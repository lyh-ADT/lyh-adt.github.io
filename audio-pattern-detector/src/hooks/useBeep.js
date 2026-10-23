/**
 * 提示音 Hook / 播放工具
 *
 * 所有提示音共用一个 AudioContext，避免每次 beep 都新建上下文导致浏览器
 * 触达同时存在的 AudioContext 上限。不同场景使用 audioCues.js 中定义的不同音色。
 */

import { useCallback } from 'react'
import { getCue } from '../utils/audioCues'

let sharedContext = null

function getSharedContext() {
  if (typeof window === 'undefined') return null

  if (!sharedContext || sharedContext.state === 'closed') {
    const AudioContextClass = window.AudioContext || window.webkitAudioContext
    if (!AudioContextClass) return null
    sharedContext = new AudioContextClass()
  }

  if (sharedContext.state === 'suspended') {
    sharedContext.resume().catch(() => {
      // 浏览器的自动播放策略可能拒绝 resume，下一次用户手势时会再尝试。
    })
  }

  return sharedContext
}

function scheduleTone(context, tone, offsetSeconds) {
  const safeVolume = Math.max(0, Math.min(1, Number(tone.volume) || 0))
  if (safeVolume <= 0) return

  try {
    const oscillator = context.createOscillator()
    const gainNode = context.createGain()
    const startAt = context.currentTime + Math.max(0, offsetSeconds)
    const durationSeconds = Math.max(0.01, (Number(tone.duration) || 80) / 1000)

    oscillator.type = tone.type || 'square'
    oscillator.frequency.setValueAtTime(
      Math.max(20, Number(tone.frequency) || 1000),
      startAt
    )

    gainNode.gain.setValueAtTime(safeVolume, startAt)
    gainNode.gain.exponentialRampToValueAtTime(
      Math.max(0.0001, safeVolume * 0.05),
      startAt + durationSeconds
    )

    oscillator.connect(gainNode)
    gainNode.connect(context.destination)
    oscillator.start(startAt)
    oscillator.stop(startAt + durationSeconds + 0.02)

    oscillator.onended = () => {
      try {
        oscillator.disconnect()
        gainNode.disconnect()
      } catch {
        // 节点可能已经被浏览器回收，忽略即可。
      }
    }
  } catch (err) {
    console.error('播放提示音失败:', err)
  }
}

/**
 * 直接播放一个自定义音调。可以在非 Hook 环境（例如自定义模式节点）调用。
 */
export function playTone({
  frequency = 1000,
  duration = 80,
  volume = 0.4,
  type = 'square'
} = {}) {
  const context = getSharedContext()
  if (!context) return

  scheduleTone(context, { frequency, duration, volume, type }, 0)
}

/**
 * 播放预定义的场景提示音。
 * @param {'standby'|'start'|'parTime'|'shot'} name
 */
export function playCue(name) {
  const cue = getCue(name)
  if (!cue) return

  const context = getSharedContext()
  if (!context) return

  let offset = 0
  for (const tone of cue.tones) {
    scheduleTone(context, tone, offset)
    offset += (Math.max(1, Number(tone.duration) || 80) + Math.max(0, tone.gapAfter || 0)) / 1000
  }
}

/**
 * 返回一个稳定函数，用于播放指定场景提示音。
 * @param {boolean} enabled 是否启用
 * @param {'standby'|'start'|'parTime'|'shot'} name
 */
export function useCue(enabled = true, name = 'start') {
  return useCallback(() => {
    if (!enabled) return
    playCue(name)
  }, [enabled, name])
}

export default useCue
