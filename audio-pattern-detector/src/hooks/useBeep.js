/**
 * 蜂鸣器 Hook / 提示音工具
 *
 * 所有提示音共用一个 AudioContext，避免每次 beep 都新建上下文导致浏览器
 * 触达同时存在的 AudioContext 上限。提示音默认很短，降低被麦克风拾取后
 * 再次触发枪声检测的概率。
 */

import { useCallback } from 'react'

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

/**
 * 直接播放一个提示音。可以在非 Hook 环境（例如自定义模式节点）调用。
 * @param {Object} options
 * @param {number} options.frequency 频率（Hz）
 * @param {number} options.duration 时长（毫秒）
 * @param {number} options.volume 音量 0-1
 * @param {OscillatorType} options.type 波形
 */
export function playTone({
  frequency = 1000,
  duration = 80,
  volume = 0.4,
  type = 'square'
} = {}) {
  const context = getSharedContext()
  if (!context) return

  const safeVolume = Math.max(0, Math.min(1, Number(volume) || 0))
  if (safeVolume <= 0) return

  try {
    const oscillator = context.createOscillator()
    const gainNode = context.createGain()
    const now = context.currentTime
    const durationSeconds = Math.max(0.01, (Number(duration) || 80) / 1000)

    oscillator.type = type
    oscillator.frequency.setValueAtTime(Math.max(20, Number(frequency) || 1000), now)

    gainNode.gain.setValueAtTime(safeVolume, now)
    gainNode.gain.exponentialRampToValueAtTime(
      Math.max(0.0001, safeVolume * 0.05),
      now + durationSeconds
    )

    oscillator.connect(gainNode)
    gainNode.connect(context.destination)
    oscillator.start(now)
    oscillator.stop(now + durationSeconds + 0.02)

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
 * 使用蜂鸣器提示音。
 * @param {boolean} enabled 是否启用
 * @param {Object} options 频率 / 时长 / 音量 / 波形
 * @returns {Function} 播放函数
 */
export function useBeep(enabled = true, options = {}) {
  const {
    frequency = 1000,
    duration = 80,
    volume = 0.4,
    type = 'square'
  } = options

  return useCallback(() => {
    if (!enabled) return
    playTone({ frequency, duration, volume, type })
  }, [enabled, frequency, duration, volume, type])
}

/**
 * 使用蜂鸣器提示音（带回调）。
 */
export function useBeepWithCallback(enabled = true, onBeep = null, options = {}) {
  const playBeep = useBeep(enabled, options)

  return useCallback(() => {
    playBeep()
    if (onBeep) {
      setTimeout(onBeep, 50)
    }
  }, [playBeep, onBeep])
}

export default useBeep
