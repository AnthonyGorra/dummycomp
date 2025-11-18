'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { 
  Bot, 
  Send, 
  Sparkles,
  MessageSquare,
  TrendingUp,
  FileText,
  Calendar,
  DollarSign,
  RefreshCw
} from 'lucide-react'
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible'
import { aiService, AIMessage } from '@/lib/ai/providers'
import { clientDataService } from '@/lib/ai/client-data'

interface ClientAssistantProps {
  clientId: string
  clientName: string
}

interface QuickQuery {
  label: string
  query: string
  icon: React.ReactNode
}

export default function ClientAssistant({ clientId, clientName }: ClientAssistantProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [input, setInput] = useState('')
  const [response, setResponse] = useState('')
  const [isLoading, setIsLoading] = useState(false)

  const quickQueries: QuickQuery[] = [
    {
      label: 'Client Summary',
      query: `Give me a comprehensive summary of ${clientName}`,
      icon: <MessageSquare className="h-3 w-3" />
    },
    {
      label: 'Portfolio Analysis',
      query: `Analyze the portfolio allocation and performance for ${clientName}`,
      icon: <TrendingUp className="h-3 w-3" />
    },
    {
      label: 'Document Status',
      query: `What documents are available for ${clientName} and what's missing?`,
      icon: <FileText className="h-3 w-3" />
    },
    {
      label: 'Review Schedule',
      query: `When is the next review for ${clientName} and what should we prepare?`,
      icon: <Calendar className="h-3 w-3" />
    },
    {
      label: 'Financial Overview',
      query: `Show me the financial details and investment goals for ${clientName}`,
      icon: <DollarSign className="h-3 w-3" />
    }
  ]

  const handleQuery = async (queryText: string) => {
    setInput(queryText)
    setIsLoading(true)
    setResponse('')

    try {
      // Get client-specific data
      const clientData = clientDataService.getClientSummaryData(clientId)
      
      const systemMessage: AIMessage = {
        role: 'system',
        content: `You are a CRM AI assistant focused on this specific client. Here is their complete data:

${clientData}

Provide helpful, specific insights about this client. Use their actual data in your response and be precise with financial figures, dates, and recommendations.`
      }

      const userMessage: AIMessage = {
        role: 'user',
        content: queryText
      }

      const aiResponse = await aiService.sendMessage([systemMessage, userMessage])
      setResponse(aiResponse.content)
    } catch (error) {
      setResponse(`❌ Error: ${error instanceof Error ? error.message : 'Failed to get AI response'}`)
    } finally {
      setIsLoading(false)
    }
  }

  const handleSendMessage = () => {
    if (!input.trim() || isLoading) return
    handleQuery(input.trim())
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSendMessage()
    }
  }

  return (
    <Card className="border-coral/20 bg-gradient-to-r from-coral/5 to-orange/5 dark:from-coral/10 dark:to-orange/10 dark:bg-gray-800">
      <Collapsible open={isOpen} onOpenChange={setIsOpen}>
        <CollapsibleTrigger asChild>
          <CardHeader className="cursor-pointer hover:bg-coral/10 dark:hover:bg-coral/20 transition-colors">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="h-8 w-8 bg-coral rounded-lg flex items-center justify-center">
                  <Bot className="h-5 w-5 text-white" />
                </div>
                <div>
                  <CardTitle className="text-lg text-black dark:text-white">AI Assistant</CardTitle>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Ask me anything about {clientName}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="text-xs">
                  <Sparkles className="h-3 w-3 mr-1" />
                  Claude
                </Badge>
              </div>
            </div>
          </CardHeader>
        </CollapsibleTrigger>

        <CollapsibleContent>
          <CardContent className="space-y-4">
            {/* Quick Query Buttons */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
              {quickQueries.map((query, index) => (
                <Button
                  key={index}
                  variant="outline"
                  size="sm"
                  className="justify-start h-auto py-2 px-3 text-left"
                  onClick={() => handleQuery(query.query)}
                  disabled={isLoading}
                >
                  <div className="flex items-center gap-2">
                    {query.icon}
                    <span className="text-xs">{query.label}</span>
                  </div>
                </Button>
              ))}
            </div>

            {/* Custom Query Input */}
            <div className="flex gap-2">
              <Input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder={`Ask about ${clientName}...`}
                disabled={isLoading}
                className="flex-1"
              />
              <Button
                onClick={handleSendMessage}
                disabled={!input.trim() || isLoading}
                size="sm"
                className="bg-coral hover:bg-coral-dark"
              >
                {isLoading ? (
                  <RefreshCw className="h-4 w-4 animate-spin" />
                ) : (
                  <Send className="h-4 w-4" />
                )}
              </Button>
            </div>

            {/* Response Area */}
            {(response || isLoading) && (
              <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-4 min-h-[100px]">
                {isLoading ? (
                  <div className="flex items-center gap-2 text-gray-500 dark:text-gray-400">
                    <RefreshCw className="h-4 w-4 animate-spin" />
                    <span>Analyzing client data...</span>
                  </div>
                ) : (
                  <div className="prose prose-sm max-w-none dark:prose-invert">
                    <div 
                      className="text-black dark:text-white"
                      dangerouslySetInnerHTML={{ 
                        __html: response
                          .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
                          .replace(/\*(.*?)\*/g, '<em>$1</em>')
                          .replace(/\n/g, '<br />') 
                      }} 
                    />
                  </div>
                )}
              </div>
            )}

            {!response && !isLoading && (
              <div className="text-center text-gray-500 dark:text-gray-400 py-4">
                <Bot className="h-8 w-8 mx-auto mb-2 text-gray-300 dark:text-gray-600" />
                <p className="text-sm">Ask me anything about this client&apos;s portfolio, documents, or financial details.</p>
              </div>
            )}
          </CardContent>
        </CollapsibleContent>
      </Collapsible>
    </Card>
  )
}