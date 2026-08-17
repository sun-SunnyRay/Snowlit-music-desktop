import { mainHandle } from '@common/mainIpc'
import { WIN_MAIN_RENDERER_EVENT_NAME } from '@common/ipcNames'
import { clearCookie, getCookie, isLoggedIn, listAccountIds, setCookie } from './store'
import { openLoginWindow } from './loginWindow'
import { getWyStatus, listWyPlaylists, listWyTracks } from './playlists/wy'
import { getTxStatus, listTxPlaylists, listTxTracks } from './playlists/tx'
import { getKgStatus, listKgPlaylists, listKgTracks } from './playlists/kg'

const getStatus = async(id: LX.SourceAccount.Id): Promise<LX.SourceAccount.Status> => {
  const cookie = getCookie(id)
  if (!isLoggedIn(id, cookie)) return { id, loggedIn: false }
  try {
    if (id == 'wy') return await getWyStatus(cookie)
    if (id == 'tx') return await getTxStatus(cookie)
    return await getKgStatus(cookie)
  } catch {
    return { id, loggedIn: false }
  }
}

const listPlaylists = async(id: LX.SourceAccount.Id) => {
  const cookie = getCookie(id)
  if (!isLoggedIn(id, cookie)) throw new Error('LOGIN_REQUIRED')
  if (id == 'wy') return listWyPlaylists(cookie)
  if (id == 'tx') return listTxPlaylists(cookie)
  return listKgPlaylists(cookie)
}

const listTracks = async(id: LX.SourceAccount.Id, playlistId: string) => {
  const cookie = getCookie(id)
  if (!isLoggedIn(id, cookie)) throw new Error('LOGIN_REQUIRED')
  if (id == 'wy') return listWyTracks(cookie, playlistId)
  if (id == 'tx') return listTxTracks(cookie, playlistId)
  return listKgTracks(cookie, playlistId)
}

export default () => {
  mainHandle(WIN_MAIN_RENDERER_EVENT_NAME.source_account_status, async() => {
    return Promise.all(listAccountIds().map(getStatus))
  })

  mainHandle<LX.SourceAccount.Id, LX.SourceAccount.Status>(WIN_MAIN_RENDERER_EVENT_NAME.source_account_login, async({ params: id }) => {
    const cookie = await openLoginWindow(id)
    setCookie(id, cookie)
    return getStatus(id)
  })

  mainHandle<LX.SourceAccount.Id, LX.SourceAccount.Status>(WIN_MAIN_RENDERER_EVENT_NAME.source_account_logout, async({ params: id }) => {
    clearCookie(id)
    return { id, loggedIn: false }
  })

  mainHandle<LX.SourceAccount.Id, LX.SourceAccount.RemotePlaylist[]>(WIN_MAIN_RENDERER_EVENT_NAME.source_account_playlists, async({ params: id }) => {
    return listPlaylists(id)
  })

  mainHandle<{ source: LX.SourceAccount.Id, id: string }, LX.Music.MusicInfoOnline[]>(WIN_MAIN_RENDERER_EVENT_NAME.source_account_tracks, async({ params }) => {
    return listTracks(params.source, params.id)
  })
}
