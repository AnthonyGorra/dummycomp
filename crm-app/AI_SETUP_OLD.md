# 🤖 AI Assistant Setup Guide

Your Link CRM now has a fully functional AI assistant with document analysis capabilities! Follow these simple steps to get it running.

## 📋 Quick Setup (5 minutes)

### 1. Copy Environment Variables
```bash
cp .env.example .env.local
```

### 2. Add Your AI API Keys
Edit `.env.local` and add your API keys:

```bash
# Get your API keys from these providers:

# Claude (Recommended) - https://console.anthropic.com/
ANTHROPIC_API_KEY=sk-ant-api03-your-key-here

# OpenAI - https://platform.openai.com/api-keys  
OPENAI_API_KEY=sk-your-openai-key-here

# Google AI - https://makersuite.google.com/app/apikey
GOOGLE_AI_API_KEY=your-google-ai-key-here

# Local AI (Optional) - http://localhost:1234/v1
LOCAL_AI_ENDPOINT=http://localhost:1234/v1
```

### 3. Start the Application
```bash
npm run dev
```

## 🎯 What Works Right Now

### ✅ AI Providers Supported
- **Claude (Anthropic)** - Best for complex analysis and reasoning
- **ChatGPT (OpenAI)** - Versatile general-purpose AI  
- **Gemini (Google)** - Multimodal AI with good document understanding
- **Local AI** - Self-hosted models (Ollama, LM Studio, etc.)

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

## 🔧 API Key Setup Instructions

### Claude (Anthropic) - Recommended
1. Visit [console.anthropic.com](https://console.anthropic.com/)
2. Sign up/login to your account
3. Navigate to API Keys section
4. Create a new API key
5. Copy the key starting with `sk-ant-api03-`

### OpenAI (ChatGPT)
1. Visit [platform.openai.com](https://platform.openai.com/api-keys)
2. Sign up/login to your account
3. Click "Create new secret key"
4. Copy the key starting with `sk-`

### Google AI (Gemini)
1. Visit [makersuite.google.com](https://makersuite.google.com/app/apikey)
2. Sign up/login with Google account
3. Click "Create API Key"
4. Copy the generated key

### Local AI (Optional)
1. Install [Ollama](https://ollama.ai/) or [LM Studio](https://lmstudio.ai/)
2. Start your local AI server
3. Set `LOCAL_AI_ENDPOINT` to your server URL
4. Default: `http://localhost:1234/v1`

## 🛠️ Troubleshooting

### No AI Providers Available
- Check that at least one API key is set in `.env.local`
- Restart the development server after adding keys
- Verify API keys are valid and have credits

### Document Upload Issues
- Ensure files are under 10MB
- Supported formats: .doc, .docx, .ppt, .pptx, .pdf, .txt, .csv
- Check browser console for specific error messages

### API Errors
- Check API key validity and credit balance
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
- ✅ Client data analysis
- ✅ Document processing and insights
- ✅ Portfolio recommendations  
- ✅ Compliance tracking
- ✅ Business intelligence

Navigate to the AI Assistant in your sidebar and start asking questions!