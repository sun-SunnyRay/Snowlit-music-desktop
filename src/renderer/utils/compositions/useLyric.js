import { ref, onMounted, onBeforeUnmount, watch, nextTick } from '@common/utils/vueTools'
import { throttle, formatPlayTime2 } from '@common/utils/common'
import { scrollTo } from '@common/utils/renderer'
import { play } from '@renderer/core/player/action'
import { appSetting } from '@renderer/store/setting'
// import { player as eventPlayerNames } from '@renderer/event/names'

const CLICK_SEEK_PX = 8

export default ({ isPlay, lyric, playProgress, isShowLyricProgressSetting, offset }) => {
  const dom_lyric = ref(null)
  const dom_lyric_text = ref(null)
  const dom_skip_line = ref(null)
  const isMsDown = ref(false)
  const isStopScroll = ref(false)
  const timeStr = ref('--/--')

  let msDownY = 0
  let msDownScrollY = 0
  let timeout = null
  let cancelScrollFn
  let dom_lines
  let isSetedLines = false
  let point = {
    x: null,
    y: null,
  }
  let time = -1
  let dom_pre_line = null
  let isSkipMouseEnter = false
  let press = null

  const progressFromLineTime = (lineTimeMs) => {
    let progress = Math.max(lineTimeMs - lyric.offset - lyric.tempOffset, 0) / 1000
    if (progress > playProgress.maxPlayTime) progress = playProgress.maxPlayTime
    return progress
  }

  const findLineEl = (el) => {
    const root = dom_lyric.value
    while (el && el !== root) {
      if (el.time != null) return el
      el = el.parentNode
    }
    return null
  }

  const seekToLineEl = (el) => {
    const line = findLineEl(el)
    if (!line || line.time == null) return
    clearLyricScrollTimeout()
    isStopScroll.value = false
    window.app_event.setProgress(progressFromLineTime(line.time))
  }

  const handleSkipPlay = () => {
    if (time == -1) return
    handleSkipMouseLeave()
    isStopScroll.value = false
    window.app_event.setProgress(time)
    if (!isPlay.value) play()
  }
  const handleSkipMouseEnter = () => {
    isSkipMouseEnter = true
    clearLyricScrollTimeout()
  }
  const handleSkipMouseLeave = () => {
    isSkipMouseEnter = false
    startLyricScrollTimeout()
  }

  const throttleSetTime = throttle(() => {
    if (!dom_skip_line.value) return
    const rect = dom_skip_line.value.getBoundingClientRect()
    point.x = rect.x
    point.y = rect.y
    let dom = document.elementFromPoint(point.x, point.y)
    if (dom_pre_line === dom) return
    if (dom.tagName == 'SPAN') {
      dom = dom.parentNode.parentNode
    } else if (dom.classList.contains('line')) {
      dom = dom.parentNode
    }
    if (dom.time == null) {
      if (lyric.lines.length) {
        const lineTime = dom.classList.contains('pre') ? 0 : lyric.lines[lyric.lines.length - 1].time ?? 0
        time = progressFromLineTime(lineTime)
        timeStr.value = formatPlayTime2(time)
      } else {
        time = -1
        timeStr.value = '--:--'
      }
    } else {
      time = progressFromLineTime(dom.time)
      timeStr.value = formatPlayTime2(time)
    }
    dom_pre_line = dom
  })
  const setTime = () => {
    if (isShowLyricProgressSetting.value) throttleSetTime()
  }

  const handleScrollLrc = (duration = 300) => {
    if (!dom_lines?.length || !dom_lyric.value) return
    if (isSkipMouseEnter) return
    if (isStopScroll.value) return
    let dom_p = dom_lines[lyric.line]
    cancelScrollFn = scrollTo(dom_lyric.value, dom_p ? (dom_p.offsetTop - dom_lyric.value.clientHeight * 0.38) : 0, duration)
  }
  const clearLyricScrollTimeout = () => {
    if (!timeout) return
    clearTimeout(timeout)
    timeout = null
  }
  const startLyricScrollTimeout = () => {
    clearLyricScrollTimeout()
    if (isSkipMouseEnter) return
    timeout = setTimeout(() => {
      timeout = null
      isStopScroll.value = false
      if (!isPlay.value) return
      handleScrollLrc()
    }, 3000)
  }
  const handleLyricDown = (y, x, target) => {
    // console.log(event)
    if (delayScrollTimeout) {
      clearTimeout(delayScrollTimeout)
      delayScrollTimeout = null
    }
    isMsDown.value = true
    msDownY = y
    msDownScrollY = dom_lyric.value.scrollTop
    press = { x, y, target }
  }
  const handleLyricMouseDown = event => {
    if (event.button !== 0) return
    handleLyricDown(event.clientY, event.clientX, event.target)
  }
  const handleLyricTouchStart = event => {
    if (event.changedTouches.length) {
      const touch = event.changedTouches[0]
      handleLyricDown(touch.clientY, touch.clientX, event.target)
    }
  }
  const handlePointerUp = (x, y) => {
    const wasDown = isMsDown.value
    isMsDown.value = false
    if (!wasDown || !press) {
      press = null
      return
    }
    const dx = x - press.x
    const dy = y - press.y
    const target = press.target
    press = null
    if ((dx * dx + dy * dy) > CLICK_SEEK_PX * CLICK_SEEK_PX) return
    seekToLineEl(target)
  }
  const handleMouseMsUp = event => {
    handlePointerUp(event.clientX, event.clientY)
  }
  const handleTouchEnd = event => {
    if (event.changedTouches.length) {
      const touch = event.changedTouches[0]
      handlePointerUp(touch.clientX, touch.clientY)
      return
    }
    isMsDown.value = false
    press = null
  }
  const handleMove = (y) => {
    if (isMsDown.value) {
      isStopScroll.value ||= true
      if (cancelScrollFn) {
        cancelScrollFn()
        cancelScrollFn = null
      }
      dom_lyric.value.scrollTop = msDownScrollY + msDownY - y
      startLyricScrollTimeout()
      setTime()
    }
  }
  const handleMouseMsMove = event => {
    handleMove(event.clientY)
  }
  const handleTouchMove = (e) => {
    if (e.changedTouches.length) {
      const touch = e.changedTouches[0]
      handleMove(touch.clientY)
    }
  }

  const handleWheel = (event) => {
    console.log(event.deltaY)
    isStopScroll.value ||= true
    if (cancelScrollFn) {
      cancelScrollFn()
      cancelScrollFn = null
    }
    dom_lyric.value.scrollTop = dom_lyric.value.scrollTop + event.deltaY
    startLyricScrollTimeout()
    setTime()
  }

  const setLyric = (lines) => {
    const dom_line_content = document.createDocumentFragment()
    for (const line of lines) {
      dom_line_content.appendChild(line.dom_line)
    }
    dom_lyric_text.value.textContent = ''
    dom_lyric_text.value.appendChild(dom_line_content)
    nextTick(() => {
      dom_lines = dom_lyric.value.querySelectorAll('.line-content')
      handleScrollLrc()
    })
  }

  const initLrc = (lines, oLines) => {
    isSetedLines = true
    if (oLines) {
      if (lines.length) {
        setLyric(lines)
      } else {
        cancelScrollFn = scrollTo(dom_lyric.value, 0, 300, () => {
          if (lyric.lines !== lines) return
          setLyric(lines)
        }, 50)
      }
    } else {
      setLyric(lines)
    }
  }

  let delayScrollTimeout
  const scrollLine = (line, oldLine) => {
    if (line < 0) return
    if (line == 0 && isSetedLines) return isSetedLines = false
    isSetedLines &&= false
    if (oldLine == null || line - oldLine != 1) return handleScrollLrc()

    if (appSetting['playDetail.isDelayScroll']) {
      delayScrollTimeout = setTimeout(() => {
        delayScrollTimeout = null
        handleScrollLrc(600)
      }, 600)
    } else {
      handleScrollLrc()
    }
  }

  watch(() => lyric.lines, initLrc)
  watch(() => lyric.line, scrollLine)

  onMounted(() => {
    document.addEventListener('mousemove', handleMouseMsMove)
    document.addEventListener('mouseup', handleMouseMsUp)
    document.addEventListener('touchmove', handleTouchMove)
    document.addEventListener('touchend', handleTouchEnd)

    initLrc(lyric.lines, null)
  })

  onBeforeUnmount(() => {
    document.removeEventListener('mousemove', handleMouseMsMove)
    document.removeEventListener('mouseup', handleMouseMsUp)
    document.removeEventListener('touchmove', handleTouchMove)
    document.removeEventListener('touchend', handleTouchEnd)
  })

  return {
    dom_lyric,
    dom_lyric_text,
    dom_skip_line,
    isStopScroll,
    isMsDown,
    timeStr,
    handleLyricMouseDown,
    handleLyricTouchStart,
    handleWheel,
    handleSkipPlay,
    handleSkipMouseEnter,
    handleSkipMouseLeave,
    handleScrollLrc,
  }
}
