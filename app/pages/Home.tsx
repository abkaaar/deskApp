import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card'
import { Badge } from '../components/ui/badge'

const stack = [
  { name: 'Electron 36', description: 'Cross-platform desktop runtime' },
  { name: 'React 19', description: 'Component-based UI' },
  { name: 'Vite 6', description: 'Fast dev server and builds' },
  { name: 'TypeScript', description: 'Type-safe development' },
  { name: 'Tailwind CSS 4', description: 'Utility-first styling' },
  { name: 'Shadcn UI', description: 'Accessible component primitives' },
  { name: 'SQLite', description: 'Local data via better-sqlite3' },
]

export function HomePage() {
  return (
    <div className="p-6 max-w-4xl mt-12">
      <div className="mb-8">
        <h1 className="text-3xl font-semibold text-foreground">DeskApp Boilerplate</h1>
        <p className="text-muted-foreground mt-2">
          A lean starting point for Electron desktop apps with React, custom window chrome, and
          SQLite-backed IPC patterns.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {stack.map((item) => (
          <Card key={item.name}>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">{item.name}</CardTitle>
              <CardDescription>{item.description}</CardDescription>
            </CardHeader>
          </Card>
        ))}
      </div>

      <Card className="mt-6">
        <CardHeader>
          <CardTitle className="text-base">Quick start</CardTitle>
          <CardDescription>Explore the included example features</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-2">
          <Badge variant="secondary">Custom titlebar + window controls</Badge>
          <Badge variant="secondary">Sidebar navigation</Badge>
          <Badge variant="secondary">Tasks page (SQLite CRUD example)</Badge>
          <Badge variant="secondary">Settings page</Badge>
        </CardContent>
      </Card>
    </div>
  )
}
