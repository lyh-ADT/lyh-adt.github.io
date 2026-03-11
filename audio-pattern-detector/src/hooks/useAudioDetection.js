/**
 * 音频检测自定义 Hook - 完整版
 * 组合核心音频 Hook 与 beep、随机延迟功能
 */

import { useEffect, useCallback, useRef } from 'react'
import {
  AppState,
  useAudioCoreState,
  useAudioCoreRefs,
  useAudioCoreConfig,
  useRecordingActions,
  useMatchDetection,
  useListeningActions,
  useStatusInfo,
  useCleanup
} from './useAudioCore'
import { useBeep } from './useBeep'
import { useRandomDelayAction } from './useRandomDelay'

export { AppState }

/**
 * 完整的音频检测 Hook
 * @param {Object} initialConfig - 初始配置
 * @returns {Object} 音频检测的状态和方法
 */
export function useAudioDetection(initialConfig = {}) {
  // 使用核心音频 Hook
  const config = useAudioCoreConfig(initialConfig)
  const audioState = useAudioCoreState()
  const refs = useAudioRefsWithExtensions()
  const playBeep = useBeep(config.beepEnabled ?? true)

  // 创建录音操作 Hook
  const { startRecording, stopRecording } = useRecordingActions(
    audioState.state,
    refs,
    config,
    audioState.updateStatus
  )

  // 创建匹配检测 Hook
  const { detectMatch } = useMatchDetection(refs, config, audioState, null)

  // 创建监听操作 Hook
  const {
    startListening,
    stopListening,
    toggleRecording,
    toggleListening
  } = useListeningActions(refs, config, audioState, detectMatch)

  // 状态信息 Hook
  const { getStatusInfo } = useStatusInfo(audioState, refs)

  // 清理 Hook
  useCleanup(refs)

  // 随机延迟 Hook
  const {
    isWaiting: isWaitingForRandomDelay,
    countdown: randomDelayCountdown,
    startDelay: startRandomDelay
  } = useRandomDelayAction(() => {
    playBeep()
    startListening()
  }, {
    minDelay: 1000,
    maxDelay: 5000
  })

  // 开始随机延迟监听
  const startListeningWithRandomDelay = useCallback(() => {
    if (!refs.referenceAudioRef.current) {
      alert('请先录制参考音频')
      return
    }
    startRandomDelay()
  }, [refs, startRandomDelay])

  // 自动重启逻辑 - 当达到匹配上限时
  useEffect(() => {
    if (audioState.matchCount >= (config.autoRestartLimit || 3)) {
      // 同时重置 ref 和 state 的 matchCount
      refs.matchCountRef.current = 0
      audioState.setMatchCount(0)
      stopListening(true)
      setTimeout(() => {
        startListeningWithRandomDelay()
      }, 500)
    }
  }, [audioState.matchCount, config.autoRestartLimit, stopListening, startListeningWithRandomDelay, refs.matchCountRef, audioState.setMatchCount])

  // 录制倒计时逻辑
  useEffect(() => {
    if (audioState.state === AppState.RECORDING) {
      const duration = config.recordDuration * 1000
      const startTime = Date.now()

      const updateCountdown = () => {
        const elapsed = Date.now() - startTime
        const remaining = Math.max(0, (duration - elapsed) / 1000)
        audioState.setCountdown(parseFloat(remaining.toFixed(1)))

        if (elapsed >= duration && refs.isRecordingRef.current) {
          refs.isRecordingRef.current = false
        } else if (audioState.state === AppState.RECORDING) {
          requestAnimationFrame(updateCountdown)
        }
      }

      updateCountdown()
    }
  }, [audioState.state, config.recordDuration, refs.isRecordingRef, audioState.setCountdown])

  // 重写 toggle 函数
  const handleToggleRecording = () => {
    if (audioState.stateRef.current === AppState.RECORDING) {
      stopRecording()
    } else {
      stopListening()
      startRecording()
    }
  }

  const handleToggleListening = () => {
    if (audioState.stateRef.current === AppState.LISTENING || audioState.stateRef.current === AppState.DETECTED) {
      stopListening()
    } else {
      startListening()
    }
  }

  return {
    // 状态
    state: audioState.state,
    matchCount: audioState.matchCount,
    currentMatch: audioState.currentMatch,
    matchHistory: audioState.matchHistory,
    countdown: audioState.countdown,
    randomDelayCountdown,
    isWaitingForRandomDelay,

    // 操作函数
    startRecording,
    stopRecording,
    toggleRecording: handleToggleRecording,
    startListening,
    stopListening,
    toggleListening: handleToggleListening,
    startListeningWithRandomDelay,

    // Refs
    analyserRef: refs.analyserRef,

    // 工具函数
    getStatusInfo
  }
}

// 扩展 refs 以包含 autoRestartLimit 需要的 matchCountRef
function useAudioRefsWithExtensions() {
  const coreRefs = useAudioCoreRefs()
  const matchCountRef = useRef(0)

  return {
    ...coreRefs,
    matchCountRef
  }
}
