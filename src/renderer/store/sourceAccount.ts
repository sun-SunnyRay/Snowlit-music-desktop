import { reactive } from '@common/utils/vueTools'
import { LIST_IDS } from '@common/constants'
import { toMD5 } from '@common/utils/nodejs'
import { appSetting } from '@renderer/store/setting'
import { userLists } from '@renderer/store/list/state'
import { createUserList, getListMusics, overwriteListMusics, removeUserList, setFetchingListStatus, updateUserList } from '@renderer/store/list/action'
import { setMusicList } from '@renderer/store/list/listManage/action'
import { playList } from '@renderer/core/player'
import { dialog } from '@renderer/plugins/Dialog'
import syncSourceList from '@renderer/store/list/syncSourceList'
import {
  getAccountAutoSource,
  getSourceAccountPlaylists,
  getSourceAccountStatus,
  getSourceAccountTracks,
  saveAccountAutoSource,
} from '@renderer/utils/ipc'

const ACCOUNT_SOURCES: LX.SourceAccount.Id[] = ['wy', 'tx', 'kg']

const RECENT_SOURCE: LX.SourceAccount.Id = 'wy'
const DAILY_SOURCES: LX.SourceAccount.Id[] = ['wy', 'kg']

const AUTO_LISTS = [
  { id: LIST_IDS.ACCOUNT_DAILY, sourceListId: 'daily', nameKey: 'account_auto__daily' },
  { id: LIST_IDS.ACCOUNT_RECENT, sourceListId: 'recent', nameKey: 'account_auto__recent' },
] as const

const supportsRecent = (logged: LX.SourceAccount.Id[]) => logged.includes(RECENT_SOURCE)
const supportsDaily = (logged: LX.SourceAccount.Id[]) => logged.some(id => DAILY_SOURCES.includes(id))

export const isDailySource = (id: LX.SourceAccount.Id) => DAILY_SOURCES.includes(id)

const pickDailySource = (selected: LX.SourceAccount.Id, logged: LX.SourceAccount.Id[]) => {
  if (isDailySource(selected) && logged.includes(selected)) return selected
  return DAILY_SOURCES.find(id => logged.includes(id)) ?? selected
}

const autoListSource = (sourceListId: string, selected: LX.SourceAccount.Id, logged: LX.SourceAccount.Id[]): LX.SourceAccount.Id => {
  return sourceListId == 'recent' ? RECENT_SOURCE : pickDailySource(selected, logged)
}

const KIND_RANK: Record<LX.SourceAccount.PlaylistKind, number> = {
  daily: 0,
  recent: 1,
  liked: 2,
  created: 3,
  collected: 4,
}

interface PlaylistSpec {
  id: string
  name: string
  source: LX.SourceAccount.Id
  sourceListId: string
}

export const accountAutoState = reactive({
  source: 'wy' as LX.SourceAccount.Id,
  loggedIn: [] as LX.SourceAccount.Id[],
  loading: false,
  error: '',
  syncedCount: 0,
})

export const isAccountAutoListId = (id?: string | null): id is typeof LIST_IDS.ACCOUNT_DAILY | typeof LIST_IDS.ACCOUNT_RECENT => {
  return id == LIST_IDS.ACCOUNT_DAILY || id == LIST_IDS.ACCOUNT_RECENT
}

export const isAccountSource = (source?: string | null): source is LX.SourceAccount.Id => {
  return ACCOUNT_SOURCES.includes(source as LX.SourceAccount.Id)
}

const autoKind = (listId: string) => listId == LIST_IDS.ACCOUNT_DAILY ? 'daily' : 'recent'

const loggedInIds = (status: LX.SourceAccount.Status[]) => {
  return ACCOUNT_SOURCES.filter(id => status.some(item => item.id == id && item.loggedIn))
}

const resolveSource = async(logged: LX.SourceAccount.Id[]) => {
  if (logged.length == 1) return logged[0]
  const saved = await getAccountAutoSource()
  if (saved && logged.includes(saved)) return saved
  return logged[0] || 'wy'
}

const sourceLabel = (id: LX.SourceAccount.Id) => {
  const prefix = appSetting['common.sourceNameType'] == 'real' ? 'source_' : 'source_alias_'
  return window.i18n.t((prefix + id) as any)
}

const autoListName = (sourceListId: 'daily' | 'recent', source: LX.SourceAccount.Id) => {
  const nameKey = sourceListId == 'daily' ? 'account_auto__daily' : 'account_auto__recent'
  return `${sourceLabel(source)} · ${window.i18n.t(nameKey)}`
}

const persistSource = async(source: LX.SourceAccount.Id, logged: LX.SourceAccount.Id[]) => {
  accountAutoState.source = source
  saveAccountAutoSource(source)
  const daily = userLists.find(list => list.id == LIST_IDS.ACCOUNT_DAILY)
  if (!daily || !supportsDaily(logged)) return
  const dailySource = pickDailySource(source, logged)
  const name = autoListName('daily', dailySource)
  if (daily.source != dailySource || daily.name != name) {
    await updateUserList([{ ...daily, source: dailySource, name }])
  }
}

const countAccountLists = () => {
  return userLists.filter(list => {
    if (isAccountAutoListId(list.id)) return true
    return isAccountSource(list.source) && Boolean(list.sourceListId)
  }).length
}

const findExisting = (spec: PlaylistSpec) => {
  if (isAccountAutoListId(spec.id)) return userLists.find(list => list.id == spec.id)
  return userLists.find(list => list.source == spec.source && list.sourceListId == spec.sourceListId)
}

const writeSpecs = async(specs: PlaylistSpec[]) => {
  let insertAt = 0
  for (const spec of specs) {
    const found = findExisting(spec)
    if (found) {
      insertAt = userLists.indexOf(found) + 1
      if (found.name != spec.name || found.source != spec.source) {
        await updateUserList([{ ...found, name: spec.name, source: spec.source }])
      }
      continue
    }
    await createUserList({
      id: spec.id,
      name: spec.name,
      source: spec.source,
      sourceListId: spec.sourceListId,
      position: insertAt,
    })
    insertAt++
  }
}

export const ensureAccountPlaylists = async() => {
  const status = await getSourceAccountStatus()
  const logged = loggedInIds(status)
  accountAutoState.loggedIn = logged
  if (!logged.length) {
    accountAutoState.syncedCount = countAccountLists()
    return
  }
  const source = await resolveSource(logged)
  await persistSource(source, logged)

  if (!supportsRecent(logged)) {
    const recent = userLists.find(list => list.id == LIST_IDS.ACCOUNT_RECENT)
    if (recent) await removeUserList([LIST_IDS.ACCOUNT_RECENT])
  }
  if (!supportsDaily(logged)) {
    const daily = userLists.find(list => list.id == LIST_IDS.ACCOUNT_DAILY)
    if (daily) await removeUserList([LIST_IDS.ACCOUNT_DAILY])
  }

  const remotes: LX.SourceAccount.RemotePlaylist[] = []
  for (const id of logged) {
    try {
      remotes.push(...await getSourceAccountPlaylists(id))
    } catch (err: any) {
      accountAutoState.error = err?.message || String(err)
    }
  }

  const specs: PlaylistSpec[] = [
    ...AUTO_LISTS
      .filter(spec => {
        if (spec.sourceListId == 'recent') return supportsRecent(logged)
        if (spec.sourceListId == 'daily') return supportsDaily(logged)
        return true
      })
      .map(spec => {
        const listSource = autoListSource(spec.sourceListId, source, logged)
        return {
          id: spec.id,
          name: autoListName(spec.sourceListId, listSource),
          source: listSource,
          sourceListId: spec.sourceListId,
        }
      }),
    ...remotes
      .filter(pl => pl.kind != 'daily' && pl.kind != 'recent')
      .slice()
      .sort((a, b) => KIND_RANK[a.kind] - KIND_RANK[b.kind])
      .map(pl => ({
        id: `${pl.source}_${toMD5(`${pl.source}__${pl.id}`)}`,
        name: `${sourceLabel(pl.source)} · ${pl.name}`,
        source: pl.source,
        sourceListId: pl.id,
      })),
  ]

  await writeSpecs(specs)
  accountAutoState.syncedCount = countAccountLists()
}

export const setAccountAutoSource = async(source: LX.SourceAccount.Id) => {
  if (!accountAutoState.loggedIn.includes(source)) return
  await persistSource(source, accountAutoState.loggedIn)
}

export const syncEmptyAccountList = async(list: LX.List.UserListInfo) => {
  if (isAccountAutoListId(list.id)) return
  if (!list.sourceListId || !isAccountSource(list.source)) return
  const musics = await getListMusics(list.id)
  if (musics.length) return
  await syncSourceList(list)
}

export const refreshAndPlayAccountAutoList = async(listId: string) => {
  if (!isAccountAutoListId(listId)) return
  accountAutoState.loading = true
  accountAutoState.error = ''
  setFetchingListStatus(listId, true)
  try {
    const status = await getSourceAccountStatus()
    const logged = loggedInIds(status)
    accountAutoState.loggedIn = logged
    if (!logged.length) {
      accountAutoState.error = 'LOGIN_REQUIRED'
      await dialog({
        message: window.i18n.t('account_auto__login_required'),
        confirmButtonText: window.i18n.t('confirm_button_text'),
      })
      return
    }
    const source = await resolveSource(logged)
    await persistSource(source, logged)
    const kind = autoKind(listId)
    if ((kind == 'recent' && !supportsRecent(logged)) || (kind == 'daily' && !supportsDaily(logged))) {
      accountAutoState.error = 'LOGIN_REQUIRED'
      await dialog({
        message: window.i18n.t('account_auto__login_required'),
        confirmButtonText: window.i18n.t('confirm_button_text'),
      })
      return
    }
    const tracks = await getSourceAccountTracks(autoListSource(kind, source, logged), kind)
    await overwriteListMusics({ listId, musicInfos: tracks })
    setMusicList(listId, tracks)
    if (!tracks.length) {
      accountAutoState.error = 'EMPTY'
      return
    }
    playList(listId, 0)
  } catch (err: any) {
    const message = err?.message || String(err)
    accountAutoState.error = message
    const tip = message == 'LOGIN_REQUIRED'
      ? window.i18n.t('account_auto__login_required')
      : message
    await dialog({
      message: tip,
      confirmButtonText: window.i18n.t('confirm_button_text'),
    })
  } finally {
    accountAutoState.loading = false
    setFetchingListStatus(listId, false)
  }
}
