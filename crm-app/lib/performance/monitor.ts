'use client'

export interface PerformanceMetrics {
  fcp: number | null // First Contentful Paint
  lcp: number | null // Largest Contentful Paint
  fid: number | null // First Input Delay
  cls: number | null // Cumulative Layout Shift
  ttfb: number | null // Time to First Byte
}

export interface PerformanceAlert {
  metric: string
  value: number
  threshold: number
  severity: 'warning' | 'critical'
  timestamp: number
}

class PerformanceMonitor {
  private metrics: PerformanceMetrics = {
    fcp: null,
    lcp: null,
    fid: null,
    cls: null,
    ttfb: null,
  }

  private alerts: PerformanceAlert[] = []
  private listeners: ((metrics: PerformanceMetrics, alerts: PerformanceAlert[]) => void)[] = []

  // Performance thresholds (in ms for timing metrics)
  private thresholds = {
    fcp: { warning: 1800, critical: 3000 },
    lcp: { warning: 2500, critical: 4000 },
    fid: { warning: 100, critical: 300 },
    cls: { warning: 0.1, critical: 0.25 }, // no unit
    ttfb: { warning: 600, critical: 1200 },
  }

  constructor() {
    if (typeof window !== 'undefined') {
      this.initializeObservers()
    }
  }

  private initializeObservers() {
    // Observe First Contentful Paint
    const observer = new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        if (entry.name === 'first-contentful-paint') {
          this.updateMetric('fcp', entry.startTime)
        }
      }
    })
    observer.observe({ entryTypes: ['paint'] })

    // Observe Largest Contentful Paint
    const lcpObserver = new PerformanceObserver((list) => {
      const entries = list.getEntries()
      const lastEntry = entries[entries.length - 1] as PerformanceEntry & { renderTime: number; loadTime: number }
      this.updateMetric('lcp', lastEntry.renderTime || lastEntry.loadTime)
    })
    lcpObserver.observe({ entryTypes: ['largest-contentful-paint'] })

    // Observe First Input Delay
    const fidObserver = new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        const fidEntry = entry as PerformanceEntry & { processingStart: number }
        this.updateMetric('fid', fidEntry.processingStart - entry.startTime)
      }
    })
    fidObserver.observe({ entryTypes: ['first-input'] })

    // Observe Cumulative Layout Shift
    let clsValue = 0
    const clsObserver = new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        const layoutShift = entry as PerformanceEntry & { hadRecentInput: boolean; value: number }
        if (!layoutShift.hadRecentInput) {
          clsValue += layoutShift.value
          this.updateMetric('cls', clsValue)
        }
      }
    })
    clsObserver.observe({ entryTypes: ['layout-shift'] })

    // Measure Time to First Byte
    if (window.performance && window.performance.timing) {
      window.addEventListener('load', () => {
        const navTiming = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming
        if (navTiming) {
          this.updateMetric('ttfb', navTiming.responseStart - navTiming.requestStart)
        }
      })
    }
  }

  private updateMetric(metric: keyof PerformanceMetrics, value: number) {
    this.metrics[metric] = value
    this.checkThreshold(metric, value)
    this.notifyListeners()
  }

  private checkThreshold(metric: keyof PerformanceMetrics, value: number) {
    const threshold = this.thresholds[metric]
    if (!threshold) return

    if (value >= threshold.critical) {
      this.addAlert(metric, value, threshold.critical, 'critical')
    } else if (value >= threshold.warning) {
      this.addAlert(metric, value, threshold.warning, 'warning')
    }
  }

  private addAlert(metric: string, value: number, threshold: number, severity: 'warning' | 'critical') {
    const alert: PerformanceAlert = {
      metric,
      value,
      threshold,
      severity,
      timestamp: Date.now(),
    }
    this.alerts.push(alert)
    this.notifyListeners()
  }

  private notifyListeners() {
    this.listeners.forEach(listener => listener(this.metrics, this.alerts))
  }

  public subscribe(listener: (metrics: PerformanceMetrics, alerts: PerformanceAlert[]) => void) {
    this.listeners.push(listener)
    return () => {
      this.listeners = this.listeners.filter(l => l !== listener)
    }
  }

  public getMetrics(): PerformanceMetrics {
    return { ...this.metrics }
  }

  public getAlerts(): PerformanceAlert[] {
    return [...this.alerts]
  }

  public clearAlerts() {
    this.alerts = []
    this.notifyListeners()
  }

  // Get performance score (0-100)
  public getPerformanceScore(): number {
    let score = 100
    const metrics = this.metrics

    // Deduct points based on metrics
    if (metrics.fcp && metrics.fcp > this.thresholds.fcp.warning) {
      score -= Math.min(20, (metrics.fcp - this.thresholds.fcp.warning) / 100)
    }
    if (metrics.lcp && metrics.lcp > this.thresholds.lcp.warning) {
      score -= Math.min(25, (metrics.lcp - this.thresholds.lcp.warning) / 100)
    }
    if (metrics.fid && metrics.fid > this.thresholds.fid.warning) {
      score -= Math.min(20, (metrics.fid - this.thresholds.fid.warning) / 10)
    }
    if (metrics.cls && metrics.cls > this.thresholds.cls.warning) {
      score -= Math.min(20, (metrics.cls - this.thresholds.cls.warning) * 100)
    }
    if (metrics.ttfb && metrics.ttfb > this.thresholds.ttfb.warning) {
      score -= Math.min(15, (metrics.ttfb - this.thresholds.ttfb.warning) / 50)
    }

    return Math.max(0, Math.round(score))
  }
}

export const performanceMonitor = new PerformanceMonitor()
