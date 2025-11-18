'use client'

import { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { 
  ArrowLeft, 
  TrendingUp, 
  TrendingDown, 
  DollarSign, 
  PieChart, 
  RefreshCw,
  Calendar,
  Target,
  AlertCircle
} from 'lucide-react'
import Link from 'next/link'

interface InvestmentAccount {
  id: string
  accountName: string
  platform: string
  accountType: string
  currentValue: number
  availableBalance: number
  lastValuationDate: string
  performance: {
    dayChange: number
    dayChangePercent: number
    yearChange: number
    yearChangePercent: number
  }
}

interface Holding {
  id: string
  accountId: string
  securityCode: string
  securityName: string
  assetClass: string
  units: number
  unitPrice: number
  marketValue: number
  bookCost: number
  unrealizedGainLoss: number
  unrealizedGainLossPercent: number
  lastPriceUpdate: string
}

interface AssetAllocation {
  assetClass: string
  value: number
  percentage: number
  color: string
}

// Mock data - in real implementation, this would come from Supabase and external APIs
const mockAccounts: InvestmentAccount[] = [
  {
    id: '1',
    accountName: 'Netwealth Investment Account',
    platform: 'Netwealth',
    accountType: 'Investment',
    currentValue: 485750.00,
    availableBalance: 12500.00,
    lastValuationDate: '2024-01-19',
    performance: {
      dayChange: 2380.50,
      dayChangePercent: 0.49,
      yearChange: 48575.00,
      yearChangePercent: 11.1
    }
  },
  {
    id: '2', 
    accountName: 'HUB24 Superannuation',
    platform: 'HUB24',
    accountType: 'Superannuation',
    currentValue: 328900.00,
    availableBalance: 5200.00,
    lastValuationDate: '2024-01-19',
    performance: {
      dayChange: -1205.75,
      dayChangePercent: -0.37,
      yearChange: 29601.00,
      yearChangePercent: 9.9
    }
  }
]

const mockHoldings: Holding[] = [
  {
    id: '1',
    accountId: '1',
    securityCode: 'VAS',
    securityName: 'Vanguard Australian Shares Index ETF',
    assetClass: 'Australian_Equities',
    units: 1250.0,
    unitPrice: 89.45,
    marketValue: 111812.50,
    bookCost: 98500.00,
    unrealizedGainLoss: 13312.50,
    unrealizedGainLossPercent: 13.5,
    lastPriceUpdate: '2024-01-19T16:00:00Z'
  },
  {
    id: '2',
    accountId: '1',
    securityCode: 'VGS',
    securityName: 'Vanguard MSCI Index International Shares ETF',
    assetClass: 'International_Equities',
    units: 890.0,
    unitPrice: 108.20,
    marketValue: 96298.00,
    bookCost: 89000.00,
    unrealizedGainLoss: 7298.00,
    unrealizedGainLossPercent: 8.2,
    lastPriceUpdate: '2024-01-19T16:00:00Z'
  },
  {
    id: '3',
    accountId: '1',
    securityCode: 'VAF',
    securityName: 'Vanguard Australian Fixed Interest Index ETF',
    assetClass: 'Fixed_Income',
    units: 2100.0,
    unitPrice: 48.95,
    marketValue: 102795.00,
    bookCost: 105000.00,
    unrealizedGainLoss: -2205.00,
    unrealizedGainLossPercent: -2.1,
    lastPriceUpdate: '2024-01-19T16:00:00Z'
  }
]

export default function PortfolioPage() {
  const params = useParams()
  const [accounts, setAccounts] = useState<InvestmentAccount[]>(mockAccounts)
  const [holdings, setHoldings] = useState<Holding[]>(mockHoldings)
  const [isRefreshing, setIsRefreshing] = useState(false)

  const totalValue = accounts.reduce((sum, account) => sum + account.currentValue, 0)
  const totalDayChange = accounts.reduce((sum, account) => sum + account.performance.dayChange, 0)
  const totalDayChangePercent = (totalDayChange / (totalValue - totalDayChange)) * 100

  // Calculate asset allocation
  const assetAllocation: AssetAllocation[] = [
    { assetClass: 'Australian Equities', value: 180000, percentage: 22.1, color: '#FF6B35' },
    { assetClass: 'International Equities', value: 350000, percentage: 43.0, color: '#F7931E' },
    { assetClass: 'Fixed Income', value: 150000, percentage: 18.4, color: '#FFD23F' },
    { assetClass: 'Property', value: 80000, percentage: 9.8, color: '#06FFA5' },
    { assetClass: 'Cash', value: 54650, percentage: 6.7, color: '#4ECDC4' }
  ]

  const refreshPrices = async () => {
    setIsRefreshing(true)
    // Simulate API call delay
    await new Promise(resolve => setTimeout(resolve, 2000))
    setIsRefreshing(false)
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-AU', {
      style: 'currency',
      currency: 'AUD',
      minimumFractionDigits: 2
    }).format(amount)
  }

  const formatPercent = (percent: number) => {
    const sign = percent >= 0 ? '+' : ''
    return `${sign}${percent.toFixed(2)}%`
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href={`/clients/${params.id}`}>
            <Button variant="ghost" size="sm">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div>
            <h1 className="text-3xl font-semibold text-black">Portfolio Overview</h1>
            <p className="text-muted-foreground mt-1">Investment accounts and holdings</p>
          </div>
        </div>
        <Button 
          onClick={refreshPrices} 
          disabled={isRefreshing}
          variant="outline"
        >
          <RefreshCw className={`h-4 w-4 mr-2 ${isRefreshing ? 'animate-spin' : ''}`} />
          {isRefreshing ? 'Updating...' : 'Refresh Prices'}
        </Button>
      </div>

      {/* Portfolio Summary */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card className="border-cream-dark">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Portfolio Value</CardTitle>
            <DollarSign className="h-4 w-4 text-coral" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(totalValue)}</div>
            <div className={`text-xs flex items-center mt-1 ${totalDayChange >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              {totalDayChange >= 0 ? <TrendingUp className="h-3 w-3 mr-1" /> : <TrendingDown className="h-3 w-3 mr-1" />}
              {formatCurrency(Math.abs(totalDayChange))} ({formatPercent(totalDayChangePercent)}) today
            </div>
          </CardContent>
        </Card>

        <Card className="border-cream-dark">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Accounts</CardTitle>
            <Target className="h-4 w-4 text-coral" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{accounts.length}</div>
            <p className="text-xs text-muted-foreground mt-1">
              Across {new Set(accounts.map(a => a.platform)).size} platforms
            </p>
          </CardContent>
        </Card>

        <Card className="border-cream-dark">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Asset Classes</CardTitle>
            <PieChart className="h-4 w-4 text-coral" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{assetAllocation.length}</div>
            <p className="text-xs text-muted-foreground mt-1">
              Diversified allocation
            </p>
          </CardContent>
        </Card>

        <Card className="border-cream-dark">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Last Updated</CardTitle>
            <Calendar className="h-4 w-4 text-coral" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">Today</div>
            <p className="text-xs text-muted-foreground mt-1">
              Real-time pricing
            </p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="accounts" className="space-y-4">
        <TabsList className="bg-cream">
          <TabsTrigger value="accounts" className="data-[state=active]:bg-coral data-[state=active]:text-white">
            Accounts
          </TabsTrigger>
          <TabsTrigger value="holdings" className="data-[state=active]:bg-coral data-[state=active]:text-white">
            Holdings
          </TabsTrigger>
          <TabsTrigger value="allocation" className="data-[state=active]:bg-coral data-[state=active]:text-white">
            Asset Allocation
          </TabsTrigger>
          <TabsTrigger value="performance" className="data-[state=active]:bg-coral data-[state=active]:text-white">
            Performance
          </TabsTrigger>
        </TabsList>

        <TabsContent value="accounts" className="space-y-4">
          {accounts.map((account) => (
            <Card key={account.id} className="border-cream-dark">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-lg">{account.accountName}</CardTitle>
                    <CardDescription className="flex items-center gap-2 mt-1">
                      <Badge variant="outline">{account.platform}</Badge>
                      <Badge variant="outline">{account.accountType}</Badge>
                    </CardDescription>
                  </div>
                  <div className="text-right">
                    <div className="text-2xl font-bold">{formatCurrency(account.currentValue)}</div>
                    <div className={`text-sm flex items-center justify-end ${account.performance.dayChange >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                      {account.performance.dayChange >= 0 ? <TrendingUp className="h-3 w-3 mr-1" /> : <TrendingDown className="h-3 w-3 mr-1" />}
                      {formatCurrency(Math.abs(account.performance.dayChange))} ({formatPercent(account.performance.dayChangePercent)})
                    </div>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                  <div>
                    <p className="text-muted-foreground">Available Balance</p>
                    <p className="font-medium">{formatCurrency(account.availableBalance)}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Year to Date</p>
                    <p className={`font-medium ${account.performance.yearChange >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                      {formatCurrency(account.performance.yearChange)} ({formatPercent(account.performance.yearChangePercent)})
                    </p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Last Valuation</p>
                    <p className="font-medium">{new Date(account.lastValuationDate).toLocaleDateString('en-AU')}</p>
                  </div>
                  <div>
                    <Button variant="outline" size="sm">
                      View Details
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </TabsContent>

        <TabsContent value="holdings" className="space-y-4">
          <Card className="border-cream-dark">
            <CardHeader>
              <CardTitle>Individual Holdings</CardTitle>
              <CardDescription>Detailed breakdown of investment positions</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="border-b border-cream-dark">
                    <tr className="text-left">
                      <th className="pb-3 font-medium">Security</th>
                      <th className="pb-3 font-medium text-right">Units</th>
                      <th className="pb-3 font-medium text-right">Price</th>
                      <th className="pb-3 font-medium text-right">Market Value</th>
                      <th className="pb-3 font-medium text-right">Gain/Loss</th>
                      <th className="pb-3 font-medium text-right">%</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-cream-dark">
                    {holdings.map((holding) => (
                      <tr key={holding.id} className="hover:bg-cream-light">
                        <td className="py-3">
                          <div>
                            <div className="font-medium">{holding.securityCode}</div>
                            <div className="text-muted-foreground text-xs">{holding.securityName}</div>
                            <Badge variant="outline" className="mt-1 text-xs">
                              {holding.assetClass.replace('_', ' ')}
                            </Badge>
                          </div>
                        </td>
                        <td className="py-3 text-right">{holding.units.toLocaleString()}</td>
                        <td className="py-3 text-right">{formatCurrency(holding.unitPrice)}</td>
                        <td className="py-3 text-right font-medium">{formatCurrency(holding.marketValue)}</td>
                        <td className={`py-3 text-right font-medium ${holding.unrealizedGainLoss >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                          {formatCurrency(holding.unrealizedGainLoss)}
                        </td>
                        <td className={`py-3 text-right font-medium ${holding.unrealizedGainLoss >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                          {formatPercent(holding.unrealizedGainLossPercent)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="allocation" className="space-y-4">
          <Card className="border-cream-dark">
            <CardHeader>
              <CardTitle>Asset Allocation</CardTitle>
              <CardDescription>Portfolio distribution across asset classes</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {assetAllocation.map((allocation) => (
                  <div key={allocation.assetClass} className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div 
                        className="w-4 h-4 rounded"
                        style={{ backgroundColor: allocation.color }}
                      />
                      <span className="font-medium">{allocation.assetClass}</span>
                    </div>
                    <div className="text-right">
                      <div className="font-medium">{formatCurrency(allocation.value)}</div>
                      <div className="text-sm text-muted-foreground">{allocation.percentage}%</div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card className="border-cream-dark">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <AlertCircle className="h-5 w-5 text-amber-500" />
                Rebalancing Recommendation
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="bg-amber-50 border border-amber-200 p-4 rounded-lg">
                <p className="text-sm text-amber-800">
                  Your International Equities allocation (43.0%) is above the target range of 35-40%. 
                  Consider rebalancing to maintain your desired risk profile.
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="performance" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card className="border-cream-dark">
              <CardHeader>
                <CardTitle>Performance Summary</CardTitle>
                <CardDescription>Returns across different time periods</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <span>1 Day</span>
                    <span className={`font-medium ${totalDayChange >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                      {formatPercent(totalDayChangePercent)}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span>1 Month</span>
                    <span className="font-medium text-green-600">+2.8%</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span>3 Months</span>
                    <span className="font-medium text-green-600">+5.2%</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span>6 Months</span>
                    <span className="font-medium text-green-600">+8.1%</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span>1 Year</span>
                    <span className="font-medium text-green-600">+10.5%</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border-cream-dark">
              <CardHeader>
                <CardTitle>Benchmark Comparison</CardTitle>
                <CardDescription>Performance vs market indices</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div>
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-sm">vs ASX 200</span>
                      <span className="text-sm font-medium text-green-600">+1.2%</span>
                    </div>
                    <div className="w-full bg-cream-dark rounded-full h-2">
                      <div className="bg-green-500 h-2 rounded-full" style={{ width: '60%' }} />
                    </div>
                  </div>
                  <div>
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-sm">vs MSCI World</span>
                      <span className="text-sm font-medium text-green-600">+0.8%</span>
                    </div>
                    <div className="w-full bg-cream-dark rounded-full h-2">
                      <div className="bg-green-500 h-2 rounded-full" style={{ width: '55%' }} />
                    </div>
                  </div>
                  <div>
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-sm">vs Balanced Index</span>
                      <span className="text-sm font-medium text-red-600">-0.3%</span>
                    </div>
                    <div className="w-full bg-cream-dark rounded-full h-2">
                      <div className="bg-red-500 h-2 rounded-full" style={{ width: '45%' }} />
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}