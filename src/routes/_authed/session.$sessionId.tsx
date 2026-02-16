import { createFileRoute, Link } from '@tanstack/react-router'
import { useState, useMemo } from 'react'
import { updateSetFn, deleteSetFn, type SessionSet } from '@/utils/log-sets'
import { SessionCard, EditSetModal } from '@/components/session-card'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { sessionHistoryQuery, queryKeys } from '@/lib/queries'

export const Route = createFileRoute('/_authed/session/$sessionId')({
  component: SessionDetailPage,
})

function SessionDetailPage() {
  const { sessionId } = Route.useParams()
  const { data, isLoading: loading, error } = useQuery(sessionHistoryQuery())
  const session = useMemo(
    () => data?.sessions.find((s) => s.session_id === sessionId) ?? null,
    [data, sessionId]
  )
  const queryClient = useQueryClient()
  const [editingSet, setEditingSet] = useState<SessionSet | null>(null)
  const [operatingSetId, setOperatingSetId] = useState<string | null>(null)

  const handleSaveSet = async (id: string, weight: number, reps: number, notes: string) => {
    setOperatingSetId(id)
    try {
      const result = await updateSetFn({ data: { id, weight, reps, notes } })
      if (!result.success) throw new Error(result.error)
      await queryClient.invalidateQueries({ queryKey: queryKeys.sessionHistory() })
    } finally {
      setOperatingSetId(null)
    }
  }

  const handleDeleteSet = async (set: SessionSet) => {
    const confirmed = window.confirm(
      `Delete this set: ${set.weight} ${set.unit} × ${set.reps}?\n\nThis cannot be undone.`
    )
    if (!confirmed) return

    setOperatingSetId(set.id)
    try {
      const result = await deleteSetFn({ data: { id: set.id } })
      if (!result.success) throw new Error(result.error)
      await queryClient.invalidateQueries({ queryKey: queryKeys.sessionHistory() })
    } catch (err) {
      alert(`Failed to delete set: ${err instanceof Error ? err.message : 'Unknown error'}`)
    } finally {
      setOperatingSetId(null)
    }
  }

  return (
    <div className="p-4 max-w-2xl mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <Link
          to="/"
          className="text-gray-400 hover:text-white shrink-0"
          aria-label="Back to home"
        >
          ←
        </Link>
        <h1 className="text-2xl font-bold">Session</h1>
      </div>

      {loading && (
        <p className="text-gray-400 py-8 text-center">Loading session…</p>
      )}
      {error && (
        <p className="text-red-400 py-4 text-center" role="alert">
          {error instanceof Error ? error.message : 'Failed to load session'}
        </p>
      )}
      {!loading && !error && !session && (
        <p className="text-gray-400 py-8 text-center">
          Session not found.
        </p>
      )}
      {!loading && !error && session && (
        <SessionCard
          session={session}
          onEditSet={setEditingSet}
          onDeleteSet={handleDeleteSet}
          operatingSetId={operatingSetId}
        />
      )}

      {editingSet && (
        <EditSetModal
          set={editingSet}
          onClose={() => setEditingSet(null)}
          onSave={handleSaveSet}
        />
      )}
    </div>
  )
}
