import { LIST_IDS } from '@common/constants'
import { toRaw } from '@common/utils/vueTools'
import {
  fetchSnowlitLists,
  putSnowlitLists,
  type SnowlitList,
  type SnowlitListChoice,
  type SnowlitRemovedList,
} from '@renderer/core/snowlitAccount'
import { createUserList, getListMusics, overwriteListMusics, removeUserList, updateUserList } from '@renderer/store/list/action'
import { userLists } from '@renderer/store/list/state'
import { snowlitAccountState } from '@renderer/store/snowlitAccount'
import { askListChoice, getListChoice, setListChoice } from './choice'
import { canSyncListId, SYNC_FIXED_IDS } from './ids'
import { mergeListPacks, packHasSongs, pickNewerPacks, syncableTracks } from './shape'
import { bumpListTimes, readListTimes, writeListTimes } from './times'

const FIXED_NAME: Record<string, string> = {
  [LIST_IDS.LOVE]: '我的收藏',
  [LIST_IDS.DEFAULT]: '试听列表',
  [LIST_IDS.RECENT]: '最近播放',
}

const PUSH_WAIT_MS = 2000

let applying = false
let inflight = false
let queued = false
let timer: ReturnType<typeof setTimeout> | null = null
let pendingRemoved: SnowlitRemovedList[] = []

const session = () => snowlitAccountState.session

const waitApply = () => new Promise<void>((resolve) => { setTimeout(resolve, 80) })

const collectLocal = async(): Promise<SnowlitList[]> => {
  const times = await readListTimes()
  const lists: SnowlitList[] = []
  for (const id of SYNC_FIXED_IDS) {
    lists.push({
      id,
      name: FIXED_NAME[id] || id,
      updatedAt: times[id] || 0,
      tracks: syncableTracks((await getListMusics(id)).map(item => toRaw(item))),
    })
  }
  for (const info of userLists) {
    if (!canSyncListId(info.id) || SYNC_FIXED_IDS.includes(info.id as typeof SYNC_FIXED_IDS[number])) continue
    lists.push({
      id: info.id,
      name: info.name,
      updatedAt: times[info.id] || 0,
      tracks: syncableTracks((await getListMusics(info.id)).map(item => toRaw(item))),
    })
  }
  return lists
}

const stampPack = (lists: SnowlitList[], at = Date.now()): SnowlitList[] => {
  return lists.map(list => ({ ...list, updatedAt: Math.max(list.updatedAt, at) }))
}

const applyPack = async(lists: SnowlitList[], dropLocalOnly: boolean) => {
  applying = true
  try {
    const incoming = new Set(lists.map(list => list.id))
    if (dropLocalOnly) {
      const drop = userLists.filter(info => canSyncListId(info.id) && !(SYNC_FIXED_IDS as readonly string[]).includes(info.id) && !incoming.has(info.id)).map(info => info.id)
      if (drop.length) await removeUserList(drop)
    }
    for (const list of lists) {
      if (list.id == LIST_IDS.LOVE || list.id == LIST_IDS.DEFAULT || list.id == LIST_IDS.RECENT) {
        await overwriteListMusics({ listId: list.id, musicInfos: list.tracks })
        continue
      }
      const prev = userLists.find(info => info.id == list.id)
      if (!prev) {
        await createUserList({ id: list.id, name: list.name, list: list.tracks })
        continue
      }
      if (prev.name != list.name) {
        await updateUserList([{ ...toRaw(prev), name: list.name }])
      }
      await overwriteListMusics({ listId: list.id, musicInfos: list.tracks })
    }
    const times = await readListTimes()
    for (const list of lists) times[list.id] = list.updatedAt
    await writeListTimes(times)
  } finally {
    await waitApply()
    applying = false
  }
}

const decidePack = async(local: SnowlitList[], remote: SnowlitList[], userId: string): Promise<{ lists: SnowlitList[], dropLocalOnly: boolean, stamp: boolean }> => {
  const saved = await getListChoice(userId)
  if (saved) return { lists: pickNewerPacks(local, remote), dropLocalOnly: false, stamp: false }
  const localHas = packHasSongs(local)
  const remoteHas = packHasSongs(remote)
  if (localHas && remoteHas) {
    const choice: SnowlitListChoice = await askListChoice()
    await setListChoice(userId, choice)
    if (choice == 'cloud') return { lists: remote, dropLocalOnly: true, stamp: false }
    if (choice == 'local') return { lists: local, dropLocalOnly: false, stamp: true }
    return { lists: mergeListPacks(local, remote), dropLocalOnly: false, stamp: true }
  }
  if (remoteHas && !localHas) {
    await setListChoice(userId, 'cloud')
    return { lists: remote, dropLocalOnly: false, stamp: false }
  }
  if (localHas && !remoteHas) {
    await setListChoice(userId, 'local')
    return { lists: local, dropLocalOnly: false, stamp: true }
  }
  return { lists: pickNewerPacks(local, remote), dropLocalOnly: false, stamp: false }
}

const putNow = async() => {
  const current = session()
  if (!current || applying) return
  const lists = await collectLocal()
  const next = await putSnowlitLists(current.token, lists, pendingRemoved)
  const remoteIds = new Set(next.map(list => list.id))
  pendingRemoved = pendingRemoved.filter(item => remoteIds.has(item.id))
  const times = await readListTimes()
  for (const list of next) {
    const local = lists.find(item => item.id == list.id)
    if (local && local.updatedAt > list.updatedAt) continue
    times[list.id] = list.updatedAt
  }
  await writeListTimes(times)
}

const flushPush = async() => {
  if (inflight) {
    queued = true
    return
  }
  inflight = true
  try {
    await putNow()
  } catch {
    // background push retries on the next local change
  } finally {
    inflight = false
    if (queued) {
      queued = false
      void flushPush()
    }
  }
}

const schedulePush = () => {
  if (applying || !session()) return
  if (timer) clearTimeout(timer)
  timer = setTimeout(() => {
    timer = null
    void flushPush()
  }, PUSH_WAIT_MS)
}

export const onSnowlitLocalListsChanged = (ids: string[]) => {
  if (applying || !session()) return
  const now = Date.now()
  const live = new Set(userLists.map(info => info.id))
  const nextIds = ids.filter(canSyncListId)
  for (const id of nextIds) {
    if (id == LIST_IDS.LOVE || id == LIST_IDS.DEFAULT || id == LIST_IDS.RECENT) continue
    if (!live.has(id)) pendingRemoved.push({ id, updatedAt: now })
  }
  if (!nextIds.length) return
  void bumpListTimes(nextIds, now).then(() => { schedulePush() })
}

export const syncSnowlitLists = async() => {
  const current = session()
  if (!current) return
  const remote = await fetchSnowlitLists(current.token)
  const local = await collectLocal()
  const decided = await decidePack(local, remote, current.userId)
  let next = decided.lists
  if (decided.stamp) {
    next = stampPack(next)
    const times = await readListTimes()
    for (const list of next) times[list.id] = list.updatedAt
    await writeListTimes(times)
  }
  const localById = new Map(local.map(list => [list.id, list]))
  const changed = next.filter(list => {
    const prev = localById.get(list.id)
    if (!prev) return true
    return list.updatedAt > prev.updatedAt || list.name != prev.name
  })
  if (changed.length || decided.dropLocalOnly) {
    const applyLists = decided.dropLocalOnly ? next : changed
    await applyPack(applyLists, decided.dropLocalOnly)
  }
  await putNow()
}

export { snowlitListChoiceVisible, resolveListChoice } from './choice'
