import { BrowserWindow, session, shell } from 'electron'
import { pickCookie } from './cookie'
import { isLoggedIn } from './store'

const LOGIN_URL: Record<LX.SourceAccount.Id, string> = {
  wy: 'https://music.163.com/#/login',
  tx: 'https://y.qq.com/n/ryqq/profile',
  kg: 'https://www.kugou.com/',
}

const PARTITION: Record<LX.SourceAccount.Id, string> = {
  wy: 'persist:xuemusic-wy',
  tx: 'persist:xuemusic-tx',
  kg: 'persist:xuemusic-kg',
}

const TITLE: Record<LX.SourceAccount.Id, string> = {
  wy: '网易云音乐登录',
  tx: 'QQ音乐登录',
  kg: '酷狗音乐登录',
}

const PRIORITY: Record<LX.SourceAccount.Id, string[]> = {
  wy: ['MUSIC_U', '__csrf', 'NMTID', 'MUSIC_A', '__remember_me'],
  tx: ['uin', 'qqmusic_uin', 'wxuin', 'qm_keyst', 'qqmusic_key', 'p_skey', 'skey', 'wxskey'],
  kg: ['KuGoo', 'token', 'userid', 'kg_mid', 'kg_dfid'],
}

const allowDomain = (id: LX.SourceAccount.Id, domain: string) => {
  const host = domain.replace(/^\./, '').toLowerCase()
  if (id == 'wy') return host.includes('163.com') || host.includes('netease.com')
  if (id == 'tx') return host.includes('qq.com') || host.includes('y.qq.com')
  return host.includes('kugou.com')
}

const readCookie = async(id: LX.SourceAccount.Id) => {
  const ses = session.fromPartition(PARTITION[id])
  const cookies = await ses.cookies.get({})
  return pickCookie(cookies, (domain) => allowDomain(id, domain), PRIORITY[id])
}

const parentWindow = () => {
  return BrowserWindow.getAllWindows().find(win => !win.isDestroyed() && win.isVisible())
}

export const openLoginWindow = async(id: LX.SourceAccount.Id): Promise<string> => {
  const existing = await readCookie(id)
  if (isLoggedIn(id, existing)) return existing

  return await new Promise((resolve, reject) => {
    let settled = false
    const owner = parentWindow()
    const loginWindow = new BrowserWindow({
      width: 940,
      height: 760,
      minWidth: 780,
      minHeight: 580,
      parent: owner,
      modal: false,
      show: false,
      autoHideMenuBar: true,
      title: TITLE[id],
      webPreferences: {
        partition: PARTITION[id],
        contextIsolation: true,
        nodeIntegration: false,
        sandbox: true,
      },
    })

    const finish = (cookie: string) => {
      if (settled) return
      settled = true
      clearInterval(pollTimer)
      if (!loginWindow.isDestroyed()) loginWindow.close()
      if (isLoggedIn(id, cookie)) resolve(cookie)
      else reject(new Error('登录未完成'))
    }

    const check = async() => {
      try {
        const cookie = await readCookie(id)
        if (isLoggedIn(id, cookie)) finish(cookie)
      } catch {}
    }

    loginWindow.webContents.setWindowOpenHandler(({ url }) => {
      if (/^https?:\/\//i.test(url)) void shell.openExternal(url)
      return { action: 'deny' }
    })
    loginWindow.on('ready-to-show', () => loginWindow.show())
    loginWindow.on('closed', async() => {
      if (settled) return
      settled = true
      clearInterval(pollTimer)
      try {
        const cookie = await readCookie(id)
        if (isLoggedIn(id, cookie)) resolve(cookie)
        else reject(new Error('登录窗口已关闭'))
      } catch (err) {
        reject(err instanceof Error ? err : new Error('登录窗口已关闭'))
      }
    })

    const pollTimer = setInterval(() => { void check() }, 1200)
    void loginWindow.loadURL(LOGIN_URL[id]).catch((err) => {
      if (!settled) {
        settled = true
        clearInterval(pollTimer)
        reject(err)
      }
    })
  })
}
