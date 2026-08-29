import { createHttpFetch, signatureParams } from './util'

const pickStart = (data) => {
  const row = Array.isArray(data) ? data[0] : data
  if (!row || typeof row != 'object') return null
  return row.start_time ?? row.startTime ?? row.start ?? row.climax_start
}

export default async(hash) => {
  const data = JSON.stringify([{ hash }])
  const clienttime = Date.now()
  const params = `appid=1005&clienttime=${clienttime}&clientver=11451&data=${data}&dfid=-&mid=1`
  const info = await createHttpFetch(`https://expendablekmrcdn.kugou.com/v1/audio_climax/audio?${params}&signature=${signatureParams(params)}`, {
    method: 'GET',
    headers: {
      'User-Agent': 'Android712-AndroidPhone-11451-376-0-FeeCacheUpdate-wifi',
      'KG-RC': '1',
      'x-router': 'expendablekmrcdn.kugou.com',
    },
  })
  return pickStart(info)
}
