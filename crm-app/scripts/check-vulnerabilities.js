#!/usr/bin/env node

/**
 * Automated Dependency Vulnerability Scanner
 *
 * This script checks for vulnerabilities in dependencies and can be run
 * as part of CI/CD pipeline or as a pre-commit hook.
 */

const { execSync } = require('child_process')
const fs = require('fs')
const path = require('path')

// Configuration
const CONFIG = {
  // Severity levels to fail on
  failOn: process.env.VULN_FAIL_LEVEL || 'high', // 'critical', 'high', 'moderate', 'low'
  // Output file for results
  outputFile: process.env.VULN_OUTPUT || './security-audit-results.json',
  // Whether to attempt automatic fixes
  autoFix: process.env.VULN_AUTO_FIX === 'true',
  // Slack webhook for notifications (optional)
  slackWebhook: process.env.SLACK_SECURITY_WEBHOOK,
}

const SEVERITY_LEVELS = {
  critical: 4,
  high: 3,
  moderate: 2,
  low: 1,
  info: 0,
}

// Color codes for console output
const COLORS = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
}

function log(message, color = 'reset') {
  console.log(`${COLORS[color]}${message}${COLORS.reset}`)
}

function runNpmAudit() {
  log('\n🔍 Running npm audit...', 'cyan')

  try {
    const result = execSync('npm audit --json', {
      encoding: 'utf8',
      stdio: ['pipe', 'pipe', 'pipe'],
    })

    return JSON.parse(result)
  } catch (error) {
    // npm audit exits with code 1 if vulnerabilities are found
    if (error.stdout) {
      try {
        return JSON.parse(error.stdout)
      } catch (parseError) {
        log('Error parsing npm audit output', 'red')
        return null
      }
    }
    return null
  }
}

function analyzeResults(auditData) {
  if (!auditData || !auditData.metadata) {
    log('No audit data available', 'red')
    return null
  }

  const { vulnerabilities } = auditData.metadata
  const { advisories } = auditData

  const summary = {
    total: vulnerabilities.total || 0,
    critical: vulnerabilities.critical || 0,
    high: vulnerabilities.high || 0,
    moderate: vulnerabilities.moderate || 0,
    low: vulnerabilities.low || 0,
    info: vulnerabilities.info || 0,
  }

  const details = Object.values(advisories || {}).map((advisory) => ({
    id: advisory.id,
    title: advisory.title,
    severity: advisory.severity,
    module: advisory.module_name,
    version: advisory.findings?.[0]?.version,
    recommendation: advisory.recommendation,
    url: advisory.url,
  }))

  return { summary, details }
}

function printSummary(analysis) {
  if (!analysis) return

  const { summary, details } = analysis

  log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━', 'cyan')
  log('       VULNERABILITY SUMMARY', 'cyan')
  log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━', 'cyan')

  log(`\nTotal Vulnerabilities: ${summary.total}`, summary.total > 0 ? 'yellow' : 'green')

  if (summary.critical > 0) {
    log(`  Critical: ${summary.critical}`, 'red')
  }
  if (summary.high > 0) {
    log(`  High:     ${summary.high}`, 'red')
  }
  if (summary.moderate > 0) {
    log(`  Moderate: ${summary.moderate}`, 'yellow')
  }
  if (summary.low > 0) {
    log(`  Low:      ${summary.low}`, 'blue')
  }

  if (details.length > 0) {
    log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━', 'cyan')
    log('       VULNERABILITY DETAILS', 'cyan')
    log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━', 'cyan')

    details.forEach((detail, index) => {
      const severityColor =
        detail.severity === 'critical' || detail.severity === 'high'
          ? 'red'
          : detail.severity === 'moderate'
          ? 'yellow'
          : 'blue'

      log(`\n${index + 1}. ${detail.title}`, 'cyan')
      log(`   Severity: ${detail.severity.toUpperCase()}`, severityColor)
      log(`   Module:   ${detail.module}`)
      log(`   URL:      ${detail.url}`)
      if (detail.recommendation) {
        log(`   Fix:      ${detail.recommendation}`, 'green')
      }
    })
  }

  log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n', 'cyan')
}

function shouldFail(summary) {
  const failLevel = SEVERITY_LEVELS[CONFIG.failOn]

  if (summary.critical > 0 && failLevel <= SEVERITY_LEVELS.critical) {
    return true
  }
  if (summary.high > 0 && failLevel <= SEVERITY_LEVELS.high) {
    return true
  }
  if (summary.moderate > 0 && failLevel <= SEVERITY_LEVELS.moderate) {
    return true
  }
  if (summary.low > 0 && failLevel <= SEVERITY_LEVELS.low) {
    return true
  }

  return false
}

function saveResults(analysis) {
  try {
    const output = {
      timestamp: new Date().toISOString(),
      ...analysis,
    }

    fs.writeFileSync(CONFIG.outputFile, JSON.stringify(output, null, 2))
    log(`\n✓ Results saved to ${CONFIG.outputFile}`, 'green')
  } catch (error) {
    log(`\n✗ Failed to save results: ${error.message}`, 'red')
  }
}

function attemptFix() {
  if (!CONFIG.autoFix) {
    log('\n💡 Tip: Run "npm audit fix" to attempt automatic fixes', 'yellow')
    return
  }

  log('\n🔧 Attempting automatic fixes...', 'cyan')

  try {
    execSync('npm audit fix', { stdio: 'inherit' })
    log('✓ Automatic fixes applied', 'green')

    // Run audit again to check if fixes worked
    log('\n🔍 Re-running audit to verify fixes...', 'cyan')
    const newAudit = runNpmAudit()
    const newAnalysis = analyzeResults(newAudit)

    if (newAnalysis) {
      printSummary(newAnalysis)
    }
  } catch (error) {
    log('✗ Some fixes may require manual intervention', 'yellow')
  }
}

async function sendSlackNotification(analysis) {
  if (!CONFIG.slackWebhook) {
    return
  }

  const { summary } = analysis

  if (summary.total === 0) {
    return // No need to notify if there are no vulnerabilities
  }

  try {
    const message = {
      text: '🚨 Security Vulnerabilities Detected',
      blocks: [
        {
          type: 'header',
          text: {
            type: 'plain_text',
            text: '🚨 Security Vulnerabilities Detected',
          },
        },
        {
          type: 'section',
          fields: [
            { type: 'mrkdwn', text: `*Total:* ${summary.total}` },
            { type: 'mrkdwn', text: `*Critical:* ${summary.critical}` },
            { type: 'mrkdwn', text: `*High:* ${summary.high}` },
            { type: 'mrkdwn', text: `*Moderate:* ${summary.moderate}` },
          ],
        },
      ],
    }

    // Note: In production, you'd use fetch or axios here
    // For now, we'll just log that we would send it
    log('\n📢 Slack notification prepared (webhook not configured)', 'blue')
  } catch (error) {
    log(`\n✗ Failed to send Slack notification: ${error.message}`, 'red')
  }
}

// Main execution
async function main() {
  log('╔════════════════════════════════════════╗', 'cyan')
  log('║  Dependency Vulnerability Scanner     ║', 'cyan')
  log('╚════════════════════════════════════════╝', 'cyan')

  const auditData = runNpmAudit()
  const analysis = analyzeResults(auditData)

  if (!analysis) {
    log('\n✗ Failed to analyze audit results', 'red')
    process.exit(1)
  }

  printSummary(analysis)
  saveResults(analysis)

  // Send Slack notification if configured
  await sendSlackNotification(analysis)

  // Attempt automatic fixes if enabled
  if (analysis.summary.total > 0) {
    attemptFix()
  }

  // Exit with appropriate code
  if (shouldFail(analysis.summary)) {
    log(
      `\n✗ Failing due to ${CONFIG.failOn} or higher severity vulnerabilities`,
      'red'
    )
    log('  Set VULN_FAIL_LEVEL environment variable to change threshold\n', 'yellow')
    process.exit(1)
  } else {
    log('\n✓ No vulnerabilities above threshold', 'green')
    process.exit(0)
  }
}

// Run the script
main().catch((error) => {
  log(`\n✗ Unexpected error: ${error.message}`, 'red')
  console.error(error)
  process.exit(1)
})
