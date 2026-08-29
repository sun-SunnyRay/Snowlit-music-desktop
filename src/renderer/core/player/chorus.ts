import { setMusicInfo } from '@renderer/store/player/action'
import { playMusicInfo } from '@renderer/store/player/state'
import wyChorus from '@renderer/utils/musicSdk/wy/chorus'
import kgChorus from '@renderer/utils/musicSdk/kg/chorus'
import txChorus from '@renderer/utils/musicSdk/tx/chorus'

const cache = new Map<string, number | null>()

type PlayMusic = LX.Download.ListItem | LX.Music.MusicInfo

const unwrap = (music: PlayMusic): LX.Music.MusicInfo => {
  return 'progress' in music ? music.metadata.musicInfo : music
}

export const toChorusSec = (raw: unknown): number | null => {
  const n = typeof raw == 'string' ? parseFloat(raw) : typeof raw == 'number' ? raw : NaN
  if (!Number.isFinite(n) || n <= 0) return null
  return n >= 1000 ? n / 1000 : n
}

export const chorusProgress = (start: number | null | undefined, duration: number): number | null => {
  if (start == null || !(duration > 0) || start <= 0 || start >= duration) return null
  return start / duration
}

const fetchBySource = async(info: LX.Music.MusicInfo): Promise<number | null> => {
  switch (info.source) {
    case 'wy':
      return toChorusSec(await wyChorus(info.meta.songId))
    case 'kg':
      return toChorusSec(await kgChorus(info.meta.hash))
    case 'tx':
      return toChorusSec(await txChorus(info.meta.songId))
    case 'local': {
      const tog = info.meta.toggleMusicInfo
      return tog ? fetchBySource(tog) : null
    }
    default:
      return null
  }
}

export const fetchChorusStart = async(music: PlayMusic): Promise<number | null> => {
  const info = unwrap(music)
  if (cache.has(info.id)) return cache.get(info.id) ?? null
  try {
    const start = await fetchBySource(info)
    cache.set(info.id, start)
    return start
  } catch {
    return null
  }
}

export const loadPlayingChorus = (music: PlayMusic) => {
  void fetchChorusStart(music).then((chorusStart) => {
    if (playMusicInfo.musicInfo?.id != music.id) return
    setMusicInfo({ chorusStart })
  })
}
