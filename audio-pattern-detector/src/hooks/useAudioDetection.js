/**
 * Shot Timer 自定义 Hook
 * 检测枪声并记录射击间隔时间
 */

import { useState, useEffect, useCallback, useRef } from 'react'
import {
  AppState,
  useAudioCoreState,
  useAudioCoreRefs,
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
  // 使用 refs 存储动态配置，避免每次渲染创建新对象
  const configRef = useRef(initialConfig)
  configRef.current = initialConfig

  const config = {
    recordDuration: configRef.current.recordDuration || 3,
    threshold: configRef.current.threshold || 0.6,
    beepEnabled: configRef.current.beepEnabled ?? true,
    shotBeepEnabled: configRef.current.shotBeepEnabled ?? true,
    autoRestartEnabled: configRef.current.autoRestartEnabled ?? false,
    autoRestartLimit: configRef.current.autoRestartLimit || 5,
    minDelay: configRef.current.minDelay || 1,
    maxDelay: configRef.current.maxDelay || 5,
    parTimeEnabled: configRef.current.parTimeEnabled ?? false,
    parTime: configRef.current.parTime || 30,
    matchCooldown: 100
  }

  const audioState = useAudioState()
  const refs = useAudioRefsWithExtensions()
  const playBeep = useBeep(config.beepEnabled ?? true)
  const playShotBeep = useBeep(config.shotBeepEnabled ?? true)

  // 创建枪声检测 Hook
  const { detectShot } = useShotDetection(refs, config, audioState, playShotBeep)

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

  // 使用 ref 存储 startRandomDelay，避免依赖变化
  const startRandomDelayRef = useRef(null)
  const cancelDelayRef = useRef(null)

  const {
    isWaiting: isWaitingForRandomDelay,
    countdown: randomDelayCountdown,
    startDelay: startRandomDelayInternal,
    cancelDelay: cancelDelayInternal
  } = useRandomDelayAction(() => {
    // 随机延迟完成，播放 Beep 并开始监听和计时
    playBeep()
    startListening()
  }, {
    minDelay: minDelayRef.current * 1000,
    maxDelay: maxDelayRef.current * 1000
  })

  // 保存函数到 ref
  startRandomDelayRef.current = startRandomDelayInternal
  cancelDelayRef.current = cancelDelayInternal

  // 开始随机延迟监听
  const startListeningWithRandomDelay = useCallback(() => {
    // 清除上次的计时结果
    audioState.setShotCount(0)
    audioState.setShotHistory([])
    audioState.setCurrentShotTime(0)
    startRandomDelayRef.current()
  }, [audioState])

  // 计时器状态
  const [elapsedTime, setElapsedTime] = useState(0)
  const [parTimeRemaining, setParTimeRemaining] = useState(null)
  const [isInfiniteLoop, setIsInfiniteLoop] = useState(false)
  const timerRef = useRef(null)
  const parTimeTimerRef = useRef(null)
  const startTimeRef = useRef(0)
  const parTimeStartTimeRef = useRef(0)
  const listeningStateRef = useRef(false)
  const hasRecordedFinalTimeRef = useRef(false)

  // 计时器更新
  useEffect(() => {
    const isListening = audioState.state === AppState.LISTENING || audioState.state === AppState.TIMING

    if (isListening && !listeningStateRef.current) {
      // 刚开始监听，重置 startTime
      startTimeRef.current = Date.now()
      setElapsedTime(0)
      hasRecordedFinalTimeRef.current = false
    }
    listeningStateRef.current = isListening

    if (isListening) {
      const animate = () => {
        setElapsedTime(Date.now() - startTimeRef.current)
        timerRef.current = requestAnimationFrame(animate)
      }
      timerRef.current = requestAnimationFrame(animate)
    }

    return () => {
      if (timerRef.current) {
        cancelAnimationFrame(timerRef.current)
      }
    }
  }, [audioState.state])

  // Par Time 计时器逻辑
  const parTimeEnabledRef = useRef(false)
  useEffect(() => {
    const isListening = audioState.state === AppState.LISTENING || audioState.state === AppState.TIMING

    if (config.parTimeEnabled && config.parTime && isListening) {
      // 只在刚开始监听时设置 Par Time 开始时间
      if (!parTimeEnabledRef.current) {
        parTimeEnabledRef.current = true
        parTimeStartTimeRef.current = Date.now()
        setParTimeRemaining(config.parTime)
        // 如果同时启用了自动重启，则标记为无限循环模式
        if (config.autoRestartEnabled) {
          setIsInfiniteLoop(true)
        }
      }

      const updateParTimeCountdown = () => {
        const elapsed = Date.now() - parTimeStartTimeRef.current
        const remaining = Math.max(0, Math.floor(config.parTime - elapsed))
        setParTimeRemaining(remaining)

        if (elapsed >= config.parTime) {
          // 到达 par time，停止计时并发出提示音
          setParTimeRemaining(null)
          if (config.beepEnabled) {
            playBeep()
          }
          // 保存当前计时结果
          const finalTime = Date.now() - startTimeRef.current
          const now = new Date()
          const timeStr = now.toLocaleTimeString()

          audioState.setShotHistory(prev => [{
            time: timeStr,
            id: Date.now(),
            timeSinceStart: finalTime,
            timeSinceLastMatch: finalTime,
            shotNumber: audioState.shotCount + 1,
            timeout: true,
            totalTime: true
          }, ...prev.slice(0, 18)])

          setElapsedTime(0)
          stopListening()
          parTimeEnabledRef.current = false

          // 如果自动重启开关打开，则自动重启
          if (config.autoRestartEnabled) {
            // 重置计数
            audioState.setShotCount(0)
            audioState.setShotHistory(prev => prev.slice(0, 19)) // 保留刚保存的记录
            audioState.setCurrentShotTime(0)
            refs.shotCountRef.current = 0

            // 1 秒后随机延迟重启
            setTimeout(() => {
              startTimeRef.current = Date.now()
              setElapsedTime(0)
              if (startRandomDelayRef.current) {
                startRandomDelayRef.current()
              }
            }, 1000)
          } else {
            // 只有在非自动重启时才设置为 false
            setIsInfiniteLoop(false)
          }
        } else {
          parTimeTimerRef.current = requestAnimationFrame(updateParTimeCountdown)
        }
      }

      updateParTimeCountdown()

      return () => {
        if (parTimeTimerRef.current) {
          cancelAnimationFrame(parTimeTimerRef.current)
        }
      }
    } else if (!isListening) {
      setParTimeRemaining(null)
      parTimeEnabledRef.current = false
    }
  }, [config.parTimeEnabled, config.parTime, audioState.state, config.beepEnabled, playBeep, stopListening, audioState])

  // 开始监听时启动计时器
  const startListeningWithTimer = useCallback(() => {
    startTimeRef.current = Date.now()
    setElapsedTime(0)
    startListening()
  }, [startListening])

  // 自动重启逻辑 - 使用 shotCountRef 来检测
  const autoRestartCheckedRef = useRef(false)
  useEffect(() => {
    // 只在射击状态变化时检查
    const currentCount = refs.shotCountRef.current
    const limit = config.autoRestartLimit || 5

    if (config.autoRestartEnabled && currentCount >= limit && !autoRestartCheckedRef.current) {
      autoRestartCheckedRef.current = true

      // 重置计数
      audioState.setShotCount(0)
      audioState.setShotHistory([])
      audioState.setCurrentShotTime(0)
      refs.shotCountRef.current = 0

      // 先停止监听
      stopListening()

      // 1 秒后随机延迟重启
      setTimeout(() => {
        startTimeRef.current = Date.now()
        setElapsedTime(0)
        if (startRandomDelayRef.current) {
          startRandomDelayRef.current()
        }
        autoRestartCheckedRef.current = false
      }, 1000)
    } else if (!config.autoRestartEnabled) {
      autoRestartCheckedRef.current = false
    }
  }, [audioState.shotCount, config.autoRestartEnabled, config.autoRestartLimit, refs.shotCountRef, stopListening, audioState])

  // 重写 toggle 函数
  const handleToggleListening = () => {
    const isListeningState = audioState.stateRef.current === AppState.LISTENING ||
                             audioState.stateRef.current === AppState.DETECTED ||
                             audioState.stateRef.current === AppState.TIMING

    // 如果是无限循环模式，或者正在监听，则执行停止操作
    if (isInfiniteLoop || isListeningState) {
      // 停止时保存最终时间到历史记录
      if (elapsedTime > 0) {
        const now = new Date()
        const timeStr = now.toLocaleTimeString()

        audioState.setShotHistory(prev => [{
          time: timeStr,
          id: Date.now(),
          timeSinceStart: elapsedTime,
          timeSinceLastMatch: elapsedTime,
          shotNumber: audioState.shotCount + 1,
          totalTime: true
        }, ...prev.slice(0, 18)])
      }

      // 取消 Par Time 计时器
      if (parTimeTimerRef.current) {
        cancelAnimationFrame(parTimeTimerRef.current)
      }
      parTimeEnabledRef.current = false
      setParTimeRemaining(null)

      // 取消主计时器
      if (timerRef.current) {
        cancelAnimationFrame(timerRef.current)
      }
      setElapsedTime(0)

      stopListening()
      setIsInfiniteLoop(false)
      if (isWaitingForRandomDelay && cancelDelayRef.current) {
        cancelDelayRef.current()
      }
    } else {
      startListeningWithTimer()
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
    elapsedTime,
    parTimeRemaining,
    isInfiniteLoop,

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
