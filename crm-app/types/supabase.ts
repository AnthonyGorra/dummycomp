export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      contacts: {
        Row: {
          id: string
          created_at: string
          updated_at: string
          user_id: string
          first_name: string
          last_name: string
          email: string
          phone: string | null
          company_id: string | null
          position: string | null
          notes: string | null
        }
        Insert: {
          id?: string
          created_at?: string
          updated_at?: string
          user_id: string
          first_name: string
          last_name: string
          email: string
          phone?: string | null
          company_id?: string | null
          position?: string | null
          notes?: string | null
        }
        Update: {
          id?: string
          created_at?: string
          updated_at?: string
          user_id?: string
          first_name?: string
          last_name?: string
          email?: string
          phone?: string | null
          company_id?: string | null
          position?: string | null
          notes?: string | null
        }
      }
      companies: {
        Row: {
          id: string
          created_at: string
          updated_at: string
          user_id: string
          name: string
          industry: string | null
          website: string | null
          phone: string | null
          address: string | null
          notes: string | null
        }
        Insert: {
          id?: string
          created_at?: string
          updated_at?: string
          user_id: string
          name: string
          industry?: string | null
          website?: string | null
          phone?: string | null
          address?: string | null
          notes?: string | null
        }
        Update: {
          id?: string
          created_at?: string
          updated_at?: string
          user_id?: string
          name?: string
          industry?: string | null
          website?: string | null
          phone?: string | null
          address?: string | null
          notes?: string | null
        }
      }
      deals: {
        Row: {
          id: string
          created_at: string
          updated_at: string
          user_id: string
          title: string
          value: number
          stage: 'lead' | 'qualified' | 'proposal' | 'negotiation' | 'closed-won' | 'closed-lost'
          contact_id: string | null
          company_id: string | null
          close_date: string | null
          notes: string | null
        }
        Insert: {
          id?: string
          created_at?: string
          updated_at?: string
          user_id: string
          title: string
          value: number
          stage: 'lead' | 'qualified' | 'proposal' | 'negotiation' | 'closed-won' | 'closed-lost'
          contact_id?: string | null
          company_id?: string | null
          close_date?: string | null
          notes?: string | null
        }
        Update: {
          id?: string
          created_at?: string
          updated_at?: string
          user_id?: string
          title?: string
          value?: number
          stage?: 'lead' | 'qualified' | 'proposal' | 'negotiation' | 'closed-won' | 'closed-lost'
          contact_id?: string | null
          company_id?: string | null
          close_date?: string | null
          notes?: string | null
        }
      }
      activities: {
        Row: {
          id: string
          created_at: string
          user_id: string
          type: 'email' | 'call' | 'meeting' | 'note'
          title: string
          description: string | null
          contact_id: string | null
          company_id: string | null
          deal_id: string | null
        }
        Insert: {
          id?: string
          created_at?: string
          user_id: string
          type: 'email' | 'call' | 'meeting' | 'note'
          title: string
          description?: string | null
          contact_id?: string | null
          company_id?: string | null
          deal_id?: string | null
        }
        Update: {
          id?: string
          created_at?: string
          user_id?: string
          type?: 'email' | 'call' | 'meeting' | 'note'
          title?: string
          description?: string | null
          contact_id?: string | null
          company_id?: string | null
          deal_id?: string | null
        }
      }
    }
  }
}