'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  ArrowLeft,
  Clock,
  Calendar,
  User,
  MessageSquare,
  Play,
  Pause,
  Save,
  Trash2,
  CheckCircle2,
} from 'lucide-react';
import type {
  TaskDashboardView,
  TaskTimeEntry,
  TaskComment,
  TaskPriority,
  TaskStatus,
} from '@/lib/types/task';
import { useToast } from '@/hooks/use-toast';

export default function TaskDetailPage({ params }: { params: { id: string } }) {
  const router = useRouter();
  const { toast } = useToast();
  const [task, setTask] = useState<TaskDashboardView | null>(null);
  const [timeEntries, setTimeEntries] = useState<TaskTimeEntry[]>([]);
  const [comments, setComments] = useState<TaskComment[]>([]);
  const [loading, setLoading] = useState(true);
  const [isTimerRunning, setIsTimerRunning] = useState(false);
  const [timerStart, setTimerStart] = useState<Date | null>(null);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [newComment, setNewComment] = useState('');

  // Edit mode state
  const [isEditing, setIsEditing] = useState(false);
  const [editedTask, setEditedTask] = useState<Partial<TaskDashboardView>>({});

  useEffect(() => {
    fetchTask();
    fetchTimeEntries();
    fetchComments();
  }, [params.id]);

  // Timer effect
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isTimerRunning && timerStart) {
      interval = setInterval(() => {
        const now = new Date();
        const seconds = Math.floor((now.getTime() - timerStart.getTime()) / 1000);
        setElapsedSeconds(seconds);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [isTimerRunning, timerStart]);

  const fetchTask = async () => {
    try {
      const response = await fetch(`/api/tasks/${params.id}`);
      const data = await response.json();
      setTask(data.task);
      setEditedTask(data.task);
    } catch (error) {
      console.error('Error fetching task:', error);
      toast({
        title: 'Error',
        description: 'Failed to fetch task details',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchTimeEntries = async () => {
    try {
      const response = await fetch(`/api/tasks/${params.id}/time-entries`);
      const data = await response.json();
      setTimeEntries(data.time_entries || []);
    } catch (error) {
      console.error('Error fetching time entries:', error);
    }
  };

  const fetchComments = async () => {
    try {
      const response = await fetch(`/api/tasks/${params.id}/comments`);
      const data = await response.json();
      setComments(data.comments || []);
    } catch (error) {
      console.error('Error fetching comments:', error);
    }
  };

  const startTimer = () => {
    setTimerStart(new Date());
    setIsTimerRunning(true);
    setElapsedSeconds(0);
  };

  const stopTimer = async () => {
    if (!timerStart) return;

    const endTime = new Date();
    const durationMinutes = Math.floor((endTime.getTime() - timerStart.getTime()) / 60000);

    try {
      const response = await fetch(`/api/tasks/${params.id}/time-entries`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          start_time: timerStart.toISOString(),
          end_time: endTime.toISOString(),
          duration_minutes: durationMinutes,
          is_billable: task?.is_billable || false,
          hourly_rate: task?.hourly_rate,
          entry_type: 'Timer',
        }),
      });

      if (response.ok) {
        toast({
          title: 'Success',
          description: `Logged ${durationMinutes} minutes`,
        });
        setIsTimerRunning(false);
        setTimerStart(null);
        setElapsedSeconds(0);
        fetchTimeEntries();
        fetchTask();
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to log time',
        variant: 'destructive',
      });
    }
  };

  const saveTask = async () => {
    try {
      const response = await fetch(`/api/tasks/${params.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editedTask),
      });

      if (response.ok) {
        toast({
          title: 'Success',
          description: 'Task updated successfully',
        });
        setIsEditing(false);
        fetchTask();
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to update task',
        variant: 'destructive',
      });
    }
  };

  const deleteTask = async () => {
    if (!confirm('Are you sure you want to delete this task?')) return;

    try {
      const response = await fetch(`/api/tasks/${params.id}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        toast({
          title: 'Success',
          description: 'Task deleted successfully',
        });
        router.push('/tasks');
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to delete task',
        variant: 'destructive',
      });
    }
  };

  const addComment = async () => {
    if (!newComment.trim()) return;

    try {
      const response = await fetch(`/api/tasks/${params.id}/comments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ comment_text: newComment }),
      });

      if (response.ok) {
        setNewComment('');
        fetchComments();
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to add comment',
        variant: 'destructive',
      });
    }
  };

  const formatTime = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    return `${hours.toString().padStart(2, '0')}:${minutes
      .toString()
      .padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  if (loading) {
    return <div className="p-8">Loading...</div>;
  }

  if (!task) {
    return <div className="p-8">Task not found</div>;
  }

  return (
    <div className="p-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <Button variant="ghost" onClick={() => router.push('/tasks')}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Tasks
          </Button>
        </div>
        <div className="flex items-center gap-2">
          {isEditing ? (
            <>
              <Button variant="outline" onClick={() => setIsEditing(false)}>
                Cancel
              </Button>
              <Button onClick={saveTask} className="bg-coral hover:bg-coral-dark">
                <Save className="h-4 w-4 mr-2" />
                Save
              </Button>
            </>
          ) : (
            <>
              <Button variant="outline" onClick={() => setIsEditing(true)}>
                Edit
              </Button>
              <Button variant="destructive" onClick={deleteTask}>
                <Trash2 className="h-4 w-4 mr-2" />
                Delete
              </Button>
            </>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Task Details */}
          <Card className="p-6">
            {isEditing ? (
              <div className="space-y-4">
                <div>
                  <Label>Task Title</Label>
                  <Input
                    value={editedTask.task_title || ''}
                    onChange={(e) =>
                      setEditedTask({ ...editedTask, task_title: e.target.value })
                    }
                  />
                </div>
                <div>
                  <Label>Description</Label>
                  <Input
                    value={editedTask.task_description || ''}
                    onChange={(e) =>
                      setEditedTask({ ...editedTask, task_description: e.target.value })
                    }
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Priority</Label>
                    <Select
                      value={editedTask.priority}
                      onValueChange={(value: TaskPriority) =>
                        setEditedTask({ ...editedTask, priority: value })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Low">Low</SelectItem>
                        <SelectItem value="Medium">Medium</SelectItem>
                        <SelectItem value="High">High</SelectItem>
                        <SelectItem value="Urgent">Urgent</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Status</Label>
                    <Select
                      value={editedTask.status}
                      onValueChange={(value: TaskStatus) =>
                        setEditedTask({ ...editedTask, status: value })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Pending">Pending</SelectItem>
                        <SelectItem value="In_progress">In Progress</SelectItem>
                        <SelectItem value="Completed">Completed</SelectItem>
                        <SelectItem value="On_hold">On Hold</SelectItem>
                        <SelectItem value="Cancelled">Cancelled</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div>
                  <Label>Due Date</Label>
                  <Input
                    type="date"
                    value={editedTask.due_date || ''}
                    onChange={(e) =>
                      setEditedTask({ ...editedTask, due_date: e.target.value })
                    }
                  />
                </div>
              </div>
            ) : (
              <>
                <h1 className="text-3xl font-bold mb-2">{task.task_title}</h1>
                {task.task_description && (
                  <p className="text-gray-600 dark:text-gray-400 mb-4">
                    {task.task_description}
                  </p>
                )}
                <div className="flex items-center gap-2 mb-4">
                  <Badge>{task.priority}</Badge>
                  <Badge variant="outline">{task.status.replace('_', ' ')}</Badge>
                  {task.is_overdue && <Badge variant="destructive">Overdue</Badge>}
                </div>
              </>
            )}
          </Card>

          {/* Tabs */}
          <Tabs defaultValue="time" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="time">Time Tracking</TabsTrigger>
              <TabsTrigger value="comments">
                Comments ({comments.length})
              </TabsTrigger>
            </TabsList>

            {/* Time Tracking Tab */}
            <TabsContent value="time">
              <Card className="p-6">
                <div className="mb-6">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-semibold">Time Tracker</h3>
                    <div className="text-3xl font-mono">{formatTime(elapsedSeconds)}</div>
                  </div>
                  <div className="flex gap-2">
                    {!isTimerRunning ? (
                      <Button
                        onClick={startTimer}
                        className="bg-green-500 hover:bg-green-600"
                      >
                        <Play className="h-4 w-4 mr-2" />
                        Start Timer
                      </Button>
                    ) : (
                      <Button
                        onClick={stopTimer}
                        className="bg-red-500 hover:bg-red-600"
                      >
                        <Pause className="h-4 w-4 mr-2" />
                        Stop & Save
                      </Button>
                    )}
                  </div>
                </div>

                <div>
                  <h3 className="text-lg font-semibold mb-4">Time Entries</h3>
                  <div className="space-y-2">
                    {timeEntries.length === 0 ? (
                      <p className="text-gray-500">No time entries yet</p>
                    ) : (
                      timeEntries.map((entry) => (
                        <div
                          key={entry.id}
                          className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded"
                        >
                          <div>
                            <p className="font-medium">
                              {entry.duration_minutes} minutes
                            </p>
                            <p className="text-sm text-gray-500">
                              {new Date(entry.start_time).toLocaleString()}
                            </p>
                          </div>
                          {entry.is_billable && entry.amount && (
                            <div className="text-right">
                              <p className="font-semibold text-green-600">
                                ${entry.amount.toFixed(2)}
                              </p>
                            </div>
                          )}
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </Card>
            </TabsContent>

            {/* Comments Tab */}
            <TabsContent value="comments">
              <Card className="p-6">
                <div className="mb-4">
                  <div className="flex gap-2">
                    <Input
                      placeholder="Add a comment..."
                      value={newComment}
                      onChange={(e) => setNewComment(e.target.value)}
                      onKeyPress={(e) => e.key === 'Enter' && addComment()}
                    />
                    <Button onClick={addComment}>Post</Button>
                  </div>
                </div>

                <div className="space-y-4">
                  {comments.length === 0 ? (
                    <p className="text-gray-500">No comments yet</p>
                  ) : (
                    comments.map((comment) => (
                      <div
                        key={comment.id}
                        className="p-4 bg-gray-50 dark:bg-gray-800 rounded"
                      >
                        <p className="mb-2">{comment.comment_text}</p>
                        <p className="text-sm text-gray-500">
                          {new Date(comment.created_at).toLocaleString()}
                        </p>
                      </div>
                    ))
                  )}
                </div>
              </Card>
            </TabsContent>
          </Tabs>
        </div>

        {/* Sidebar */}
        <div className="space-y-4">
          <Card className="p-4">
            <h3 className="font-semibold mb-3">Details</h3>
            <div className="space-y-3">
              {task.due_date && (
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-gray-500" />
                  <span className="text-sm">
                    {new Date(task.due_date).toLocaleDateString()}
                  </span>
                </div>
              )}
              {task.client_name && (
                <div className="flex items-center gap-2">
                  <User className="h-4 w-4 text-gray-500" />
                  <span className="text-sm">{task.client_name}</span>
                </div>
              )}
              {task.total_time_minutes > 0 && (
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4 text-gray-500" />
                  <span className="text-sm">
                    {(task.total_time_minutes / 60).toFixed(1)} hours logged
                  </span>
                </div>
              )}
            </div>
          </Card>

          {task.is_billable && (
            <Card className="p-4">
              <h3 className="font-semibold mb-3">Billing</h3>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">Hourly Rate:</span>
                  <span className="font-semibold">
                    ${task.hourly_rate?.toFixed(2) || '0.00'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">Total Amount:</span>
                  <span className="font-semibold text-green-600">
                    ${task.billable_amount?.toFixed(2) || '0.00'}
                  </span>
                </div>
              </div>
            </Card>
          )}

          <Card className="p-4">
            <h3 className="font-semibold mb-3">Priority Score</h3>
            <div className="text-center">
              <div className="text-4xl font-bold text-coral">
                {task.priority_score}
              </div>
              <p className="text-sm text-gray-500 mt-1">out of 100</p>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
