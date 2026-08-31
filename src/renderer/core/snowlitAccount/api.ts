import {
  SNOWLIT_ACCOUNT_ORIGIN,
  SNOWLIT_ACCOUNT_TIMEOUT_MS,
  SNOWLIT_AUTH_ME_PATH,
  SNOWLIT_AUTH_VERIFY_PATH,
  SNOWLIT_LISTS_PATH,
  SNOWLIT_LISTS_TIMEOUT_MS,
  SNOWLIT_OTP_ORIGIN,
  SNOWLIT_OTP_SEND_PATH,
} from './config'
import { isEmail, normalizeEmail, SnowlitAccountError, type SnowlitList, type SnowlitRemovedList, type SnowlitSession } from './types'

const asHttpError = (error: unknown) => {
  if (error instanceof SnowlitAccountError) return error
  const msg = error instanceof Error ? error.message : ''
  const name = error instanceof Error ? error.name : ''
  if (name == 'AbortError' || /aborted/i.test(msg)) return new SnowlitAccountError('http', 'timeout')
  return new SnowlitAccountError('http', msg || 'http')
}

const request = async(url: string, init: RequestInit, timeoutMs = SNOWLIT_ACCOUNT_TIMEOUT_MS): Promise<unknown> => {
  let timer: ReturnType<typeof setTimeout> | undefined
  try {
    const response = await Promise.race([
      fetch(url, init),
      new Promise<Response>((_, reject) => {
        timer = setTimeout(() => {
          reject(new SnowlitAccountError('http', 'timeout'))
        }, timeoutMs)
      }),
    ])
    const text = await response.text()
    let raw: unknown = null
    if (text) {
      try {
        raw = JSON.parse(text) as unknown
      } catch {
        raw = null
      }
    }
    if (!response.ok) {
      const message = raw && typeof raw == 'object' && 'message' in raw && typeof raw.message == 'string'
        ? raw.message
        : `http ${response.status}`
      throw new SnowlitAccountError('http', message)
    }
    return raw
  } catch (error) {
    throw asHttpError(error)
  } finally {
    if (timer) clearTimeout(timer)
  }
}

const asSession = (raw: unknown, email: string): SnowlitSession => {
  if (!raw || typeof raw != 'object') throw new SnowlitAccountError('http', 'bad session')
  const token = 'token' in raw && typeof raw.token == 'string' ? raw.token : ''
  const userId = 'userId' in raw && typeof raw.userId == 'string' ? raw.userId : ''
  const nextEmail = 'email' in raw && typeof raw.email == 'string' ? normalizeEmail(raw.email) : email
  if (!token || !userId) throw new SnowlitAccountError('http', 'bad session')
  return { token, userId, email: nextEmail }
}

export const sendSnowlitCode = async(email: string) => {
  const next = normalizeEmail(email)
  if (!isEmail(next)) throw new SnowlitAccountError('bad_email')
  if (!SNOWLIT_OTP_ORIGIN) throw new SnowlitAccountError('not_wired')
  await request(`${SNOWLIT_OTP_ORIGIN}${SNOWLIT_OTP_SEND_PATH}`, {
    method: 'POST',
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ email: next }),
  })
}

export const verifySnowlitCode = async(email: string, code: string): Promise<SnowlitSession> => {
  const next = normalizeEmail(email)
  if (!isEmail(next)) throw new SnowlitAccountError('bad_email')
  if (!SNOWLIT_ACCOUNT_ORIGIN) throw new SnowlitAccountError('not_wired')
  const raw = await request(`${SNOWLIT_ACCOUNT_ORIGIN}${SNOWLIT_AUTH_VERIFY_PATH}`, {
    method: 'POST',
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ email: next, code: code.trim() }),
  })
  return asSession(raw, next)
}

export const fetchSnowlitMe = async(token: string): Promise<Pick<SnowlitSession, 'userId' | 'email'>> => {
  if (!SNOWLIT_ACCOUNT_ORIGIN) throw new SnowlitAccountError('not_wired')
  const raw = await request(`${SNOWLIT_ACCOUNT_ORIGIN}${SNOWLIT_AUTH_ME_PATH}`, {
    method: 'GET',
    headers: {
      Accept: 'application/json',
      Authorization: `Bearer ${token}`,
    },
  })
  if (!raw || typeof raw != 'object') throw new SnowlitAccountError('http', 'bad me')
  const userId = 'userId' in raw && typeof raw.userId == 'string' ? raw.userId : ''
  const email = 'email' in raw && typeof raw.email == 'string' ? normalizeEmail(raw.email) : ''
  if (!userId || !email) throw new SnowlitAccountError('http', 'bad me')
  return { userId, email }
}

const asLists = (raw: unknown): SnowlitList[] => {
  if (!raw || typeof raw != 'object' || !('lists' in raw) || !Array.isArray(raw.lists)) return []
  return raw.lists.filter((item): item is SnowlitList => {
    return !!item && typeof item == 'object'
      && typeof item.id == 'string'
      && typeof item.name == 'string'
      && typeof item.updatedAt == 'number'
      && Array.isArray(item.tracks)
  })
}

export const fetchSnowlitLists = async(token: string): Promise<SnowlitList[]> => {
  if (!SNOWLIT_ACCOUNT_ORIGIN) throw new SnowlitAccountError('not_wired')
  const raw = await request(`${SNOWLIT_ACCOUNT_ORIGIN}${SNOWLIT_LISTS_PATH}`, {
    method: 'GET',
    headers: {
      Accept: 'application/json',
      Authorization: `Bearer ${token}`,
    },
  }, SNOWLIT_LISTS_TIMEOUT_MS)
  return asLists(raw)
}

export const putSnowlitLists = async(token: string, lists: SnowlitList[], removed: SnowlitRemovedList[] = []): Promise<SnowlitList[]> => {
  if (!SNOWLIT_ACCOUNT_ORIGIN) throw new SnowlitAccountError('not_wired')
  const raw = await request(`${SNOWLIT_ACCOUNT_ORIGIN}${SNOWLIT_LISTS_PATH}`, {
    method: 'PUT',
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ lists, removed }),
  }, SNOWLIT_LISTS_TIMEOUT_MS)
  return asLists(raw)
}
