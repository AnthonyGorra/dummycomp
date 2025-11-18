'use client'

import { useState, useEffect, useRef } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { 
  Bot, 
  Send, 
  User, 
  Clock,
  RefreshCw,
  Upload,
  FileText,
  X
} from 'lucide-react'
import { aiService, AIMessage, AIResponse } from '@/lib/ai/providers'
import { clientDataService } from '@/lib/ai/client-data'
import { DocumentParser, ParsedDocument } from '@/lib/document-parser'

interface ChatMessage extends AIMessage {
  id: string
  response?: AIResponse
  attachedDocuments?: ParsedDocument[]
}


export default function AIAssistantPage() {
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [input, setInput] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [uploadedDocuments, setUploadedDocuments] = useState<ParsedDocument[]>([])
  const [isUploading, setIsUploading] = useState(false)
  const currentProvider = 'claude'
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    // Initial welcome message
    const welcomeMessage: ChatMessage = {
      id: '1',
      role: 'assistant',
      content: `👋 **Welcome to your CRM AI Assistant!**

I'm here to help you access and analyze your client information. I can provide:

• **Client summaries** and detailed information
• **Portfolio analysis** and financial insights  
• **Document status** and compliance tracking
• **Upcoming reviews** and scheduling insights
• **Risk profile** analysis and recommendations

What would you like to know about your clients?

**AI Provider:** Claude (Anthropic)

**Document Analysis:**
You can upload Word documents, PowerPoint presentations, PDFs, and other business files for analysis.`,
      timestamp: new Date().toISOString()
    }
    setMessages([welcomeMessage])
  }, [currentProvider])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files
    if (!files || files.length === 0) return

    setIsUploading(true)
    const newDocuments: ParsedDocument[] = []

    try {
      for (const file of Array.from(files)) {
        if (!DocumentParser.isFileTypeSupported(file.name)) {
          alert(`File type not supported: ${file.name}. Supported types: ${DocumentParser.getSupportedFileTypes().join(', ')}`)
          continue
        }

        if (file.size > 10 * 1024 * 1024) { // 10MB limit
          alert(`File too large: ${file.name}. Maximum size is 10MB.`)
          continue
        }

        const parsedDoc = await DocumentParser.parseFile(file)
        newDocuments.push(parsedDoc)
      }

      setUploadedDocuments(prev => [...prev, ...newDocuments])
    } catch (error) {
      alert(`Error uploading files: ${error instanceof Error ? error.message : 'Unknown error'}`)
    } finally {
      setIsUploading(false)
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }
    }
  }

  const removeDocument = (index: number) => {
    setUploadedDocuments(prev => prev.filter((_, i) => i !== index))
  }

  const handleSendMessage = async () => {
    if ((!input.trim() && uploadedDocuments.length === 0) || isLoading) return

    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      role: 'user',
      content: input.trim() || 'Please analyze the uploaded documents.',
      timestamp: new Date().toISOString(),
      attachedDocuments: uploadedDocuments.length > 0 ? [...uploadedDocuments] : undefined
    }

    setMessages(prev => [...prev, userMessage])
    setInput('')
    setUploadedDocuments([]) // Clear uploaded documents after sending
    setIsLoading(true)

    try {
      // Set AI provider
      aiService.setProvider(currentProvider)

      // Prepare context with client data and documents
      let documentContext = ''
      if (uploadedDocuments.length > 0) {
        documentContext = `\n\nUploaded Documents for Analysis:\n${uploadedDocuments.map((doc, index) => 
          `${index + 1}. ${doc.metadata.fileName} (${doc.metadata.fileType}):\n${doc.content.slice(0, 2000)}${doc.content.length > 2000 ? '...' : ''}`
        ).join('\n\n')}`
      }

      const systemMessage: AIMessage = {
        role: 'system',
        content: `You are a helpful CRM AI assistant. You have access to client data and can analyze business documents. 

Available client data context:
${clientDataService.getAllClientsForAI().map(client => 
  `- ${client.name} (${client.client_id}): ${client.entity_type}, Portfolio: ${client.financial.portfolio_value ? '$' + client.financial.portfolio_value.toLocaleString() : 'N/A'}, Risk: ${client.financial.risk_profile || 'N/A'}`
).join('\n')}${documentContext}

Respond in a helpful, professional manner. Use markdown formatting for better readability. When analyzing documents, provide insights, summaries, and actionable recommendations.`
      }

      const response = await aiService.sendMessage([
        systemMessage,
        ...messages.slice(-5), // Include last 5 messages for context
        userMessage
      ])

      const assistantMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: response.content,
        timestamp: response.timestamp,
        response
      }

      setMessages(prev => [...prev, assistantMessage])
    } catch (error) {
      const errorMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: `❌ **Error:** Failed to get response from AI provider. Please check your connection and try again.

**Error details:** ${error instanceof Error ? error.message : 'Unknown error'}`,
        timestamp: new Date().toISOString()
      }
      setMessages(prev => [...prev, errorMessage])
    } finally {
      setIsLoading(false)
    }
  }


  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSendMessage()
    }
  }

  const clearChat = () => {
    setMessages([])
    // Re-add welcome message
    const welcomeMessage: ChatMessage = {
      id: Date.now().toString(),
      role: 'assistant',
      content: `Chat cleared! How can I help you with your client information?`,
      timestamp: new Date().toISOString()
    }
    setMessages([welcomeMessage])
  }

  const formatTimestamp = (timestamp: string) => {
    return new Date(timestamp).toLocaleTimeString('en-AU', {
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  return (
    <div className="h-[calc(100vh-4rem)] flex flex-col">
      {/* Header */}
      <div className="border-b border-cream-dark dark:border-gray-700 bg-white dark:bg-gray-800 p-4 flex-shrink-0">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 bg-coral rounded-lg flex items-center justify-center">
              <Bot className="h-6 w-6 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-semibold text-black dark:text-white">AI Assistant</h1>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={clearChat}
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              Clear
            </Button>
          </div>
        </div>
      </div>

      {/* Chat Area */}
      <div className="flex-1 flex flex-col overflow-hidden bg-cream dark:bg-gray-900">
        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-cream dark:bg-gray-900">
            {messages.map((message) => (
              <div
                key={message.id}
                className={`flex gap-3 ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                {message.role === 'assistant' && (
                  <Avatar className="h-8 w-8 bg-coral">
                    <AvatarFallback className="bg-coral text-white">
                      <Bot className="h-4 w-4" />
                    </AvatarFallback>
                  </Avatar>
                )}

                <div
                  className={`max-w-3xl rounded-lg p-4 ${
                    message.role === 'user'
                      ? 'bg-coral text-white ml-12'
                      : 'bg-white dark:bg-gray-800 border border-cream-dark dark:border-gray-700 text-black dark:text-white'
                  }`}
                >
                  <div className="prose prose-sm max-w-none">
                    {message.role === 'assistant' ? (
                      <div 
                        dangerouslySetInnerHTML={{ 
                          __html: message.content
                            .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
                            .replace(/\*(.*?)\*/g, '<em>$1</em>')
                            .replace(/\n/g, '<br />') 
                        }} 
                      />
                    ) : (
                      <div>
                        <div>{message.content}</div>
                        {message.attachedDocuments && message.attachedDocuments.length > 0 && (
                          <div className="mt-3 space-y-2">
                            <div className="text-xs text-gray-500 dark:text-gray-400">Attached Documents:</div>
                            {message.attachedDocuments.map((doc, index) => (
                              <div key={index} className="flex items-center gap-2 text-xs bg-gray-100 dark:bg-gray-700 rounded p-2">
                                <FileText className="h-3 w-3" />
                                <span className="font-medium">{doc.metadata.fileName}</span>
                                <span className="text-gray-500">({(doc.metadata.fileSize / 1024).toFixed(1)} KB)</span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                  
                  <div className="flex items-center justify-between mt-3 pt-2 border-t border-gray-200 dark:border-gray-600">
                    <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
                      <Clock className="h-3 w-3" />
                      {formatTimestamp(message.timestamp!)}
                    </div>
                    
                    {message.response && (
                      <div className="flex items-center gap-4 text-xs text-gray-500 dark:text-gray-400">
                        <span>{message.response.tokens_used} tokens</span>
                        <span>{message.response.provider}</span>
                      </div>
                    )}
                  </div>
                </div>

                {message.role === 'user' && (
                  <Avatar className="h-8 w-8 bg-blue-600 dark:bg-blue-800">
                    <AvatarFallback className="bg-blue-600 dark:bg-blue-800 text-white">
                      <User className="h-4 w-4" />
                    </AvatarFallback>
                  </Avatar>
                )}
              </div>
            ))}

            {isLoading && (
              <div className="flex gap-3 justify-start">
                <Avatar className="h-8 w-8 bg-coral">
                  <AvatarFallback className="bg-coral text-white">
                    <Bot className="h-4 w-4" />
                  </AvatarFallback>
                </Avatar>
                <div className="bg-white dark:bg-gray-800 border border-cream-dark dark:border-gray-700 rounded-lg p-4">
                  <div className="flex items-center gap-2 text-gray-500 dark:text-gray-400">
                    <RefreshCw className="h-4 w-4 animate-spin" />
                    <span>Thinking...</span>
                  </div>
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

        </div>

        {/* Input Area */}
        <div className="border-t border-cream-dark dark:border-gray-700 bg-white dark:bg-gray-800 p-6 flex-shrink-0">
          {/* Uploaded Documents */}
          {uploadedDocuments.length > 0 && (
            <div className="mb-4 space-y-2">
              <div className="text-sm font-medium text-gray-700 dark:text-gray-300">Uploaded Documents:</div>
              <div className="space-y-2">
                {uploadedDocuments.map((doc, index) => (
                  <div key={index} className="flex items-center gap-3 bg-cream-light dark:bg-gray-700 rounded-lg p-3">
                    <FileText className="h-4 w-4 text-coral" />
                    <div className="flex-1">
                      <div className="font-medium text-sm">{doc.metadata.fileName}</div>
                      <div className="text-xs text-gray-500 dark:text-gray-400">
                        {(doc.metadata.fileSize / 1024).toFixed(1)} KB • {doc.content.slice(0, 50)}...
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => removeDocument(index)}
                      className="h-8 w-8 p-0"
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="flex gap-3">
            <div className="flex-1 flex gap-2">
              <Input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="Ask me anything..."
                className="flex-1 h-12 text-base"
                disabled={isLoading || isUploading}
              />
              <input
                ref={fileInputRef}
                type="file"
                multiple
                accept=".doc,.docx,.ppt,.pptx,.pdf,.txt,.csv"
                onChange={handleFileUpload}
                className="hidden"
              />
              <Button
                variant="outline"
                onClick={() => fileInputRef.current?.click()}
                disabled={isLoading || isUploading}
                className="h-12 px-4"
                title="Upload documents"
              >
                {isUploading ? (
                  <RefreshCw className="h-5 w-5 animate-spin" />
                ) : (
                  <Upload className="h-5 w-5" />
                )}
              </Button>
            </div>
            <Button
              onClick={handleSendMessage}
              disabled={((!input.trim() && uploadedDocuments.length === 0) || isLoading)}
              className="bg-coral hover:bg-coral-dark h-12 px-6"
            >
              <Send className="h-5 w-5" />
            </Button>
          </div>

          <div className="mt-3 text-xs text-gray-500 dark:text-gray-400 text-center">
            Upload Word, PowerPoint, PDF, or text files • Max 10MB per file
          </div>
        </div>
      </div>
    )
  }