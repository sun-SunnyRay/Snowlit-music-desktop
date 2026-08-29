import { httpFetch } from '../../request'
import { eapi } from './utils/crypto'

const pickStart = (body) => {
  const chorus = body?.chorus ?? body?.data?.chorus
  if (Array.isArray(chorus) && chorus.length) {
    return chorus[0].startTime ?? chorus[0].start_time ?? chorus[0].start
  }
  if (chorus && typeof chorus == 'object') {
    return chorus.startTime ?? chorus.start_time ?? chorus.start
  }
  return null
}

export default async(songId) => {
  const url = '/api/song/chorus'
  const { body } = await httpFetch('https://interface3.music.163.com/eapi/song/chorus', {
    method: 'post',
    headers: {
      'User-Agent': 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/60.0.3112.90 Safari/537.36',
      origin: 'https://music.163.com',
    },
    form: eapi(url, {
      ids: JSON.stringify([songId]),
    }),
  }).promise
  if (body?.code != 200) return null
  return pickStart(body)
}
