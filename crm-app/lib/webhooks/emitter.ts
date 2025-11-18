import { WebhookService } from './service'
import { WebhookEventType } from '@/types/webhooks'
import { createClient } from '@/lib/supabase'

export class WebhookEmitter {
  private static instance: WebhookEmitter
  private webhookService: WebhookService

  private constructor() {
    const supabase = createClient()
    this.webhookService = new WebhookService(supabase)
  }

  static getInstance(): WebhookEmitter {
    if (!WebhookEmitter.instance) {
      WebhookEmitter.instance = new WebhookEmitter()
    }
    return WebhookEmitter.instance
  }

  /**
   * Emit a webhook event
   */
  async emit(
    event: WebhookEventType,
    data: Record<string, any>,
    userId?: string
  ): Promise<void> {
    try {
      await this.webhookService.sendWebhook({
        event,
        data,
        user_id: userId
      })
    } catch (error) {
      console.error('Failed to emit webhook:', error)
      // Don't throw error to avoid breaking the main application flow
    }
  }

  /**
   * Emit contact created event
   */
  async emitContactCreated(contact: any, userId?: string): Promise<void> {
    await this.emit('contact.created', {
      id: contact.id,
      first_name: contact.first_name,
      last_name: contact.last_name,
      email: contact.email,
      phone: contact.phone,
      company_id: contact.company_id,
      position: contact.position,
      created_at: contact.created_at || new Date().toISOString()
    }, userId)
  }

  /**
   * Emit contact updated event
   */
  async emitContactUpdated(
    contactId: string,
    changes: Record<string, any>,
    userId?: string
  ): Promise<void> {
    await this.emit('contact.updated', {
      id: contactId,
      changes,
      updated_at: new Date().toISOString()
    }, userId)
  }

  /**
   * Emit contact deleted event
   */
  async emitContactDeleted(contactId: string, userId?: string): Promise<void> {
    await this.emit('contact.deleted', {
      id: contactId,
      deleted_at: new Date().toISOString()
    }, userId)
  }

  /**
   * Emit deal created event
   */
  async emitDealCreated(deal: any, userId?: string): Promise<void> {
    await this.emit('deal.created', {
      id: deal.id,
      title: deal.title,
      value: deal.value,
      stage: deal.stage,
      contact_id: deal.contact_id,
      company_id: deal.company_id,
      close_date: deal.close_date,
      created_at: deal.created_at || new Date().toISOString()
    }, userId)
  }

  /**
   * Emit deal updated event
   */
  async emitDealUpdated(
    dealId: string,
    changes: Record<string, any>,
    userId?: string
  ): Promise<void> {
    await this.emit('deal.updated', {
      id: dealId,
      changes,
      updated_at: new Date().toISOString()
    }, userId)
  }

  /**
   * Emit deal stage changed event
   */
  async emitDealStageChanged(
    dealId: string,
    previousStage: string,
    newStage: string,
    userId?: string
  ): Promise<void> {
    await this.emit('deal.stage_changed', {
      id: dealId,
      previous_stage: previousStage,
      new_stage: newStage,
      changed_at: new Date().toISOString()
    }, userId)
  }

  /**
   * Emit company created event
   */
  async emitCompanyCreated(company: any, userId?: string): Promise<void> {
    await this.emit('company.created', {
      id: company.id,
      name: company.name,
      industry: company.industry,
      website: company.website,
      phone: company.phone,
      address: company.address,
      created_at: company.created_at || new Date().toISOString()
    }, userId)
  }

  /**
   * Emit company updated event
   */
  async emitCompanyUpdated(
    companyId: string,
    changes: Record<string, any>,
    userId?: string
  ): Promise<void> {
    await this.emit('company.updated', {
      id: companyId,
      changes,
      updated_at: new Date().toISOString()
    }, userId)
  }

  /**
   * Emit note created event
   */
  async emitNoteCreated(note: any, userId?: string): Promise<void> {
    await this.emit('note.created', {
      id: note.id,
      title: note.title,
      content: note.content,
      contact_id: note.contact_id,
      company_id: note.company_id,
      deal_id: note.deal_id,
      created_at: note.created_at || new Date().toISOString()
    }, userId)
  }

  /**
   * Emit file uploaded event
   */
  async emitFileUploaded(file: any, userId?: string): Promise<void> {
    await this.emit('file.uploaded', {
      id: file.id,
      filename: file.filename,
      file_size: file.file_size,
      mime_type: file.mime_type,
      contact_id: file.contact_id,
      company_id: file.company_id,
      deal_id: file.deal_id,
      uploaded_at: file.uploaded_at || new Date().toISOString()
    }, userId)
  }

  /**
   * Emit activity logged event
   */
  async emitActivityLogged(activity: any, userId?: string): Promise<void> {
    await this.emit('activity.logged', {
      id: activity.id,
      type: activity.type,
      title: activity.title,
      description: activity.description,
      contact_id: activity.contact_id,
      company_id: activity.company_id,
      deal_id: activity.deal_id,
      created_at: activity.created_at || new Date().toISOString()
    }, userId)
  }
}

// Export singleton instance
export const webhookEmitter = WebhookEmitter.getInstance()