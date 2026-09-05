import { app } from 'electron'
import fs from 'node:fs'
import path from 'node:path'
import { DEFAULT_PACKAGED_SOURCE_ID, PACKAGED_SOURCES, toUserApiInfo, type PackagedSourceInfo } from '@common/packagedSources'

export { DEFAULT_PACKAGED_SOURCE_ID, DROPPED_PACKAGED_IDS, PACKAGED_IDS, PACKAGED_SOURCES, toUserApiInfo } from '@common/packagedSources'

const getSourcesDir = () => {
  if (app.isPackaged) return path.join(process.resourcesPath, 'sources')
  return path.join(process.cwd(), 'assets', 'sources')
}

const sourcePath = (source: PackagedSourceInfo) => path.join(getSourcesDir(), source.file)

export const getAvailablePackagedSources = (): PackagedSourceInfo[] => {
  return PACKAGED_SOURCES.filter(source => fs.existsSync(sourcePath(source)))
}

export const getPackagedApiInfos = (): LX.UserApi.UserApiInfo[] => {
  return getAvailablePackagedSources().map(toUserApiInfo)
}

export const loadPackagedScript = async(id: string): Promise<string> => {
  const source = PACKAGED_SOURCES.find(item => item.id == id)
  if (!source) throw new Error('packaged source not found')
  return fs.promises.readFile(sourcePath(source), 'utf8')
}
