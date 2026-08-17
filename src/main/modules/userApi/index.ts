import { closeWindow } from './main'
import { getUserApis, importApi as handleImportApi, removeApi as handleRemoveApi, setAllowShowUpdateAlert as saveAllowShowUpdateAlert } from './utils'
import { loadApi, setAllowShowUpdateAlert as setRendererEventAllowShowUpdateAlert, init } from './rendererEvent/rendererEvent'

let userApiId: string | null

export const getApiList = getUserApis

export const importApi = async(script: string): Promise<LX.UserApi.ImportUserApi> => {
  return {
    apiInfo: await handleImportApi(script),
    apiList: getUserApis(),
  }
}
export const removeApi = async(ids: string[]): Promise<LX.UserApi.UserApiInfo[]> => {
  if (userApiId && ids.includes(userApiId)) {
    userApiId = null
    await closeWindow()
  }
  handleRemoveApi(ids)
  return getUserApis()
}

export const setApi = async(id: string) => {
  if (userApiId) {
    userApiId = null
    await closeWindow()
  }
  const apiList = getUserApis()
  if (!apiList.some(a => a.id === id)) return
  userApiId ||= id
  await loadApi(id)
}

export const setAllowShowUpdateAlert = (id: string, enable: boolean) => {
  saveAllowShowUpdateAlert(id, enable)
  setRendererEventAllowShowUpdateAlert(id, enable)
}


export * from './rendererEvent/rendererEvent'

export default () => {
  init()

  // 首次无自定义源时，自动写入安装包内推荐源（本地文件，不联网）
  void import('./bundledSources').then(m => m.ensureBundledSourcesSeeded()).catch(err => {
    console.error('[Snowlit] ensureBundledSourcesSeeded', err)
  })

  global.lx.event_app.on('main_window_close', () => {
    void closeWindow()
  })
}
