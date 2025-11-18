'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Activity, AlertTriangle, CheckCircle, X } from 'lucide-react'
import { performanceMonitor, PerformanceMetrics, PerformanceAlert } from '@/lib/performance/monitor'

interface PerformanceMonitorProps {
  position?: 'bottom-right' | 'bottom-left' | 'top-right' | 'top-left'
  showByDefault?: boolean
}

export function PerformanceMonitor({
  position = 'bottom-right',
  showByDefault = false
}: PerformanceMonitorProps) {
  const [metrics, setMetrics] = useState<PerformanceMetrics>(performanceMonitor.getMetrics())
  const [alerts, setAlerts] = useState<PerformanceAlert[]>(performanceMonitor.getAlerts())
  const [isVisible, setIsVisible] = useState(showByDefault)
  const [score, setScore] = useState(100)

  useEffect(() => {
    const unsubscribe = performanceMonitor.subscribe((newMetrics, newAlerts) => {
      setMetrics(newMetrics)
      setAlerts(newAlerts)
      setScore(performanceMonitor.getPerformanceScore())
    })

    return unsubscribe
  }, [])

  const positionClasses = {
    'bottom-right': 'bottom-4 right-4',
    'bottom-left': 'bottom-4 left-4',
    'top-right': 'top-4 right-4',
    'top-left': 'top-4 left-4',
  }

  const formatMetric = (value: number | null, unit: string = 'ms') => {
    if (value === null) return 'N/A'
    if (unit === 'ms') return `${Math.round(value)}${unit}`
    return `${value.toFixed(3)}`
  }

  const getScoreColor = (score: number) => {
    if (score >= 90) return 'text-green-600'
    if (score >= 50) return 'text-yellow-600'
    return 'text-red-600'
  }

  const getScoreBadge = (score: number) => {
    if (score >= 90) return 'Good'
    if (score >= 50) return 'Needs Improvement'
    return 'Poor'
  }

  if (!isVisible) {
    return (
      <button
        onClick={() => setIsVisible(true)}
        className={`fixed ${positionClasses[position]} z-50 bg-coral text-white p-3 rounded-full shadow-lg hover:bg-coral-dark transition-all`}
        title="Show Performance Monitor"
      >
        <Activity className="h-5 w-5" />
        {alerts.length > 0 && (
          <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
            {alerts.length}
          </span>
        )}
      </button>
    )
  }

  return (
    <div className={`fixed ${positionClasses[position]} z-50 w-96`}>
      <Card className="shadow-xl border-2 border-cream-dark">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Activity className="h-5 w-5 text-coral" />
              <h3 className="font-semibold text-lg">Performance Monitor</h3>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsVisible(false)}
              className="h-6 w-6 p-0"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
          <div className="flex items-center gap-2 mt-2">
            <span className="text-sm text-gray-600">Score:</span>
            <span className={`text-2xl font-bold ${getScoreColor(score)}`}>{score}</span>
            <Badge variant="outline" className="ml-2">
              {getScoreBadge(score)}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Metrics */}
          <div className="space-y-2">
            <h4 className="text-sm font-semibold text-gray-700">Core Web Vitals</h4>
            <div className="grid grid-cols-2 gap-2 text-sm">
              <div className="flex justify-between p-2 bg-cream-light rounded">
                <span className="text-gray-600">FCP:</span>
                <span className="font-mono">{formatMetric(metrics.fcp)}</span>
              </div>
              <div className="flex justify-between p-2 bg-cream-light rounded">
                <span className="text-gray-600">LCP:</span>
                <span className="font-mono">{formatMetric(metrics.lcp)}</span>
              </div>
              <div className="flex justify-between p-2 bg-cream-light rounded">
                <span className="text-gray-600">FID:</span>
                <span className="font-mono">{formatMetric(metrics.fid)}</span>
              </div>
              <div className="flex justify-between p-2 bg-cream-light rounded">
                <span className="text-gray-600">CLS:</span>
                <span className="font-mono">{formatMetric(metrics.cls, '')}</span>
              </div>
              <div className="flex justify-between p-2 bg-cream-light rounded col-span-2">
                <span className="text-gray-600">TTFB:</span>
                <span className="font-mono">{formatMetric(metrics.ttfb)}</span>
              </div>
            </div>
          </div>

          {/* Alerts */}
          {alerts.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <h4 className="text-sm font-semibold text-gray-700">Alerts</h4>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => performanceMonitor.clearAlerts()}
                  className="h-6 text-xs"
                >
                  Clear
                </Button>
              </div>
              <div className="space-y-1 max-h-40 overflow-y-auto">
                {alerts.map((alert, index) => (
                  <div
                    key={index}
                    className={`flex items-start gap-2 p-2 rounded text-xs ${
                      alert.severity === 'critical' ? 'bg-red-50 text-red-800' : 'bg-yellow-50 text-yellow-800'
                    }`}
                  >
                    <AlertTriangle className="h-3 w-3 mt-0.5 flex-shrink-0" />
                    <div className="flex-1">
                      <div className="font-semibold">{alert.metric.toUpperCase()}</div>
                      <div>
                        {formatMetric(alert.value, alert.metric === 'cls' ? '' : 'ms')} exceeds threshold (
                        {formatMetric(alert.threshold, alert.metric === 'cls' ? '' : 'ms')})
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Status */}
          <div className="pt-2 border-t border-cream">
            <div className="flex items-center gap-2 text-xs text-gray-600">
              <CheckCircle className="h-3 w-3 text-green-600" />
              <span>Monitoring active</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
