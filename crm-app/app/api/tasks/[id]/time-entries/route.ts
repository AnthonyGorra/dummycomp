import { createClient } from '@/lib/supabase';
import { NextRequest, NextResponse } from 'next/server';

// GET /api/tasks/[id]/time-entries - Get time entries for a task
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

    const { data: timeEntries, error } = await supabase
      .from('task_time_entries')
      .select('*')
      .eq('task_id', params.id)
      .order('start_time', { ascending: false });

    if (error) {
      console.error('Error fetching time entries:', error);
      return NextResponse.json({ error: 'Failed to fetch time entries' }, { status: 500 });
    }

    return NextResponse.json({ time_entries: timeEntries });
  } catch (error) {
    console.error('Error in GET /api/tasks/[id]/time-entries:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST /api/tasks/[id]/time-entries - Create a new time entry
export async function POST(
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

    const body = await request.json();

    // Calculate duration if end_time is provided
    let durationMinutes = body.duration_minutes;
    if (body.end_time && body.start_time && !durationMinutes) {
      const start = new Date(body.start_time);
      const end = new Date(body.end_time);
      durationMinutes = Math.round((end.getTime() - start.getTime()) / 60000);
    }

    // Calculate amount if billable
    let amount = 0;
    if (body.is_billable && body.hourly_rate && durationMinutes) {
      amount = (durationMinutes / 60) * body.hourly_rate;
    }

    const timeEntryData = {
      task_id: params.id,
      user_id: user.id,
      start_time: body.start_time,
      end_time: body.end_time,
      duration_minutes: durationMinutes,
      is_billable: body.is_billable || false,
      hourly_rate: body.hourly_rate,
      amount,
      description: body.description,
      entry_type: body.entry_type || 'Manual',
      is_approved: false,
    };

    // Insert time entry
    const { data: timeEntry, error } = await supabase
      .from('task_time_entries')
      .insert(timeEntryData)
      .select()
      .single();

    if (error) {
      console.error('Error creating time entry:', error);
      return NextResponse.json({ error: 'Failed to create time entry' }, { status: 500 });
    }

    // Update task total time and billable amount
    const { data: task } = await supabase
      .from('tasks')
      .select('total_time_minutes, billable_amount')
      .eq('id', params.id)
      .single();

    if (task) {
      const newTotalTime = (task.total_time_minutes || 0) + (durationMinutes || 0);
      const newBillableAmount = (task.billable_amount || 0) + (amount || 0);

      await supabase
        .from('tasks')
        .update({
          total_time_minutes: newTotalTime,
          billable_amount: newBillableAmount,
        })
        .eq('id', params.id);
    }

    return NextResponse.json({ time_entry: timeEntry }, { status: 201 });
  } catch (error) {
    console.error('Error in POST /api/tasks/[id]/time-entries:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
