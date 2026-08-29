import { computed } from '@common/utils/vueTools'
import { chorusProgress } from '@renderer/core/player/chorus'
import { playProgress } from '@renderer/store/player/playProgress'
import { musicInfo } from '@renderer/store/player/state'

export default () => {
  const chorusAt = computed(() => chorusProgress(musicInfo.chorusStart, playProgress.maxPlayTime))
  const chorusStart = computed(() => musicInfo.chorusStart)
  return {
    chorusAt,
    chorusStart,
  }
}
