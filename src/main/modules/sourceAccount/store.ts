import { app, safeStorage } from 'electron'
import fs from 'node:fs'
import path from 'node:path'
import { cookieHas, parseCookie } from './cookie'

const ACCOUNTS: LX.SourceAccount.Id[] = ['wy', 'tx', 'kg']

const filePath = () => path.join(app.getPath('userData'), 'source-account.bin')

type StoreFile = Partial<Record<LX.SourceAccount.Id, string>>

let cache: StoreFile | null = null

const readStore = (): StoreFile => {
  if (cache) return cache
  try {
    const raw = fs.readFileSync(filePath())
    const text = safeStorage.isEncryptionAvailable()
      ? safeStorage.decryptString(raw)
      : raw.toString('utf8')
    cache = JSON.parse(text) as StoreFile
  } catch {
    cache = {}
  }
  return cache
}

const writeStore = (next: StoreFile) => {
  cache = next
  const text = JSON.stringify(next)
  const buf = safeStorage.isEncryptionAvailable()
    ? safeStorage.encryptString(text)
    : Buffer.from(text, 'utf8')
  fs.writeFileSync(filePath(), buf)
}

export const getCookie = (id: LX.SourceAccount.Id): string => {
  return readStore()[id] || ''
}

export const setCookie = (id: LX.SourceAccount.Id, cookie: string) => {
  const next = { ...readStore() }
  if (cookie) next[id] = cookie
  else delete next[id]
  writeStore(next)
}

export const clearCookie = (id: LX.SourceAccount.Id) => {
  setCookie(id, '')
}

const wyLoggedIn = (cookie: string) => cookieHas(cookie, ['MUSIC_U'])

const txLoggedIn = (cookie: string) => {
  const obj = parseCookie(cookie)
  const uin = String(obj.uin || obj.wxuin || obj.p_uin || '').replace(/^o+/i, '')
  return !!(uin && (obj.qm_keyst || obj.qqmusic_key || obj.music_key || obj.p_skey))
}

const kgLoggedIn = (cookie: string) => {
  const obj = parseCookie(cookie)
  const kugoo = obj.KuGoo || obj.kugou || obj.Kugou || ''
  const userid = String(obj.userid || '').replace(/\D/g, '')
  const token = obj.token || ''
  return !!(userid && userid !== '0' && token) || !!kugoo
}

export const isLoggedIn = (id: LX.SourceAccount.Id, cookie = getCookie(id)): boolean => {
  if (!cookie) return false
  if (id == 'wy') return wyLoggedIn(cookie)
  if (id == 'tx') return txLoggedIn(cookie)
  return kgLoggedIn(cookie)
}

export const listAccountIds = () => ACCOUNTS
