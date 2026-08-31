import { LIST_IDS } from '@common/constants'

export const SYNC_FIXED_IDS = [LIST_IDS.LOVE, LIST_IDS.DEFAULT, LIST_IDS.RECENT] as const

export const SKIP_LIST_IDS = new Set<string>([
  LIST_IDS.DOWNLOAD,
  LIST_IDS.TEMP,
  LIST_IDS.ACCOUNT_DAILY,
  LIST_IDS.ACCOUNT_RECENT,
  'local',
  'browse_radio',
])

export const canSyncListId = (id: string) => !SKIP_LIST_IDS.has(id)
