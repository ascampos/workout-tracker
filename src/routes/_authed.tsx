import { createFileRoute, Link, Outlet, redirect, useRouter } from '@tanstack/react-router'
import { logoutFn } from './login'

export const Route = createFileRoute('/_authed')({
  beforeLoad: ({ context }) => {
    if (!context.user) {
      throw redirect({ to: '/login' })
    }
  },
  component: AuthedLayout,
})

function AuthedLayout() {
  const router = useRouter()

  async function handleLogout() {
    await logoutFn()
    router.invalidate()
    router.navigate({ to: '/login' })
  }

  return (
    <div className="min-h-screen flex flex-col min-w-0 overflow-x-hidden">
      <header className="flex justify-between items-center p-3 border-b border-gray-800">
        <div className="flex items-center gap-4">
          <Link to="/charts" className="text-sm text-gray-400 hover:text-white">
            Progress
          </Link>
          <Link to="/history" className="text-sm text-gray-400 hover:text-white">
            History
          </Link>
        </div>
        <button
          type="button"
          onClick={handleLogout}
          className="text-sm text-gray-400 hover:text-white"
        >
          Log out
        </button>
      </header>
      <div className="min-w-0 flex-1">
        <Outlet />
      </div>
    </div>
  )
}
