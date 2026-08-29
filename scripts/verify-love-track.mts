import {
  collapseLoveList,
  isLovedMusic,
  loveIdsForTrack,
  loveListUnchanged,
  sameLoveTrack,
  upsertLoveInto,
} from '../src/common/loveTrack.ts'

const track = (id: string, name: string, singer: string) => ({
  id,
  name,
  singer,
  source: id.split('_')[0],
  interval: '03:00',
  meta: { songId: id, albumName: '' },
}) as LX.Music.MusicInfo

const assert = (ok: boolean, message: string) => {
  if (!ok) throw new Error(message)
}

const wy = track('wy_1', '晴天', '周杰伦')
const tx = track('tx_1', '晴天', '周杰伦/费玉清')
const other = track('kg_2', '晴天', '孙燕姿')
const spaced = track('kg_1', '晴 天', '周杰伦')

assert(sameLoveTrack(wy, tx), 'overlap singers should match')
assert(sameLoveTrack(wy, spaced), 'name spaces should match')
assert(!sameLoveTrack(wy, other), 'different singer should not match')

const collapsed = collapseLoveList([wy, other, tx])
assert(collapsed.length == 2, 'collapse should keep two tracks')
assert(collapsed[0].id == 'tx_1', 'collapse should keep last same-track source')
assert(collapsed[1].id == 'kg_2', 'other singer should remain')

const replaced = upsertLoveInto([wy, other], [tx], 'bottom')
assert(replaced.length == 2, 'upsert should not grow the list')
assert(replaced[0].id == 'tx_1', 'upsert should replace in place')
assert(replaced[1].id == 'kg_2', 'unrelated track should stay')

const inserted = upsertLoveInto([other], [wy], 'top')
assert(inserted[0].id == 'wy_1' && inserted[1].id == 'kg_2', 'fresh track should insert at top')

assert(isLovedMusic([wy], tx), 'loved should follow identity')
assert(loveIdsForTrack([wy, tx, other], spaced).join(',') == 'wy_1,tx_1', 'uncollect should take every same-track id')
assert(loveListUnchanged([wy], [wy]), 'unchanged list should compare equal')
assert(!loveListUnchanged([wy], [tx]), 'replaced source should compare different')

console.log('loveTrack ok')
