<template>
  <div :class="[$style.aside, { [$style.fullscreen]: isFullscreen }]">
    <ControlBtns v-if="appSetting['common.controlBtnPosition'] == 'left'" />
    <div v-else :class="$style.logo">Snowlit</div>
    <NavBar />
    <AccountBtn :active="isShowAccountModal" @open="isShowAccountModal = true" />
    <AccountPlaylistModal v-model:visible="isShowAccountModal" />
  </div>
</template>

<script setup>
import { ref } from '@common/utils/vueTools'
import { isFullscreen } from '@renderer/store'
import { appSetting } from '@renderer/store/setting'

import ControlBtns from './ControlBtns.vue'
import NavBar from './NavBar.vue'
import AccountBtn from './AccountBtn.vue'
import AccountPlaylistModal from './AccountPlaylistModal.vue'

const isShowAccountModal = ref(false)

</script>


<style lang="less" module>
@import '@renderer/assets/styles/layout.less';

.aside {
  // box-shadow: 0 0 5px rgba(0, 0, 0, .3);
  transition: @transition-normal;
  transition-property: background-color;
  // background-color: @color-theme-sidebar;
  // background-color: @color-aside-background;
  // border-right: 2px solid var(--color-primary);
  -webkit-app-region: drag;
  -webkit-user-select: none;
  display: flex;
  flex-flow: column nowrap;

  &.fullscreen {
    -webkit-app-region: no-drag;
    .logo {
      display: none;
    }
  }
}

.logo {
  box-sizing: border-box;
  padding: 0 6%;
  height: 50px;
  color: var(--color-nav-font);
  opacity: .8;
  flex: none;
  text-align: center;
  line-height: 50px;
  font-weight: bold;
  font-size: 11px;
  letter-spacing: 0.02em;
  .mixin-ellipsis-1();
  // -webkit-app-region: no-drag;
}

</style>
