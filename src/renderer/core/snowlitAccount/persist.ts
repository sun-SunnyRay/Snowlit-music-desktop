import { getSnowlitAccount, saveSnowlitAccount } from '@renderer/utils/ipc'
import { SNOWLIT_ACCOUNT_ORIGIN } from './config'
import { fetchSnowlitMe } from './api'
import { SnowlitAccountError, type SnowlitSession } from './types'

const isSession = (raw: unknown): raw is SnowlitSession => {
  return !!raw
    && typeof raw == 'object'
    && 'token' in raw && typeof raw.token == 'string' && !!raw.token
    && 'userId' in raw && typeof raw.userId == 'string' && !!raw.userId
    && 'email' in raw && typeof raw.email == 'string' && !!raw.email
}

export const readSnowlitSession = async(): Promise<SnowlitSession | null> => {
  const raw = await getSnowlitAccount()
  return isSession(raw) ? raw : null
}

export const writeSnowlitSession = async(session: SnowlitSession | null) => {
  saveSnowlitAccount(session)
}

export const restoreSnowlitSession = async(): Promise<SnowlitSession | null> => {
  const session = await readSnowlitSession()
  if (!session) return null
  if (!SNOWLIT_ACCOUNT_ORIGIN) return session
  try {
    const me = await fetchSnowlitMe(session.token)
    const next = { ...session, userId: me.userId, email: me.email }
    if (next.userId != session.userId || next.email != session.email) {
      await writeSnowlitSession(next)
    }
    return next
  } catch (error) {
    if (error instanceof SnowlitAccountError && error.code == 'not_wired') return session
    await writeSnowlitSession(null)
    return null
  }
}
