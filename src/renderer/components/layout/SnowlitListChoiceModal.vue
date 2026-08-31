<template>
  <material-modal :show="snowlitListChoiceVisible" :bg-close="false" :close-btn="false">
    <main :class="$style.main">
      <h2>{{ $t('snowlit_list_choice_title') }}</h2>
      <p :class="$style.tip">{{ $t('snowlit_list_choice_tip') }}</p>
      <div :class="$style.btns">
        <base-btn :class="$style.btn" @click="pick('cloud')">{{ $t('snowlit_list_choice_cloud') }}</base-btn>
        <base-btn :class="$style.btn" @click="pick('local')">{{ $t('snowlit_list_choice_local') }}</base-btn>
        <base-btn :class="$style.btn" @click="pick('merge')">{{ $t('snowlit_list_choice_merge') }}</base-btn>
      </div>
    </main>
  </material-modal>
</template>

<script>
import { resolveListChoice, snowlitListChoiceVisible } from '@renderer/core/snowlitListSync'

export default {
  setup() {
    const pick = (choice) => {
      resolveListChoice(choice)
    }
    return {
      snowlitListChoiceVisible,
      pick,
    }
  },
}
</script>

<style lang="less" module>
.main {
  padding: 18px 20px 16px;
  min-width: 320px;
  max-width: 420px;
  h2 {
    font-size: 16px;
    text-align: center;
    line-height: 1.4;
  }
}
.tip {
  margin: 12px 0 16px;
  font-size: 13px;
  line-height: 1.5;
  opacity: .75;
  text-align: center;
}
.btns {
  display: flex;
  flex-direction: column;
  gap: 10px;
}
.btn {
  display: block;
  width: 100%;
}
</style>
