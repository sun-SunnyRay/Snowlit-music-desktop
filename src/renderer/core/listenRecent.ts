import { LIST_IDS } from '@common/constants'
import { getListMusics, overwriteListMusics } from '@renderer/store/list/action'
import { isPlay, playMusicInfo } from '@renderer/store/player/state'

const RECENT_LIMIT = 100
const RECENT_AFTER_MS = 10_000

let inited = false
let sessionId = ''
let sessionMs = 0
let recentSaved = false
let lastWall = 0

const toMusicInfo = (music: LX.Player.PlayMusicInfo['musicInfo']): LX.Music.MusicInfo => {
  return 'progress' in music ? music.metadata.musicInfo : music
}

const pushRecent = async(musicInfo: LX.Music.MusicInfo) => {
  const list = await getListMusics(LIST_IDS.RECENT)
  const next = [musicInfo, ...list.filter(item => item.id != musicInfo.id)].slice(0, RECENT_LIMIT)
  await overwriteListMusics({ listId: LIST_IDS.RECENT, musicInfos: next })
}

export const initListenRecent = () => {
  if (inited) return
  inited = true
  setInterval(() => {
    if (!isPlay.value || playMusicInfo.isTempPlay || !playMusicInfo.musicInfo) {
      lastWall = 0
      return
    }
    const musicInfo = toMusicInfo(playMusicInfo.musicInfo)
    if (!musicInfo?.id) return
    const now = Date.now()
    const delta = lastWall ? Math.min(now - lastWall, 2000) : 1000
    lastWall = now
    if (sessionId != musicInfo.id) {
      sessionId = musicInfo.id
      sessionMs = 0
      recentSaved = false
    }
    sessionMs += delta
    if (!recentSaved && sessionMs >= RECENT_AFTER_MS) {
      recentSaved = true
      void pushRecent(musicInfo)
    }
  }, 1000)
}
