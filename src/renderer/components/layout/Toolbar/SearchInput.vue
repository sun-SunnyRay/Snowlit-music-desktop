<template>
  <material-search-input v-model="searchText" :list="tipList" :visible-list="visibleList" @event="handleEvent">
    <template #empty>
      <div v-if="showEmptyPanel" :class="$style.panel">
        <dl v-if="appSetting['search.isShowHistorySearch'] && historyList.length" :class="$style.section">
          <dt :class="$style.title">
            <span>{{ $t('history_search') }}</span>
            <span :class="$style.clearBtn" :aria-label="$t('history_clear')" @click="clearHistoryList">
              <svg version="1.1" xmlns="http://www.w3.org/2000/svg" xlink="http://www.w3.org/1999/xlink" height="100%" viewBox="0 0 512 512" space="preserve">
                <use xlink:href="#icon-eraser" />
              </svg>
            </span>
          </dt>
          <dd
            v-for="(item, index) in historyList"
            :key="'h' + index + item"
            :class="$style.chip"
            :aria-label="$t('history_remove')"
            @contextmenu.prevent="removeHistoryWord(index)"
            @click="handleChipSearch(item)"
          >{{ item }}</dd>
        </dl>
        <dl v-if="appSetting['search.isShowHotSearch'] && hotSearchList.length" :class="$style.section">
          <dt :class="$style.title">{{ $t('search__hot_search') }}</dt>
          <dd
            v-for="(item, index) in hotSearchList"
            :key="'hot' + index + item"
            :class="$style.chip"
            @click="handleChipSearch(item)"
          >{{ item }}</dd>
        </dl>
      </div>
    </template>
  </material-search-input>
</template>

<script>
import music from '@renderer/utils/musicSdk'
import { debounce } from '@common/utils'
import {
  ref,
  computed,
  watch,
  nextTick,
  shallowRef,
} from '@common/utils/vueTools'
import { useRouter, useRoute } from '@common/utils/vueRouter'
import { appSetting } from '@renderer/store/setting'
import { searchText as _searchText, historyList } from '@renderer/store/search/state'
import { setSearchText, getHistoryList, removeHistoryWord, clearHistoryList } from '@renderer/store/search/action'
import { getList } from '@renderer/store/hotSearch'
import { getSearchSetting } from '@renderer/utils/data'
import { setVisibleListDetail } from '@renderer/store/songList/action'

export default {
  setup() {
    const searchText = ref('')
    const visibleList = ref(false)
    const tipList = ref([])
    const hotSearchList = shallowRef([])
    let isFocused = false
    let prevTempSearchSource = ''

    const route = useRoute()
    const router = useRouter()

    const showEmptyPanel = computed(() => {
      const showHistory = appSetting['search.isShowHistorySearch'] && historyList.length > 0
      const showHot = appSetting['search.isShowHotSearch'] && hotSearchList.value.length > 0
      return showHistory || showHot
    })

    watch(() => route.name, (newValue, oldValue) => {
      if (oldValue == 'Search' && newValue != 'SongListDetail') {
        setTimeout(() => {
          if (appSetting['odc.isAutoClearSearchInput'] && searchText.value) searchText.value = ''
          if (appSetting['odc.isAutoClearSearchList']) setSearchText('')
        })
      }
    })

    watch(_searchText, (newValue) => {
      searchText.value = newValue
    })
    watch(searchText, () => {
      if (searchText.value) {
        handleTipSearch()
        return
      }
      if (!isFocused) return
      visibleList.value = true
      void loadEmptyPanel()
    })

    const resolveHotSource = async() => {
      const q = route.query.source
      if (typeof q == 'string' && q) return q
      const setting = await getSearchSetting()
      return setting.source
    }

    const loadEmptyPanel = async() => {
      if (appSetting['search.isShowHistorySearch']) await getHistoryList()
      if (!appSetting['search.isShowHotSearch']) {
        hotSearchList.value = []
        return
      }
      const source = await resolveHotSource()
      try {
        hotSearchList.value = await getList(source)
      } catch {
        hotSearchList.value = []
      }
    }

    const tipSearch = debounce(async() => {
      if (searchText.value === '' && prevTempSearchSource) {
        tipList.value = []
        music[prevTempSearchSource].tipSearch.cancelTipSearch()
        return
      }
      const { temp_source } = await getSearchSetting()
      prevTempSearchSource ||= temp_source
      music[prevTempSearchSource].tipSearch.search(searchText.value).then(list => {
        tipList.value = list
      }).catch(() => {})
    }, 50)

    const handleTipSearch = () => {
      if (!visibleList.value && isFocused) visibleList.value = true
      tipSearch()
    }

    const handleSearch = () => {
      const onSongList = route.path.startsWith('/songList')
      if (!searchText.value) {
        setSearchText('')
        if (route.path == '/songList/list' && route.query.text) {
          const query = { ...route.query }
          delete query.text
          query.page = '1'
          void router.replace({ path: '/songList/list', query }).catch(_ => _)
        }
        visibleList.value = isFocused
        return
      }
      visibleList.value = false
      setTimeout(() => {
        if (onSongList) {
          setVisibleListDetail(false)
          void router.push({
            path: '/songList/list',
            query: {
              source: route.query.source,
              tagId: route.query.tagId,
              sortId: route.query.sortId,
              text: searchText.value,
              page: 1,
            },
          }).catch(_ => _)
          return
        }
        void router.push({
          path: '/search',
          query: {
            text: searchText.value,
            type: 'music',
          },
        }).catch(_ => _)
      }, 200)
    }

    const handleChipSearch = (text) => {
      searchText.value = text
      void nextTick(handleSearch)
    }

    const handleEvent = ({ action, data }) => {
      switch (action) {
        case 'focus':
          isFocused = true
          visibleList.value = true
          if (searchText.value) handleTipSearch()
          else void loadEmptyPanel()
          break
        case 'blur':
          isFocused = false
          setTimeout(() => {
            visibleList.value &&= false
          }, 50)
          break
        case 'submit':
          handleSearch()
          break
        case 'listClick':
          searchText.value = tipList.value[data]
          void nextTick(handleSearch)
      }
    }

    return {
      searchText,
      visibleList,
      tipList,
      handleEvent,
      handleChipSearch,
      showEmptyPanel,
      historyList,
      hotSearchList,
      appSetting,
      removeHistoryWord,
      clearHistoryList,
    }
  },
}

</script>

<style lang="less" module>
@import '@renderer/assets/styles/layout.less';

.panel {
  padding: 8px 8px 10px;
}

.section {
  + .section {
    margin-top: 8px;
  }
}

.title {
  display: flex;
  align-items: center;
  color: var(--color-font);
  padding: 2px 4px 6px;
  font-size: 12px;
}

.chip {
  display: inline-block;
  margin: 3px 4px;
  background-color: var(--color-button-background);
  padding: 5px 8px;
  border-radius: @radius-progress-border;
  transition: background-color @transition-normal;
  cursor: pointer;
  color: var(--color-button-font);
  .mixin-ellipsis-1();
  max-width: 150px;
  font-size: 12px;
  &:hover {
    background-color: var(--color-button-background-hover);
  }
  &:active {
    background-color: var(--color-button-background-active);
  }
}

.clearBtn {
  padding: 0 5px;
  margin-left: 4px;
  color: var(--color-font-label);
  cursor: pointer;
  transition: @transition-normal;
  transition-property: color, opacity;
  opacity: .3;
  &:hover {
    color: var(--color-primary-font-hover);
    opacity: .8;
  }
  &:active {
    color: var(--color-primary-font-active);
    opacity: 1;
  }
  svg {
    vertical-align: middle;
    width: 13px;
  }
}
</style>
