-- Enhanced Task Management System Migration
-- This migration adds comprehensive task management features to the existing tasks table

-- First, add new columns to the existing tasks table
ALTER TABLE tasks
  -- Priority scoring (0-100 score)
  ADD COLUMN IF NOT EXISTS priority_score INTEGER DEFAULT 50 CHECK (priority_score >= 0 AND priority_score <= 100),

  -- Recurring task automation
  ADD COLUMN IF NOT EXISTS is_recurring BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS recurrence_pattern VARCHAR(50), -- daily, weekly, monthly, quarterly, annually, custom
  ADD COLUMN IF NOT EXISTS recurrence_interval INTEGER DEFAULT 1, -- e.g., every 2 weeks
  ADD COLUMN IF NOT EXISTS recurrence_end_date DATE,
  ADD COLUMN IF NOT EXISTS parent_recurring_task_id UUID REFERENCES tasks(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS next_occurrence_date DATE,
  ADD COLUMN IF NOT EXISTS recurrence_config JSONB, -- Stores complex recurrence rules (e.g., 2nd Tuesday of month)

  -- Time tracking for billable hours
  ADD COLUMN IF NOT EXISTS is_billable BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS hourly_rate DECIMAL(10, 2),
  ADD COLUMN IF NOT EXISTS time_entries JSONB DEFAULT '[]', -- Array of time tracking entries
  ADD COLUMN IF NOT EXISTS total_time_minutes INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS billable_amount DECIMAL(10, 2),

  -- Team collaboration
  ADD COLUMN IF NOT EXISTS collaborators JSONB DEFAULT '[]', -- Array of user IDs who can collaborate
  ADD COLUMN IF NOT EXISTS assigned_by UUID REFERENCES auth.users(id),
  ADD COLUMN IF NOT EXISTS assignment_date TIMESTAMP WITH TIME ZONE,
  ADD COLUMN IF NOT EXISTS completion_percentage INTEGER DEFAULT 0 CHECK (completion_percentage >= 0 AND completion_percentage <= 100),

  -- Escalation and alerts
  ADD COLUMN IF NOT EXISTS escalation_level VARCHAR(20) CHECK (escalation_level IN ('None', 'Warning', 'Critical', 'Overdue')),
  ADD COLUMN IF NOT EXISTS escalation_date TIMESTAMP WITH TIME ZONE,
  ADD COLUMN IF NOT EXISTS escalation_config JSONB, -- Alert timing rules
  ADD COLUMN IF NOT EXISTS last_reminder_sent TIMESTAMP WITH TIME ZONE,
  ADD COLUMN IF NOT EXISTS reminder_frequency VARCHAR(20), -- daily, weekly, custom

  -- Workflow and sequencing
  ADD COLUMN IF NOT EXISTS sequence_order INTEGER, -- Order in workflow sequence
  ADD COLUMN IF NOT EXISTS is_milestone BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS workflow_template_id UUID REFERENCES workflow_templates(id),

  -- Follow-up sequences
  ADD COLUMN IF NOT EXISTS is_follow_up BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS follow_up_sequence_id UUID,
  ADD COLUMN IF NOT EXISTS follow_up_trigger_date DATE,
  ADD COLUMN IF NOT EXISTS auto_complete_on_response BOOLEAN DEFAULT false,

  -- Additional metadata
  ADD COLUMN IF NOT EXISTS tags JSONB DEFAULT '[]',
  ADD COLUMN IF NOT EXISTS custom_fields JSONB DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS completion_notes TEXT,
  ADD COLUMN IF NOT EXISTS archived BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS archived_at TIMESTAMP WITH TIME ZONE;

-- Create task_templates table for reusable task templates
CREATE TABLE IF NOT EXISTS task_templates (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()) NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,

  template_name VARCHAR(255) NOT NULL,
  template_description TEXT,
  category VARCHAR(50) CHECK (category IN ('Client_Onboarding', 'Annual_Review', 'Compliance', 'Follow_Up', 'Investment', 'Insurance', 'General')),

  -- Template task details
  task_title VARCHAR(255) NOT NULL,
  task_description TEXT,
  task_type VARCHAR(50),
  default_priority VARCHAR(10),
  default_priority_score INTEGER DEFAULT 50,
  estimated_hours DECIMAL(4, 2),

  -- Automation settings
  is_recurring BOOLEAN DEFAULT false,
  recurrence_pattern VARCHAR(50),
  recurrence_config JSONB,

  -- Assignment defaults
  auto_assign_to VARCHAR(50), -- 'creator', 'specific_user', 'role'
  default_assignee UUID REFERENCES auth.users(id),

  -- Checklist template
  checklist_items JSONB,

  -- Metadata
  is_active BOOLEAN DEFAULT true,
  usage_count INTEGER DEFAULT 0,
  last_used_date DATE
);

-- Create task_time_entries table for detailed time tracking
CREATE TABLE IF NOT EXISTS task_time_entries (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()) NOT NULL,

  task_id UUID REFERENCES tasks(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,

  start_time TIMESTAMP WITH TIME ZONE NOT NULL,
  end_time TIMESTAMP WITH TIME ZONE,
  duration_minutes INTEGER,

  is_billable BOOLEAN DEFAULT false,
  hourly_rate DECIMAL(10, 2),
  amount DECIMAL(10, 2),

  description TEXT,
  entry_type VARCHAR(20) CHECK (entry_type IN ('Manual', 'Timer', 'Imported')),

  -- Metadata
  is_approved BOOLEAN DEFAULT false,
  approved_by UUID REFERENCES auth.users(id),
  approved_at TIMESTAMP WITH TIME ZONE,

  notes TEXT
);

-- Create task_comments table for collaboration
CREATE TABLE IF NOT EXISTS task_comments (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()) NOT NULL,

  task_id UUID REFERENCES tasks(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,

  comment_text TEXT NOT NULL,
  mentions JSONB DEFAULT '[]', -- Array of mentioned user IDs
  attachments JSONB DEFAULT '[]',

  is_edited BOOLEAN DEFAULT false,
  edited_at TIMESTAMP WITH TIME ZONE
);

-- Create task_history table for audit trail
CREATE TABLE IF NOT EXISTS task_history (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()) NOT NULL,

  task_id UUID REFERENCES tasks(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES auth.users(id) NOT NULL,

  action VARCHAR(50) NOT NULL, -- created, updated, assigned, completed, etc.
  field_changed VARCHAR(100),
  old_value TEXT,
  new_value TEXT,

  change_summary TEXT
);

-- Create follow_up_sequences table for automated follow-ups
CREATE TABLE IF NOT EXISTS follow_up_sequences (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()) NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,

  sequence_name VARCHAR(255) NOT NULL,
  sequence_description TEXT,

  -- Trigger configuration
  trigger_event VARCHAR(50) CHECK (trigger_event IN ('Client_Created', 'Meeting_Scheduled', 'Document_Sent', 'Manual', 'Date_Based', 'Status_Change')),
  trigger_config JSONB,

  -- Sequence steps
  sequence_steps JSONB NOT NULL, -- Array of follow-up steps with timing

  -- Status
  is_active BOOLEAN DEFAULT true,
  category VARCHAR(50),

  usage_count INTEGER DEFAULT 0,
  last_used_date DATE
);

-- Create follow_up_sequence_instances table for active sequences
CREATE TABLE IF NOT EXISTS follow_up_sequence_instances (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()) NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,

  sequence_id UUID REFERENCES follow_up_sequences(id) ON DELETE SET NULL,
  client_id UUID REFERENCES clients(id) ON DELETE CASCADE NOT NULL,

  status VARCHAR(30) CHECK (status IN ('Active', 'Paused', 'Completed', 'Cancelled')) DEFAULT 'Active',
  current_step INTEGER DEFAULT 1,
  total_steps INTEGER,

  started_date TIMESTAMP WITH TIME ZONE,
  next_step_date TIMESTAMP WITH TIME ZONE,
  completed_date TIMESTAMP WITH TIME ZONE,

  sequence_data JSONB, -- Current state and variables
  notes TEXT
);

-- Create task_escalations table for tracking escalation history
CREATE TABLE IF NOT EXISTS task_escalations (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()) NOT NULL,

  task_id UUID REFERENCES tasks(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES auth.users(id) NOT NULL,

  escalation_level VARCHAR(20),
  escalation_reason TEXT,
  escalated_to UUID REFERENCES auth.users(id),

  resolved BOOLEAN DEFAULT false,
  resolved_at TIMESTAMP WITH TIME ZONE,
  resolution_notes TEXT
);

-- Create indexes for performance

-- Task indexes
CREATE INDEX IF NOT EXISTS idx_tasks_priority_score ON tasks(priority_score DESC);
CREATE INDEX IF NOT EXISTS idx_tasks_is_recurring ON tasks(is_recurring);
CREATE INDEX IF NOT EXISTS idx_tasks_next_occurrence ON tasks(next_occurrence_date) WHERE is_recurring = true;
CREATE INDEX IF NOT EXISTS idx_tasks_parent_recurring ON tasks(parent_recurring_task_id);
CREATE INDEX IF NOT EXISTS idx_tasks_is_billable ON tasks(is_billable);
CREATE INDEX IF NOT EXISTS idx_tasks_escalation_level ON tasks(escalation_level);
CREATE INDEX IF NOT EXISTS idx_tasks_workflow_template ON tasks(workflow_template_id);
CREATE INDEX IF NOT EXISTS idx_tasks_follow_up_sequence ON tasks(follow_up_sequence_id);
CREATE INDEX IF NOT EXISTS idx_tasks_archived ON tasks(archived);
CREATE INDEX IF NOT EXISTS idx_tasks_assigned_by ON tasks(assigned_by);

-- Task template indexes
CREATE INDEX IF NOT EXISTS idx_task_templates_user_id ON task_templates(user_id);
CREATE INDEX IF NOT EXISTS idx_task_templates_category ON task_templates(category);
CREATE INDEX IF NOT EXISTS idx_task_templates_active ON task_templates(is_active);

-- Time entry indexes
CREATE INDEX IF NOT EXISTS idx_task_time_entries_task_id ON task_time_entries(task_id);
CREATE INDEX IF NOT EXISTS idx_task_time_entries_user_id ON task_time_entries(user_id);
CREATE INDEX IF NOT EXISTS idx_task_time_entries_start_time ON task_time_entries(start_time);
CREATE INDEX IF NOT EXISTS idx_task_time_entries_billable ON task_time_entries(is_billable);

-- Comment indexes
CREATE INDEX IF NOT EXISTS idx_task_comments_task_id ON task_comments(task_id);
CREATE INDEX IF NOT EXISTS idx_task_comments_user_id ON task_comments(user_id);

-- History indexes
CREATE INDEX IF NOT EXISTS idx_task_history_task_id ON task_history(task_id);
CREATE INDEX IF NOT EXISTS idx_task_history_user_id ON task_history(user_id);
CREATE INDEX IF NOT EXISTS idx_task_history_created_at ON task_history(created_at);

-- Follow-up sequence indexes
CREATE INDEX IF NOT EXISTS idx_follow_up_sequences_user_id ON follow_up_sequences(user_id);
CREATE INDEX IF NOT EXISTS idx_follow_up_sequences_active ON follow_up_sequences(is_active);
CREATE INDEX IF NOT EXISTS idx_follow_up_sequence_instances_user_id ON follow_up_sequence_instances(user_id);
CREATE INDEX IF NOT EXISTS idx_follow_up_sequence_instances_client_id ON follow_up_sequence_instances(client_id);
CREATE INDEX IF NOT EXISTS idx_follow_up_sequence_instances_status ON follow_up_sequence_instances(status);
CREATE INDEX IF NOT EXISTS idx_follow_up_sequence_instances_next_step ON follow_up_sequence_instances(next_step_date);

-- Escalation indexes
CREATE INDEX IF NOT EXISTS idx_task_escalations_task_id ON task_escalations(task_id);
CREATE INDEX IF NOT EXISTS idx_task_escalations_resolved ON task_escalations(resolved);

-- Create triggers for new tables
CREATE TRIGGER update_task_templates_updated_at BEFORE UPDATE ON task_templates
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_task_time_entries_updated_at BEFORE UPDATE ON task_time_entries
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_task_comments_updated_at BEFORE UPDATE ON task_comments
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_follow_up_sequences_updated_at BEFORE UPDATE ON follow_up_sequences
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_follow_up_sequence_instances_updated_at BEFORE UPDATE ON follow_up_sequence_instances
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Enable Row Level Security
ALTER TABLE task_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE task_time_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE task_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE task_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE follow_up_sequences ENABLE ROW LEVEL SECURITY;
ALTER TABLE follow_up_sequence_instances ENABLE ROW LEVEL SECURITY;
ALTER TABLE task_escalations ENABLE ROW LEVEL SECURITY;

-- Create RLS policies

-- Task Templates
CREATE POLICY "Users can view their own task templates" ON task_templates
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own task templates" ON task_templates
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own task templates" ON task_templates
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own task templates" ON task_templates
  FOR DELETE USING (auth.uid() = user_id);

-- Task Time Entries
CREATE POLICY "Users can view time entries for their tasks" ON task_time_entries
  FOR SELECT USING (auth.uid() = user_id OR EXISTS (
    SELECT 1 FROM tasks WHERE tasks.id = task_time_entries.task_id AND tasks.user_id = auth.uid()
  ));

CREATE POLICY "Users can insert their own time entries" ON task_time_entries
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own time entries" ON task_time_entries
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own time entries" ON task_time_entries
  FOR DELETE USING (auth.uid() = user_id);

-- Task Comments
CREATE POLICY "Users can view comments on accessible tasks" ON task_comments
  FOR SELECT USING (EXISTS (
    SELECT 1 FROM tasks WHERE tasks.id = task_comments.task_id AND (tasks.user_id = auth.uid() OR tasks.assigned_to = auth.uid())
  ));

CREATE POLICY "Users can insert comments on accessible tasks" ON task_comments
  FOR INSERT WITH CHECK (auth.uid() = user_id AND EXISTS (
    SELECT 1 FROM tasks WHERE tasks.id = task_comments.task_id AND (tasks.user_id = auth.uid() OR tasks.assigned_to = auth.uid())
  ));

CREATE POLICY "Users can update their own comments" ON task_comments
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own comments" ON task_comments
  FOR DELETE USING (auth.uid() = user_id);

-- Task History
CREATE POLICY "Users can view history for their tasks" ON task_history
  FOR SELECT USING (EXISTS (
    SELECT 1 FROM tasks WHERE tasks.id = task_history.task_id AND (tasks.user_id = auth.uid() OR tasks.assigned_to = auth.uid())
  ));

CREATE POLICY "System can insert task history" ON task_history
  FOR INSERT WITH CHECK (true);

-- Follow-up Sequences
CREATE POLICY "Users can view their own follow-up sequences" ON follow_up_sequences
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own follow-up sequences" ON follow_up_sequences
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own follow-up sequences" ON follow_up_sequences
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own follow-up sequences" ON follow_up_sequences
  FOR DELETE USING (auth.uid() = user_id);

-- Follow-up Sequence Instances
CREATE POLICY "Users can view their own sequence instances" ON follow_up_sequence_instances
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own sequence instances" ON follow_up_sequence_instances
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own sequence instances" ON follow_up_sequence_instances
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own sequence instances" ON follow_up_sequence_instances
  FOR DELETE USING (auth.uid() = user_id);

-- Task Escalations
CREATE POLICY "Users can view escalations for their tasks" ON task_escalations
  FOR SELECT USING (EXISTS (
    SELECT 1 FROM tasks WHERE tasks.id = task_escalations.task_id AND (tasks.user_id = auth.uid() OR tasks.assigned_to = auth.uid())
  ));

CREATE POLICY "System can insert task escalations" ON task_escalations
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Users can update escalations they're involved in" ON task_escalations
  FOR UPDATE USING (auth.uid() = user_id OR auth.uid() = escalated_to);

-- Create function to automatically generate recurring tasks
CREATE OR REPLACE FUNCTION generate_recurring_task()
RETURNS TRIGGER AS $$
DECLARE
  new_task_id UUID;
  new_due_date DATE;
BEGIN
  -- Only process if the task is marked as completed and it's a recurring task
  IF NEW.status = 'Completed' AND NEW.is_recurring = true AND OLD.status != 'Completed' THEN
    -- Calculate next occurrence date based on recurrence pattern
    CASE NEW.recurrence_pattern
      WHEN 'daily' THEN
        new_due_date := NEW.due_date + (NEW.recurrence_interval || ' days')::INTERVAL;
      WHEN 'weekly' THEN
        new_due_date := NEW.due_date + (NEW.recurrence_interval || ' weeks')::INTERVAL;
      WHEN 'monthly' THEN
        new_due_date := NEW.due_date + (NEW.recurrence_interval || ' months')::INTERVAL;
      WHEN 'quarterly' THEN
        new_due_date := NEW.due_date + (NEW.recurrence_interval * 3 || ' months')::INTERVAL;
      WHEN 'annually' THEN
        new_due_date := NEW.due_date + (NEW.recurrence_interval || ' years')::INTERVAL;
      ELSE
        new_due_date := NEW.due_date + (NEW.recurrence_interval || ' days')::INTERVAL;
    END CASE;

    -- Only create new task if it's before the recurrence end date (or no end date)
    IF NEW.recurrence_end_date IS NULL OR new_due_date <= NEW.recurrence_end_date THEN
      -- Create the next occurrence
      INSERT INTO tasks (
        user_id, assigned_to, client_id, workflow_instance_id,
        task_title, task_description, task_type,
        priority, priority_score, status,
        due_date, estimated_hours,
        instructions, checklist_items, attachments,
        is_recurring, recurrence_pattern, recurrence_interval,
        recurrence_end_date, parent_recurring_task_id, next_occurrence_date,
        recurrence_config, is_billable, hourly_rate,
        collaborators, escalation_config, reminder_frequency,
        workflow_template_id, tags, custom_fields
      ) VALUES (
        NEW.user_id, NEW.assigned_to, NEW.client_id, NEW.workflow_instance_id,
        NEW.task_title, NEW.task_description, NEW.task_type,
        NEW.priority, NEW.priority_score, 'Pending',
        new_due_date, NEW.estimated_hours,
        NEW.instructions, NEW.checklist_items, NEW.attachments,
        NEW.is_recurring, NEW.recurrence_pattern, NEW.recurrence_interval,
        NEW.recurrence_end_date, COALESCE(NEW.parent_recurring_task_id, NEW.id), new_due_date,
        NEW.recurrence_config, NEW.is_billable, NEW.hourly_rate,
        NEW.collaborators, NEW.escalation_config, NEW.reminder_frequency,
        NEW.workflow_template_id, NEW.tags, NEW.custom_fields
      )
      RETURNING id INTO new_task_id;

      -- Update the completed task's next occurrence reference
      UPDATE tasks SET next_occurrence_date = new_due_date WHERE id = NEW.id;
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for recurring task generation
DROP TRIGGER IF EXISTS auto_generate_recurring_task ON tasks;
CREATE TRIGGER auto_generate_recurring_task
  AFTER UPDATE ON tasks
  FOR EACH ROW
  EXECUTE FUNCTION generate_recurring_task();

-- Create function to track task history
CREATE OR REPLACE FUNCTION track_task_changes()
RETURNS TRIGGER AS $$
BEGIN
  -- Track status changes
  IF OLD.status IS DISTINCT FROM NEW.status THEN
    INSERT INTO task_history (task_id, user_id, action, field_changed, old_value, new_value, change_summary)
    VALUES (NEW.id, auth.uid(), 'updated', 'status', OLD.status, NEW.status,
            'Status changed from ' || OLD.status || ' to ' || NEW.status);
  END IF;

  -- Track assignment changes
  IF OLD.assigned_to IS DISTINCT FROM NEW.assigned_to THEN
    INSERT INTO task_history (task_id, user_id, action, field_changed, old_value, new_value, change_summary)
    VALUES (NEW.id, auth.uid(), 'assigned', 'assigned_to',
            COALESCE(OLD.assigned_to::TEXT, 'None'),
            COALESCE(NEW.assigned_to::TEXT, 'None'),
            'Task reassigned');
  END IF;

  -- Track priority changes
  IF OLD.priority_score IS DISTINCT FROM NEW.priority_score THEN
    INSERT INTO task_history (task_id, user_id, action, field_changed, old_value, new_value, change_summary)
    VALUES (NEW.id, auth.uid(), 'updated', 'priority_score',
            OLD.priority_score::TEXT, NEW.priority_score::TEXT,
            'Priority score changed');
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for task history tracking
DROP TRIGGER IF EXISTS track_task_changes_trigger ON tasks;
CREATE TRIGGER track_task_changes_trigger
  AFTER UPDATE ON tasks
  FOR EACH ROW
  EXECUTE FUNCTION track_task_changes();

-- Create function to calculate priority score based on multiple factors
CREATE OR REPLACE FUNCTION calculate_priority_score(
  p_priority VARCHAR,
  p_due_date DATE,
  p_client_value DECIMAL,
  p_is_milestone BOOLEAN,
  p_dependencies_count INTEGER
)
RETURNS INTEGER AS $$
DECLARE
  base_score INTEGER := 50;
  time_score INTEGER := 0;
  value_score INTEGER := 0;
  milestone_bonus INTEGER := 0;
  dependency_bonus INTEGER := 0;
  days_until_due INTEGER;
BEGIN
  -- Base score from priority
  CASE p_priority
    WHEN 'Urgent' THEN base_score := 90;
    WHEN 'High' THEN base_score := 70;
    WHEN 'Medium' THEN base_score := 50;
    WHEN 'Low' THEN base_score := 30;
    ELSE base_score := 50;
  END CASE;

  -- Time-based scoring (urgency)
  IF p_due_date IS NOT NULL THEN
    days_until_due := p_due_date - CURRENT_DATE;
    IF days_until_due < 0 THEN
      time_score := 20; -- Overdue bonus
    ELSIF days_until_due <= 1 THEN
      time_score := 15;
    ELSIF days_until_due <= 3 THEN
      time_score := 10;
    ELSIF days_until_due <= 7 THEN
      time_score := 5;
    END IF;
  END IF;

  -- Client value scoring
  IF p_client_value > 1000000 THEN
    value_score := 10;
  ELSIF p_client_value > 500000 THEN
    value_score := 7;
  ELSIF p_client_value > 100000 THEN
    value_score := 5;
  END IF;

  -- Milestone bonus
  IF p_is_milestone THEN
    milestone_bonus := 5;
  END IF;

  -- Dependency bonus (tasks blocking others)
  dependency_bonus := LEAST(p_dependencies_count * 2, 10);

  -- Calculate final score (capped at 100)
  RETURN LEAST(base_score + time_score + value_score + milestone_bonus + dependency_bonus, 100);
END;
$$ LANGUAGE plpgsql;

-- Create view for task dashboard with calculated metrics
CREATE OR REPLACE VIEW task_dashboard AS
SELECT
  t.id,
  t.user_id,
  t.assigned_to,
  t.client_id,
  t.task_title,
  t.task_description,
  t.task_type,
  t.priority,
  t.priority_score,
  t.status,
  t.due_date,
  t.is_recurring,
  t.is_billable,
  t.total_time_minutes,
  t.billable_amount,
  t.escalation_level,
  t.completion_percentage,
  t.created_at,
  t.updated_at,

  -- Calculate overdue status
  CASE
    WHEN t.due_date < CURRENT_DATE AND t.status NOT IN ('Completed', 'Cancelled') THEN true
    ELSE false
  END as is_overdue,

  -- Calculate days until due
  CASE
    WHEN t.due_date IS NOT NULL THEN t.due_date - CURRENT_DATE
    ELSE NULL
  END as days_until_due,

  -- Count time entries
  (SELECT COUNT(*) FROM task_time_entries WHERE task_id = t.id) as time_entry_count,

  -- Count comments
  (SELECT COUNT(*) FROM task_comments WHERE task_id = t.id) as comment_count,

  -- Count dependencies blocking this task
  (SELECT COUNT(*) FROM tasks dep WHERE dep.id = t.depends_on_task_id AND dep.status != 'Completed') as blocking_dependencies,

  -- Client info
  c.first_name || ' ' || c.last_name as client_name,
  c.portfolio_value as client_value

FROM tasks t
LEFT JOIN clients c ON t.client_id = c.id
WHERE t.archived = false;

-- Grant access to the view
GRANT SELECT ON task_dashboard TO authenticated;
