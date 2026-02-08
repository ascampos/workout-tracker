import { createFileRoute, useRouter } from '@tanstack/react-router'
import { createServerFn } from '@tanstack/react-start'
import { useState } from 'react'
import { useAppSession } from '@/utils/session'

const loginFn = createServerFn({ method: 'POST' })
  .inputValidator((d: { passcode: string }) => d)
  .handler(async ({ data }) => {
    if (data.passcode !== process.env.APP_PASSCODE) {
      return { error: 'Invalid passcode' }
    }
    const session = await useAppSession()
    await session.update({ authenticated: true })
    return { error: null }
  })

export const logoutFn = createServerFn({ method: 'POST' }).handler(async () => {
  const session = await useAppSession()
  await session.update({ authenticated: false })
})

export const Route = createFileRoute('/login')({
  component: LoginPage,
})

function LoginPage() {
  const router = useRouter()
  const [passcode, setPasscode] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)
    const result = await loginFn({ data: { passcode } })
    if (result?.error) {
      setError(result.error)
      setLoading(false)
    } else {
      router.invalidate()
      router.navigate({ to: '/' })
    }
  }

  return (
    <div className="flex items-center justify-center min-h-screen p-4">
      <form onSubmit={handleSubmit} className="w-full max-w-sm space-y-4">
        <h1 className="text-2xl font-bold text-center">Workout Tracker</h1>
        <input
          type="password"
          inputMode="numeric"
          placeholder="Enter passcode"
          value={passcode}
          onChange={(e) => setPasscode(e.target.value)}
          className="w-full p-4 text-lg rounded bg-gray-800 border border-gray-700 text-white placeholder-gray-500"
          autoFocus
        />
        {error && <p className="text-red-400 text-center">{error}</p>}
        <button
          type="submit"
          disabled={loading}
          className="w-full p-4 text-lg font-bold rounded bg-blue-600 hover:bg-blue-700 disabled:opacity-50"
        >
          {loading ? 'Logging in...' : 'Log In'}
        </button>
      </form>
    </div>
  )
}
