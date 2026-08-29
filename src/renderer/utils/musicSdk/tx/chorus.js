import { httpFetch } from '../../request'

const KEYS = /chorus|hot_start|climax|hook_start|ksong_start/i

const walk = (value, depth) => {
  if (value == null || depth > 3) return null
  if (typeof value == 'number' && value > 0) return value
  if (typeof value != 'object') return null
  if (Array.isArray(value)) {
    for (const item of value) {
      const found = walk(item, depth + 1)
      if (found != null) return found
    }
    return null
  }
  for (const [key, child] of Object.entries(value)) {
    if (!KEYS.test(key)) continue
    if (typeof child == 'number' && child > 0) return child
    const nested = child?.startTime ?? child?.start_time ?? child?.start
    if (typeof nested == 'number' && nested > 0) return nested
  }
  return walk(value.chorus, depth + 1) ?? walk(value.file, depth + 1) ?? walk(value.ksong, depth + 1)
}

export default async(songmid) => {
  const { body } = await httpFetch('https://u.y.qq.com/cgi-bin/musicu.fcg', {
    method: 'post',
    headers: {
      'User-Agent': 'Mozilla/5.0 (compatible; MSIE 9.0; Windows NT 6.1; WOW64; Trident/5.0)',
    },
    body: {
      comm: { ct: '19', cv: '1859', uin: '0' },
      req: {
        module: 'music.pf_song_detail_svr',
        method: 'get_song_detail_yqq',
        param: { song_type: 0, song_mid: songmid },
      },
    },
  }).promise
  if (body?.code != 0 || body?.req?.code != 0) return null
  return walk(body.req.data.track_info, 0)
}
