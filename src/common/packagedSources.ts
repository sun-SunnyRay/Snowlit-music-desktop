export interface PackagedSourceInfo {
  id: string
  name: string
  description: string
  author: string
  homepage: string
  version: string
  file: string
}

export const PACKAGED_SOURCES: PackagedSourceInfo[] = [
  {
    id: 'user_api_yuningxi',
    name: 'lx-玉宁熙-Pro',
    description: '禁止批量下载 2秒内最多4次请求',
    author: 'ynx(2363768762)',
    homepage: 'https://gitee.com/Myn_1/Mao_Yuna/raw/MYN_update/lx-music/lx-玉宁熙.js',
    version: 'v1.2.5',
    file: 'yuningxi.js',
  },
  {
    id: 'user_api_xinghai',
    name: '星海音乐源',
    description: 'GDAPI | 聚合 | ChKSz API | 全平台支持24FLAC，网易、酷狗、QQ最高支持母带',
    author: '万去了了',
    homepage: 'https://zrcdy.dpdns.org/',
    version: 'v3.2.13',
    file: 'xinghai.js',
  },
  {
    id: 'user_api_molan',
    name: '墨澜聚合音源',
    description: '全平台支持flac，wy，qq，kw，kg支持母带',
    author: '白姬9527(2449067834)',
    homepage: 'https://github.com/baiji6/molanyinyueyuan',
    version: '2.3.0',
    file: 'molan.js',
  },
]

export const PACKAGED_IDS = new Set(PACKAGED_SOURCES.map(source => source.id))

export const DROPPED_PACKAGED_IDS = new Set(['user_api_hyw'])

export const DEFAULT_PACKAGED_SOURCE_ID = 'user_api_xinghai'

export const toUserApiInfo = (source: PackagedSourceInfo): LX.UserApi.UserApiInfo => ({
  id: source.id,
  name: source.name,
  description: source.description,
  author: source.author,
  homepage: source.homepage,
  version: source.version,
  allowShowUpdateAlert: true,
})
