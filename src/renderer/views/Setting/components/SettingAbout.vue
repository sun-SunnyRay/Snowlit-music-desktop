<template lang="pug">
dt#about {{ $t('setting__about') }}
dd
  .p.small
    strong 映雪音乐（Snowlit Music）桌面版
    |  · 版本见关于/标题栏。本软件基于开源项目 LX Music（洛雪音乐助手）二次发行，无内置融合调度音源；请在「设置 → 自定义源」中自行在线导入音源。
  .p.small
    | 上游开源项目（洛雪桌面）：
    span.hover.underline(:aria-label="$t('setting__click_open')" @click="openUrl('https://github.com/lyswhut/lx-music-desktop#readme')") https://github.com/lyswhut/lx-music-desktop
  .p.small
    | 上游常见问题：
    span.hover.underline(:aria-label="$t('setting__click_open')" @click="openUrl('https://lyswhut.github.io/lx-music-doc/desktop/faq')") 洛雪桌面版 FAQ
  .p.small
    strong 本发行没有客服、没有微信公众号之类的所谓「官方账号」，谨防被骗。
  br
  .p.small 使用前请先导入社区音源（在线导入 raw 链接）。音质为原生「播放音质」选档，取链失败后换源，不做融合调度。
  .p.small
    | 你已签署本软件的
    base-btn(min @click="handleShowPact") 许可协议
    | 。
  br

  .p.small
    | By:&nbsp;
    strong SunnyRay
    |  · 上游 By 落雪无痕
</template>

<script>
// import { ref, onBeforeUnmount } from '@common/utils/vueTools'
import { isShowPact } from '@renderer/store'
import { openUrl, clipboardWriteText } from '@common/utils/electron'

export default {
  name: 'SettingAbout',
  setup() {
    const handleShowPact = () => {
      isShowPact.value = true
    }
    return {
      openUrl,
      clipboardWriteText,
      handleShowPact,
    }
  },
}
</script>
