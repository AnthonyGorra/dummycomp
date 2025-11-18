'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Plus,
  Search,
  Filter,
  CheckCircle2,
  Circle,
  Clock,
  AlertCircle,
  Calendar,
  User,
  DollarSign,
  Repeat,
  BarChart3,
} from 'lucide-react';
import type {
  Task,
  TaskDashboardView,
  TaskStats,
  CreateTaskRequest,
  TaskPriority,
  TaskStatus,
  TaskType,
} from '@/lib/types/task';
import { useToast } from '@/hooks/use-toast';

export default function TasksPage() {
  const [tasks, setTasks] = useState<TaskDashboardView[]>([]);
  const [filteredTasks, setFilteredTasks] = useState<TaskDashboardView[]>([]);
  const [stats, setStats] = useState<TaskStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [filterPriority, setFilterPriority] = useState<string>('all');
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const { toast } = useToast();

  // Fetch tasks
  useEffect(() => {
    fetchTasks();
    fetchStats();
  }, []);

  // Filter tasks
  useEffect(() => {
    let filtered = tasks;

    if (searchTerm) {
      filtered = filtered.filter(
        (task) =>
          task.task_title.toLowerCase().includes(searchTerm.toLowerCase()) ||
          task.task_description?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    if (filterStatus !== 'all') {
      if (filterStatus === 'overdue') {
        filtered = filtered.filter((task) => task.is_overdue);
      } else {
        filtered = filtered.filter((task) => task.status === filterStatus);
      }
    }

    if (filterPriority !== 'all') {
      filtered = filtered.filter((task) => task.priority === filterPriority);
    }

    setFilteredTasks(filtered);
  }, [tasks, searchTerm, filterStatus, filterPriority]);

  const fetchTasks = async () => {
    try {
      const response = await fetch('/api/tasks');
      const data = await response.json();
      setTasks(data.tasks || []);
    } catch (error) {
      console.error('Error fetching tasks:', error);
      toast({
        title: 'Error',
        description: 'Failed to fetch tasks',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      const response = await fetch('/api/tasks/stats');
      const data = await response.json();
      setStats(data.stats);
    } catch (error) {
      console.error('Error fetching stats:', error);
    }
  };

  const createTask = async (taskData: CreateTaskRequest) => {
    try {
      const response = await fetch('/api/tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(taskData),
      });

      if (response.ok) {
        toast({
          title: 'Success',
          description: 'Task created successfully',
        });
        setIsCreateDialogOpen(false);
        fetchTasks();
        fetchStats();
      } else {
        throw new Error('Failed to create task');
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to create task',
        variant: 'destructive',
      });
    }
  };

  const updateTaskStatus = async (taskId: string, status: TaskStatus) => {
    try {
      const response = await fetch(`/api/tasks/${taskId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      });

      if (response.ok) {
        toast({
          title: 'Success',
          description: 'Task status updated',
        });
        fetchTasks();
        fetchStats();
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to update task',
        variant: 'destructive',
      });
    }
  };

  const getPriorityColor = (priority: TaskPriority) => {
    switch (priority) {
      case 'Urgent':
        return 'bg-red-500';
      case 'High':
        return 'bg-orange-500';
      case 'Medium':
        return 'bg-yellow-500';
      case 'Low':
        return 'bg-green-500';
      default:
        return 'bg-gray-500';
    }
  };

  const getStatusIcon = (status: TaskStatus) => {
    switch (status) {
      case 'Completed':
        return <CheckCircle2 className="h-5 w-5 text-green-500" />;
      case 'In_progress':
        return <Clock className="h-5 w-5 text-blue-500" />;
      case 'On_hold':
        return <Circle className="h-5 w-5 text-gray-400" />;
      case 'Cancelled':
        return <Circle className="h-5 w-5 text-red-400" />;
      default:
        return <Circle className="h-5 w-5 text-gray-300" />;
    }
  };

  if (loading) {
    return <div className="p-8">Loading tasks...</div>;
  }

  return (
    <div className="p-8">
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold text-black dark:text-white">Tasks</h1>
          <p className="text-gray-600 dark:text-gray-400">
            Manage your tasks and track progress
          </p>
        </div>
        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button className="bg-coral hover:bg-coral-dark">
              <Plus className="h-4 w-4 mr-2" />
              New Task
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <CreateTaskDialog onSubmit={createTask} />
          </DialogContent>
        </Dialog>
      </div>

      {/* Stats Cards */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <Card className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Total Tasks</p>
                <p className="text-2xl font-bold">{stats.total_tasks}</p>
              </div>
              <BarChart3 className="h-8 w-8 text-blue-500" />
            </div>
          </Card>
          <Card className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">In Progress</p>
                <p className="text-2xl font-bold">{stats.in_progress_tasks}</p>
              </div>
              <Clock className="h-8 w-8 text-orange-500" />
            </div>
          </Card>
          <Card className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Overdue</p>
                <p className="text-2xl font-bold">{stats.overdue_tasks}</p>
              </div>
              <AlertCircle className="h-8 w-8 text-red-500" />
            </div>
          </Card>
          <Card className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Billable Hours</p>
                <p className="text-2xl font-bold">{stats.total_billable_hours.toFixed(1)}</p>
              </div>
              <DollarSign className="h-8 w-8 text-green-500" />
            </div>
          </Card>
        </div>
      )}

      {/* Filters */}
      <Card className="p-4 mb-6">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Search tasks..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>
          <Select value={filterStatus} onValueChange={setFilterStatus}>
            <SelectTrigger className="w-full md:w-48">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="Pending">Pending</SelectItem>
              <SelectItem value="In_progress">In Progress</SelectItem>
              <SelectItem value="Completed">Completed</SelectItem>
              <SelectItem value="overdue">Overdue</SelectItem>
            </SelectContent>
          </Select>
          <Select value={filterPriority} onValueChange={setFilterPriority}>
            <SelectTrigger className="w-full md:w-48">
              <SelectValue placeholder="Priority" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Priority</SelectItem>
              <SelectItem value="Urgent">Urgent</SelectItem>
              <SelectItem value="High">High</SelectItem>
              <SelectItem value="Medium">Medium</SelectItem>
              <SelectItem value="Low">Low</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </Card>

      {/* Tasks List */}
      <div className="space-y-3">
        {filteredTasks.length === 0 ? (
          <Card className="p-8 text-center">
            <p className="text-gray-500 dark:text-gray-400">No tasks found</p>
          </Card>
        ) : (
          filteredTasks.map((task) => (
            <Card key={task.id} className="p-4 hover:shadow-md transition-shadow">
              <div className="flex items-start justify-between">
                <div className="flex items-start gap-3 flex-1">
                  <button
                    onClick={() =>
                      updateTaskStatus(
                        task.id,
                        task.status === 'Completed' ? 'Pending' : 'Completed'
                      )
                    }
                  >
                    {getStatusIcon(task.status)}
                  </button>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-semibold text-lg">{task.task_title}</h3>
                      <Badge className={getPriorityColor(task.priority)}>
                        {task.priority}
                      </Badge>
                      {task.is_recurring && (
                        <Badge variant="outline">
                          <Repeat className="h-3 w-3 mr-1" />
                          Recurring
                        </Badge>
                      )}
                      {task.is_overdue && (
                        <Badge variant="destructive">Overdue</Badge>
                      )}
                    </div>
                    {task.task_description && (
                      <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                        {task.task_description}
                      </p>
                    )}
                    <div className="flex items-center gap-4 text-sm text-gray-500 dark:text-gray-400">
                      {task.due_date && (
                        <div className="flex items-center gap-1">
                          <Calendar className="h-4 w-4" />
                          {new Date(task.due_date).toLocaleDateString()}
                          {task.days_until_due !== undefined && task.days_until_due >= 0 && (
                            <span className="ml-1">
                              ({task.days_until_due} days)
                            </span>
                          )}
                        </div>
                      )}
                      {task.client_name && (
                        <div className="flex items-center gap-1">
                          <User className="h-4 w-4" />
                          {task.client_name}
                        </div>
                      )}
                      {task.is_billable && task.total_time_minutes > 0 && (
                        <div className="flex items-center gap-1">
                          <Clock className="h-4 w-4" />
                          {(task.total_time_minutes / 60).toFixed(1)}h
                          {task.billable_amount && (
                            <span className="ml-1">
                              (${task.billable_amount.toFixed(2)})
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                    {/* Progress bar for in-progress tasks */}
                    {task.status === 'In_progress' && task.completion_percentage > 0 && (
                      <div className="mt-2">
                        <div className="flex justify-between text-xs text-gray-500 mb-1">
                          <span>Progress</span>
                          <span>{task.completion_percentage}%</span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-2">
                          <div
                            className="bg-coral h-2 rounded-full transition-all"
                            style={{ width: `${task.completion_percentage}%` }}
                          />
                        </div>
                      </div>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-gray-500">
                    Score: {task.priority_score}
                  </span>
                </div>
              </div>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}

// Create Task Dialog Component
function CreateTaskDialog({ onSubmit }: { onSubmit: (task: CreateTaskRequest) => void }) {
  const [formData, setFormData] = useState<CreateTaskRequest>({
    task_title: '',
    task_description: '',
    priority: 'Medium',
    due_date: '',
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(formData);
  };

  return (
    <>
      <DialogHeader>
        <DialogTitle>Create New Task</DialogTitle>
        <DialogDescription>
          Add a new task to your personal task list
        </DialogDescription>
      </DialogHeader>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <Label htmlFor="title">Task Title *</Label>
          <Input
            id="title"
            value={formData.task_title}
            onChange={(e) =>
              setFormData({ ...formData, task_title: e.target.value })
            }
            required
          />
        </div>
        <div>
          <Label htmlFor="description">Description</Label>
          <Input
            id="description"
            value={formData.task_description || ''}
            onChange={(e) =>
              setFormData({ ...formData, task_description: e.target.value })
            }
          />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label htmlFor="priority">Priority</Label>
            <Select
              value={formData.priority}
              onValueChange={(value: TaskPriority) =>
                setFormData({ ...formData, priority: value })
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
            <Label htmlFor="due_date">Due Date</Label>
            <Input
              id="due_date"
              type="date"
              value={formData.due_date || ''}
              onChange={(e) =>
                setFormData({ ...formData, due_date: e.target.value })
              }
            />
          </div>
        </div>
        <div>
          <Label htmlFor="estimated_hours">Estimated Hours</Label>
          <Input
            id="estimated_hours"
            type="number"
            step="0.5"
            value={formData.estimated_hours || ''}
            onChange={(e) =>
              setFormData({
                ...formData,
                estimated_hours: parseFloat(e.target.value),
              })
            }
          />
        </div>
        <div className="flex items-center space-x-2">
          <input
            type="checkbox"
            id="is_billable"
            checked={formData.is_billable || false}
            onChange={(e) =>
              setFormData({ ...formData, is_billable: e.target.checked })
            }
          />
          <Label htmlFor="is_billable">Billable</Label>
        </div>
        {formData.is_billable && (
          <div>
            <Label htmlFor="hourly_rate">Hourly Rate ($)</Label>
            <Input
              id="hourly_rate"
              type="number"
              step="0.01"
              value={formData.hourly_rate || ''}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  hourly_rate: parseFloat(e.target.value),
                })
              }
            />
          </div>
        )}
        <Button type="submit" className="w-full bg-coral hover:bg-coral-dark">
          Create Task
        </Button>
      </form>
    </>
  );
}
