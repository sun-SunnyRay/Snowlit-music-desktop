import { createCipheriv, constants, publicEncrypt, randomBytes } from 'node:crypto'
import { httpFetch } from '@main/utils/request'
import { parseCookie } from '../cookie'
import { formatPlayTime, toOnlineMusic } from './format'

const linuxapiKey = Buffer.from('rFgB&h#%2?^eDg:Q')
const weapiIv = Buffer.from('0102030405060708')
const weapiPresetKey = Buffer.from('0CoJUm6Qyw8W8jud')
const weapiPublicKey = '-----BEGIN PUBLIC KEY-----\nMIGfMA0GCSqGSIb3DQEBAQUAA4GNADCBiQKBgQDgtQn2JZ34ZC28NWYpAUd98iZ37BUrX/aKzmFbt7clFSs6sXqHauqKWqdtLkF2KexO40H1YTX8z2lSgBBOAxLsvaklV8k4cBFK9snQXE9/DDaFt6Rr7iVZMldczhC0JNgTz+SHXT6CBHuX3e9SdB1Ua44oncaTWz7OBGLbCiK45wIDAQAB\n-----END PUBLIC KEY-----'
const base62 = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'

const linuxapi = (object: Record<string, unknown>) => {
  const cipher = createCipheriv('aes-128-ecb', linuxapiKey, '')
  const eparams = Buffer.concat([cipher.update(Buffer.from(JSON.stringify(object))), cipher.final()]).toString('hex').toUpperCase()
  return { eparams }
}

const weapi = (object: Record<string, unknown>) => {
  const text = JSON.stringify(object)
  const secretKey = Buffer.from([...randomBytes(16)].map(n => base62.charCodeAt(n % 62)))
  const aes = (buffer: Buffer, key: Buffer) => {
    const cipher = createCipheriv('aes-128-cbc', key, weapiIv)
    return Buffer.concat([cipher.update(buffer), cipher.final()])
  }
  const params = aes(Buffer.from(aes(Buffer.from(text), weapiPresetKey).toString('base64')), secretKey).toString('base64')
  const encSecKey = publicEncrypt(
    { key: weapiPublicKey, padding: constants.RSA_NO_PADDING },
    Buffer.concat([Buffer.alloc(128 - secretKey.length), Buffer.from(secretKey).reverse()]),
  ).toString('hex')
  return { params, encSecKey }
}

const headers = (cookie: string) => ({
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  Cookie: cookie,
  Referer: 'https://music.163.com/',
})

export const getWyStatus = async(cookie: string): Promise<LX.SourceAccount.Status> => {
  const { body } = await httpFetch<any>('https://music.163.com/weapi/nuser/account/get', {
    method: 'POST',
    headers: headers(cookie),
    form: weapi({}),
  })
  const profile = body?.profile || body?.account || {}
  const userId = String(profile.userId || profile.id || '')
  return {
    id: 'wy',
    loggedIn: !!userId || !!parseCookie(cookie).MUSIC_U,
    userId,
    nickname: profile.nickname || userId,
  }
}

export const listWyPlaylists = async(cookie: string): Promise<LX.SourceAccount.RemotePlaylist[]> => {
  const status = await getWyStatus(cookie)
  if (!status.loggedIn || !status.userId) return []
  const { body } = await httpFetch<any>('https://music.163.com/weapi/user/playlist', {
    method: 'POST',
    headers: headers(cookie),
    form: weapi({ uid: status.userId, limit: 1000, offset: 0, includeVideo: true }),
  })
  const raw = Array.isArray(body?.playlist) ? body.playlist : []
  return raw.map((pl: any) => {
    const liked = Number(pl.specialType) === 5
    return {
      source: 'wy' as const,
      id: String(pl.id),
      name: liked ? '赞过的音乐' : String(pl.name || '歌单'),
      cover: pl.coverImgUrl || '',
      trackCount: Number(pl.trackCount) || 0,
      kind: liked ? 'liked' as const : (pl.subscribed ? 'collected' as const : 'created' as const),
    }
  }).filter((pl: LX.SourceAccount.RemotePlaylist) => pl.id)
}

const mapWyTrack = (item: any): LX.Music.MusicInfoOnline | null => {
  if (!item?.id || !item.name) return null
  const artists = Array.isArray(item.ar) ? item.ar : (Array.isArray(item.artists) ? item.artists : [])
  return toOnlineMusic({
    source: 'wy',
    songmid: item.id,
    name: item.name,
    singer: artists.map((a: any) => a.name).filter(Boolean).join('、'),
    albumName: item.al?.name || item.album?.name || '',
    albumId: item.al?.id || item.album?.id,
    img: item.al?.picUrl || item.album?.picUrl || '',
    interval: formatPlayTime((item.dt || item.duration || 0) / 1000),
    types: [{ type: '128k', size: null }],
    _types: { '128k': { size: null } },
  })
}

export const listWyDailyTracks = async(cookie: string): Promise<LX.Music.MusicInfoOnline[]> => {
  const { body } = await httpFetch<any>('https://music.163.com/weapi/v3/discovery/recommend/songs', {
    method: 'POST',
    headers: headers(cookie),
    form: weapi({ limit: 30, offset: 0, total: true }),
  })
  const raw = body?.data?.dailySongs || body?.data?.recommend || body?.recommend || []
  return (Array.isArray(raw) ? raw : []).map(mapWyTrack).filter(Boolean) as LX.Music.MusicInfoOnline[]
}

export const listWyRecentTracks = async(cookie: string): Promise<LX.Music.MusicInfoOnline[]> => {
  const status = await getWyStatus(cookie)
  const { body } = await httpFetch<any>('https://music.163.com/weapi/v1/play/record', {
    method: 'POST',
    headers: headers(cookie),
    form: weapi({ uid: status.userId, type: 1 }),
  })
  const raw = body?.weekData || body?.allData || []
  return (Array.isArray(raw) ? raw : [])
    .map((item: any) => mapWyTrack(item.song || item))
    .filter(Boolean) as LX.Music.MusicInfoOnline[]
}

export const listWyTracks = async(cookie: string, id: string): Promise<LX.Music.MusicInfoOnline[]> => {
  if (id == 'daily') return listWyDailyTracks(cookie)
  if (id == 'recent') return listWyRecentTracks(cookie)
  const { body } = await httpFetch<any>('https://music.163.com/api/linux/forward', {
    method: 'POST',
    headers: {
      ...headers(cookie),
      'User-Agent': 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/60.0.3112.90 Safari/537.36',
    },
    form: linuxapi({
      method: 'POST',
      url: 'https://music.163.com/api/v3/playlist/detail',
      params: { id, n: 100000, s: 8 },
    }),
  })
  const tracks = body?.playlist?.tracks
  if (!Array.isArray(tracks)) return []
  return tracks.map(mapWyTrack).filter(Boolean) as LX.Music.MusicInfoOnline[]
}
