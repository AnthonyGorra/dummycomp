'use client'

import { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { 
  ArrowLeft, 
  Upload, 
  Download, 
  FileText, 
  Trash2,
  Calendar,
  User,
  Eye,
  ClipboardList,
  TrendingUp,
  Shield,
  PieChart,
  ChevronDown,
  ChevronRight,
  Folder,
  FolderOpen
} from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Badge } from '@/components/ui/badge'
import Link from 'next/link'
import { useToast } from '@/hooks/use-toast'

interface ClientDocument {
  id: string
  clientId: string
  fileName: string
  originalName: string
  fileType: string
  fileSize: number
  uploadDate: string
  uploadedBy: string
  category: 'SOA' | 'Report' | 'Compliance' | 'Other'
  folder: string
  description?: string
  fileData?: string // Base64 encoded file data for local storage
}

interface DocumentFolder {
  id: string
  name: string
  description: string
  icon: string
  color: string
}

const PREDEFINED_FOLDERS: DocumentFolder[] = [
  {
    id: 'advice-documents',
    name: 'Advice Documents',
    description: 'Statements of Advice, recommendations, and advisory documents',
    icon: 'FileText',
    color: 'bg-blue-100 text-blue-800'
  },
  {
    id: 'fact-find',
    name: 'Fact Find',
    description: 'Client fact finding documents and questionnaires',
    icon: 'ClipboardList',
    color: 'bg-green-100 text-green-800'
  },
  {
    id: 'risk-profile',
    name: 'Risk Profile',
    description: 'Risk assessment documents and profile analysis',
    icon: 'TrendingUp',
    color: 'bg-orange-100 text-orange-800'
  },
  {
    id: 'compliance-regulatory',
    name: 'Compliance & Regulatory',
    description: 'Compliance documents, regulatory filings, and audit materials',
    icon: 'Shield',
    color: 'bg-red-100 text-red-800'
  },
  {
    id: 'portfolio-reports',
    name: 'Portfolio Reports',
    description: 'Investment reports, performance analysis, and portfolio statements',
    icon: 'PieChart',
    color: 'bg-purple-100 text-purple-800'
  }
]

const mockDocuments: ClientDocument[] = [
  {
    id: '1',
    clientId: '1',
    fileName: 'soa_2024_q1.docx',
    originalName: 'Statement of Advice Q1 2024.docx',
    fileType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    fileSize: 245760,
    uploadDate: '2024-01-15T10:30:00Z',
    uploadedBy: 'John Smith',
    category: 'SOA',
    folder: 'advice-documents',
    description: 'Quarterly Statement of Advice for portfolio review'
  },
  {
    id: '2',
    clientId: '1',
    fileName: 'annual_report_2023.docx',
    originalName: 'Annual Portfolio Report 2023.docx',
    fileType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    fileSize: 512000,
    uploadDate: '2024-01-10T14:20:00Z',
    uploadedBy: 'Sarah Johnson',
    category: 'Report',
    folder: 'portfolio-reports',
    description: 'Annual portfolio performance report'
  }
]

export default function ClientDocumentsPage() {
  const params = useParams()
  const { toast } = useToast()
  const [documents, setDocuments] = useState<ClientDocument[]>([])
  const [isUploadDialogOpen, setIsUploadDialogOpen] = useState(false)
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)
  const [documentToDelete, setDocumentToDelete] = useState<ClientDocument | null>(null)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set(['advice-documents']))
  const [uploadForm, setUploadForm] = useState({
    category: 'Other' as ClientDocument['category'],
    folder: 'advice-documents',
    description: ''
  })

  // Load documents from localStorage on component mount
  useEffect(() => {
    const loadDocuments = () => {
      try {
        const clientId = params.id as string
        const storedDocs = localStorage.getItem(`client_documents_${clientId}`)
        if (storedDocs) {
          const parsedDocs = JSON.parse(storedDocs)
          setDocuments(parsedDocs)
        } else {
          // Load mock documents for demo
          setDocuments(mockDocuments)
        }
      } catch (error) {
        console.error('Error loading documents:', error)
        setDocuments(mockDocuments)
      }
    }
    loadDocuments()
  }, [params.id])

  // Save documents to localStorage whenever documents change
  useEffect(() => {
    if (documents.length > 0) {
      const clientId = params.id as string
      localStorage.setItem(`client_documents_${clientId}`, JSON.stringify(documents))
    }
  }, [documents, params.id])

  const toggleFolder = (folderId: string) => {
    const newExpanded = new Set(expandedFolders)
    if (newExpanded.has(folderId)) {
      newExpanded.delete(folderId)
    } else {
      newExpanded.add(folderId)
    }
    setExpandedFolders(newExpanded)
  }

  const getDocumentsByFolder = (folderId: string) => {
    return documents.filter(doc => doc.folder === folderId)
  }

  const getFolderIcon = (iconName: string) => {
    const icons = {
      FileText,
      ClipboardList,
      TrendingUp,
      Shield,
      PieChart
    }
    return icons[iconName as keyof typeof icons] || FileText
  }

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-AU', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'SOA': return 'bg-blue-100 text-blue-800'
      case 'Report': return 'bg-green-100 text-green-800'
      case 'Compliance': return 'bg-orange-100 text-orange-800'
      case 'Other': return 'bg-gray-100 text-gray-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (file) {
      // Check if it's a Word document
      const allowedTypes = [
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document', // .docx
        'application/msword' // .doc
      ]
      
      if (!allowedTypes.includes(file.type)) {
        toast({
          title: 'Invalid file type',
          description: 'Please select a Word document (.doc or .docx)',
          variant: 'destructive',
        })
        return
      }

      if (file.size > 10 * 1024 * 1024) { // 10MB limit
        toast({
          title: 'File too large',
          description: 'Please select a file smaller than 10MB',
          variant: 'destructive',
        })
        return
      }

      setSelectedFile(file)
    }
  }

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!selectedFile) {
      toast({
        title: 'No file selected',
        description: 'Please select a file to upload',
        variant: 'destructive',
      })
      return
    }

    try {
      // Convert file to base64 for storage
      const fileData = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader()
        reader.onload = () => resolve(reader.result as string)
        reader.onerror = reject
        reader.readAsDataURL(selectedFile)
      })

      const newDocument: ClientDocument = {
        id: Date.now().toString(),
        clientId: params.id as string,
        fileName: `${Date.now()}_${selectedFile.name}`,
        originalName: selectedFile.name,
        fileType: selectedFile.type,
        fileSize: selectedFile.size,
        uploadDate: new Date().toISOString(),
        uploadedBy: 'Current User', // Would get from auth context
        category: uploadForm.category,
        folder: uploadForm.folder,
        description: uploadForm.description,
        fileData: fileData
      }

      setDocuments([newDocument, ...documents])
      setIsUploadDialogOpen(false)
      setSelectedFile(null)
      setUploadForm({ category: 'Other', folder: 'advice-documents', description: '' })

      toast({
        title: 'Success',
        description: 'Document uploaded successfully',
      })
    } catch (error) {
      toast({
        title: 'Upload failed',
        description: 'Failed to upload document. Please try again.',
        variant: 'destructive',
      })
    }
  }

  const handleDownload = async (document: ClientDocument) => {
    try {
      if (!document.fileData) {
        toast({
          title: 'Download failed',
          description: 'File data not available. This may be a legacy document.',
          variant: 'destructive',
        })
        return
      }

      // Create a blob from the base64 data
      const byteCharacters = atob(document.fileData.split(',')[1])
      const byteNumbers = new Array(byteCharacters.length)
      for (let i = 0; i < byteCharacters.length; i++) {
        byteNumbers[i] = byteCharacters.charCodeAt(i)
      }
      const byteArray = new Uint8Array(byteNumbers)
      const blob = new Blob([byteArray], { type: document.fileType })

      // Create download link
      const url = window.URL.createObjectURL(blob)
      const link = window.document.createElement('a')
      link.href = url
      link.download = document.originalName
      window.document.body.appendChild(link)
      link.click()
      window.document.body.removeChild(link)
      window.URL.revokeObjectURL(url)

      toast({
        title: 'Download started',
        description: `Downloading ${document.originalName}`,
      })
    } catch (error) {
      console.error('Download error:', error)
      toast({
        title: 'Download failed',
        description: 'Failed to download document. Please try again.',
        variant: 'destructive',
      })
    }
  }

  const handleDeleteClick = (document: ClientDocument) => {
    setDocumentToDelete(document)
    setIsDeleteDialogOpen(true)
  }

  const handleConfirmDelete = async () => {
    if (!documentToDelete) return

    try {
      const updatedDocuments = documents.filter(doc => doc.id !== documentToDelete.id)
      setDocuments(updatedDocuments)
      
      // Update localStorage immediately
      const clientId = params.id as string
      localStorage.setItem(`client_documents_${clientId}`, JSON.stringify(updatedDocuments))
      
      setIsDeleteDialogOpen(false)
      setDocumentToDelete(null)
      
      toast({
        title: 'Document deleted',
        description: 'Document has been removed successfully',
      })
    } catch (error) {
      toast({
        title: 'Delete failed',
        description: 'Failed to delete document. Please try again.',
        variant: 'destructive',
      })
    }
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
            <h1 className="text-3xl font-semibold text-black">Client Documents</h1>
            <p className="text-muted-foreground mt-1">Manage client files and documents</p>
          </div>
        </div>
        <Button 
          onClick={() => setIsUploadDialogOpen(true)}
          className="bg-coral hover:bg-coral-dark"
        >
          <Upload className="h-4 w-4 mr-2" />
          Upload Document
        </Button>
      </div>

      {/* Folders Structure */}
      <div className="space-y-4">
        {PREDEFINED_FOLDERS.map((folder) => {
          const folderDocuments = getDocumentsByFolder(folder.id)
          const isExpanded = expandedFolders.has(folder.id)
          const FolderIcon = getFolderIcon(folder.icon)

          return (
            <Card key={folder.id} className="border-cream-dark">
              <CardHeader 
                className="cursor-pointer hover:bg-cream-light transition-colors"
                onClick={() => toggleFolder(folder.id)}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="flex items-center gap-2">
                      {isExpanded ? (
                        <ChevronDown className="h-4 w-4 text-gray-500" />
                      ) : (
                        <ChevronRight className="h-4 w-4 text-gray-500" />
                      )}
                      {isExpanded ? (
                        <FolderOpen className="h-5 w-5 text-coral" />
                      ) : (
                        <Folder className="h-5 w-5 text-coral" />
                      )}
                    </div>
                    <div>
                      <CardTitle className="text-lg font-medium text-black">
                        {folder.name}
                      </CardTitle>
                      <CardDescription className="text-sm text-gray-600 mt-1">
                        {folder.description}
                      </CardDescription>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <Badge variant="outline" className="text-xs">
                      {folderDocuments.length} {folderDocuments.length === 1 ? 'document' : 'documents'}
                    </Badge>
                    <FolderIcon className="h-5 w-5 text-gray-400" />
                  </div>
                </div>
              </CardHeader>

              {isExpanded && (
                <CardContent className="pt-0">
                  {folderDocuments.length === 0 ? (
                    <div className="text-center py-8 text-gray-500">
                      <FolderIcon className="h-8 w-8 mx-auto mb-2 text-gray-300" />
                      <p className="text-sm">No documents in this folder</p>
                      <Button 
                        variant="outline" 
                        size="sm" 
                        className="mt-2"
                        onClick={(e) => {
                          e.stopPropagation()
                          setUploadForm({ ...uploadForm, folder: folder.id })
                          setIsUploadDialogOpen(true)
                        }}
                      >
                        <Upload className="h-3 w-3 mr-1" />
                        Add Document
                      </Button>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {folderDocuments.map((document) => (
                        <div key={document.id} className="flex items-start justify-between p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                          <div className="flex items-start gap-3">
                            <FileText className="h-6 w-6 text-coral flex-shrink-0 mt-0.5" />
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-1">
                                <h4 className="font-medium text-black text-sm truncate">
                                  {document.originalName}
                                </h4>
                                <Badge className={`text-xs ${getCategoryColor(document.category)}`}>
                                  {document.category}
                                </Badge>
                              </div>
                              {document.description && (
                                <p className="text-xs text-gray-600 mb-2">
                                  {document.description}
                                </p>
                              )}
                              <div className="flex items-center gap-3 text-xs text-gray-500">
                                <div className="flex items-center gap-1">
                                  <Calendar className="h-3 w-3" />
                                  {formatDate(document.uploadDate)}
                                </div>
                                <div className="flex items-center gap-1">
                                  <User className="h-3 w-3" />
                                  {document.uploadedBy}
                                </div>
                                <span>{formatFileSize(document.fileSize)}</span>
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleDownload(document)}
                            >
                              <Download className="h-3 w-3 mr-1" />
                              Download
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleDeleteClick(document)}
                              className="text-red-600 hover:text-red-700"
                            >
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              )}
            </Card>
          )
        })}
      </div>

      {/* Upload Dialog */}
      <Dialog open={isUploadDialogOpen} onOpenChange={setIsUploadDialogOpen}>
        <DialogContent className="sm:max-w-[500px] bg-white">
          <DialogHeader>
            <DialogTitle>Upload Document</DialogTitle>
            <DialogDescription>
              Upload a Word document for this client. Accepted formats: .doc, .docx
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleUpload}>
            <div className="grid gap-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="file">Select File</Label>
                <Input
                  id="file"
                  type="file"
                  accept=".doc,.docx,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                  onChange={handleFileSelect}
                  className="bg-cream-light border-cream-dark"
                />
                {selectedFile && (
                  <p className="text-sm text-gray-600">
                    Selected: {selectedFile.name} ({formatFileSize(selectedFile.size)})
                  </p>
                )}
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="folder">Folder</Label>
                <select
                  id="folder"
                  value={uploadForm.folder}
                  onChange={(e) => setUploadForm({ ...uploadForm, folder: e.target.value })}
                  className="w-full p-2 border border-cream-dark rounded-md bg-cream-light"
                >
                  {PREDEFINED_FOLDERS.map((folder) => (
                    <option key={folder.id} value={folder.id}>
                      {folder.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="category">Category</Label>
                <select
                  id="category"
                  value={uploadForm.category}
                  onChange={(e) => setUploadForm({ ...uploadForm, category: e.target.value as ClientDocument['category'] })}
                  className="w-full p-2 border border-cream-dark rounded-md bg-cream-light"
                >
                  <option value="SOA">Statement of Advice</option>
                  <option value="Report">Report</option>
                  <option value="Compliance">Compliance</option>
                  <option value="Other">Other</option>
                </select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Description (Optional)</Label>
                <Input
                  id="description"
                  value={uploadForm.description}
                  onChange={(e) => setUploadForm({ ...uploadForm, description: e.target.value })}
                  placeholder="Brief description of the document"
                  className="bg-cream-light border-cream-dark"
                />
              </div>
            </div>
            <DialogFooter>
              <Button type="submit" className="bg-coral hover:bg-coral-dark">
                <Upload className="h-4 w-4 mr-2" />
                Upload Document
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent className="sm:max-w-[400px] bg-white">
          <DialogHeader>
            <DialogTitle>Delete Document</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this document? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          {documentToDelete && (
            <div className="py-4">
              <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                <FileText className="h-8 w-8 text-coral flex-shrink-0" />
                <div className="min-w-0 flex-1">
                  <p className="font-medium text-sm truncate">
                    {documentToDelete.originalName}
                  </p>
                  <p className="text-xs text-gray-500">
                    {formatFileSize(documentToDelete.fileSize)} • {documentToDelete.category}
                  </p>
                </div>
              </div>
            </div>
          )}
          <DialogFooter className="gap-2">
            <Button 
              variant="outline" 
              onClick={() => setIsDeleteDialogOpen(false)}
            >
              Cancel
            </Button>
            <Button 
              variant="destructive" 
              onClick={handleConfirmDelete}
              className="bg-red-600 hover:bg-red-700"
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Delete Document
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}