<template>
  <div :class="$style.container">
    <div :class="$style.header">
      <base-tab v-model="source" :list="sources" @change="handleSourceChange" />
    </div>
    <div :class="$style.main">
      <music-list v-show="searchText" :page="page" :source-id="source" />
      <blank-view :visible="!searchText" />
    </div>
  </div>
</template>

<script>
import { useRoute, useRouter } from '@common/utils/vueRouter'
import { searchText } from '@renderer/store/search/state'
import { getSearchSetting, setSearchSetting } from '@renderer/utils/data'
import { sources as _sources } from '@renderer/store/search/music'

import MusicList from './MusicList/index.vue'
import BlankView from './components/BlankView.vue'
import { ref } from '@common/utils/vueTools'
import { sourceNames } from '@renderer/store'

const source = ref('kw')
const page = ref(1)

const verifyQueryParams = async(to, from, next) => {
  let _source = to.query.source
  let _page = to.query.page

  if (_source == null) {
    const setting = await getSearchSetting()
    _source ??= setting.source

    next({
      path: to.path,
      query: { ...to.query, source: _source, type: 'music', page: _page },
    })
    return
  }
  source.value = _source

  if (_page) page.value = parseInt(_page)

  if (to.query.text != null) {
    searchText.value = to.query.text
    if (!_page) page.value = 1
  }
  next()
  void setSearchSetting({ source: _source, type: 'music' })
}

export default {
  components: {
    MusicList,
    BlankView,
  },
  beforeRouteEnter: verifyQueryParams,
  beforeRouteUpdate: verifyQueryParams,
  setup() {
    const route = useRoute()
    const router = useRouter()

    const sources = _sources.map(id => {
      return {
        id,
        label: sourceNames.value[id],
      }
    })
    const handleSourceChange = (id) => {
      void router.replace({
        path: route.path,
        query: {
          ...route.query,
          source: id,
          type: 'music',
          page: 1,
        },
      })
    }

    return {
      sources,
      source,
      handleSourceChange,
      page,
      searchText,
    }
  },
}


</script>

<style lang="less" module>
.container {
  height: 100%;
  display: flex;
  flex-flow: column nowrap;
}

.header {
  flex: none;
  display: flex;
  flex-flow: row nowrap;
}

.main {
  position: relative;
  flex: auto;
  min-height: 0;
}
</style>
