import { reactive } from '@common/utils/vueTools'
import { restoreSnowlitSession, writeSnowlitSession, type SnowlitSession } from '@renderer/core/snowlitAccount'

export const snowlitAccountState = reactive({
  session: null as SnowlitSession | null,
})

export const setSnowlitSession = async(session: SnowlitSession | null) => {
  await writeSnowlitSession(session)
  snowlitAccountState.session = session
  return session
}

export const loadSnowlitSession = async() => {
  snowlitAccountState.session = await restoreSnowlitSession()
  return snowlitAccountState.session
}
