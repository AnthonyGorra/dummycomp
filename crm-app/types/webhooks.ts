export type WebhookEventType = 
  | 'contact.created'
  | 'contact.updated'
  | 'contact.deleted'
  | 'deal.created'
  | 'deal.updated'
  | 'deal.stage_changed'
  | 'company.created'
  | 'company.updated'
  | 'note.created'
  | 'file.uploaded'
  | 'activity.logged'

export type WebhookStatus = 'pending' | 'delivered' | 'failed' | 'retrying'

export interface WebhookEvent {
  id: string
  event: WebhookEventType
  data: Record<string, any>
  timestamp: string
  user_id?: string
}

export interface WebhookPayload {
  event: WebhookEventType
  data: Record<string, any>
  timestamp: string
  signature: string
  user_id?: string
}

export interface WebhookLog {
  id: string
  event_type: WebhookEventType
  payload: Record<string, any>
  status: WebhookStatus
  attempts: number
  response_status?: number
  response_body?: string
  error_message?: string
  created_at: string
  updated_at: string
  next_retry_at?: string
}

export interface WebhookSubscription {
  id: string
  event_type: WebhookEventType
  url: string
  is_active: boolean
  created_at: string
  updated_at: string
  user_id: string
}

export interface WebhookConfig {
  enabled: boolean
  url: string
  apiKey: string
  secret: string
  retryAttempts: number
  retryDelay: number
  enabledEvents: WebhookEventType[]
}

export interface WebhookTestPayload {
  test: true
  message: string
  timestamp: string
}

export interface WebhookDeliveryAttempt {
  attempt: number
  timestamp: string
  status: number
  response?: string
  error?: string
}

export interface WebhookStats {
  totalEvents: number
  successfulDeliveries: number
  failedDeliveries: number
  pendingDeliveries: number
  averageResponseTime: number
  lastDelivery?: string
}

// Event-specific payload types
export interface ContactCreatedPayload {
  id: string
  first_name: string
  last_name: string
  email: string
  phone?: string
  company_id?: string
  position?: string
  created_at: string
}

export interface ContactUpdatedPayload {
  id: string
  changes: Partial<ContactCreatedPayload>
  updated_at: string
}

export interface ContactDeletedPayload {
  id: string
  deleted_at: string
}

export interface DealCreatedPayload {
  id: string
  title: string
  value: number
  stage: string
  contact_id?: string
  company_id?: string
  close_date?: string
  created_at: string
}

export interface DealUpdatedPayload {
  id: string
  changes: Partial<DealCreatedPayload>
  updated_at: string
}

export interface DealStageChangedPayload {
  id: string
  previous_stage: string
  new_stage: string
  changed_at: string
}

export interface CompanyCreatedPayload {
  id: string
  name: string
  industry?: string
  website?: string
  phone?: string
  address?: string
  created_at: string
}

export interface CompanyUpdatedPayload {
  id: string
  changes: Partial<CompanyCreatedPayload>
  updated_at: string
}

export interface NoteCreatedPayload {
  id: string
  title: string
  content: string
  contact_id?: string
  company_id?: string
  deal_id?: string
  created_at: string
}

export interface FileUploadedPayload {
  id: string
  filename: string
  file_size: number
  mime_type: string
  contact_id?: string
  company_id?: string
  deal_id?: string
  uploaded_at: string
}

export interface ActivityLoggedPayload {
  id: string
  type: 'email' | 'call' | 'meeting' | 'note'
  title: string
  description?: string
  contact_id?: string
  company_id?: string
  deal_id?: string
  created_at: string
}