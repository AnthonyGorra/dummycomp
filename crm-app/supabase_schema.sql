-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create companies table
CREATE TABLE companies (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()) NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  name VARCHAR(255) NOT NULL,
  industry VARCHAR(100),
  website VARCHAR(255),
  phone VARCHAR(50),
  address TEXT,
  notes TEXT
);

-- Create contacts table
CREATE TABLE contacts (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()) NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  first_name VARCHAR(100) NOT NULL,
  last_name VARCHAR(100) NOT NULL,
  email VARCHAR(255) NOT NULL,
  phone VARCHAR(50),
  company_id UUID REFERENCES companies(id) ON DELETE SET NULL,
  position VARCHAR(100),
  notes TEXT
);

-- Create households table for family groupings
CREATE TABLE households (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()) NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  household_name VARCHAR(255) NOT NULL,
  primary_contact_id UUID, -- Will reference clients table
  household_type VARCHAR(50) CHECK (household_type IN ('Individual', 'Couple', 'Family', 'Business', 'Trust', 'SMSF')) NOT NULL,
  total_portfolio_value DECIMAL(15, 2),
  risk_profile VARCHAR(20) CHECK (risk_profile IN ('Conservative', 'Balanced', 'Growth', 'Aggressive')),
  notes TEXT
);

-- Create entities table for legal structures (trusts, companies, SMSFs)
CREATE TABLE entities (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW') NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW') NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  household_id UUID REFERENCES households(id) ON DELETE CASCADE,
  entity_name VARCHAR(255) NOT NULL,
  entity_type VARCHAR(50) CHECK (entity_type IN ('Individual', 'Company', 'Trust', 'SMSF', 'Partnership')) NOT NULL,
  abn VARCHAR(20),
  acn VARCHAR(20),
  tfn VARCHAR(20),
  registration_date DATE,
  address TEXT,
  trustee_details JSONB, -- For trusts and SMSFs
  directors JSONB, -- For companies
  beneficiaries JSONB, -- For trusts
  notes TEXT
);

-- Enhanced clients table for detailed financial client information
CREATE TABLE clients (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW') NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  household_id UUID REFERENCES households(id) ON DELETE SET NULL,
  entity_id UUID REFERENCES entities(id) ON DELETE SET NULL,
  
  -- Personal Details
  title VARCHAR(20),
  first_name VARCHAR(100) NOT NULL,
  middle_name VARCHAR(100),
  last_name VARCHAR(100) NOT NULL,
  preferred_name VARCHAR(100),
  email VARCHAR(255) NOT NULL,
  phone VARCHAR(50),
  mobile VARCHAR(50),
  date_of_birth DATE,
  gender VARCHAR(20) CHECK (gender IN ('Male', 'Female', 'Other', 'Prefer not to say')),
  marital_status VARCHAR(30) CHECK (marital_status IN ('Single', 'Married', 'De facto', 'Divorced', 'Widowed', 'Separated')),
  
  -- Address Details
  residential_address TEXT,
  postal_address TEXT,
  city VARCHAR(100),
  state VARCHAR(50),
  postcode VARCHAR(20),
  country VARCHAR(100) DEFAULT 'Australia',
  
  -- Financial Details
  portfolio_value DECIMAL(15, 2),
  annual_income DECIMAL(12, 2),
  net_worth DECIMAL(15, 2),
  
  -- Risk and Goals
  risk_profile VARCHAR(20) CHECK (risk_profile IN ('Conservative', 'Balanced', 'Growth', 'Aggressive')),
  risk_capacity VARCHAR(20) CHECK (risk_capacity IN ('Low', 'Medium', 'High')),
  investment_timeframe VARCHAR(50),
  investment_goals TEXT,
  
  -- Professional Details
  occupation VARCHAR(100),
  employer VARCHAR(200),
  industry VARCHAR(100),
  
  -- Adviser Relationship
  client_since DATE,
  client_status VARCHAR(30) CHECK (client_status IN ('Prospect', 'Active', 'Inactive', 'Former')) DEFAULT 'Active',
  assigned_adviser VARCHAR(100),
  servicing_adviser VARCHAR(100),
  client_type VARCHAR(50) CHECK (client_type IN ('Individual', 'Joint', 'Corporate', 'Trust', 'SMSF')),
  fee_structure VARCHAR(50),
  annual_fee DECIMAL(10, 2),
  
  -- Review and Communication
  review_frequency VARCHAR(20) CHECK (review_frequency IN ('Monthly', 'Quarterly', 'Semi-annually', 'Annually', 'As needed')),
  last_review_date DATE,
  next_review_date DATE,
  preferred_contact_method VARCHAR(30) CHECK (preferred_contact_method IN ('Email', 'Phone', 'SMS', 'Post', 'In person')),
  communication_preferences JSONB,
  
  -- Compliance and Documentation
  kyc_completed BOOLEAN DEFAULT false,
  kyc_completed_date DATE,
  aml_risk_rating VARCHAR(20) CHECK (aml_risk_rating IN ('Low', 'Medium', 'High')),
  source_of_funds TEXT,
  
  -- Additional Information
  dependents JSONB, -- Array of dependent information
  medical_conditions TEXT, -- For insurance purposes
  smoking_status VARCHAR(20) CHECK (smoking_status IN ('Never', 'Former', 'Current')),
  referral_source VARCHAR(200),
  notes TEXT,
  tags JSONB, -- Array of tags for categorization
  
  -- Metadata
  is_archived BOOLEAN DEFAULT false,
  archived_date DATE,
  archived_reason TEXT
);

-- Australian Compliance Tables

-- Financial Services Guide and Fee Disclosure Statements
CREATE TABLE compliance_documents (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()) NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  client_id UUID REFERENCES clients(id) ON DELETE CASCADE NOT NULL,
  document_type VARCHAR(50) CHECK (document_type IN ('FSG', 'FDS', 'SOA', 'ROA', 'Privacy_Policy', 'Terms_Conditions')) NOT NULL,
  document_version VARCHAR(20),
  issued_date DATE NOT NULL,
  delivery_method VARCHAR(30) CHECK (delivery_method IN ('Email', 'Post', 'Hand_delivered', 'Client_portal')),
  acknowledgment_received BOOLEAN DEFAULT false,
  acknowledgment_date DATE,
  expiry_date DATE,
  document_url TEXT,
  notes TEXT
);

-- Client consent and opt-in tracking
CREATE TABLE client_consents (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW') NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  client_id UUID REFERENCES clients(id) ON DELETE CASCADE NOT NULL,
  consent_type VARCHAR(50) CHECK (consent_type IN ('Ongoing_advice', 'Limited_advice', 'Product_recommendation', 'Portfolio_management', 'Insurance_advice')) NOT NULL,
  consent_given BOOLEAN NOT NULL DEFAULT false,
  consent_date DATE,
  consent_method VARCHAR(30) CHECK (consent_method IN ('Verbal', 'Written', 'Electronic', 'Recorded_call')),
  renewal_date DATE, -- For ongoing fee arrangements (3-year rule)
  withdrawal_date DATE,
  notes TEXT
);

-- Risk profiling questionnaires and results
CREATE TABLE risk_profiles (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW') NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  client_id UUID REFERENCES clients(id) ON DELETE CASCADE NOT NULL,
  questionnaire_type VARCHAR(50) CHECK (questionnaire_type IN ('FinaMetrica', 'Risk_Questionnaire', 'Goals_Assessment', 'Needs_Analysis')) NOT NULL,
  completion_date DATE NOT NULL,
  risk_score INTEGER,
  risk_category VARCHAR(20) CHECK (risk_category IN ('Conservative', 'Balanced', 'Growth', 'Aggressive')),
  questionnaire_responses JSONB, -- Store all Q&A responses
  risk_capacity VARCHAR(20) CHECK (risk_capacity IN ('Low', 'Medium', 'High')),
  investment_timeframe VARCHAR(50),
  liquidity_needs TEXT,
  adviser_override_reason TEXT,
  next_review_date DATE,
  is_current BOOLEAN DEFAULT true
);

-- Portfolio and Investment Tables

-- Investment accounts (platform accounts, direct shares, etc.)
CREATE TABLE investment_accounts (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW') NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  client_id UUID REFERENCES clients(id) ON DELETE CASCADE,
  entity_id UUID REFERENCES entities(id) ON DELETE CASCADE,
  
  account_name VARCHAR(255) NOT NULL,
  account_number VARCHAR(100),
  platform VARCHAR(100) CHECK (platform IN ('HUB24', 'Netwealth', 'Praemium', 'IOOF', 'BT_Wrap', 'Colonial_First_State', 'Direct_Equities', 'Term_Deposit', 'Other')),
  account_type VARCHAR(50) CHECK (account_type IN ('Investment', 'Superannuation', 'Pension', 'Cash', 'Property', 'Business', 'Insurance')),
  tax_structure VARCHAR(50) CHECK (tax_structure IN ('Taxable', 'Super_Accumulation', 'Super_Pension', 'Tax_Free')),
  
  current_value DECIMAL(15, 2),
  available_balance DECIMAL(15, 2),
  last_valuation_date DATE,
  
  -- Platform integration
  platform_account_id VARCHAR(255), -- External platform account ID
  api_integration_active BOOLEAN DEFAULT false,
  last_sync_date TIMESTAMP WITH TIME ZONE,
  
  -- Account details
  account_holder VARCHAR(255),
  joint_holder VARCHAR(255),
  beneficiaries JSONB,
  
  is_active BOOLEAN DEFAULT true,
  notes TEXT
);

-- Holdings within investment accounts
CREATE TABLE holdings (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW') NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  account_id UUID REFERENCES investment_accounts(id) ON DELETE CASCADE NOT NULL,
  
  -- Security details
  security_code VARCHAR(20), -- ASX code, APIR code, etc.
  security_name VARCHAR(255) NOT NULL,
  asset_class VARCHAR(50) CHECK (asset_class IN ('Australian_Equities', 'International_Equities', 'Fixed_Income', 'Property', 'Cash', 'Alternatives', 'Commodities')),
  sector VARCHAR(100),
  
  -- Position details
  units DECIMAL(15, 6),
  unit_price DECIMAL(15, 6),
  market_value DECIMAL(15, 2),
  book_cost DECIMAL(15, 2),
  unrealized_gain_loss DECIMAL(15, 2),
  
  -- Dates
  purchase_date DATE,
  last_price_update TIMESTAMP WITH TIME ZONE,
  
  -- Additional details
  distribution_frequency VARCHAR(20) CHECK (distribution_frequency IN ('Monthly', 'Quarterly', 'Semi-annually', 'Annually', 'None')),
  franking_percentage DECIMAL(5, 2), -- For Australian dividends
  notes TEXT
);

-- Transactions (buys, sells, distributions, fees)
CREATE TABLE transactions (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW') NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  account_id UUID REFERENCES investment_accounts(id) ON DELETE CASCADE NOT NULL,
  holding_id UUID REFERENCES holdings(id) ON DELETE SET NULL,
  
  transaction_date DATE NOT NULL,
  transaction_type VARCHAR(50) CHECK (transaction_type IN ('Buy', 'Sell', 'Distribution', 'Dividend', 'Interest', 'Fee', 'Contribution', 'Withdrawal', 'Transfer_In', 'Transfer_Out', 'Bonus_Issue', 'DRP')) NOT NULL,
  
  -- Transaction details
  security_code VARCHAR(20),
  security_name VARCHAR(255),
  units DECIMAL(15, 6),
  price DECIMAL(15, 6),
  gross_amount DECIMAL(15, 2),
  fees DECIMAL(15, 2),
  tax DECIMAL(15, 2),
  net_amount DECIMAL(15, 2),
  
  -- Tax details for Australian investments
  franking_credits DECIMAL(15, 2),
  cgt_discount_eligible BOOLEAN DEFAULT false,
  
  -- Platform integration
  platform_transaction_id VARCHAR(255),
  
  notes TEXT
);

-- Workflow Automation Tables

-- Workflow templates that can be triggered
CREATE TABLE workflow_templates (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW') NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  
  name VARCHAR(255) NOT NULL,
  description TEXT,
  trigger_type VARCHAR(50) CHECK (trigger_type IN ('Manual', 'Client_created', 'Status_change', 'Date_based', 'Portfolio_change', 'Document_signed')) NOT NULL,
  trigger_conditions JSONB, -- Conditions for automatic triggers
  
  workflow_definition JSONB NOT NULL, -- Complete workflow steps and logic
  is_active BOOLEAN DEFAULT true,
  category VARCHAR(50) CHECK (category IN ('Onboarding', 'Review', 'Compliance', 'Investment', 'Insurance', 'General')),
  
  usage_count INTEGER DEFAULT 0,
  last_used_date DATE
);

-- Active workflow instances
CREATE TABLE workflow_instances (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW') NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  
  template_id UUID REFERENCES workflow_templates(id) ON DELETE SET NULL,
  client_id UUID REFERENCES clients(id) ON DELETE CASCADE,
  
  workflow_name VARCHAR(255) NOT NULL,
  status VARCHAR(30) CHECK (status IN ('Running', 'Paused', 'Completed', 'Failed', 'Cancelled')) DEFAULT 'Running',
  current_step INTEGER DEFAULT 1,
  total_steps INTEGER,
  
  started_date TIMESTAMP WITH TIME ZONE,
  completed_date TIMESTAMP WITH TIME ZONE,
  due_date DATE,
  
  workflow_data JSONB, -- Current state and variables
  notes TEXT
);

-- Document generation templates
CREATE TABLE document_templates (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW') NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW') NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  
  template_name VARCHAR(255) NOT NULL,
  template_type VARCHAR(50) CHECK (template_type IN ('SOA', 'ROA', 'FSG', 'FDS', 'Client_Letter', 'Investment_Report', 'Insurance_Report', 'Portfolio_Review')) NOT NULL,
  template_content TEXT NOT NULL, -- HTML/markdown template with merge fields
  conditional_sections JSONB, -- Logic for conditional content
  
  merge_fields JSONB, -- Available merge fields and their sources
  required_data JSONB, -- Required client data for generation
  
  version VARCHAR(20) DEFAULT '1.0',
  is_active BOOLEAN DEFAULT true,
  category VARCHAR(50),
  
  usage_count INTEGER DEFAULT 0,
  last_used_date DATE
);

-- Generated documents
CREATE TABLE generated_documents (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW') NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW') NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  
  template_id UUID REFERENCES document_templates(id) ON DELETE SET NULL,
  client_id UUID REFERENCES clients(id) ON DELETE CASCADE NOT NULL,
  workflow_instance_id UUID REFERENCES workflow_instances(id) ON DELETE SET NULL,
  
  document_name VARCHAR(255) NOT NULL,
  document_type VARCHAR(50) NOT NULL,
  file_path TEXT NOT NULL,
  file_size BIGINT,
  mime_type VARCHAR(100),
  
  generation_data JSONB, -- Data used for generation
  status VARCHAR(30) CHECK (status IN ('Draft', 'Generated', 'Sent', 'Signed', 'Archived')) DEFAULT 'Draft',
  
  sent_date TIMESTAMP WITH TIME ZONE,
  signed_date TIMESTAMP WITH TIME ZONE,
  signature_request_id VARCHAR(255), -- DocuSign request ID
  
  notes TEXT
);

-- Enhanced activities table for client interactions
CREATE TABLE activities (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW') NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW') NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  
  client_id UUID REFERENCES clients(id) ON DELETE CASCADE,
  household_id UUID REFERENCES households(id) ON DELETE CASCADE,
  contact_id UUID REFERENCES contacts(id) ON DELETE SET NULL,
  workflow_instance_id UUID REFERENCES workflow_instances(id) ON DELETE SET NULL,
  
  activity_type VARCHAR(30) CHECK (activity_type IN ('Email', 'Phone_call', 'Meeting', 'Video_call', 'SMS', 'Letter', 'Task', 'Note', 'Document_sent', 'Document_signed', 'Portfolio_review', 'Compliance_update')) NOT NULL,
  subject VARCHAR(255) NOT NULL,
  description TEXT,
  
  activity_date TIMESTAMP WITH TIME ZONE NOT NULL,
  duration_minutes INTEGER,
  
  -- Follow-up tracking
  requires_followup BOOLEAN DEFAULT false,
  followup_date DATE,
  completed BOOLEAN DEFAULT true,
  
  -- Related records
  related_account_id UUID REFERENCES investment_accounts(id),
  related_document_id UUID REFERENCES generated_documents(id),
  
  -- Categorization
  category VARCHAR(50),
  priority VARCHAR(10) CHECK (priority IN ('Low', 'Medium', 'High', 'Urgent')) DEFAULT 'Medium',
  tags JSONB,
  
  -- Communication details
  attendees JSONB, -- For meetings
  outcome TEXT,
  next_steps TEXT
);

-- Tasks for workflow steps and manual activities
CREATE TABLE tasks (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW') NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW') NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  
  assigned_to UUID REFERENCES auth.users(id), -- Can be assigned to other advisers
  client_id UUID REFERENCES clients(id) ON DELETE CASCADE,
  workflow_instance_id UUID REFERENCES workflow_instances(id) ON DELETE CASCADE,
  
  task_title VARCHAR(255) NOT NULL,
  task_description TEXT,
  task_type VARCHAR(50) CHECK (task_type IN ('Call_client', 'Send_document', 'Review_portfolio', 'Complete_SOA', 'Schedule_meeting', 'Follow_up', 'Compliance', 'Research', 'Administration', 'Other')),
  
  priority VARCHAR(10) CHECK (priority IN ('Low', 'Medium', 'High', 'Urgent')) DEFAULT 'Medium',
  status VARCHAR(20) CHECK (status IN ('Pending', 'In_progress', 'Completed', 'Cancelled', 'On_hold')) DEFAULT 'Pending',
  
  due_date DATE,
  completed_date DATE,
  estimated_hours DECIMAL(4, 2),
  actual_hours DECIMAL(4, 2),
  
  -- Task details
  instructions TEXT,
  checklist_items JSONB, -- For complex tasks with multiple steps
  attachments JSONB, -- File references
  
  -- Dependencies
  depends_on_task_id UUID REFERENCES tasks(id),
  blocks_task_ids JSONB, -- Array of task IDs this task blocks
  
  notes TEXT
);

-- Create indexes for better performance

-- Existing indexes
CREATE INDEX idx_companies_user_id ON companies(user_id);
CREATE INDEX idx_contacts_user_id ON contacts(user_id);
CREATE INDEX idx_contacts_company_id ON contacts(company_id);

-- Enhanced client and household indexes
CREATE INDEX idx_households_user_id ON households(user_id);
CREATE INDEX idx_households_type ON households(household_type);
CREATE INDEX idx_entities_user_id ON entities(user_id);
CREATE INDEX idx_entities_household_id ON entities(household_id);
CREATE INDEX idx_entities_type ON entities(entity_type);

CREATE INDEX idx_clients_user_id ON clients(user_id);
CREATE INDEX idx_clients_household_id ON clients(household_id);
CREATE INDEX idx_clients_entity_id ON clients(entity_id);
CREATE INDEX idx_clients_risk_profile ON clients(risk_profile);
CREATE INDEX idx_clients_assigned_adviser ON clients(assigned_adviser);
CREATE INDEX idx_clients_client_status ON clients(client_status);
CREATE INDEX idx_clients_next_review_date ON clients(next_review_date);
CREATE INDEX idx_clients_client_since ON clients(client_since);

-- Compliance indexes
CREATE INDEX idx_compliance_documents_user_id ON compliance_documents(user_id);
CREATE INDEX idx_compliance_documents_client_id ON compliance_documents(client_id);
CREATE INDEX idx_compliance_documents_type ON compliance_documents(document_type);
CREATE INDEX idx_compliance_documents_expiry ON compliance_documents(expiry_date);

CREATE INDEX idx_client_consents_user_id ON client_consents(user_id);
CREATE INDEX idx_client_consents_client_id ON client_consents(client_id);
CREATE INDEX idx_client_consents_renewal ON client_consents(renewal_date);

CREATE INDEX idx_risk_profiles_user_id ON risk_profiles(user_id);
CREATE INDEX idx_risk_profiles_client_id ON risk_profiles(client_id);
CREATE INDEX idx_risk_profiles_current ON risk_profiles(is_current);

-- Portfolio and investment indexes
CREATE INDEX idx_investment_accounts_user_id ON investment_accounts(user_id);
CREATE INDEX idx_investment_accounts_client_id ON investment_accounts(client_id);
CREATE INDEX idx_investment_accounts_entity_id ON investment_accounts(entity_id);
CREATE INDEX idx_investment_accounts_platform ON investment_accounts(platform);
CREATE INDEX idx_investment_accounts_active ON investment_accounts(is_active);

CREATE INDEX idx_holdings_user_id ON holdings(user_id);
CREATE INDEX idx_holdings_account_id ON holdings(account_id);
CREATE INDEX idx_holdings_security_code ON holdings(security_code);
CREATE INDEX idx_holdings_asset_class ON holdings(asset_class);

CREATE INDEX idx_transactions_user_id ON transactions(user_id);
CREATE INDEX idx_transactions_account_id ON transactions(account_id);
CREATE INDEX idx_transactions_holding_id ON transactions(holding_id);
CREATE INDEX idx_transactions_date ON transactions(transaction_date);
CREATE INDEX idx_transactions_type ON transactions(transaction_type);

-- Workflow and automation indexes
CREATE INDEX idx_workflow_templates_user_id ON workflow_templates(user_id);
CREATE INDEX idx_workflow_templates_trigger_type ON workflow_templates(trigger_type);
CREATE INDEX idx_workflow_templates_category ON workflow_templates(category);
CREATE INDEX idx_workflow_templates_active ON workflow_templates(is_active);

CREATE INDEX idx_workflow_instances_user_id ON workflow_instances(user_id);
CREATE INDEX idx_workflow_instances_template_id ON workflow_instances(template_id);
CREATE INDEX idx_workflow_instances_client_id ON workflow_instances(client_id);
CREATE INDEX idx_workflow_instances_status ON workflow_instances(status);
CREATE INDEX idx_workflow_instances_due_date ON workflow_instances(due_date);

CREATE INDEX idx_document_templates_user_id ON document_templates(user_id);
CREATE INDEX idx_document_templates_type ON document_templates(template_type);
CREATE INDEX idx_document_templates_active ON document_templates(is_active);

CREATE INDEX idx_generated_documents_user_id ON generated_documents(user_id);
CREATE INDEX idx_generated_documents_client_id ON generated_documents(client_id);
CREATE INDEX idx_generated_documents_template_id ON generated_documents(template_id);
CREATE INDEX idx_generated_documents_status ON generated_documents(status);

-- Enhanced activities indexes
CREATE INDEX idx_activities_user_id ON activities(user_id);
CREATE INDEX idx_activities_client_id ON activities(client_id);
CREATE INDEX idx_activities_household_id ON activities(household_id);
CREATE INDEX idx_activities_contact_id ON activities(contact_id);
CREATE INDEX idx_activities_workflow_id ON activities(workflow_instance_id);
CREATE INDEX idx_activities_type ON activities(activity_type);
CREATE INDEX idx_activities_date ON activities(activity_date);
CREATE INDEX idx_activities_followup ON activities(followup_date) WHERE requires_followup = true;

-- Tasks indexes
CREATE INDEX idx_tasks_user_id ON tasks(user_id);
CREATE INDEX idx_tasks_assigned_to ON tasks(assigned_to);
CREATE INDEX idx_tasks_client_id ON tasks(client_id);
CREATE INDEX idx_tasks_workflow_id ON tasks(workflow_instance_id);
CREATE INDEX idx_tasks_status ON tasks(status);
CREATE INDEX idx_tasks_due_date ON tasks(due_date);
CREATE INDEX idx_tasks_priority ON tasks(priority);
CREATE INDEX idx_tasks_type ON tasks(task_type);

-- Create updated_at triggers
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = TIMEZONE('utc', NOW());
  RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_companies_updated_at BEFORE UPDATE ON companies
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_contacts_updated_at BEFORE UPDATE ON contacts
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_clients_updated_at BEFORE UPDATE ON clients
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Triggers for new tables
CREATE TRIGGER update_households_updated_at BEFORE UPDATE ON households
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_entities_updated_at BEFORE UPDATE ON entities
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_compliance_documents_updated_at BEFORE UPDATE ON compliance_documents
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_client_consents_updated_at BEFORE UPDATE ON client_consents
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_risk_profiles_updated_at BEFORE UPDATE ON risk_profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_investment_accounts_updated_at BEFORE UPDATE ON investment_accounts
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_holdings_updated_at BEFORE UPDATE ON holdings
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_transactions_updated_at BEFORE UPDATE ON transactions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_workflow_templates_updated_at BEFORE UPDATE ON workflow_templates
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_workflow_instances_updated_at BEFORE UPDATE ON workflow_instances
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_document_templates_updated_at BEFORE UPDATE ON document_templates
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_generated_documents_updated_at BEFORE UPDATE ON generated_documents
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_activities_updated_at BEFORE UPDATE ON activities
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_tasks_updated_at BEFORE UPDATE ON tasks
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Enable Row Level Security (RLS)
ALTER TABLE companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE activities ENABLE ROW LEVEL SECURITY;

-- Enable RLS for new tables
ALTER TABLE households ENABLE ROW LEVEL SECURITY;
ALTER TABLE entities ENABLE ROW LEVEL SECURITY;
ALTER TABLE compliance_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE client_consents ENABLE ROW LEVEL SECURITY;
ALTER TABLE risk_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE investment_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE holdings ENABLE ROW LEVEL SECURITY;
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE workflow_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE workflow_instances ENABLE ROW LEVEL SECURITY;
ALTER TABLE document_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE generated_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;

-- Create policies for companies
CREATE POLICY "Users can view their own companies" ON companies
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own companies" ON companies
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own companies" ON companies
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own companies" ON companies
  FOR DELETE USING (auth.uid() = user_id);

-- Create policies for contacts
CREATE POLICY "Users can view their own contacts" ON contacts
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own contacts" ON contacts
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own contacts" ON contacts
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own contacts" ON contacts
  FOR DELETE USING (auth.uid() = user_id);

-- Create policies for clients
CREATE POLICY "Users can view their own clients" ON clients
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own clients" ON clients
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own clients" ON clients
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own clients" ON clients
  FOR DELETE USING (auth.uid() = user_id);

-- Create policies for deals
CREATE POLICY "Users can view their own deals" ON deals
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own deals" ON deals
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own deals" ON deals
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own deals" ON deals
  FOR DELETE USING (auth.uid() = user_id);

-- Create policies for activities
CREATE POLICY "Users can view their own activities" ON activities
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own activities" ON activities
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own activities" ON activities
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own activities" ON activities
  FOR DELETE USING (auth.uid() = user_id);

-- Create policies for households
CREATE POLICY "Users can view their own households" ON households
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own households" ON households
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own households" ON households
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own households" ON households
  FOR DELETE USING (auth.uid() = user_id);

-- Create policies for entities
CREATE POLICY "Users can view their own entities" ON entities
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own entities" ON entities
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own entities" ON entities
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own entities" ON entities
  FOR DELETE USING (auth.uid() = user_id);

-- Create policies for compliance_documents
CREATE POLICY "Users can view their own compliance documents" ON compliance_documents
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own compliance documents" ON compliance_documents
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own compliance documents" ON compliance_documents
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own compliance documents" ON compliance_documents
  FOR DELETE USING (auth.uid() = user_id);

-- Create policies for client_consents
CREATE POLICY "Users can view their own client consents" ON client_consents
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own client consents" ON client_consents
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own client consents" ON client_consents
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own client consents" ON client_consents
  FOR DELETE USING (auth.uid() = user_id);

-- Create policies for risk_profiles
CREATE POLICY "Users can view their own risk profiles" ON risk_profiles
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own risk profiles" ON risk_profiles
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own risk profiles" ON risk_profiles
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own risk profiles" ON risk_profiles
  FOR DELETE USING (auth.uid() = user_id);

-- Create policies for investment_accounts
CREATE POLICY "Users can view their own investment accounts" ON investment_accounts
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own investment accounts" ON investment_accounts
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own investment accounts" ON investment_accounts
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own investment accounts" ON investment_accounts
  FOR DELETE USING (auth.uid() = user_id);

-- Create policies for holdings
CREATE POLICY "Users can view their own holdings" ON holdings
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own holdings" ON holdings
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own holdings" ON holdings
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own holdings" ON holdings
  FOR DELETE USING (auth.uid() = user_id);

-- Create policies for transactions
CREATE POLICY "Users can view their own transactions" ON transactions
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own transactions" ON transactions
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own transactions" ON transactions
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own transactions" ON transactions
  FOR DELETE USING (auth.uid() = user_id);

-- Create policies for workflow_templates
CREATE POLICY "Users can view their own workflow templates" ON workflow_templates
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own workflow templates" ON workflow_templates
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own workflow templates" ON workflow_templates
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own workflow templates" ON workflow_templates
  FOR DELETE USING (auth.uid() = user_id);

-- Create policies for workflow_instances
CREATE POLICY "Users can view their own workflow instances" ON workflow_instances
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own workflow instances" ON workflow_instances
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own workflow instances" ON workflow_instances
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own workflow instances" ON workflow_instances
  FOR DELETE USING (auth.uid() = user_id);

-- Create policies for document_templates
CREATE POLICY "Users can view their own document templates" ON document_templates
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own document templates" ON document_templates
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own document templates" ON document_templates
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own document templates" ON document_templates
  FOR DELETE USING (auth.uid() = user_id);

-- Create policies for generated_documents
CREATE POLICY "Users can view their own generated documents" ON generated_documents
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own generated documents" ON generated_documents
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own generated documents" ON generated_documents
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own generated documents" ON generated_documents
  FOR DELETE USING (auth.uid() = user_id);

-- Create policies for tasks
CREATE POLICY "Users can view their own tasks" ON tasks
  FOR SELECT USING (auth.uid() = user_id OR auth.uid() = assigned_to);

CREATE POLICY "Users can insert their own tasks" ON tasks
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own tasks" ON tasks
  FOR UPDATE USING (auth.uid() = user_id OR auth.uid() = assigned_to);

CREATE POLICY "Users can delete their own tasks" ON tasks
  FOR DELETE USING (auth.uid() = user_id);

-- Create webhook_logs table
CREATE TABLE webhook_logs (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  event_type VARCHAR(50) NOT NULL,
  payload JSONB NOT NULL,
  status VARCHAR(20) CHECK (status IN ('pending', 'delivered', 'failed', 'retrying')) NOT NULL DEFAULT 'pending',
  attempts INTEGER NOT NULL DEFAULT 0,
  response_status INTEGER,
  response_body TEXT,
  error_message TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()) NOT NULL,
  next_retry_at TIMESTAMP WITH TIME ZONE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE
);

-- Create webhook_subscriptions table
CREATE TABLE webhook_subscriptions (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  event_type VARCHAR(50) NOT NULL,
  url VARCHAR(500) NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()) NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  api_key VARCHAR(255),
  secret VARCHAR(255)
);

-- Create webhook_settings table for global webhook configuration
CREATE TABLE webhook_settings (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
  n8n_webhook_url VARCHAR(500),
  n8n_api_key VARCHAR(255),
  webhook_secret VARCHAR(255),
  is_enabled BOOLEAN NOT NULL DEFAULT false,
  retry_attempts INTEGER NOT NULL DEFAULT 3,
  retry_delay_seconds INTEGER NOT NULL DEFAULT 60,
  enabled_events JSONB NOT NULL DEFAULT '[]',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()) NOT NULL
);

-- Create indexes for webhook tables
CREATE INDEX idx_webhook_logs_status ON webhook_logs(status);
CREATE INDEX idx_webhook_logs_event_type ON webhook_logs(event_type);
CREATE INDEX idx_webhook_logs_user_id ON webhook_logs(user_id);
CREATE INDEX idx_webhook_logs_created_at ON webhook_logs(created_at);
CREATE INDEX idx_webhook_logs_next_retry ON webhook_logs(next_retry_at) WHERE next_retry_at IS NOT NULL;

CREATE INDEX idx_webhook_subscriptions_user_id ON webhook_subscriptions(user_id);
CREATE INDEX idx_webhook_subscriptions_event_type ON webhook_subscriptions(event_type);
CREATE INDEX idx_webhook_subscriptions_active ON webhook_subscriptions(is_active);

CREATE INDEX idx_webhook_settings_user_id ON webhook_settings(user_id);

-- Create updated_at triggers for webhook tables
CREATE TRIGGER update_webhook_logs_updated_at BEFORE UPDATE ON webhook_logs
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_webhook_subscriptions_updated_at BEFORE UPDATE ON webhook_subscriptions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_webhook_settings_updated_at BEFORE UPDATE ON webhook_settings
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Enable Row Level Security for webhook tables
ALTER TABLE webhook_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE webhook_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE webhook_settings ENABLE ROW LEVEL SECURITY;

-- Create policies for webhook_logs
CREATE POLICY "Users can view their own webhook logs" ON webhook_logs
  FOR SELECT USING (auth.uid() = user_id OR user_id IS NULL);

CREATE POLICY "System can insert webhook logs" ON webhook_logs
  FOR INSERT WITH CHECK (true);

CREATE POLICY "System can update webhook logs" ON webhook_logs
  FOR UPDATE USING (true);

CREATE POLICY "Users can delete their own webhook logs" ON webhook_logs
  FOR DELETE USING (auth.uid() = user_id);

-- Create policies for webhook_subscriptions
CREATE POLICY "Users can view their own webhook subscriptions" ON webhook_subscriptions
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own webhook subscriptions" ON webhook_subscriptions
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own webhook subscriptions" ON webhook_subscriptions
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own webhook subscriptions" ON webhook_subscriptions
  FOR DELETE USING (auth.uid() = user_id);

-- Create policies for webhook_settings
CREATE POLICY "Users can view their own webhook settings" ON webhook_settings
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own webhook settings" ON webhook_settings
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own webhook settings" ON webhook_settings
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own webhook settings" ON webhook_settings
  FOR DELETE USING (auth.uid() = user_id);