import type { SnowlitList } from '@renderer/core/snowlitAccount'

const trackKey = (track: LX.Music.MusicInfo) => `${track.source}\0${track.id}`

export const syncableTracks = (tracks: LX.Music.MusicInfo[]) => {
  const seen = new Set<string>()
  const next: LX.Music.MusicInfo[] = []
  for (const track of tracks) {
    if (!track || track.source == 'local') continue
    const key = trackKey(track)
    if (seen.has(key)) continue
    seen.add(key)
    next.push(track)
  }
  return next
}

export const packHasSongs = (lists: SnowlitList[]) => lists.some(list => list.tracks.length > 0)

export const mergeListPacks = (local: SnowlitList[], remote: SnowlitList[]): SnowlitList[] => {
  const map = new Map<string, SnowlitList>()
  for (const list of local) map.set(list.id, { ...list, tracks: syncableTracks(list.tracks) })
  for (const list of remote) {
    const prev = map.get(list.id)
    if (!prev) {
      map.set(list.id, { ...list, tracks: syncableTracks(list.tracks) })
      continue
    }
    const newer = list.updatedAt >= prev.updatedAt ? list : prev
    const older = newer == list ? prev : list
    map.set(list.id, {
      id: newer.id,
      name: newer.name,
      updatedAt: Math.max(list.updatedAt, prev.updatedAt),
      tracks: syncableTracks([...newer.tracks, ...older.tracks]),
    })
  }
  return Array.from(map.values())
}

export const pickNewerPacks = (local: SnowlitList[], remote: SnowlitList[]): SnowlitList[] => {
  const map = new Map<string, SnowlitList>()
  for (const list of local) map.set(list.id, list)
  for (const list of remote) {
    const prev = map.get(list.id)
    if (!prev || list.updatedAt >= prev.updatedAt) map.set(list.id, list)
  }
  return Array.from(map.values())
}

const trackSetKey = (tracks: LX.Music.MusicInfo[]) => {
  const keys = syncableTracks(tracks).map(track => trackKey(track))
  keys.sort()
  return keys.join('\n')
}

export const listNeedsApply = (local: SnowlitList | undefined, incoming: SnowlitList) => {
  if (!local) return true
  if (local.name != incoming.name) return true
  if (incoming.updatedAt > local.updatedAt) return true
  return trackSetKey(local.tracks) != trackSetKey(incoming.tracks)
}

export const listsNeedApply = (local: SnowlitList[], incoming: SnowlitList[]) => {
  const localById = new Map(local.map(list => [list.id, list]))
  return incoming.filter(list => listNeedsApply(localById.get(list.id), list))
}
