<template>
  <material-modal :show="visible" bg-close @close="$emit('update:visible', false)">
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
import { computed, ref, watch } from '@common/utils/vueTools'
import { useRouter } from '@common/utils/vueRouter'
import { accountAutoState, ensureAccountPlaylists } from '@renderer/store/sourceAccount'
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
    const accounts = ref(SOURCE_IDS.map(id => ({ id, loggedIn: false })))
    const error = ref('')
    const refreshing = ref(false)
    const syncedCount = computed(() => accountAutoState.syncedCount)
    const hasLogin = computed(() => accounts.value.some(item => item.loggedIn))

    const refreshStatus = async() => {
      accounts.value = await getSourceAccountStatus()
      accountAutoState.loggedIn = accounts.value.filter(item => item.loggedIn).map(item => item.id)
    }

    const goMyList = () => {
      if (router.currentRoute.value.path == '/list') return
      void router.push({ path: '/list' })
    }

    watch(() => props.visible, (show) => {
      if (show) void refreshStatus()
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

    const handleRefresh = async() => {
      refreshing.value = true
      error.value = ''
      try {
        await ensureAccountPlaylists()
        await refreshStatus()
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
      handleLogin,
      handleLogout,
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
  min-height: 160px;
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
  padding: 12px 15px 16px;
  text-align: right;
}
</style>
