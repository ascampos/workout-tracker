import { useSession } from '@tanstack/react-start/server'

type SessionData = {
  authenticated?: boolean
}

/** 90 days - keeps session alive on mobile even when app is backgrounded for a while */
const SESSION_MAX_AGE = 90 * 24 * 60 * 60

export function useAppSession() {
  return useSession<SessionData>({
    password: process.env.SESSION_SECRET!,
    cookie: {
      maxAge: SESSION_MAX_AGE,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      httpOnly: true,
    },
  })
}
