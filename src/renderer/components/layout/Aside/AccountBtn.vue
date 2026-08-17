<template>
  <div ref="dom_btn" :class="$style.wrap">
    <div
      role="button"
      tabindex="0"
      :class="[$style.link, { [$style.active]: active }]"
      :aria-label="$t('account_playlist__nav')"
      :title="$t('account_playlist__nav')"
      @click.stop="emit('open')"
      @keydown.enter.prevent="emit('open')"
    >
      <svg version="1.1" xmlns="http://www.w3.org/2000/svg" xlink="http://www.w3.org/1999/xlink" viewBox="0 0 24 24" :height="iconSize" :width="iconSize" space="preserve">
        <use xlink:href="#icon-account" />
      </svg>
      <i v-if="loggedIn" :class="$style.dot" />
    </div>
  </div>
</template>

<script setup>
import { computed, ref } from '@common/utils/vueTools'
import { useIconSize } from '@renderer/utils/compositions/useIconSize'
import { accountAutoState } from '@renderer/store/sourceAccount'

defineProps({
  active: { type: Boolean, default: false },
})
const emit = defineEmits(['open'])

const dom_btn = ref()
const iconSize = useIconSize(dom_btn, 0.32)
const loggedIn = computed(() => accountAutoState.loggedIn.length > 0)
</script>

<style lang="less" module>
@import '@renderer/assets/styles/layout.less';

.wrap {
  position: relative;
  flex: none;
  z-index: 1;
  -webkit-app-region: no-drag;
  &:before {
    content: '';
    display: block;
    width: 100%;
    padding-bottom: 84%;
  }
}

.link {
  position: absolute;
  left: 0;
  top: 0;
  width: 100%;
  height: 100%;
  box-sizing: border-box;
  -webkit-app-region: no-drag;
  transition: @transition-fast;
  transition-property: background-color, opacity, transform;
  color: var(--color-nav-font);
  cursor: pointer;
  text-align: center;
  outline: none;
  display: flex;
  align-items: center;
  justify-content: center;
  background: none;
  border: none;
  padding: 0;

  &:before {
    .mixin-after();
    left: 0;
    top: 0;
    width: 3px;
    height: 100%;
    background-color: var(--color-primary-dark-200-alpha-700);
    border-radius: 4px;
    transform: translateX(-100%);
    transition: transform @transition-fast;
  }

  &.active {
    background-color: var(--color-primary-light-300-alpha-700);

    &:before {
      transform: translateX(0);
    }

    &:hover {
      background-color: var(--color-primary-light-300-alpha-800);
    }
  }

  &:hover {
    color: var(--color-nav-font);

    &:not(.active) {
      opacity: .8;
      background-color: var(--color-primary-light-400-alpha-700);
    }
  }
  &:active:not(.active) {
    opacity: .7;
    background-color: var(--color-primary-light-300-alpha-600);
    transform: scale(@press-scale);
  }
}

.dot {
  position: absolute;
  top: 18%;
  right: 18%;
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background-color: var(--color-primary);
}
</style>
