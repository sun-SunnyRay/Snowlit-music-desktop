export const parseCookie = (header: string): Record<string, string> => {
  const out: Record<string, string> = {}
  for (const part of String(header || '').split(';')) {
    const idx = part.indexOf('=')
    if (idx <= 0) continue
    const key = part.slice(0, idx).trim()
    if (key) out[key] = part.slice(idx + 1).trim()
  }
  return out
}

export const cookieHas = (header: string, names: string[]): boolean => {
  const obj = parseCookie(header)
  return names.some(name => !!obj[name])
}

export const pickCookie = (cookies: Electron.Cookie[], allowDomain: (domain: string) => boolean, priority: string[]): string => {
  const now = Date.now() / 1000
  const picked = new Map<string, string>()
  for (const cookie of cookies) {
    if (!cookie?.name || !allowDomain(String(cookie.domain || ''))) continue
    if (cookie.expirationDate && cookie.expirationDate < now) continue
    if (!picked.has(cookie.name) || priority.includes(cookie.name)) {
      picked.set(cookie.name, cookie.value || '')
    }
  }
  return [...picked.entries()].map(([k, v]) => `${k}=${v}`).join('; ')
}
