# 🤖 AI Assistant Setup Guide

Your Link CRM now has a fully functional AI assistant with document analysis capabilities! Follow these simple steps to get it running with Claude.

## 📋 Quick Setup (5 minutes)

### 1. Copy Environment Variables
```bash
cp .env.example .env.local
```

### 2. Add Your Claude API Key
Edit `.env.local` and add your Claude API key:

```bash
# Get your Claude API key from: https://console.anthropic.com/
ANTHROPIC_API_KEY=sk-ant-api03-your-key-here
```

### 3. Start the Application
```bash
npm run dev
```

## 🎯 What Works Right Now

### ✅ AI Provider
- **Claude (Anthropic)** - Advanced AI assistant for complex reasoning and analysis

### ✅ Document Analysis
- **Word Documents** (.doc, .docx) - Full text extraction
- **PowerPoint** (.ppt, .pptx) - Basic text extraction
- **PDF Files** (.pdf) - Placeholder for server-side processing
- **Text Files** (.txt) - Complete content reading
- **CSV Files** (.csv) - Data structure analysis

### ✅ CRM Integration
- Complete client database context
- Portfolio analysis and insights
- Risk profile assessments
- Document management integration
- Upcoming review tracking

## 🚀 How to Use

1. **Go to AI Assistant** (sidebar navigation)
2. **Upload Documents** (click 📎 button)
3. **Ask Questions** about clients, documents, or portfolios
4. **Get Insights** with professional analysis and recommendations

## 🔧 Claude API Key Setup

1. Visit [console.anthropic.com](https://console.anthropic.com/)
2. Sign up/login to your account
3. Navigate to API Keys section
4. Create a new API key
5. Copy the key starting with `sk-ant-api03-`
6. Add it to your `.env.local` file

## 🛠️ Troubleshooting

### Claude Not Available
- Check that `ANTHROPIC_API_KEY` is set in `.env.local`
- Restart the development server after adding the key
- Verify your Claude API key is valid and has credits

### Document Upload Issues
- Ensure files are under 10MB
- Supported formats: .doc, .docx, .ppt, .pptx, .pdf, .txt, .csv
- Check browser console for specific error messages

### API Errors
- Check Claude API key validity and credit balance
- Verify network connectivity
- Review error messages in browser console

## 💡 Features Overview

### Smart Client Analysis
```
"Give me a summary of Michael Smith"
"What clients have Conservative risk profiles?"
"Show me upcoming reviews this month"
```

### Document Intelligence
```
"Analyze this investment proposal"
"Summarize the compliance document"
"Extract key insights from this report"
```

### Portfolio Insights
```
"Compare portfolio performance across clients"
"Identify clients needing rebalancing"
"Show me high-risk investments"
```

## 🎉 You're Ready!

Your AI assistant is now fully configured and ready to help with:
- ✅ Client data analysis powered by Claude
- ✅ Document processing and insights
- ✅ Portfolio recommendations  
- ✅ Compliance tracking
- ✅ Business intelligence

Navigate to the AI Assistant in your sidebar and start asking questions!

## ⚡ What Works Immediately

- **Real AI Conversations** - Powered by Claude 3.5 Sonnet
- **Document Upload & Analysis** - Upload Word/PowerPoint files for AI analysis  
- **CRM Data Integration** - AI has complete access to client information
- **Professional Error Handling** - Clear messages when API key is missing
- **Token Usage Tracking** - Real metrics from Claude API
- **Claude Integration** - Optimized for Claude's advanced reasoning capabilities

Just add your Claude API key and the AI assistant will be fully functional!