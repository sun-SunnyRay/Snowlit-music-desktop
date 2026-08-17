import { httpFetch } from '@main/utils/request'
import { parseCookie } from '../cookie'
import { formatPlayTime, toOnlineMusic } from './format'

const LIKED_ID = 'liked'
const LIKED_DIRID = 201

const headers = (cookie: string) => ({
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  Cookie: cookie,
  Referer: 'https://y.qq.com/',
})

const qqUin = (cookie: string) => {
  const obj = parseCookie(cookie)
  return String(obj.uin || obj.wxuin || obj.p_uin || '').replace(/^o+/i, '')
}

export const getTxStatus = async(cookie: string): Promise<LX.SourceAccount.Status> => {
  const userId = qqUin(cookie)
  return {
    id: 'tx',
    loggedIn: !!userId,
    userId,
    nickname: userId,
  }
}

const unwrapJson = (body: any) => {
  if (body && typeof body === 'object') return body
  const text = String(body || '').trim()
  const start = text.indexOf('{')
  const end = text.lastIndexOf('}')
  if (start >= 0 && end > start) return JSON.parse(text.slice(start, end + 1))
  return {}
}

const qqGet = async(url: string, query: Record<string, string | number>, cookie: string) => {
  const { body } = await httpFetch<any>(url, {
    headers: headers(cookie),
    query,
  })
  return unwrapJson(body)
}

const mapTxPlaylist = (pl: any, kind: LX.SourceAccount.PlaylistKind): LX.SourceAccount.RemotePlaylist | null => {
  const id = String(pl.tid || pl.dissid || pl.disstid || pl.id || '')
  const name = String(pl.diss_name || pl.dissname || pl.name || '')
  if (!id || !name) return null
  if (/qzone|空间|背景音乐/i.test(name)) return null
  return {
    source: 'tx',
    id,
    name,
    cover: pl.diss_cover || pl.logo || pl.cover || '',
    trackCount: Number(pl.song_cnt || pl.songnum || pl.diss_songnum) || 0,
    kind,
  }
}

export const listTxPlaylists = async(cookie: string): Promise<LX.SourceAccount.RemotePlaylist[]> => {
  const uin = qqUin(cookie)
  if (!uin) return []
  const createdBody = await qqGet('https://c.y.qq.com/rsc/fcgi-bin/fcg_user_created_diss', {
    hostUin: 0,
    hostuin: uin,
    sin: 0,
    size: 200,
    g_tk: 5381,
    loginUin: uin,
    format: 'json',
    inCharset: 'utf8',
    outCharset: 'utf-8',
    notice: 0,
    platform: 'yqq.json',
    needNewCode: 0,
  }, cookie)
  const collectedBody = await qqGet('https://c.y.qq.com/fav/fcgi-bin/fcg_get_profile_order_asset.fcg', {
    ct: 20,
    cid: 205360956,
    userid: uin,
    reqtype: 3,
    sin: 0,
    ein: 199,
  }, cookie)
  const created = (createdBody?.data?.disslist || []).map((pl: any) => mapTxPlaylist(pl, 'created'))
  const collected = (collectedBody?.data?.cdlist || []).map((pl: any) => mapTxPlaylist(pl, 'collected'))
  const liked: LX.SourceAccount.RemotePlaylist = {
    source: 'tx',
    id: LIKED_ID,
    name: '赞过的音乐',
    cover: 'https://y.gtimg.cn/mediastyle/global/img/cover_like.png',
    kind: 'liked',
  }
  const seen = new Set<string>([LIKED_ID])
  const list = [liked]
  for (const pl of [...created, ...collected]) {
    if (!pl || seen.has(pl.id)) continue
    seen.add(pl.id)
    list.push(pl)
  }
  return list
}

const mapTxTrack = (track: any): LX.Music.MusicInfoOnline | null => {
  track = track?.songInfo || track?.song || track?.item || track
  const mid = track.songmid || track.mid || ''
  const name = track.songname || track.name || ''
  if (!mid || !name) return null
  const singers = Array.isArray(track.singer) ? track.singer : []
  const albumMid = track.albummid || track.album?.mid || ''
  return toOnlineMusic({
    source: 'tx',
    songmid: mid,
    songId: track.songid || track.id,
    name,
    singer: singers.map((s: any) => s.name).filter(Boolean).join('、'),
    albumName: track.albumname || track.album?.name || '',
    albumMid,
    strMediaMid: track.strMediaMid || track.file?.media_mid || mid,
    img: albumMid ? `https://y.gtimg.cn/music/photo_new/T002R300x300M000${albumMid}.jpg` : '',
    interval: formatPlayTime(track.interval || 0),
    types: [{ type: '128k', size: null }],
    _types: { '128k': { size: null } },
  })
}

const musicu = async(cookie: string, req: { module: string, method: string, param: Record<string, unknown> }) => {
  const uin = qqUin(cookie)
  const { body } = await httpFetch<any>('https://u.y.qq.com/cgi-bin/musicu.fcg', {
    method: 'POST',
    headers: { ...headers(cookie), 'Content-Type': 'application/json' },
    json: {
      comm: { ct: 24, cv: 0, uin },
      req_0: req,
    },
  })
  return unwrapJson(body)
}

const isTxSong = (item: any) => {
  if (!item || typeof item != 'object') return false
  const mid = item.songmid || item.mid
  const name = item.songname || item.name || item.title
  return !!(mid && name && (item.singer || item.album || item.albummid || item.interval != null || item.file))
}

const collectTxSongs = (node: any, out: any[], depth = 0) => {
  if (!node || depth > 8) return
  if (Array.isArray(node)) {
    const songs = node.filter(isTxSong)
    if (songs.length && (songs.length == node.length || songs.length >= 3)) {
      out.push(...songs)
      return
    }
    for (const item of node) collectTxSongs(item, out, depth + 1)
    return
  }
  if (typeof node != 'object') return
  if (isTxSong(node)) {
    out.push(node)
    return
  }
  for (const value of Object.values(node)) collectTxSongs(value, out, depth + 1)
}

const mapTxSongs = (body: any) => {
  const raw: any[] = []
  collectTxSongs(body, raw)
  const seen = new Set<string>()
  const tracks: LX.Music.MusicInfoOnline[] = []
  for (const item of raw) {
    const track = mapTxTrack(item)
    if (!track || seen.has(track.id)) continue
    seen.add(track.id)
    tracks.push(track)
  }
  return tracks
}

const TX_DAILY_REQS = [
  { module: 'music.offline.DailyRecommend', method: 'get_daily_recommend', param: {} },
  { module: 'tme_v2.WebDailyRecommend', method: 'GetDailyRecommend', param: {} },
  { module: 'music.recommend.RecommendFeedSvr', method: 'get_recommend_feed', param: { direction: 1, page: 1 } },
]

export const listTxDailyTracks = async(cookie: string): Promise<LX.Music.MusicInfoOnline[]> => {
  for (const req of TX_DAILY_REQS) {
    try {
      const tracks = mapTxSongs(await musicu(cookie, req)).slice(0, 30)
      if (tracks.length) return tracks
    } catch {}
  }
  return []
}

const TX_RECENT_REQS = [
  { module: 'music.recommend.RecommendServer', method: 'get_recent_play', param: { type: 1, size: 100 } },
  { module: 'music.recent.RecentPlaySvr', method: 'GetRecentPlay', param: { bizType: 1, pageSize: 100 } },
  { module: 'music.recent.RecentPlaySvr', method: 'GetRecentPlayList', param: { bizType: 1, pageSize: 100 } },
]

export const listTxRecentTracks = async(cookie: string): Promise<LX.Music.MusicInfoOnline[]> => {
  for (const req of TX_RECENT_REQS) {
    try {
      const tracks = mapTxSongs(await musicu(cookie, req))
      if (tracks.length) return tracks
    } catch {}
  }
  const uin = qqUin(cookie)
  try {
    const body = await qqGet('https://c.y.qq.com/splcloud/fcgi-bin/fcg_recentlisten_list.fcg', {
      uin,
      loginUin: uin,
      format: 'json',
      inCharset: 'utf8',
      outCharset: 'utf-8',
      notice: 0,
      platform: 'yqq.json',
      needNewCode: 0,
    }, cookie)
    return mapTxSongs(body)
  } catch {
    return []
  }
}

const listTxLikedTracks = async(cookie: string): Promise<LX.Music.MusicInfoOnline[]> => {
  const tracks: LX.Music.MusicInfoOnline[] = []
  let offset = 0
  const limit = 100
  for (let page = 0; page < 30; page++) {
    const { body } = await httpFetch<any>('https://u.y.qq.com/cgi-bin/musicu.fcg', {
      method: 'POST',
      headers: { ...headers(cookie), 'Content-Type': 'application/json' },
      json: {
        comm: { ct: 24, cv: 0 },
        req_0: {
          module: 'music.srfDissInfo.DissInfo',
          method: 'CgiGetDiss',
          param: {
            disstid: 0,
            dirid: LIKED_DIRID,
            tag: 1,
            song_begin: offset,
            song_num: limit,
            userinfo: 1,
            orderlist: 1,
          },
        },
      },
    })
    const data = body?.req_0?.data || {}
    const raw = Array.isArray(data.songlist) ? data.songlist : []
    tracks.push(...raw.map(mapTxTrack).filter(Boolean) as LX.Music.MusicInfoOnline[])
    const total = Number(data.total_song_num) || 0
    offset += raw.length
    if (!raw.length || (total && offset >= total) || raw.length < limit) break
  }
  return tracks
}

export const listTxTracks = async(cookie: string, id: string): Promise<LX.Music.MusicInfoOnline[]> => {
  if (id == 'daily') return listTxDailyTracks(cookie)
  if (id == 'recent') return listTxRecentTracks(cookie)
  if (id == LIKED_ID || id == '201') return listTxLikedTracks(cookie)
  const uin = qqUin(cookie)
  const body = await qqGet('https://c.y.qq.com/qzone/fcg-bin/fcg_ucc_getcdinfo_byids_cp.fcg', {
    type: 1,
    utf8: 1,
    disstid: id,
    loginUin: uin,
    format: 'json',
    inCharset: 'utf8',
    outCharset: 'utf-8',
    notice: 0,
    platform: 'yqq.json',
    needNewCode: 0,
  }, cookie)
  const detail = body?.cdlist?.[0] || {}
  const raw = Array.isArray(detail.songlist) ? detail.songlist : []
  return raw.map(mapTxTrack).filter(Boolean) as LX.Music.MusicInfoOnline[]
}
