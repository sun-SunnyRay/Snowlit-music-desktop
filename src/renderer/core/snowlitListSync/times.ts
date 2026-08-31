import { getSnowlitListTimes, saveSnowlitListTimes } from '@renderer/utils/ipc'

type TimeMap = Record<string, number>

let cache: TimeMap | null = null

const readMap = async() => {
  if (cache) return cache
  const raw = await getSnowlitListTimes()
  cache = raw && typeof raw == 'object' ? raw : {}
  return cache
}

export const readListTimes = async() => {
  return { ...(await readMap()) }
}

export const writeListTimes = async(map: TimeMap) => {
  cache = map
  saveSnowlitListTimes(map)
}

export const bumpListTimes = async(ids: string[], at = Date.now()) => {
  if (!ids.length) return
  const map = { ...(await readMap()) }
  for (const id of ids) map[id] = at
  await writeListTimes(map)
}
