/**
 * Shot Timer 自定义 Hook
 * 检测枪声并记录射击间隔时间
 */

import { useState, useEffect, useCallback, useRef } from 'react'
import {
  AppState,
  useAudioCoreState,
  useAudioCoreRefs,
  useAudioCoreConfig,
  useShotDetection,
  useListeningActionsForShot,
  useStatusInfo,
  useCleanup
} from './useAudioCore'
import { useBeep } from './useBeep'
import { useRandomDelayAction } from './useRandomDelay'

export { AppState }

/**
 * Shot Timer Hook
 * @param {Object} initialConfig - 初始配置
 * @returns {Object} Shot Timer 的状态和方法
 */
export function useAudioDetection(initialConfig = {}) {
  // 使用核心音频 Hook
  const config = useAudioCoreConfig(initialConfig)
  const audioState = useAudioState()
  const refs = useAudioRefsWithExtensions()
  const playBeep = useBeep(config.beepEnabled ?? true)

  // 创建枪声检测 Hook
  const { detectShot } = useShotDetection(refs, config, audioState, playBeep)

  // 创建监听操作 Hook（Shot Timer 专用）
  const {
    startListening,
    stopListening
  } = useListeningActionsForShot(refs, config, audioState, detectShot)

  // 状态信息 Hook
  const { getStatusInfo } = useStatusInfo(audioState, refs)

  // 清理 Hook
  useCleanup(refs)

  // 随机延迟 Hook（使用 refs 来存储动态变化的延迟参数）
  const minDelayRef = useRef(config.minDelay || 1)
  const maxDelayRef = useRef(config.maxDelay || 5)
  minDelayRef.current = config.minDelay || 1
  maxDelayRef.current = config.maxDelay || 5

  const {
    isWaiting: isWaitingForRandomDelay,
    countdown: randomDelayCountdown,
    startDelay: startRandomDelay,
    cancelDelay
  } = useRandomDelayAction(() => {
    // 随机延迟完成，播放 Beep 并开始监听
    playBeep()
    startListening()
  }, {
    minDelay: minDelayRef.current * 1000,
    maxDelay: maxDelayRef.current * 1000
  })

  // 开始随机延迟监听
  const startListeningWithRandomDelay = useCallback(() => {
    // 清除上次的计时结果
    audioState.setShotCount(0)
    audioState.setShotHistory([])
    audioState.setCurrentShotTime(0)
    startRandomDelay()
  }, [audioState, startRandomDelay])

  // 重写 toggle 函数
  const handleToggleListening = () => {
    if (audioState.stateRef.current === AppState.LISTENING || audioState.stateRef.current === AppState.DETECTED || audioState.stateRef.current === AppState.TIMING) {
      stopListening()
      if (isWaitingForRandomDelay) {
        cancelDelay()
      }
    } else {
      startListening()
    }
  }

  return {
    // 状态
    state: audioState.state,
    shotCount: audioState.shotCount,
    currentShotTime: audioState.currentShotTime,
    shotHistory: audioState.shotHistory,
    countdown: audioState.countdown,
    randomDelayCountdown,
    isWaitingForRandomDelay,

    // 操作函数
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

/**
 * 扩展的音频状态管理 Hook（添加 Shot Timer 专用状态）
 */
function useAudioState() {
  const coreState = useAudioCoreState()
  const [shotCount, setShotCount] = useState(0)
  const [currentShotTime, setCurrentShotTime] = useState(0)
  const [shotHistory, setShotHistory] = useState([])

  return {
    ...coreState,
    shotCount,
    setShotCount,
    currentShotTime,
    setCurrentShotTime,
    shotHistory,
    setShotHistory
  }
}

// 扩展 refs
function useAudioRefsWithExtensions() {
  const coreRefs = useAudioCoreRefs()
  const shotCountRef = useRef(0)

  return {
    ...coreRefs,
    shotCountRef
  }
}
