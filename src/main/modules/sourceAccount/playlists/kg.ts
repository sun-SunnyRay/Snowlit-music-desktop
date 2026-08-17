import { createHash } from 'node:crypto'
import { httpFetch } from '@main/utils/request'
import { parseCookie } from '../cookie'
import { formatPlayTime, toOnlineMusic } from './format'

const H5_SALT = 'NVPh5oo715z5DIWAeQlhMDsWXXQV4hwt'
const H5_SRC_APPID = '2919'
const H5_CLIENTVER = '20000'
const WEB_APPID = 1014
const ANDROID_APPID = 1005
const ANDROID_CLIENTVER = 20489
const ANDROID_SALT = 'OIlwieks28dk2k092lksi2UIkp'
const ANDROID_UA = 'Android15-1070-11083-46-0-DiscoveryDRADProtocol-wifi'

const parseKuGoo = (raw: string) => {
  const out: Record<string, string> = {}
  let text = String(raw || '').trim()
  if (!text) return out
  try { text = decodeURIComponent(text) } catch {}
  for (const part of text.split('&')) {
    const idx = part.indexOf('=')
    if (idx <= 0) continue
    out[part.slice(0, idx).trim()] = part.slice(idx + 1).trim()
  }
  return out
}

const extractAuth = (cookie: string) => {
  const obj = parseCookie(cookie)
  const kugoo = parseKuGoo(obj.KuGoo || obj.kugou || obj.Kugou || '')
  const userid = String(obj.userid || kugoo.KugooID || kugoo.userid || '').replace(/\D/g, '')
  const token = String(obj.token || kugoo.t || kugoo.token || '').trim()
  const mid = String(obj.kg_mid || obj.mid || createHash('md5').update(`xuemusic-kg:${userid || token}`).digest('hex'))
  const dfid = String(obj.kg_dfid || obj.dfid || '-')
  return { userid, token, mid, dfid, ready: !!(userid && userid !== '0' && token) }
}

const signatureH5 = (params: Record<string, string | number>, bodyObj: unknown) => {
  const parts = Object.keys(params).sort().map(key => `${key}=${params[key]}`)
  if (bodyObj && typeof bodyObj === 'object') parts.push(JSON.stringify(bodyObj))
  return createHash('md5').update(`${H5_SALT}${parts.join('')}${H5_SALT}`).digest('hex')
}

const gateway = async(path: string, cookie: string, bodyObj: Record<string, unknown>) => {
  const auth = extractAuth(cookie)
  if (!auth.ready) throw new Error('LOGIN_REQUIRED')
  const now = Date.now()
  const params: Record<string, string | number> = {
    srcappid: H5_SRC_APPID,
    clientver: H5_CLIENTVER,
    clienttime: now,
    mid: auth.mid,
    uuid: now,
    dfid: auth.dfid,
    appid: WEB_APPID,
    token: auth.token,
    userid: Number(auth.userid) || 0,
  }
  params.signature = signatureH5(params, bodyObj)
  const query = new URLSearchParams()
  for (const [k, v] of Object.entries(params)) query.set(k, String(v))
  const { body } = await httpFetch<any>(`https://gateway.kugou.com${path}?${query.toString()}`, {
    method: 'POST',
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      Referer: 'https://www.kugou.com/',
      Cookie: cookie,
      'Content-Type': 'application/json',
      'x-router': 'cloudlist.service.kugou.com',
    },
    json: bodyObj,
  })
  return body
}

const signatureAndroid = (params: Record<string, string | number>, body: string) => {
  const paramsString = Object.keys(params).sort()
    .map(key => `${key}=${typeof params[key] == 'object' ? JSON.stringify(params[key]) : params[key]}`)
    .join('')
  return createHash('md5').update(`${ANDROID_SALT}${paramsString}${body}${ANDROID_SALT}`).digest('hex')
}

const androidGateway = async(path: string, cookie: string, bodyObj: Record<string, unknown>, router: string) => {
  const auth = extractAuth(cookie)
  if (!auth.ready) throw new Error('LOGIN_REQUIRED')
  const body = JSON.stringify(bodyObj)
  const clienttime = Math.floor(Date.now() / 1000)
  const params: Record<string, string | number> = {
    dfid: auth.dfid || '-',
    mid: auth.mid,
    uuid: '-',
    appid: ANDROID_APPID,
    clientver: ANDROID_CLIENTVER,
    clienttime,
    token: auth.token,
    userid: auth.userid || 0,
  }
  params.signature = signatureAndroid(params, body)
  const query = new URLSearchParams()
  for (const [k, v] of Object.entries(params)) query.set(k, String(v))
  const { body: json } = await httpFetch<any>(`https://gateway.kugou.com${path}?${query.toString()}`, {
    method: 'POST',
    headers: {
      'User-Agent': ANDROID_UA,
      Referer: 'https://www.kugou.com/',
      Cookie: cookie,
      'Content-Type': 'application/json',
      dfid: auth.dfid || '-',
      mid: auth.mid,
      clienttime: String(clienttime),
      'kg-rc': '1',
      ...(router ? { 'x-router': router } : {}),
    },
    json: bodyObj,
  })
  return json
}

export const getKgStatus = async(cookie: string): Promise<LX.SourceAccount.Status> => {
  const auth = extractAuth(cookie)
  return {
    id: 'kg',
    loggedIn: auth.ready,
    userId: auth.userid,
    nickname: auth.userid,
  }
}

const isLikedName = (name: string) => /我喜欢|喜欢的音乐|赞过/.test(name)

export const listKgPlaylists = async(cookie: string): Promise<LX.SourceAccount.RemotePlaylist[]> => {
  const auth = extractAuth(cookie)
  if (!auth.ready) return []
  const json = await gateway('/v7/get_all_list', cookie, {
    userid: Number(auth.userid),
    token: auth.token,
    total_ver: 979,
    type: 2,
    page: 1,
    pagesize: 50,
  })
  const data = json?.data || {}
  const lists = data.info || data.lists || data.list || []
  const rows = Array.isArray(lists) ? lists : []
  return rows.map((item: any) => {
    const id = String(item.global_collection_id || item.listid || item.list_id || item.id || '')
    const name = String(item.name || item.listname || item.specialname || '歌单')
    const liked = isLikedName(name)
    return {
      source: 'kg' as const,
      id,
      name: liked ? '赞过的音乐' : name,
      cover: item.pic || item.img || item.imgurl || '',
      trackCount: Number(item.count || item.song_count) || 0,
      kind: liked ? 'liked' as const : 'created' as const,
    }
  }).filter((pl: LX.SourceAccount.RemotePlaylist) => pl.id)
}

const parseListId = (playlistId: string) => {
  const id = String(playlistId || '').trim()
  if (/^\d+$/.test(id)) return id
  const matched = id.match(/collection_\d+_\d+_(\d+)_\d+/)
  return matched ? matched[1] : id
}

const mapKgTrack = (item: any): LX.Music.MusicInfoOnline | null => {
  const hash = item.hash || item.FileHash || ''
  const name = String(item.name || item.SongName || item.filename || '').replace(/^\S+ - /, '')
  if (!hash || !name) return null
  const singers = Array.isArray(item.singerinfo) ? item.singerinfo : []
  const singer = singers.map((s: any) => s.name).filter(Boolean).join('、') || item.SingerName || ''
  return toOnlineMusic({
    source: 'kg',
    songmid: item.album_audio_id || item.mixsongid || hash,
    hash,
    name,
    singer,
    albumName: item.albuminfo?.name || item.album_name || '',
    albumId: item.albuminfo?.id || item.album_id,
    img: item.cover || item.img || '',
    interval: formatPlayTime(item.duration || (item.timelen ? Number(item.timelen) / 1000 : 0)),
    types: [{ type: '128k', size: null }],
    _types: { '128k': { size: null } },
  })
}

const extractKgSongs = (json: any): any[] => {
  const data = json?.data
  const candidates = [
    data?.info,
    data?.song_list,
    data?.songs,
    data?.list,
    data?.songlist,
    json?.info,
    json?.list,
  ]
  for (const item of candidates) {
    if (Array.isArray(item) && item.length) return item
  }
  return []
}

export const listKgDailyTracks = async(cookie: string): Promise<LX.Music.MusicInfoOnline[]> => {
  const auth = extractAuth(cookie)
  if (!auth.ready) throw new Error('LOGIN_REQUIRED')
  const clienttime = Date.now()
  const key = createHash('md5').update(`${ANDROID_APPID}${ANDROID_CLIENTVER}${clienttime}${ANDROID_SALT}`).digest('hex')
  const json = await androidGateway('/v1/app_song_list_offset', cookie, {
    appid: ANDROID_APPID,
    area_code: 1,
    clienttime,
    clientver: ANDROID_CLIENTVER,
    data: [{ fmid: '0', fmtype: 2, offset: -1, size: 20, singername: '' }],
    get_tracker: 1,
    key,
    mid: auth.mid,
    uid: Number(auth.userid || 0),
  }, 'fm.service.kugou.com')
  return extractKgSongs(json).map(mapKgTrack).filter(Boolean) as LX.Music.MusicInfoOnline[]
}

export const listKgTracks = async(cookie: string, id: string): Promise<LX.Music.MusicInfoOnline[]> => {
  if (id == 'daily') return listKgDailyTracks(cookie)
  const auth = extractAuth(cookie)
  if (!auth.ready) throw new Error('LOGIN_REQUIRED')
  const listid = parseListId(id)
  const tracks: LX.Music.MusicInfoOnline[] = []
  for (let page = 1; page <= 40; page++) {
    const json = await gateway('/v4/get_list_all_file', cookie, {
      listid: Number(listid) || listid,
      userid: Number(auth.userid),
      area_code: 1,
      show_relate_goods: 0,
      pagesize: 50,
      allplatform: 1,
      show_cover: 1,
      type: 0,
      token: auth.token,
      page,
    })
    const data = json?.data || {}
    const chunk = data.info || data.songs || data.lists || data.file || []
    const list = Array.isArray(chunk) ? chunk : []
    tracks.push(...list.map(mapKgTrack).filter(Boolean) as LX.Music.MusicInfoOnline[])
    if (list.length < 50) break
  }
  return tracks
}
