import { useSession } from '@tanstack/react-start/server'

type SessionData = {
  authenticated?: boolean
}

export function useAppSession() {
  return useSession<SessionData>({
    password: process.env.SESSION_SECRET!,
  })
}
