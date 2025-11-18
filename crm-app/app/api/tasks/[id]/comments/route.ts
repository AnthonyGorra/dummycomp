import { createClient } from '@/lib/supabase';
import { NextRequest, NextResponse } from 'next/server';

// GET /api/tasks/[id]/comments - Get comments for a task
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

    const { data: comments, error } = await supabase
      .from('task_comments')
      .select('*')
      .eq('task_id', params.id)
      .order('created_at', { ascending: true });

    if (error) {
      console.error('Error fetching comments:', error);
      return NextResponse.json({ error: 'Failed to fetch comments' }, { status: 500 });
    }

    return NextResponse.json({ comments });
  } catch (error) {
    console.error('Error in GET /api/tasks/[id]/comments:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST /api/tasks/[id]/comments - Create a new comment
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

    const commentData = {
      task_id: params.id,
      user_id: user.id,
      comment_text: body.comment_text,
      mentions: body.mentions || [],
      attachments: body.attachments || [],
      is_edited: false,
    };

    const { data: comment, error } = await supabase
      .from('task_comments')
      .insert(commentData)
      .select()
      .single();

    if (error) {
      console.error('Error creating comment:', error);
      return NextResponse.json({ error: 'Failed to create comment' }, { status: 500 });
    }

    // TODO: Send notifications to mentioned users

    return NextResponse.json({ comment }, { status: 201 });
  } catch (error) {
    console.error('Error in POST /api/tasks/[id]/comments:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
