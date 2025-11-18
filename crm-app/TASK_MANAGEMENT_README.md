# Task Management System Documentation

## Overview

The Task Management System is a comprehensive feature set that provides personal task lists, team collaboration, time tracking, recurring tasks, workflow automation, and intelligent priority scoring for the CRM application.

## Features Implemented

### 1. Personal Task Lists with Priority Scoring

Each user has their own personal task list that is completely separate and private to their account. Tasks are automatically scored on a 0-100 scale based on multiple factors:

- **Base Priority**: Urgent (90), High (70), Medium (50), Low (30)
- **Time Urgency**: Additional points for approaching deadlines
- **Client Value**: Bonus points for high-value clients
- **Milestone Status**: Extra points for critical milestones
- **Dependencies**: Points for tasks blocking other tasks

The priority scoring system automatically calculates and updates scores to help users focus on the most important work.

### 2. Recurring Task Automation

Tasks can be set to recur automatically on various schedules:

- **Daily**: Every N days
- **Weekly**: Every N weeks
- **Monthly**: Every N months
- **Quarterly**: Every 3 months
- **Annually**: Every year
- **Custom**: Complex rules (e.g., 2nd Tuesday of each month)

When a recurring task is completed, the system automatically creates the next occurrence based on the recurrence pattern. This is perfect for:
- Annual client reviews
- Quarterly compliance checks
- Monthly reporting
- Regular client touchpoints

### 3. Team Task Assignment and Collaboration

- **Assignment**: Tasks can be assigned to specific team members
- **Collaborators**: Multiple users can collaborate on a single task
- **Comments**: Team members can discuss tasks with threaded comments
- **Mentions**: Tag other users in comments to notify them
- **History Tracking**: Full audit trail of all task changes
- **Permissions**: Users can only see tasks they created or are assigned to

### 4. Workflow Templates for Common Processes

Pre-built workflow templates make it easy to standardize common processes:

- **Client Onboarding**: Step-by-step tasks for new clients
- **Annual Reviews**: Comprehensive review checklist
- **Compliance Checks**: Regulatory compliance workflows
- **Investment Reviews**: Portfolio review processes

Templates can be customized and reused, saving time and ensuring consistency.

### 5. Deadline Tracking with Escalation Alerts

The system monitors task deadlines and automatically escalates based on configured rules:

- **Warning Level**: N days before due date
- **Critical Level**: Task approaching due date
- **Overdue Level**: Task past due date

Escalation can:
- Send email notifications
- Change task priority score
- Notify supervisors or assigned users
- Create audit trail entries

### 6. Task Dependencies and Workflow Sequencing

Tasks can be linked in sequences:

- **Dependencies**: Mark tasks that must be completed before others
- **Blocking**: See which tasks are blocked by current task
- **Sequence Order**: Number tasks in a workflow sequence
- **Milestones**: Mark critical checkpoints in workflows

This ensures work flows in the correct order and nothing gets missed.

### 7. Time Tracking for Billable Hours

Comprehensive time tracking system for productivity and billing:

- **Timer**: Start/stop timer to track time in real-time
- **Manual Entry**: Add time entries manually
- **Billable/Non-billable**: Mark entries as billable or internal
- **Hourly Rates**: Set rates per task or user
- **Automatic Calculation**: System calculates billable amounts
- **Reporting**: View total hours and amounts by task, client, or period
- **Approval Workflow**: Time entries can be approved by managers

### 8. Automated Follow-up Sequences

Create automated follow-up sequences triggered by events:

**Triggers**:
- Client created
- Meeting scheduled
- Document sent
- Date-based
- Status changes
- Manual activation

**Sequence Steps**:
- Each step has a delay (days after trigger/previous step)
- Automatically creates tasks at the right time
- Can use task templates for consistency
- Tracks completion and progress

**Example Sequences**:
- New client onboarding (Day 1: Welcome call, Day 3: Send documents, Day 7: Review meeting)
- Post-meeting follow-up (Day 1: Send notes, Day 3: Check for questions, Day 7: Next steps)
- Compliance reminders (Quarterly: Review compliance, Monthly: Update records)

## Database Schema

### Core Tables

#### tasks
Main task table with all task properties including:
- Basic info (title, description, type)
- Assignment (owner, assigned_to, collaborators)
- Priority (priority, priority_score)
- Status and completion tracking
- Recurrence configuration
- Time tracking totals
- Escalation settings
- Dependencies
- Follow-up configuration

#### task_templates
Reusable task templates for common task types

#### task_time_entries
Detailed time tracking entries with:
- Start/end times
- Duration
- Billable status and rates
- Approval workflow

#### task_comments
Team collaboration and discussion

#### task_history
Complete audit trail of all changes

#### follow_up_sequences
Automated follow-up sequence definitions

#### follow_up_sequence_instances
Active follow-up sequences in progress

#### task_escalations
Escalation history and tracking

### Database Functions

#### calculate_priority_score()
Automatically calculates priority scores based on multiple factors

#### generate_recurring_task()
Trigger function that creates next occurrence when recurring task is completed

#### track_task_changes()
Trigger function that logs all task changes to history table

### Views

#### task_dashboard
Optimized view combining task data with calculated metrics:
- Overdue status
- Days until due
- Time entry count
- Comment count
- Blocking dependencies
- Client information

## API Endpoints

### Tasks
- `GET /api/tasks` - List all tasks with filtering
- `POST /api/tasks` - Create new task
- `GET /api/tasks/:id` - Get task details
- `PUT /api/tasks/:id` - Update task
- `DELETE /api/tasks/:id` - Archive task

### Time Tracking
- `GET /api/tasks/:id/time-entries` - Get time entries
- `POST /api/tasks/:id/time-entries` - Create time entry

### Comments
- `GET /api/tasks/:id/comments` - Get comments
- `POST /api/tasks/:id/comments` - Add comment

### Statistics
- `GET /api/tasks/stats` - Get task statistics and analytics

## User Interface

### Tasks Page (`/tasks`)

Main task list with:
- Quick stats dashboard (total, in progress, overdue, billable hours)
- Search and filtering (status, priority, client, etc.)
- Task cards with priority badges, due dates, progress bars
- Quick status updates
- Priority score display

### Task Detail Page (`/tasks/:id`)

Comprehensive task management:
- Full task details with inline editing
- Time tracking with start/stop timer
- Time entry history
- Comments and collaboration
- Client and billing information
- Priority score breakdown

### Features in UI

1. **Real-time Timer**: Start/stop timer that tracks time automatically
2. **Progress Tracking**: Visual progress bars for in-progress tasks
3. **Priority Badges**: Color-coded priority indicators
4. **Overdue Alerts**: Clear visual indicators for overdue tasks
5. **Quick Actions**: Fast status updates, assignments
6. **Filtering**: Multiple filter options to find tasks quickly
7. **Stats Dashboard**: At-a-glance metrics

## Usage Examples

### Creating a Personal Task

```typescript
const task = {
  task_title: "Review client portfolio",
  task_description: "Annual portfolio review for Smith family",
  priority: "High",
  client_id: "client-uuid",
  due_date: "2025-12-31",
  is_billable: true,
  hourly_rate: 150.00,
  estimated_hours: 2.5
};
```

### Setting up a Recurring Task

```typescript
const recurringTask = {
  task_title: "Quarterly compliance check",
  priority: "High",
  is_recurring: true,
  recurrence_pattern: "quarterly",
  recurrence_interval: 1,
  recurrence_end_date: "2026-12-31"
};
```

### Creating a Follow-up Sequence

```typescript
const sequence = {
  sequence_name: "New Client Onboarding",
  trigger_event: "Client_Created",
  sequence_steps: [
    {
      step_number: 1,
      step_name: "Welcome Call",
      delay_days: 0,
      task_config: {
        task_title: "Schedule welcome call",
        priority: "High"
      }
    },
    {
      step_number: 2,
      step_name: "Send Documents",
      delay_days: 2,
      task_config: {
        task_title: "Send onboarding documents",
        priority: "Medium"
      }
    },
    {
      step_number: 3,
      step_name: "Follow-up Meeting",
      delay_days: 7,
      task_config: {
        task_title: "Schedule follow-up meeting",
        priority: "Medium"
      }
    }
  ]
};
```

### Tracking Time

Users can either:
1. Use the built-in timer (click Start, work on task, click Stop)
2. Manually enter time after completion
3. Import time from other systems

All time entries are tracked separately and aggregated on the task.

## Implementation Notes

### Personal Task Lists

All tasks are scoped to the user account via Row Level Security (RLS) policies. The database ensures:
- Users can only see their own tasks OR tasks assigned to them
- Tasks created by a user are owned by that user
- Collaborators can view and comment but not delete
- Full data isolation between users

### Recurring Tasks

The `generate_recurring_task()` trigger automatically creates the next occurrence when a recurring task is marked as completed. The system:
- Calculates the next due date based on pattern
- Creates a new task with same properties
- Links it to the parent recurring task
- Stops if recurrence end date is reached

### Priority Scoring

Priority scores are recalculated automatically when:
- Priority is changed
- Due date is changed
- Task is assigned to a different client
- Dependencies are added/removed

### Security

All API endpoints:
- Require authentication
- Check user permissions
- Validate input data
- Use parameterized queries
- Enforce RLS policies

## Migration Instructions

1. Run the migration SQL file:
   ```bash
   psql -U your_user -d your_database -f supabase_task_management_migration.sql
   ```

2. The migration will:
   - Add new columns to existing tasks table
   - Create new supporting tables
   - Set up indexes for performance
   - Create database functions and triggers
   - Enable Row Level Security
   - Create RLS policies

3. All existing tasks will be preserved with default values for new fields

## Future Enhancements

Potential additions:
- Email notifications for task assignments and comments
- Mobile app with push notifications
- Gantt chart view for task dependencies
- Advanced reporting and analytics
- Integration with calendar systems
- Voice input for task creation
- AI-powered task suggestions
- Batch operations on tasks
- Custom fields and metadata
- Export to various formats

## Support

For issues or questions about the task management system, please refer to the main CRM documentation or contact your system administrator.
