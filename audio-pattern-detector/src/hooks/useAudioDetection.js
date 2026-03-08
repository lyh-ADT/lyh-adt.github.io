/**
 * 音频检测自定义 Hook
 * 组合各个小 Hook 提供完整的音频检测功能
 */

import { useEffect } from 'react'
import {
  AppState,
  useAudioState,
  useAudioRefs,
  useAudioConfig,
  useBeep,
  useRecordingActions,
  useMatchDetection,
  useListeningActions,
  useStatusInfo,
  useCleanup
} from './useAudioRecording'

export { AppState }

export function useAudioDetection(initialConfig = {}) {
  // 使用各个小 Hook
  const config = useAudioConfig(initialConfig)
  const audioState = useAudioState()
  const refs = useAudioRefs()
  const playBeep = useBeep(config.beepEnabled)

  // 创建录音操作 Hook
  const { startRecording, stopRecording } = useRecordingActions(
    audioState.state,
    refs,
    config,
    audioState.updateStatus
  )

  // 创建匹配检测 Hook
  const { detectMatch } = useMatchDetection(refs, config, audioState, playBeep)

  // 创建监听操作 Hook
  const {
    startListening,
    stopListening,
    startListeningWithRandomDelay,
    toggleRecording,
    toggleListening
  } = useListeningActions(refs, config, audioState, detectMatch, playBeep)

  // 状态信息 Hook
  const { getStatusInfo } = useStatusInfo(audioState, refs)

  // 清理 Hook
  useCleanup(refs)

  // 自动重启逻辑 - 当达到匹配上限时
  useEffect(() => {
    if (audioState.matchCount >= config.autoRestartLimit) {
      refs.matchCountRef.current = 0
      stopListening(true)
      setTimeout(() => {
        startListeningWithRandomDelay()
      }, 500)
    }
  }, [audioState.matchCount, config.autoRestartLimit, stopListening, startListeningWithRandomDelay, refs.matchCountRef])

  // 暴露需要的函数给组件
  const setCountdown = audioState.setCountdown

  // 重写 toggleRecording 和 toggleListening 以包含实际函数
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
          // finishRecording is called internally
        } else if (audioState.state === AppState.RECORDING) {
          requestAnimationFrame(updateCountdown)
        }
      }

      updateCountdown()
    }
  }, [audioState.state, config.recordDuration, refs.isRecordingRef, audioState.setCountdown])

  return {
    // 状态
    state: audioState.state,
    matchCount: audioState.matchCount,
    currentMatch: audioState.currentMatch,
    matchHistory: audioState.matchHistory,
    countdown: audioState.countdown,
    randomDelayCountdown: audioState.randomDelayCountdown,
    isWaitingForRandomDelay: audioState.isWaitingForRandomDelay,

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
