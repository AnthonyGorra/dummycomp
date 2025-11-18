import { createClient } from '@/lib/supabase';
import { NextRequest, NextResponse } from 'next/server';
import type { UpdateTaskRequest } from '@/lib/types/task';

// GET /api/tasks/[id] - Get a specific task
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
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

    const { data: task, error } = await supabase
      .from('task_dashboard')
      .select('*')
      .eq('id', params.id)
      .or(`user_id.eq.${user.id},assigned_to.eq.${user.id}`)
      .single();

    if (error) {
      console.error('Error fetching task:', error);
      return NextResponse.json({ error: 'Task not found' }, { status: 404 });
    }

    return NextResponse.json({ task });
  } catch (error) {
    console.error('Error in GET /api/tasks/[id]:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// PUT /api/tasks/[id] - Update a task
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
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

    const body: UpdateTaskRequest = await request.json();

    // Check if user has access to this task
    const { data: existingTask, error: fetchError } = await supabase
      .from('tasks')
      .select('*')
      .eq('id', params.id)
      .or(`user_id.eq.${user.id},assigned_to.eq.${user.id}`)
      .single();

    if (fetchError || !existingTask) {
      return NextResponse.json({ error: 'Task not found' }, { status: 404 });
    }

    // Prepare update data
    const updateData: any = {
      ...body,
      updated_at: new Date().toISOString(),
    };

    // If status is being changed to Completed, set completed_date
    if (body.status === 'Completed' && existingTask.status !== 'Completed') {
      updateData.completed_date = new Date().toISOString();
      updateData.completion_percentage = 100;
    }

    // Recalculate priority score if priority or due date changed
    if (body.priority || body.due_date) {
      let clientValue = 0;
      if (existingTask.client_id) {
        const { data: client } = await supabase
          .from('clients')
          .select('portfolio_value')
          .eq('id', existingTask.client_id)
          .single();

        clientValue = client?.portfolio_value || 0;
      }

      const { data: scoreData } = await supabase.rpc('calculate_priority_score', {
        p_priority: body.priority || existingTask.priority,
        p_due_date: body.due_date || existingTask.due_date,
        p_client_value: clientValue,
        p_is_milestone: existingTask.is_milestone || false,
        p_dependencies_count: 0,
      });

      if (scoreData) {
        updateData.priority_score = scoreData;
      }
    }

    // Update task
    const { data: task, error } = await supabase
      .from('tasks')
      .update(updateData)
      .eq('id', params.id)
      .select()
      .single();

    if (error) {
      console.error('Error updating task:', error);
      return NextResponse.json({ error: 'Failed to update task' }, { status: 500 });
    }

    return NextResponse.json({ task });
  } catch (error) {
    console.error('Error in PUT /api/tasks/[id]:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// DELETE /api/tasks/[id] - Delete (archive) a task
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
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

    // Check if user owns this task
    const { data: existingTask, error: fetchError } = await supabase
      .from('tasks')
      .select('*')
      .eq('id', params.id)
      .eq('user_id', user.id)
      .single();

    if (fetchError || !existingTask) {
      return NextResponse.json({ error: 'Task not found or unauthorized' }, { status: 404 });
    }

    // Archive instead of hard delete
    const { error } = await supabase
      .from('tasks')
      .update({
        archived: true,
        archived_at: new Date().toISOString(),
      })
      .eq('id', params.id);

    if (error) {
      console.error('Error archiving task:', error);
      return NextResponse.json({ error: 'Failed to delete task' }, { status: 500 });
    }

    return NextResponse.json({ message: 'Task deleted successfully' });
  } catch (error) {
    console.error('Error in DELETE /api/tasks/[id]:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
