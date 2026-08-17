import fs from 'node:fs'
import path from 'node:path'
import { app } from 'electron'
import { importApi, getUserApis } from './utils'
import getStore from '@main/utils/store'
import { STORE_NAMES } from '@common/constants'

/** 打包进 resources/user-apis 的推荐源（无需联网） */
const BUNDLED_FILES = [
  'xinghai-music-sourcev2.3.11.js',
  'HYWmusic_beta.js',
  'flower-latest.js',
  'sixyin-latest.js',
  'juhe-latest.js',
] as const

const SEED_FLAG = 'bundledSourcesSeeded'

const getBundledDir = () => {
  // 生产：extraResources → process.resourcesPath/user-apis
  // 开发：项目根 resources/user-apis
  if (app.isPackaged) {
    return path.join(process.resourcesPath, 'user-apis')
  }
  // 兼容不同 cwd
  const candidates = [
    path.join(process.cwd(), 'resources', 'user-apis'),
    path.join(app.getAppPath(), 'resources', 'user-apis'),
    path.join(__dirname, '../../../../resources/user-apis'),
  ]
  for (const dir of candidates) {
    if (fs.existsSync(dir)) return dir
  }
  return candidates[0]
}

export const listBundledSourceFiles = (): string[] => {
  const dir = getBundledDir()
  if (!fs.existsSync(dir)) return []
  return BUNDLED_FILES.filter(name => fs.existsSync(path.join(dir, name)))
}

/**
 * 一键导入内置推荐源（跳过已导入的相同脚本）
 * 纯本地读盘 + 写入配置，不联网。
 */
export const importBundledSources = async(): Promise<{
  imported: string[]
  skipped: string[]
  failed: Array<{ name: string, message: string }>
  apiList: LX.UserApi.UserApiInfo[]
  dir: string
}> => {
  const dir = getBundledDir()
  const imported: string[] = []
  const skipped: string[] = []
  const failed: Array<{ name: string, message: string }> = []

  if (!fs.existsSync(dir)) {
    return {
      imported,
      skipped,
      failed: [{ name: 'user-apis', message: `目录不存在: ${dir}` }],
      apiList: getUserApis(),
      dir,
    }
  }

  // 确保 userApis 已从 store 初始化
  getUserApis()

  for (const name of BUNDLED_FILES) {
    const filePath = path.join(dir, name)
    if (!fs.existsSync(filePath)) {
      failed.push({ name, message: '文件不存在' })
      continue
    }
    try {
      const script = fs.readFileSync(filePath, 'utf8')
      if (!script || script.length < 80) {
        failed.push({ name, message: `脚本过短 (${script?.length || 0})` })
        continue
      }
      // 必须以注释头开头（洛雪自定义源规范）
      if (!/^\s*\/\*/.test(script)) {
        failed.push({ name, message: '不是有效的自定义源脚本（缺少 @name 头）' })
        continue
      }
      const info = await importApi(script)
      imported.push(info.name || name)
    } catch (err: any) {
      const msg = err?.message || String(err)
      if (msg.includes('相同') || msg.includes('已有')) {
        skipped.push(name)
      } else {
        failed.push({ name, message: msg })
      }
    }
  }

  try {
    getStore(STORE_NAMES.USER_API).set(SEED_FLAG, true)
  } catch {}

  return {
    imported,
    skipped,
    failed,
    apiList: getUserApis(),
    dir,
  }
}

/**
 * 首次启动若无自定义源，自动写入内置推荐源（不弹窗、不联网）
 */
export const ensureBundledSourcesSeeded = async() => {
  try {
    const store = getStore(STORE_NAMES.USER_API)
    const list = getUserApis()
    if (list.length > 0) return
    if (store.get(SEED_FLAG)) return
    console.log('[Snowlit] auto-seed bundled user apis…')
    const result = await importBundledSources()
    console.log('[Snowlit] seed result', {
      imported: result.imported,
      skipped: result.skipped,
      failed: result.failed,
      dir: result.dir,
    })
  } catch (e) {
    console.error('[Snowlit] seed bundled sources failed', e)
  }
}
