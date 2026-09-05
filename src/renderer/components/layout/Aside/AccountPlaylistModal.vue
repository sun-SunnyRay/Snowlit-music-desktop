<template>
  <material-modal :show="visible" max-height="90%" bg-close @close="$emit('update:visible', false)">
    <div :class="$style.header">
      <h2>{{ $t('account_playlist__title') }}</h2>
    </div>
    <main class="scroll" :class="$style.main">
      <div :class="$style.accounts">
        <div v-for="item in accounts" :key="item.id" :class="$style.account">
          <div>
            <h3>{{ $t('account_playlist__' + item.id) }}</h3>
            <p>{{ item.loggedIn ? (item.nickname || item.userId) : $t('account_playlist__logged_out') }}</p>
          </div>
          <base-btn v-if="item.loggedIn" min outline @click="handleLogout(item.id)">{{ $t('account_playlist__logout') }}</base-btn>
          <base-btn v-else min @click="handleLogin(item.id)">{{ $t('account_playlist__login') }}</base-btn>
        </div>
        <div :class="$style.account">
          <div>
            <h3>{{ $t('snowlit_account_name') }}</h3>
            <p>{{ snowlitSession ? snowlitSession.email : $t('account_playlist__logged_out') }}</p>
          </div>
          <base-btn v-if="snowlitSession" min outline @click="handleSnowlitLogout">{{ $t('account_playlist__logout') }}</base-btn>
          <base-btn v-else min @click="showSnowlitForm = !showSnowlitForm">{{ $t('account_playlist__login') }}</base-btn>
        </div>
      </div>
      <div v-if="showSnowlitForm && !snowlitSession" :class="$style.snowlitForm">
        <p :class="$style.hint">{{ $t('snowlit_account_hint') }}</p>
        <div :class="$style.field">
          <span>{{ $t('snowlit_account_email') }}</span>
          <base-input
            v-model="snowlitEmail"
            :class="$style.input"
            type="email"
            :placeholder="$t('snowlit_account_email')"
          />
        </div>
        <div :class="$style.field">
          <span>{{ $t('snowlit_account_code') }}</span>
          <div :class="$style.codeRow">
            <base-input
              v-model="snowlitCode"
              :class="$style.input"
              :placeholder="$t('snowlit_account_code')"
            />
            <base-btn min :disabled="snowlitBusy || snowlitWait > 0" @click="handleSendCode">
              {{ snowlitWait > 0 ? $t('snowlit_account_send_wait', { s: snowlitWait }) : $t('snowlit_account_send') }}
            </base-btn>
          </div>
        </div>
        <div :class="$style.actions">
          <base-btn :disabled="snowlitBusy" @click="handleSnowlitLogin">{{ $t('snowlit_account_submit') }}</base-btn>
        </div>
      </div>
      <p v-if="error" :class="$style.error">{{ error }}</p>
      <p :class="$style.synced">{{ $t('account_playlist__synced', { count: syncedCount }) }}</p>
    </main>
    <div :class="$style.footer">
      <base-btn :disabled="!hasLogin || refreshing" @click="handleRefresh">{{ $t('account_playlist__refresh') }}</base-btn>
    </div>
  </material-modal>
</template>

<script>
import { computed, onBeforeUnmount, ref, watch } from '@common/utils/vueTools'
import { useRouter } from '@common/utils/vueRouter'
import { useI18n } from '@root/lang'
import { accountAutoState, ensureAccountPlaylists } from '@renderer/store/sourceAccount'
import { setSnowlitSession, snowlitAccountState } from '@renderer/store/snowlitAccount'
import { SNOWLIT_CODE_WAIT_SEC, sendSnowlitCode, SnowlitAccountError, verifySnowlitCode } from '@renderer/core/snowlitAccount'
import { refreshSnowlitListPull, syncSnowlitLists } from '@renderer/core/snowlitListSync'
import { canSyncListId, SYNC_FIXED_IDS } from '@renderer/core/snowlitListSync/ids'
import { userLists } from '@renderer/store/list/state'
import {
  getSourceAccountStatus,
  loginSourceAccount,
  logoutSourceAccount,
} from '@renderer/utils/ipc'

const SOURCE_IDS = ['wy', 'tx', 'kg']

export default {
  props: {
    visible: { type: Boolean, default: false },
  },
  emits: ['update:visible'],
  setup(props) {
    const router = useRouter()
    const t = useI18n()
    const accounts = ref(SOURCE_IDS.map(id => ({ id, loggedIn: false })))
    const error = ref('')
    const refreshing = ref(false)
    const showSnowlitForm = ref(false)
    const snowlitEmail = ref('')
    const snowlitCode = ref('')
    const snowlitBusy = ref(false)
    const snowlitWait = ref(0)
    const snowlitSession = computed(() => snowlitAccountState.session)
    const snowlitListCount = computed(() => {
      if (!snowlitSession.value) return 0
      const fixed = new Set(SYNC_FIXED_IDS)
      return SYNC_FIXED_IDS.length + userLists.filter(info => canSyncListId(info.id) && !fixed.has(info.id)).length
    })
    const syncedCount = computed(() => accountAutoState.syncedCount + snowlitListCount.value)
    const hasLogin = computed(() => accounts.value.some(item => item.loggedIn) || !!snowlitSession.value)
    let waitTimer = null

    const refreshStatus = async() => {
      accounts.value = await getSourceAccountStatus()
      accountAutoState.loggedIn = accounts.value.filter(item => item.loggedIn).map(item => item.id)
    }

    const goMyList = () => {
      if (router.currentRoute.value.path == '/list') return
      void router.push({ path: '/list' })
    }

    const snowlitError = (err, kind) => {
      if (err instanceof SnowlitAccountError) {
        if (err.code == 'not_wired') return t('snowlit_account_not_wired')
        if (err.code == 'bad_email') return t('snowlit_account_bad_email')
        const msg = typeof err.message == 'string' ? err.message.trim() : ''
        if (
          err.code == 'http'
          && msg
          && msg != 'http'
          && msg != 'timeout'
          && !/^http \d+$/.test(msg)
          && !/aborted/i.test(msg)
          && /[\u4e00-\u9fff]/.test(msg)
        ) return msg
      }
      return t(kind == 'send' ? 'snowlit_account_send_failed' : 'snowlit_account_failed')
    }

    const clearWait = () => {
      if (waitTimer) {
        clearInterval(waitTimer)
        waitTimer = null
      }
    }

    const startWait = () => {
      clearWait()
      snowlitWait.value = SNOWLIT_CODE_WAIT_SEC
      waitTimer = setInterval(() => {
        snowlitWait.value -= 1
        if (snowlitWait.value <= 0) clearWait()
      }, 1000)
    }

    watch(() => props.visible, (show) => {
      if (show) void refreshStatus()
    })

    onBeforeUnmount(() => {
      clearWait()
    })

    const handleLogin = async(id) => {
      error.value = ''
      try {
        await loginSourceAccount(id)
        await ensureAccountPlaylists()
        await refreshStatus()
        goMyList()
      } catch (err) {
        error.value = err.message || String(err)
      }
    }

    const handleLogout = async(id) => {
      await logoutSourceAccount(id)
      await ensureAccountPlaylists()
      await refreshStatus()
    }

    const handleSendCode = async() => {
      if (snowlitBusy.value || snowlitWait.value > 0) return
      error.value = ''
      snowlitBusy.value = true
      try {
        await sendSnowlitCode(snowlitEmail.value)
        startWait()
      } catch (err) {
        error.value = snowlitError(err, 'send')
      } finally {
        snowlitBusy.value = false
      }
    }

    const handleSnowlitLogin = async() => {
      if (snowlitBusy.value) return
      if (!snowlitCode.value.trim()) {
        error.value = t('snowlit_account_need_code')
        return
      }
      error.value = ''
      snowlitBusy.value = true
      try {
        const session = await verifySnowlitCode(snowlitEmail.value, snowlitCode.value)
        await setSnowlitSession(session)
        showSnowlitForm.value = false
        snowlitCode.value = ''
        try {
          await syncSnowlitLists()
        } catch {
          error.value = t('snowlit_list_sync_failed')
        }
        refreshSnowlitListPull()
      } catch (err) {
        error.value = snowlitError(err, 'login')
      } finally {
        snowlitBusy.value = false
      }
    }

    const handleSnowlitLogout = async() => {
      await setSnowlitSession(null)
      showSnowlitForm.value = false
      refreshSnowlitListPull()
    }

    const handleRefresh = async() => {
      refreshing.value = true
      error.value = ''
      try {
        if (accounts.value.some(item => item.loggedIn)) {
          await ensureAccountPlaylists()
          await refreshStatus()
        }
        if (snowlitSession.value) {
          try {
            await syncSnowlitLists()
          } catch {
            error.value = t('snowlit_list_sync_failed')
          }
          refreshSnowlitListPull()
        }
      } catch (err) {
        error.value = err.message || String(err)
      } finally {
        refreshing.value = false
      }
    }

    return {
      accounts,
      error,
      refreshing,
      syncedCount,
      hasLogin,
      snowlitSession,
      showSnowlitForm,
      snowlitEmail,
      snowlitCode,
      snowlitBusy,
      snowlitWait,
      handleLogin,
      handleLogout,
      handleSendCode,
      handleSnowlitLogin,
      handleSnowlitLogout,
      handleRefresh,
    }
  },
}
</script>

<style lang="less" module>
@import '@renderer/assets/styles/layout.less';

@width: 420px;

.header {
  flex: none;
  padding: 15px;
  text-align: center;
}
.main {
  flex: 1;
  min-height: 0;
  width: @width;
  padding: 0 15px 10px;
}
.accounts {
  display: flex;
  flex-direction: column;
  gap: 10px;
  margin-bottom: 12px;
}
.account {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  h3 {
    font-size: 14px;
  }
  p {
    font-size: 12px;
    opacity: .7;
  }
}
.snowlitForm {
  display: flex;
  flex-direction: column;
  gap: 10px;
  margin: 2px 0 12px;
}
.hint {
  font-size: 12px;
  opacity: .7;
}
.field {
  display: flex;
  flex-direction: column;
  gap: 4px;
  span {
    font-size: 13px;
  }
}
.codeRow {
  display: flex;
  align-items: center;
  gap: 8px;
}
.input {
  flex: 1;
  min-width: 0;
}
.actions {
  display: flex;
  justify-content: flex-end;
}
.error {
  color: var(--color-btn-error);
  font-size: 12px;
  margin-bottom: 8px;
}
.synced {
  font-size: 12px;
  opacity: .7;
}
.footer {
  flex: none;
  padding: 12px 15px 16px;
  text-align: right;
}
</style>
