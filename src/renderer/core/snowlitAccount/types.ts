export interface SnowlitSession {
  token: string
  userId: string
  email: string
}

export interface SnowlitList {
  id: string
  name: string
  updatedAt: number
  tracks: LX.Music.MusicInfo[]
}

export type SnowlitListChoice = 'cloud' | 'local' | 'merge'

export interface SnowlitRemovedList {
  id: string
  updatedAt: number
}

export class SnowlitAccountError extends Error {
  readonly code: 'not_wired' | 'bad_email' | 'http'
  constructor(code: 'not_wired' | 'bad_email' | 'http', message: string = code) {
    super(message)
    this.name = 'SnowlitAccountError'
    this.code = code
  }
}

export const normalizeEmail = (value: string) => value.trim().toLowerCase()

export const isEmail = (value: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)
