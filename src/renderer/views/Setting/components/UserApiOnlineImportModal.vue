<template>
  <material-modal :show="show" teleport="#view" @close="handleClose" @after-enter="$refs.input.focus()">
    <main :class="$style.main">
      <h2>{{ $t('user_api_import_online__title') }}</h2>
      <base-input
        ref="input"
        v-model="url"
        :class="$style.input"
        type="url"
        :placeholder="$t('user_api_import_online__input_tip')"
        @submit="handleSubmit" @blur="verify"
      />
      <div :class="$style.footer">
        <base-btn :class="$style.btn" @click="handleClose">{{ $t('btn_close') }}</base-btn>
        <base-btn :class="$style.btn" :disabled="disabled" @click="handleSubmit">{{ btnText }}</base-btn>
      </div>
    </main>
  </material-modal>
</template>

<script>
import { dialog } from '@renderer/plugins/Dialog'
import { httpFetch } from '@renderer/utils/request'

export default {
  props: {
    show: {
      type: Boolean,
      default: false,
    },
  },
  emits: ['update:show', 'import'],
  data() {
    return {
      url: '',
      disabled: false,
      btnText: '',
    }
  },
  watch: {
    show(n) {
      if (n) {
        this.url = ''
        this.disabled = false
        this.btnText = this.$t('user_api_import_online__input_confirm')
      }
    },
  },
  methods: {
    handleClose() {
      this.$emit('update:show', false)
    },
    verify() {
      if (!/^https?:\/\//.test(this.url)) this.url = ''
      return this.url
    },
    /** GitHub raw 在国内常超时：优先镜像，单次 6s，总超时 12s */
    buildUrlCandidates(url) {
      const list = []
      if (/raw\.githubusercontent\.com/.test(url) || /github\.com/.test(url)) {
        const prefixes = [
          'https://ghproxy.net/',
          'https://gh.llkk.cc/',
          'https://github.moeyy.xyz/',
        ]
        for (const p of prefixes) list.push(p + url)
      }
      list.push(url)
      return list
    },
    fetchOnce(url) {
      const req = httpFetch(url, {
        follow_max: 2,
        timeout: 6000,
        open_timeout: 6000,
        response_timeout: 6000,
        read_timeout: 6000,
      })
      return Promise.race([
        req.promise.then(resp => {
          const body = resp.body
          if (typeof body === 'string' && body.length > 50 && body.includes('@name')) return body
          if (typeof body === 'string' && body.length > 50 && body.trimStart().startsWith('/*')) return body
          throw new Error('响应不是有效源脚本')
        }),
        new Promise((_, reject) => {
          setTimeout(() => {
            try { req.requestObj?.abort?.() } catch {}
            reject(new Error('单次请求超时'))
          }, 6500)
        }),
      ])
    },
    async fetchScript(url) {
      const candidates = this.buildUrlCandidates(url)
      let lastErr
      const deadline = Date.now() + 12000
      for (const u of candidates) {
        if (Date.now() > deadline) break
        try {
          return await this.fetchOnce(u)
        } catch (err) {
          lastErr = err
        }
      }
      throw lastErr || new Error('下载失败')
    },
    async handleSubmit() {
      let url = this.verify()
      if (!url) return
      this.disabled = true
      this.btnText = this.$t('user_api_import_online__input_loading')
      let script
      try {
        script = await Promise.race([
          this.fetchScript(url),
          new Promise((_, reject) => {
            setTimeout(() => reject(new Error('在线导入超时。请改用「本地导入」。')), 13000)
          }),
        ])
      } catch (err) {
        void dialog(this.$t('user_api_import__failed', {
          message: ((err && err.message) || String(err)) +
            '\n\n电脑访问 GitHub 常失败，请关闭此窗口，改用「本地导入」。',
        }))
        return
      } finally {
        this.disabled = false
        this.btnText = this.$t('user_api_import_online__input_confirm')
      }
      if (typeof script !== 'string') script = String(script)
      if (script.length > 9_000_000) {
        void dialog(this.$t('user_api_import__failed', {
          message: 'Too large script',
          confirm: this.$t('ok'),
        }))
        return
      }
      this.$emit('import', script)
      this.handleClose()
    },
  },
}
</script>


<style lang="less" module>
@import '@renderer/assets/styles/layout.less';

.main {
  padding: 0 15px;
  width: 450px;
  min-width: 280px;
  display: flex;
  flex-flow: column nowrap;
  min-height: 0;
  // max-height: 100%;
  // overflow: hidden;
  h2 {
    font-size: 13px;
    color: var(--color-font);
    line-height: 1.3;
    word-break: break-all;
    // text-align: center;
    padding: 15px 0 8px;
  }
}

.input {
  // width: 100%;
  // height: 26px;
  padding: 8px 8px;
}
.footer {
  margin: 20px 0 15px auto;
}
.btn {
  // box-sizing: border-box;
  // margin-left: 15px;
  // margin-bottom: 15px;
  // height: 36px;
  // line-height: 36px;
  // padding: 0 10px !important;
  min-width: 70px;
  // .mixin-ellipsis-1();

  +.btn {
    margin-left: 10px;
  }
}


</style>
