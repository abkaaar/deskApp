import { useEffect, useState } from 'react'
import { Plus, Search, Trash2 } from 'lucide-react'
import { Button } from '../components/ui/button'
import { Input } from '../components/ui/input'
import { Card } from '../components/ui/card'
import { Switch } from '../components/ui/switch'
import { useTasksStore } from '../stores/tasksStore'

export function TasksPage() {
  const { tasks, loading, error, fetchTasks, createTask, updateTask, deleteTask, searchTasks, clearError } =
    useTasksStore()
  const [title, setTitle] = useState('')
  const [search, setSearch] = useState('')

  useEffect(() => {
    fetchTasks()
  }, [fetchTasks])

  const handleCreate = async () => {
    const trimmed = title.trim()
    if (!trimmed) return
    await createTask({ title: trimmed })
    setTitle('')
  }

  const handleSearch = async () => {
    await searchTasks(search)
  }

  const toggleCompleted = async (id: string, completed: number) => {
    await updateTask(id, { completed: completed ? 0 : 1 })
  }

  return (
    <div className="p-0">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-foreground">Tasks</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Example CRUD page wired to SQLite via IPC. Data persists in your app userData folder.
        </p>
      </div>

      {error && (
        <Card className="p-4 mb-4 border-destructive text-destructive flex items-center justify-between">
          <span className="text-sm">{error}</span>
          <Button variant="ghost" size="sm" onClick={clearError}>
            Dismiss
          </Button>
        </Card>
      )}

      <div className="flex gap-2 mb-4">
        <Input
          placeholder="New task title..."
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleCreate()}
        />
        <Button onClick={handleCreate} disabled={loading || !title.trim()}>
          <Plus className="h-4 w-4 mr-1" />
          Add
        </Button>
      </div>

      <div className="flex gap-2 mb-6">
        <Input
          placeholder="Search tasks..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
        />
        <Button variant="outline" onClick={handleSearch} disabled={loading}>
          <Search className="h-4 w-4 mr-1" />
          Search
        </Button>
        {search && (
          <Button
            variant="ghost"
            onClick={() => {
              setSearch('')
              fetchTasks()
            }}
          >
            Clear
          </Button>
        )}
      </div>

      <div className="space-y-2">
        {tasks.length === 0 && !loading && (
          <p className="text-sm text-muted-foreground">No tasks yet. Add one above.</p>
        )}
        {tasks.map((task) => (
          <Card key={task.id} className="p-4 flex items-center justify-between gap-4">
            <div className="flex items-center gap-3 min-w-0">
              <Switch
                checked={!!task.completed}
                onCheckedChange={() => toggleCompleted(task.id, task.completed)}
              />
              <span
                className={
                  task.completed ? 'line-through text-muted-foreground truncate' : 'truncate'
                }
              >
                {task.title}
              </span>
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => deleteTask(task.id)}
              disabled={loading}
              aria-label="Delete task"
            >
              <Trash2 className="h-4 w-4 text-destructive" />
            </Button>
          </Card>
        ))}
      </div>
    </div>
  )
}
