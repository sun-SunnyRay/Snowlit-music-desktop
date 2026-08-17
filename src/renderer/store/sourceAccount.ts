import { reactive } from '@common/utils/vueTools'
import { LIST_IDS } from '@common/constants'
import { userLists } from '@renderer/store/list/state'
import { createUserList, overwriteListMusics, setFetchingListStatus, updateUserList } from '@renderer/store/list/action'
import { setMusicList } from '@renderer/store/list/listManage/action'
import { playList } from '@renderer/core/player'
import { dialog } from '@renderer/plugins/Dialog'
import {
  getAccountAutoSource,
  getSourceAccountStatus,
  getSourceAccountTracks,
  saveAccountAutoSource,
} from '@renderer/utils/ipc'

const ACCOUNT_SOURCES: LX.SourceAccount.Id[] = ['wy', 'tx', 'kg']

const AUTO_LISTS = [
  { id: LIST_IDS.ACCOUNT_DAILY, sourceListId: 'daily', nameKey: 'account_auto__daily' },
  { id: LIST_IDS.ACCOUNT_RECENT, sourceListId: 'recent', nameKey: 'account_auto__recent' },
] as const

export const accountAutoState = reactive({
  source: 'wy' as LX.SourceAccount.Id,
  loggedIn: [] as LX.SourceAccount.Id[],
  loading: false,
  error: '',
})

export const isAccountAutoListId = (id?: string | null): id is typeof LIST_IDS.ACCOUNT_DAILY | typeof LIST_IDS.ACCOUNT_RECENT => {
  return id == LIST_IDS.ACCOUNT_DAILY || id == LIST_IDS.ACCOUNT_RECENT
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

const persistSource = async(source: LX.SourceAccount.Id) => {
  accountAutoState.source = source
  saveAccountAutoSource(source)
  const next = userLists
    .filter(list => isAccountAutoListId(list.id) && list.source != source)
    .map(list => ({ ...list, source }))
  if (next.length) await updateUserList(next)
}

export const ensureAutoLists = async() => {
  const status = await getSourceAccountStatus()
  const logged = loggedInIds(status)
  accountAutoState.loggedIn = logged
  if (!logged.length) return
  const source = await resolveSource(logged)
  await persistSource(source)
  for (const [index, spec] of AUTO_LISTS.entries()) {
    if (userLists.some(list => list.id == spec.id)) continue
    await createUserList({
      id: spec.id,
      name: window.i18n.t(spec.nameKey),
      source,
      sourceListId: spec.sourceListId,
      position: index,
    })
  }
}

export const setAccountAutoSource = async(source: LX.SourceAccount.Id) => {
  if (!accountAutoState.loggedIn.includes(source)) return
  await persistSource(source)
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
    await persistSource(source)
    const tracks = await getSourceAccountTracks(source, autoKind(listId))
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
    const tip = message == 'KG_RECENT_UNSUPPORTED'
      ? window.i18n.t('account_auto__kg_recent_unsupported')
      : message == 'LOGIN_REQUIRED'
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
