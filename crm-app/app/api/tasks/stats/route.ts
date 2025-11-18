import { createClient } from '@/lib/supabase';
import { NextRequest, NextResponse } from 'next/server';
import type { TaskStats } from '@/lib/types/task';

// GET /api/tasks/stats - Get task statistics
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

    // Get all tasks for the user
    const { data: tasks, error } = await supabase
      .from('task_dashboard')
      .select('*')
      .or(`user_id.eq.${user.id},assigned_to.eq.${user.id}`);

    if (error) {
      console.error('Error fetching tasks for stats:', error);
      return NextResponse.json({ error: 'Failed to fetch stats' }, { status: 500 });
    }

    // Calculate statistics
    const stats: TaskStats = {
      total_tasks: tasks.length,
      pending_tasks: tasks.filter((t) => t.status === 'Pending').length,
      in_progress_tasks: tasks.filter((t) => t.status === 'In_progress').length,
      completed_tasks: tasks.filter((t) => t.status === 'Completed').length,
      overdue_tasks: tasks.filter((t) => t.is_overdue).length,
      high_priority_tasks: tasks.filter(
        (t) => t.priority === 'High' || t.priority === 'Urgent'
      ).length,
      total_billable_hours: tasks.reduce(
        (sum, t) => sum + (t.total_time_minutes || 0),
        0
      ) / 60,
      total_billable_amount: tasks.reduce(
        (sum, t) => sum + (t.billable_amount || 0),
        0
      ),
      tasks_by_type: {},
      tasks_by_client: [],
    };

    // Calculate tasks by type
    tasks.forEach((task) => {
      if (task.task_type) {
        stats.tasks_by_type[task.task_type] =
          (stats.tasks_by_type[task.task_type] || 0) + 1;
      }
    });

    // Calculate tasks by client
    const clientMap = new Map<string, { name: string; count: number }>();
    tasks.forEach((task) => {
      if (task.client_id && task.client_name) {
        const existing = clientMap.get(task.client_id);
        if (existing) {
          existing.count++;
        } else {
          clientMap.set(task.client_id, {
            name: task.client_name,
            count: 1,
          });
        }
      }
    });

    stats.tasks_by_client = Array.from(clientMap.entries())
      .map(([client_id, data]) => ({
        client_id,
        client_name: data.name,
        task_count: data.count,
      }))
      .sort((a, b) => b.task_count - a.task_count)
      .slice(0, 10); // Top 10 clients

    return NextResponse.json({ stats });
  } catch (error) {
    console.error('Error in GET /api/tasks/stats:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
