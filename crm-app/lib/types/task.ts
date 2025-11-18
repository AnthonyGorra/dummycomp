// Task Management Types

export type TaskPriority = 'Low' | 'Medium' | 'High' | 'Urgent';

export type TaskStatus = 'Pending' | 'In_progress' | 'Completed' | 'Cancelled' | 'On_hold';

export type TaskType =
  | 'Call_client'
  | 'Send_document'
  | 'Review_portfolio'
  | 'Complete_SOA'
  | 'Schedule_meeting'
  | 'Follow_up'
  | 'Compliance'
  | 'Research'
  | 'Administration'
  | 'Other';

export type RecurrencePattern = 'daily' | 'weekly' | 'monthly' | 'quarterly' | 'annually' | 'custom';

export type EscalationLevel = 'None' | 'Warning' | 'Critical' | 'Overdue';

export type ReminderFrequency = 'daily' | 'weekly' | 'custom';

export interface TimeEntry {
  id: string;
  start_time: string;
  end_time?: string;
  duration_minutes?: number;
  description?: string;
  is_billable: boolean;
  hourly_rate?: number;
  amount?: number;
}

export interface RecurrenceConfig {
  pattern: RecurrencePattern;
  interval: number;
  end_date?: string;
  custom_rule?: {
    day_of_week?: number; // 0-6 for Sunday-Saturday
    week_of_month?: number; // 1-4 for first-fourth week
    day_of_month?: number; // 1-31
    month_of_year?: number; // 1-12
  };
}

export interface EscalationConfig {
  warning_days_before?: number; // Days before due date to send warning
  critical_days_before?: number; // Days before due date to escalate to critical
  escalate_to_user_id?: string; // User to notify on escalation
  auto_escalate_overdue?: boolean;
}

export interface ChecklistItem {
  id: string;
  text: string;
  completed: boolean;
  completed_at?: string;
  completed_by?: string;
}

export interface Task {
  id: string;
  created_at: string;
  updated_at: string;
  user_id: string;

  // Assignment
  assigned_to?: string;
  assigned_by?: string;
  assignment_date?: string;
  collaborators?: string[]; // User IDs

  // Client/Workflow relationship
  client_id?: string;
  workflow_instance_id?: string;
  workflow_template_id?: string;

  // Basic details
  task_title: string;
  task_description?: string;
  task_type?: TaskType;

  // Priority and status
  priority: TaskPriority;
  priority_score: number; // 0-100
  status: TaskStatus;
  completion_percentage: number; // 0-100

  // Timing
  due_date?: string;
  completed_date?: string;
  estimated_hours?: number;
  actual_hours?: number;

  // Recurrence
  is_recurring: boolean;
  recurrence_pattern?: RecurrencePattern;
  recurrence_interval?: number;
  recurrence_end_date?: string;
  parent_recurring_task_id?: string;
  next_occurrence_date?: string;
  recurrence_config?: RecurrenceConfig;

  // Time tracking
  is_billable: boolean;
  hourly_rate?: number;
  time_entries?: TimeEntry[];
  total_time_minutes: number;
  billable_amount?: number;

  // Escalation
  escalation_level?: EscalationLevel;
  escalation_date?: string;
  escalation_config?: EscalationConfig;
  last_reminder_sent?: string;
  reminder_frequency?: ReminderFrequency;

  // Dependencies
  depends_on_task_id?: string;
  blocks_task_ids?: string[]; // Tasks this task blocks
  sequence_order?: number;
  is_milestone: boolean;

  // Follow-up
  is_follow_up: boolean;
  follow_up_sequence_id?: string;
  follow_up_trigger_date?: string;
  auto_complete_on_response: boolean;

  // Content
  instructions?: string;
  checklist_items?: ChecklistItem[];
  attachments?: any[];
  notes?: string;
  completion_notes?: string;

  // Metadata
  tags?: string[];
  custom_fields?: Record<string, any>;
  archived: boolean;
  archived_at?: string;
}

export interface TaskTemplate {
  id: string;
  created_at: string;
  updated_at: string;
  user_id: string;

  template_name: string;
  template_description?: string;
  category?:
    | 'Client_Onboarding'
    | 'Annual_Review'
    | 'Compliance'
    | 'Follow_Up'
    | 'Investment'
    | 'Insurance'
    | 'General';

  // Template task details
  task_title: string;
  task_description?: string;
  task_type?: TaskType;
  default_priority?: TaskPriority;
  default_priority_score: number;
  estimated_hours?: number;

  // Automation settings
  is_recurring: boolean;
  recurrence_pattern?: RecurrencePattern;
  recurrence_config?: RecurrenceConfig;

  // Assignment defaults
  auto_assign_to?: 'creator' | 'specific_user' | 'role';
  default_assignee?: string;

  // Checklist template
  checklist_items?: Omit<ChecklistItem, 'completed' | 'completed_at' | 'completed_by'>[];

  // Metadata
  is_active: boolean;
  usage_count: number;
  last_used_date?: string;
}

export interface TaskTimeEntry {
  id: string;
  created_at: string;
  updated_at: string;

  task_id: string;
  user_id: string;

  start_time: string;
  end_time?: string;
  duration_minutes?: number;

  is_billable: boolean;
  hourly_rate?: number;
  amount?: number;

  description?: string;
  entry_type: 'Manual' | 'Timer' | 'Imported';

  // Approval
  is_approved: boolean;
  approved_by?: string;
  approved_at?: string;

  notes?: string;
}

export interface TaskComment {
  id: string;
  created_at: string;
  updated_at: string;

  task_id: string;
  user_id: string;

  comment_text: string;
  mentions?: string[]; // User IDs
  attachments?: any[];

  is_edited: boolean;
  edited_at?: string;
}

export interface TaskHistory {
  id: string;
  created_at: string;

  task_id: string;
  user_id: string;

  action: string;
  field_changed?: string;
  old_value?: string;
  new_value?: string;

  change_summary?: string;
}

export interface FollowUpSequence {
  id: string;
  created_at: string;
  updated_at: string;
  user_id: string;

  sequence_name: string;
  sequence_description?: string;

  // Trigger configuration
  trigger_event:
    | 'Client_Created'
    | 'Meeting_Scheduled'
    | 'Document_Sent'
    | 'Manual'
    | 'Date_Based'
    | 'Status_Change';
  trigger_config?: any;

  // Sequence steps
  sequence_steps: FollowUpStep[];

  // Status
  is_active: boolean;
  category?: string;

  usage_count: number;
  last_used_date?: string;
}

export interface FollowUpStep {
  step_number: number;
  step_name: string;
  step_description?: string;
  delay_days: number; // Days after trigger or previous step
  task_template_id?: string;
  task_config?: {
    task_title: string;
    task_description?: string;
    task_type?: TaskType;
    priority?: TaskPriority;
    auto_assign?: boolean;
  };
}

export interface FollowUpSequenceInstance {
  id: string;
  created_at: string;
  updated_at: string;
  user_id: string;

  sequence_id?: string;
  client_id: string;

  status: 'Active' | 'Paused' | 'Completed' | 'Cancelled';
  current_step: number;
  total_steps: number;

  started_date?: string;
  next_step_date?: string;
  completed_date?: string;

  sequence_data?: any;
  notes?: string;
}

export interface TaskEscalation {
  id: string;
  created_at: string;

  task_id: string;
  user_id: string;

  escalation_level?: EscalationLevel;
  escalation_reason?: string;
  escalated_to?: string;

  resolved: boolean;
  resolved_at?: string;
  resolution_notes?: string;
}

export interface TaskDashboardView extends Task {
  is_overdue: boolean;
  days_until_due?: number;
  time_entry_count: number;
  comment_count: number;
  blocking_dependencies: number;
  client_name?: string;
  client_value?: number;
}

// API Request/Response types

export interface CreateTaskRequest {
  task_title: string;
  task_description?: string;
  task_type?: TaskType;
  priority?: TaskPriority;
  priority_score?: number;
  client_id?: string;
  assigned_to?: string;
  due_date?: string;
  estimated_hours?: number;
  is_recurring?: boolean;
  recurrence_pattern?: RecurrencePattern;
  recurrence_config?: RecurrenceConfig;
  is_billable?: boolean;
  hourly_rate?: number;
  checklist_items?: Omit<ChecklistItem, 'completed' | 'completed_at' | 'completed_by'>[];
  tags?: string[];
}

export interface UpdateTaskRequest extends Partial<CreateTaskRequest> {
  status?: TaskStatus;
  completion_percentage?: number;
  completed_date?: string;
  actual_hours?: number;
  completion_notes?: string;
}

export interface TaskFilters {
  status?: TaskStatus | TaskStatus[];
  priority?: TaskPriority | TaskPriority[];
  assigned_to?: string;
  client_id?: string;
  is_overdue?: boolean;
  is_recurring?: boolean;
  is_billable?: boolean;
  escalation_level?: EscalationLevel;
  tags?: string[];
  due_date_from?: string;
  due_date_to?: string;
  search?: string;
}

export interface TaskStats {
  total_tasks: number;
  pending_tasks: number;
  in_progress_tasks: number;
  completed_tasks: number;
  overdue_tasks: number;
  high_priority_tasks: number;
  total_billable_hours: number;
  total_billable_amount: number;
  tasks_by_type: Record<TaskType, number>;
  tasks_by_client: Array<{
    client_id: string;
    client_name: string;
    task_count: number;
  }>;
}
