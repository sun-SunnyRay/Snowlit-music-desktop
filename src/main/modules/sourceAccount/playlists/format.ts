export const formatPlayTime = (seconds: number): string => {
  const sec = Math.max(0, Math.floor(Number(seconds) || 0))
  const m = Math.floor(sec / 60)
  const s = sec % 60
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
}

export const toOnlineMusic = (oldMusicInfo: any): LX.Music.MusicInfoOnline => {
  const meta: Record<string, any> = {
    songId: oldMusicInfo.songmid,
    albumName: oldMusicInfo.albumName,
    picUrl: oldMusicInfo.img,
    qualitys: oldMusicInfo.types || [],
    _qualitys: oldMusicInfo._types || {},
    albumId: oldMusicInfo.albumId,
  }
  const info: LX.Music.MusicInfoOnline = {
    id: `${oldMusicInfo.source}_${oldMusicInfo.songmid}`,
    name: oldMusicInfo.name,
    singer: oldMusicInfo.singer,
    source: oldMusicInfo.source,
    interval: oldMusicInfo.interval,
    meta: meta as LX.Music.MusicInfoOnline['meta'],
  }
  if (oldMusicInfo.source == 'kg') {
    meta.hash = oldMusicInfo.hash
    info.id = `${oldMusicInfo.songmid}_${oldMusicInfo.hash}`
  }
  if (oldMusicInfo.source == 'tx') {
    meta.strMediaMid = oldMusicInfo.strMediaMid
    meta.id = oldMusicInfo.songId
    meta.albumMid = oldMusicInfo.albumMid
  }
  return info
}
