<template>
  <material-modal :show="visible" bg-close teleport="#view" @close="$emit('update:visible', false)">
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
      <ul v-if="playlists.length" :class="$style.list">
        <li v-for="pl in playlists" :key="pl.source + '_' + pl.id" :class="$style.listItem">
          <base-checkbox
            :id="'account_pl_' + pl.source + '_' + pl.id"
            :model-value="selected.has(plKey(pl))"
            :label="playlistLabel(pl)"
            @change="toggle(pl)"
          />
        </li>
      </ul>
      <div v-else :class="$style.noItem">
        <p>{{ $t('account_playlist__empty') }}</p>
      </div>
    </main>
    <div :class="$style.footer">
      <base-btn :disabled="!selected.size || importing" @click="handleImport">{{ $t('account_playlist__import') }}</base-btn>
    </div>
  </material-modal>
</template>

<script>
import { ref, watch } from '@common/utils/vueTools'
import { useI18n } from '@renderer/plugins/i18n'
import { dialog } from '@renderer/plugins/Dialog'
import { userLists } from '@renderer/store/list/state'
import { createUserList } from '@renderer/store/list/action'
import syncSourceList from '@renderer/store/list/syncSourceList'
import {
  getSourceAccountPlaylists,
  getSourceAccountStatus,
  getSourceAccountTracks,
  loginSourceAccount,
  logoutSourceAccount,
} from '@renderer/utils/ipc'
import { toMD5 } from '@renderer/utils'
import { ensureAutoLists } from '@renderer/store/sourceAccount'

const SOURCE_IDS = ['wy', 'tx', 'kg']

export default {
  props: {
    visible: { type: Boolean, default: false },
  },
  emits: ['update:visible'],
  setup(props) {
    const t = useI18n()
    const accounts = ref(SOURCE_IDS.map(id => ({ id, loggedIn: false })))
    const playlists = ref([])
    const selected = ref(new Set())
    const error = ref('')
    const importing = ref(false)

    const plKey = (pl) => `${pl.source}__${pl.id}`

    const playlistLabel = (pl) => {
      const source = t('account_playlist__' + pl.source)
      return `${source} · ${pl.name}`
    }

    const loadPlaylists = async() => {
      error.value = ''
      const next = []
      for (const item of accounts.value) {
        if (!item.loggedIn) continue
        try {
          next.push(...await getSourceAccountPlaylists(item.id))
        } catch (err) {
          error.value = err.message || String(err)
        }
      }
      playlists.value = next.filter(pl => pl.kind != 'daily' && pl.kind != 'recent')
    }

    const refreshStatus = async() => {
      accounts.value = await getSourceAccountStatus()
      await loadPlaylists()
    }

    watch(() => props.visible, (show) => {
      if (show) void refreshStatus()
    })

    const handleLogin = async(id) => {
      error.value = ''
      try {
        await loginSourceAccount(id)
        await ensureAutoLists()
        await refreshStatus()
      } catch (err) {
        error.value = err.message || String(err)
      }
    }

    const handleLogout = async(id) => {
      await logoutSourceAccount(id)
      selected.value = new Set([...selected.value].filter(key => !key.startsWith(id + '__')))
      await refreshStatus()
    }

    const toggle = (pl) => {
      const key = plKey(pl)
      const next = new Set(selected.value)
      if (next.has(key)) next.delete(key)
      else next.add(key)
      selected.value = next
    }

    const handleImport = async() => {
      importing.value = true
      error.value = ''
      try {
        const picked = playlists.value.filter(pl => selected.value.has(plKey(pl)))
        for (const pl of picked) {
          const sourceListId = pl.id
          const localId = `${pl.source}_${toMD5(`${pl.source}__${sourceListId}`)}`
          const existed = userLists.find(l => l.source == pl.source && l.sourceListId == sourceListId)
          if (existed) {
            await syncSourceList(existed)
            continue
          }
          const list = await getSourceAccountTracks(pl.source, pl.id)
          await createUserList({
            name: playlistLabel(pl),
            id: localId,
            list,
            source: pl.source,
            sourceListId,
          })
        }
        selected.value = new Set()
        await dialog({ message: t('account_playlist__done'), confirmButtonText: t('confirm_button_text') })
      } catch (err) {
        error.value = err.message || String(err)
      } finally {
        importing.value = false
      }
    }

    return {
      accounts,
      playlists,
      selected,
      error,
      importing,
      plKey,
      playlistLabel,
      handleLogin,
      handleLogout,
      toggle,
      handleImport,
    }
  },
}
</script>

<style lang="less" module>
@import '@renderer/assets/styles/layout.less';

@width: 520px;

.header {
  flex: none;
  padding: 15px;
  text-align: center;
}
.main {
  min-height: 180px;
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
.list {
  font-size: 13px;
}
.listItem {
  padding: 8px 0;
}
.error {
  color: var(--color-btn-error);
  font-size: 12px;
  margin-bottom: 8px;
}
.noItem {
  padding: 20px 0;
  text-align: center;
  opacity: .7;
}
.footer {
  padding: 12px 15px 16px;
  text-align: right;
}
</style>
