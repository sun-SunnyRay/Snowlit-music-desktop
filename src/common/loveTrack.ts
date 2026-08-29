const SINGER_SPLIT = /[,，、/&;；|]/

const normName = (name: string) => name.replace(/\s+/g, '').toLowerCase()

const splitSingers = (singer: string) => {
  return singer.split(SINGER_SPLIT).map(item => item.trim().toLowerCase()).filter(Boolean)
}

const singersOverlap = (a: string, b: string) => {
  const left = splitSingers(a)
  const right = splitSingers(b)
  if (!left.length || !right.length) return !!a && !!b && a.trim().toLowerCase() == b.trim().toLowerCase()
  const set = new Set(left)
  return right.some(item => set.has(item))
}

export const sameLoveTrack = (
  a: { name: string, singer: string },
  b: { name: string, singer: string },
) => {
  if (normName(a.name) != normName(b.name)) return false
  return singersOverlap(a.singer, b.singer)
}

export const isLovedMusic = (list: LX.Music.MusicInfo[], music: LX.Music.MusicInfo) => {
  return list.some(item => item.id == music.id || sameLoveTrack(item, music))
}

export const loveIdsForTrack = (list: LX.Music.MusicInfo[], music: LX.Music.MusicInfo) => {
  return list.filter(item => item.id == music.id || sameLoveTrack(item, music)).map(item => item.id)
}

export const collapseLoveList = (list: LX.Music.MusicInfo[]) => {
  const groups: LX.Music.MusicInfo[][] = []
  for (const item of list) {
    const group = groups.find(g => g.some(m => m.id == item.id || sameLoveTrack(m, item)))
    if (group) group.push(item)
    else groups.push([item])
  }
  return groups.map(group => group[group.length - 1])
}

export const upsertLoveInto = (
  list: LX.Music.MusicInfo[],
  incoming: LX.Music.MusicInfo[],
  loc: LX.AddMusicLocationType,
) => {
  const next = [...list]
  const fresh: LX.Music.MusicInfo[] = []
  for (const music of incoming) {
    let replaced = false
    for (let i = 0; i < next.length; i++) {
      if (next[i].id != music.id && !sameLoveTrack(next[i], music)) continue
      if (!replaced) {
        next[i] = music
        replaced = true
      } else {
        next.splice(i, 1)
        i--
      }
    }
    if (!replaced) fresh.push(music)
  }
  if (!fresh.length) return next
  if (loc == 'top') return [...fresh, ...next]
  return [...next, ...fresh]
}

export const playingListMusic = (info: LX.Music.MusicInfo | LX.Download.ListItem | null | undefined): LX.Music.MusicInfo | null => {
  if (!info) return null
  return 'progress' in info ? info.metadata.musicInfo : info
}

export const loveListUnchanged = (list: LX.Music.MusicInfo[], next: LX.Music.MusicInfo[]) => {
  return next.length == list.length && next.every((item, i) => item.id == list[i].id)
}
