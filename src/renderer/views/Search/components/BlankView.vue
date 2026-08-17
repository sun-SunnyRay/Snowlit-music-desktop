<template>
  <transition enter-active-class="animated-fast fadeIn" leave-active-class="animated-fast fadeOut">
    <div v-show="props.visible" :class="$style.noitem">
      <div :class="$style.noitem_label">
        <p>{{ $t('search__welcome') }}</p>
      </div>
    </div>
  </transition>
</template>

<script setup>
const props = defineProps({
  visible: Boolean,
})
</script>

<style lang="less" module>
.noitem {
  position: absolute;
  top: 0;
  left: 0;
  height: 100%;
  width: 100%;
  overflow: hidden;
  display: flex;
  flex-flow: column nowrap;
}

.noitem_label {
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  p {
    font-size: 24px;
    color: var(--color-font-label);
    text-align: center;
  }
}
</style>
