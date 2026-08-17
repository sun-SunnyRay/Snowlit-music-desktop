import { setListUpdateTime } from '@renderer/utils/data'
import { setFetchingListStatus, overwriteListMusics, setUpdateTime } from './action'
import { getListDetailAll } from '@renderer/store/songList/action'
import { getListDetailAll as getBoardListAll } from '@renderer/store/leaderboard/action'
import { dateFormat } from '@common/utils/common'
import { getSourceAccountStatus, getSourceAccountTracks } from '@renderer/utils/ipc'

const ACCOUNT_SOURCES = new Set<LX.SourceAccount.Id>(['wy', 'tx', 'kg'])

const fetchAccountList = async(source: LX.OnlineSource, sourceListId: string) => {
  if (!ACCOUNT_SOURCES.has(source as LX.SourceAccount.Id)) return null
  const status = await getSourceAccountStatus()
  const account = status.find(item => item.id == source)
  if (!account?.loggedIn) return null
  return getSourceAccountTracks(source as LX.SourceAccount.Id, sourceListId)
}

const fetchList = async(id: string, source: LX.OnlineSource, sourceListId: string) => {
  setFetchingListStatus(id, true)

  let promise
  if (/^board__/.test(sourceListId)) {
    const id = sourceListId.replace(/^board__/, '')
    promise = id ? getBoardListAll(id, true) : Promise.reject(new Error('id not defined: ' + sourceListId))
  } else {
    promise = fetchAccountList(source, sourceListId).then(list => {
      if (list) return list
      return getListDetailAll(sourceListId, source, true)
    })
  }
  return promise.finally(() => {
    setFetchingListStatus(id, false)
  })
}

export default async(targetListInfo: LX.List.UserListInfo) => {
  // console.log(targetListInfo)
  if (!targetListInfo.source || !targetListInfo.sourceListId) return
  const list = await fetchList(targetListInfo.id, targetListInfo.source, targetListInfo.sourceListId)
  // console.log(list)
  void overwriteListMusics({ listId: targetListInfo.id, musicInfos: list })
  const now = Date.now()
  void setListUpdateTime(targetListInfo.id, now)
  setUpdateTime(targetListInfo.id, dateFormat(now))
}
