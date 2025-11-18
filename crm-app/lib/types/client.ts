export interface Client {
  id: string
  created_at: string
  updated_at: string
  user_id: string
  first_name: string
  last_name: string
  email: string
  phone?: string
  date_of_birth?: string
  street_address?: string
  city?: string
  state?: string
  postcode?: string
  portfolio_value?: number
  risk_profile?: 'Conservative' | 'Balanced' | 'Growth'
  client_since?: string
  investment_goal?: string
  assigned_adviser?: string
  review_frequency?: 'Quarterly' | 'Semi-annually' | 'Annually'
  next_review_date?: string
  notes?: string
}

export interface CreateClientData {
  first_name: string
  last_name: string
  email: string
  phone?: string
  date_of_birth?: string
  street_address?: string
  city?: string
  state?: string
  postcode?: string
  portfolio_value?: number
  risk_profile?: 'Conservative' | 'Balanced' | 'Growth'
  client_since?: string
  investment_goal?: string
  assigned_adviser?: string
  review_frequency?: 'Quarterly' | 'Semi-annually' | 'Annually'
  next_review_date?: string
  notes?: string
}

export interface UpdateClientData extends Partial<CreateClientData> {}

export interface ClientFilters {
  risk_profile?: 'Conservative' | 'Balanced' | 'Growth'
  assigned_adviser?: string
  review_frequency?: 'Quarterly' | 'Semi-annually' | 'Annually'
  search?: string
}

export interface ClientStats {
  total_clients: number
  total_portfolio_value: number
  avg_portfolio_value: number
  risk_profile_breakdown: {
    Conservative: number
    Balanced: number
    Growth: number
  }
  adviser_breakdown: Record<string, number>
}

export const RISK_PROFILES = ['Conservative', 'Balanced', 'Growth'] as const
export const REVIEW_FREQUENCIES = ['Quarterly', 'Semi-annually', 'Annually'] as const