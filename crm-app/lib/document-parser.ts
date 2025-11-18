import mammoth from 'mammoth'

export interface ParsedDocument {
  content: string
  metadata: {
    fileName: string
    fileType: string
    fileSize: number
    parsedAt: string
  }
}

export class DocumentParser {
  static async parseFile(file: File): Promise<ParsedDocument> {
    const fileType = file.type
    const fileName = file.name
    const fileSize = file.size

    let content = ''

    try {
      if (fileType.includes('word') || fileName.endsWith('.docx') || fileName.endsWith('.doc')) {
        content = await this.parseWordDocument(file)
      } else if (fileType.includes('powerpoint') || fileName.endsWith('.pptx') || fileName.endsWith('.ppt')) {
        content = await this.parsePowerPointDocument(file)
      } else if (fileType.includes('pdf') || fileName.endsWith('.pdf')) {
        content = await this.parsePDFDocument(file)
      } else if (fileType.includes('text') || fileName.endsWith('.txt')) {
        content = await this.parseTextDocument(file)
      } else if (fileType.includes('csv') || fileName.endsWith('.csv')) {
        content = await this.parseCSVDocument(file)
      } else {
        throw new Error(`Unsupported file type: ${fileType}`)
      }

      return {
        content: content.trim(),
        metadata: {
          fileName,
          fileType,
          fileSize,
          parsedAt: new Date().toISOString()
        }
      }
    } catch (error) {
      throw new Error(`Failed to parse document: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  private static async parseWordDocument(file: File): Promise<string> {
    const arrayBuffer = await file.arrayBuffer()
    const result = await mammoth.extractRawText({ arrayBuffer })
    return result.value
  }

  private static async parsePowerPointDocument(file: File): Promise<string> {
    // For PowerPoint files, we'll extract text from slides
    // This is a simplified approach - in production you might want to use a more robust library
    const text = await file.text()
    
    // Try to extract readable text from XML content
    if (file.name.endsWith('.pptx')) {
      // PPTX files are ZIP archives with XML content
      // For now, we'll return a message indicating partial support
      return `PowerPoint file "${file.name}" uploaded. Note: Full PowerPoint parsing requires additional setup. Please convert to PDF or Word format for complete text extraction.`
    }
    
    return text
  }

  private static async parsePDFDocument(file: File): Promise<string> {
    // PDF parsing would require pdf-parse or similar
    // For now, return a placeholder
    return `PDF file "${file.name}" uploaded. Note: PDF text extraction requires additional server-side processing. Please convert to Word format for immediate text analysis.`
  }

  private static async parseTextDocument(file: File): Promise<string> {
    return await file.text()
  }

  private static async parseCSVDocument(file: File): Promise<string> {
    const text = await file.text()
    const lines = text.split('\n')
    const headers = lines[0]
    const dataRows = lines.slice(1, 11) // First 10 rows for analysis
    
    return `CSV Data Analysis:
Headers: ${headers}

Sample Data (first 10 rows):
${dataRows.join('\n')}

Total rows: ${lines.length - 1}`
  }

  static getSupportedFileTypes(): string[] {
    return [
      '.docx',
      '.doc', 
      '.pptx',
      '.ppt',
      '.pdf',
      '.txt',
      '.csv'
    ]
  }

  static isFileTypeSupported(fileName: string): boolean {
    const extension = fileName.toLowerCase().substring(fileName.lastIndexOf('.'))
    return this.getSupportedFileTypes().includes(extension)
  }
}