/**
 * 蜂鸣器 Hook - 可复用的 beep 功能
 */

import { useCallback } from 'react'

/**
 * 使用蜂鸣器提示音
 * @param {boolean} enabled - 是否启用蜂鸣器
 * @returns {Function} 播放蜂鸣器的函数
 */
export function useBeep(enabled = true) {
  return useCallback(() => {
    if (!enabled) return

    try {
      const audioContext = new (window.AudioContext || window.webkitAudioContext)()
      const oscillator = audioContext.createOscillator()
      const gainNode = audioContext.createGain()

      oscillator.connect(gainNode)
      gainNode.connect(audioContext.destination)
      oscillator.type = 'square'
      oscillator.frequency.value = 1000
      gainNode.gain.setValueAtTime(0.8, audioContext.currentTime)
      oscillator.start(audioContext.currentTime)

      setTimeout(() => {
        gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.1)
        oscillator.stop(audioContext.currentTime + 0.1)
        setTimeout(() => audioContext.close(), 100)
      }, 800)
    } catch (err) {
      console.error('播放蜂鸣器失败:', err)
    }
  }, [enabled])
}

/**
 * 使用蜂鸣器提示音（带回调）
 * @param {boolean} enabled - 是否启用蜂鸣器
 * @param {Function} onBeep - beep 后的回调函数
 * @returns {Function} 播放蜂鸣器的函数
 */
export function useBeepWithCallback(enabled = true, onBeep = null) {
  const playBeep = useBeep(enabled)

  return useCallback(() => {
    playBeep()
    if (onBeep) {
      // 在 beep 后执行回调
      setTimeout(onBeep, 50)
    }
  }, [playBeep, onBeep])
}

export default useBeep
