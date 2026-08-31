import { ref } from '@common/utils/vueTools'
import { getSnowlitListChoice, saveSnowlitListChoice } from '@renderer/utils/ipc'
import type { SnowlitListChoice } from '@renderer/core/snowlitAccount'

type ChoiceMap = Record<string, SnowlitListChoice>

let cache: ChoiceMap | null = null
let resolver: ((choice: SnowlitListChoice) => void) | null = null

export const snowlitListChoiceVisible = ref(false)

const readMap = async() => {
  if (cache) return cache
  const raw = await getSnowlitListChoice()
  cache = raw && typeof raw == 'object' ? raw : {}
  return cache
}

export const getListChoice = async(userId: string) => {
  const map = await readMap()
  return map[userId] || null
}

export const setListChoice = async(userId: string, choice: SnowlitListChoice) => {
  const map = { ...(await readMap()), [userId]: choice }
  cache = map
  saveSnowlitListChoice(map)
}

export const askListChoice = () => new Promise<SnowlitListChoice>((resolve) => {
  resolver = resolve
  snowlitListChoiceVisible.value = true
})

export const resolveListChoice = (choice: SnowlitListChoice) => {
  snowlitListChoiceVisible.value = false
  resolver?.(choice)
  resolver = null
}
