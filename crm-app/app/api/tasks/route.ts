import { createClient } from '@/lib/supabase';
import { NextRequest, NextResponse } from 'next/server';
import type { CreateTaskRequest, TaskFilters } from '@/lib/types/task';

// GET /api/tasks - Get all tasks with filtering
export async function GET(request: NextRequest) {
  try {
    const supabase = createClient();

    // Check authentication
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Parse query parameters for filtering
    const searchParams = request.nextUrl.searchParams;
    const filters: TaskFilters = {
      status: searchParams.get('status') as any,
      priority: searchParams.get('priority') as any,
      assigned_to: searchParams.get('assigned_to') || undefined,
      client_id: searchParams.get('client_id') || undefined,
      is_overdue: searchParams.get('is_overdue') === 'true',
      is_recurring: searchParams.get('is_recurring') === 'true',
      is_billable: searchParams.get('is_billable') === 'true',
      search: searchParams.get('search') || undefined,
    };

    // Build query from task_dashboard view
    let query = supabase
      .from('task_dashboard')
      .select('*')
      .or(`user_id.eq.${user.id},assigned_to.eq.${user.id}`)
      .order('priority_score', { ascending: false })
      .order('due_date', { ascending: true });

    // Apply filters
    if (filters.status) {
      query = query.eq('status', filters.status);
    }

    if (filters.priority) {
      query = query.eq('priority', filters.priority);
    }

    if (filters.assigned_to) {
      query = query.eq('assigned_to', filters.assigned_to);
    }

    if (filters.client_id) {
      query = query.eq('client_id', filters.client_id);
    }

    if (filters.is_overdue) {
      query = query.eq('is_overdue', true);
    }

    if (filters.is_recurring) {
      query = query.eq('is_recurring', true);
    }

    if (filters.is_billable) {
      query = query.eq('is_billable', true);
    }

    if (filters.search) {
      query = query.or(
        `task_title.ilike.%${filters.search}%,task_description.ilike.%${filters.search}%`
      );
    }

    const { data: tasks, error } = await query;

    if (error) {
      console.error('Error fetching tasks:', error);
      return NextResponse.json({ error: 'Failed to fetch tasks' }, { status: 500 });
    }

    return NextResponse.json({ tasks });
  } catch (error) {
    console.error('Error in GET /api/tasks:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST /api/tasks - Create a new task
export async function POST(request: NextRequest) {
  try {
    const supabase = createClient();

    // Check authentication
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body: CreateTaskRequest = await request.json();

    // Calculate priority score if not provided
    let priorityScore = body.priority_score || 50;

    if (!body.priority_score) {
      // Get client value if client_id is provided
      let clientValue = 0;
      if (body.client_id) {
        const { data: client } = await supabase
          .from('clients')
          .select('portfolio_value')
          .eq('id', body.client_id)
          .single();

        clientValue = client?.portfolio_value || 0;
      }

      // Use the database function to calculate priority score
      const { data: scoreData } = await supabase.rpc('calculate_priority_score', {
        p_priority: body.priority || 'Medium',
        p_due_date: body.due_date || null,
        p_client_value: clientValue,
        p_is_milestone: false,
        p_dependencies_count: 0,
      });

      if (scoreData) {
        priorityScore = scoreData;
      }
    }

    // Prepare task data
    const taskData = {
      user_id: user.id,
      task_title: body.task_title,
      task_description: body.task_description,
      task_type: body.task_type,
      priority: body.priority || 'Medium',
      priority_score: priorityScore,
      status: 'Pending',
      client_id: body.client_id,
      assigned_to: body.assigned_to || user.id,
      assigned_by: user.id,
      assignment_date: new Date().toISOString(),
      due_date: body.due_date,
      estimated_hours: body.estimated_hours,
      is_recurring: body.is_recurring || false,
      recurrence_pattern: body.recurrence_pattern,
      recurrence_config: body.recurrence_config,
      is_billable: body.is_billable || false,
      hourly_rate: body.hourly_rate,
      checklist_items: body.checklist_items || [],
      tags: body.tags || [],
      is_milestone: false,
      is_follow_up: false,
      auto_complete_on_response: false,
      completion_percentage: 0,
      total_time_minutes: 0,
      archived: false,
    };

    // Insert task
    const { data: task, error } = await supabase
      .from('tasks')
      .insert(taskData)
      .select()
      .single();

    if (error) {
      console.error('Error creating task:', error);
      return NextResponse.json({ error: 'Failed to create task' }, { status: 500 });
    }

    return NextResponse.json({ task }, { status: 201 });
  } catch (error) {
    console.error('Error in POST /api/tasks:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
