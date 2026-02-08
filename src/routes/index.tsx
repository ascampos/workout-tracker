import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/')({
  component: HomePage,
})

function HomePage() {
  return (
    <div className="flex items-center justify-center min-h-screen p-4">
      <h1 className="text-3xl font-bold">Workout Tracker</h1>
    </div>
  )
}
