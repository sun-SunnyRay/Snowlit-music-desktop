<template lang="pug">
dt#about {{ $t('setting__about') }}
dd
  .p.small
    strong 映雪音乐（Snowlit Music）桌面版
    |  · 版本见关于/标题栏。请在「设置 → 自定义源」中自行导入音源。
  .p.small
    strong 本软件没有客服、没有微信公众号之类的所谓「官方账号」，谨防被骗。
  br
  .p.small 使用前请先到「设置 → 自定义源」在线或本地导入音源。音质在「播放设置 → 优先播放的音质」里选。取链失败后会换源。
  .p.small
    | 你已签署本软件的
    base-btn(min @click="handleShowPact") 许可协议
    | 。
  br

  .p.small
    | By:&nbsp;
    strong SunnyRay
</template>

<script>
// import { ref, onBeforeUnmount } from '@common/utils/vueTools'
import { isShowPact } from '@renderer/store'
import { clipboardWriteText } from '@common/utils/electron'

export default {
  name: 'SettingAbout',
  setup() {
    const handleShowPact = () => {
      isShowPact.value = true
    }
    return {
      clipboardWriteText,
      handleShowPact,
    }
  },
}
</script>
