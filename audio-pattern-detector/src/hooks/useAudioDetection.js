/**
 * Shot Timer Hook
 * 检测枪声、维护总计时、Par Time 和自动重启。
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
import { useCue } from './useBeep'
import { useRandomDelayAction } from './useRandomDelay'

export { AppState }

const MATCH_COOLDOWN_MS = 80
const REFRACTORY_MS = 60
const DETECTION_WINDOW_SIZE = 512
const START_GUARD_MS = 180
const AUTO_RESTART_DELAY_MS = 1000

/**
 * Shot Timer Hook
 */
export function useAudioDetection(initialConfig = {}) {
  const configRef = useRef(initialConfig)
  configRef.current = initialConfig

  const config = {
    threshold: configRef.current.threshold ?? 0.7,
    beepEnabled: configRef.current.beepEnabled ?? true,
    shotBeepEnabled: configRef.current.shotBeepEnabled ?? true,
    autoRestartEnabled: configRef.current.autoRestartEnabled ?? false,
    autoRestartLimit: configRef.current.autoRestartLimit ?? 5,
    minDelay: configRef.current.minDelay ?? 1,
    maxDelay: configRef.current.maxDelay ?? 5,
    parTimeEnabled: configRef.current.parTimeEnabled ?? false,
    parTime: configRef.current.parTime ?? 1000
  }

  const audioState = useAudioState()
  const coreRefs = useAudioCoreRefs()
  const shotCountRef = useRef(0)
  const refs = { ...coreRefs, shotCountRef }

  const playStandbyBeep = useCue(config.beepEnabled, 'standby')
  const playStartBeep = useCue(config.beepEnabled, 'start')
  const playParTimeBeep = useCue(config.beepEnabled, 'parTime')
  const playShotBeep = useCue(true, 'shot')

  const playStandbyBeepRef = useRef(playStandbyBeep)
  const playStartBeepRef = useRef(playStartBeep)
  const playParTimeBeepRef = useRef(playParTimeBeep)

  useEffect(() => {
    playStandbyBeepRef.current = playStandbyBeep
  }, [playStandbyBeep])

  useEffect(() => {
    playStartBeepRef.current = playStartBeep
  }, [playStartBeep])

  useEffect(() => {
    playParTimeBeepRef.current = playParTimeBeep
  }, [playParTimeBeep])

  // 检测配置放在 ref 中，修改设置后无需重新启动监听即可生效。
  const shotConfigRef = useRef({})
  shotConfigRef.current = {
    threshold: config.threshold,
    beepEnabled: config.shotBeepEnabled,
    matchCooldown: MATCH_COOLDOWN_MS,
    refractoryMs: REFRACTORY_MS,
    windowSize: DETECTION_WINDOW_SIZE,
    manageStats: true,
    detectedHoldMs: 200
  }

  const { detectShot } = useShotDetection(
    refs,
    shotConfigRef,
    audioState,
    playShotBeep
  )

  const { startListening, stopListening } = useListeningActionsForShot(
    refs,
    audioState,
    detectShot
  )

  const { getStatusInfo } = useStatusInfo(audioState)

  useCleanup(refs)

  // 随机延迟
  const startListeningRef = useRef(startListening)
  useEffect(() => {
    startListeningRef.current = startListening
  }, [startListening])

  const {
    isWaiting: isWaitingForRandomDelay,
    countdown: randomDelayCountdown,
    startDelay: startRandomDelayInternal,
    cancelDelay: cancelDelayInternal
  } = useRandomDelayAction(() => {
    playStartBeepRef.current?.()
    startListeningRef.current?.({ guardMs: START_GUARD_MS })
  }, {
    minDelay: config.minDelay * 1000,
    maxDelay: config.maxDelay * 1000
  })

  const startRandomDelayRef = useRef(startRandomDelayInternal)
  const cancelDelayRef = useRef(cancelDelayInternal)
  startRandomDelayRef.current = startRandomDelayInternal
  cancelDelayRef.current = cancelDelayInternal

  // 待机提示音在随机等待开始时播放；start 提示音在延迟结束时播放。
  const beginStandby = useCallback(() => {
    playStandbyBeepRef.current?.()
    startRandomDelayRef.current?.()
  }, [])

  // 计时状态
  const [elapsedTime, setElapsedTime] = useState(0)
  const [parTimeRemaining, setParTimeRemaining] = useState(null)
  const [isInfiniteLoop, setIsInfiniteLoop] = useState(false)

  const timerRef = useRef(null)
  const restartTimerRef = useRef(null)
  const sessionStartTimeRef = useRef(0)
  const parTimeFiredRef = useRef(false)
  const autoRestartCheckedRef = useRef(false)

  // 总计时 + Par Time。DETECTED/TIMING 都属于同一次计时 session，
  // 只有回到 IDLE 后才重置 session 起点。
  useEffect(() => {
    const active =
      audioState.state === AppState.LISTENING ||
      audioState.state === AppState.DETECTED ||
      audioState.state === AppState.TIMING

    if (!active) {
      if (audioState.state === AppState.IDLE) {
        if (timerRef.current) {
          cancelAnimationFrame(timerRef.current)
          timerRef.current = null
        }
        sessionStartTimeRef.current = 0
        parTimeFiredRef.current = false
        setElapsedTime(0)
        setParTimeRemaining(null)
      }
      return
    }

    if (!sessionStartTimeRef.current) {
      sessionStartTimeRef.current = Date.now()
      parTimeFiredRef.current = false
      setElapsedTime(0)
    }

    const tick = () => {
      const now = Date.now()
      setElapsedTime(now - sessionStartTimeRef.current)

      if (config.parTimeEnabled && config.parTime > 0) {
        const remaining = Math.max(0, config.parTime - (now - sessionStartTimeRef.current))
        setParTimeRemaining(remaining)

        if (remaining <= 0 && !parTimeFiredRef.current) {
          parTimeFiredRef.current = true
          setParTimeRemaining(null)

          if (config.beepEnabled) {
            playParTimeBeepRef.current?.()
          }

          const finalTime = now - sessionStartTimeRef.current
          audioState.setShotHistory(prev => [{
            time: new Date().toLocaleTimeString(),
            id: now,
            timeSinceStart: finalTime,
            timeSinceLastMatch: finalTime,
            shotNumber: shotCountRef.current + 1,
            timeout: true,
            totalTime: true
          }, ...prev.slice(0, 18)])

          if (config.autoRestartEnabled) {
            setIsInfiniteLoop(true)
            stopListening()
            if (restartTimerRef.current) {
              clearTimeout(restartTimerRef.current)
            }
            restartTimerRef.current = setTimeout(() => {
              restartTimerRef.current = null
              beginStandby()
            }, AUTO_RESTART_DELAY_MS)
          } else {
            stopListening()
            setIsInfiniteLoop(false)
          }

          timerRef.current = null
          return
        }
      } else {
        setParTimeRemaining(null)
      }

      timerRef.current = requestAnimationFrame(tick)
    }

    tick()

    return () => {
      if (timerRef.current) {
        cancelAnimationFrame(timerRef.current)
        timerRef.current = null
      }
    }
  }, [
    audioState.state,
    audioState.setShotHistory,
    config.parTimeEnabled,
    config.parTime,
    config.autoRestartEnabled,
    config.beepEnabled,
    stopListening,
    beginStandby
  ])

  // 按射击发数自动重启
  useEffect(() => {
    if (!config.autoRestartEnabled) {
      autoRestartCheckedRef.current = false
      if (restartTimerRef.current) {
        clearTimeout(restartTimerRef.current)
        restartTimerRef.current = null
        setIsInfiniteLoop(false)
      }
      return
    }

    const limit = Math.max(1, config.autoRestartLimit || 5)
    if (
      audioState.shotCount < limit ||
      autoRestartCheckedRef.current
    ) {
      return
    }

    autoRestartCheckedRef.current = true
    setIsInfiniteLoop(true)
    stopListening()

    audioState.setShotCount(0)
    audioState.setShotHistory([])
    audioState.setCurrentShotTime(0)
    shotCountRef.current = 0
    sessionStartTimeRef.current = 0

    if (restartTimerRef.current) {
      clearTimeout(restartTimerRef.current)
    }
    restartTimerRef.current = setTimeout(() => {
      restartTimerRef.current = null
      autoRestartCheckedRef.current = false
      beginStandby()
    }, AUTO_RESTART_DELAY_MS)
  }, [
    audioState.shotCount,
    audioState.setShotCount,
    audioState.setShotHistory,
    audioState.setCurrentShotTime,
    config.autoRestartEnabled,
    config.autoRestartLimit,
    stopListening,
    beginStandby
  ])

  const startListeningWithTimer = useCallback(() => {
    audioState.setError(null)
    autoRestartCheckedRef.current = false
    parTimeFiredRef.current = false
    shotCountRef.current = 0

    audioState.setShotCount(0)
    audioState.setShotHistory([])
    audioState.setCurrentShotTime(0)
    setElapsedTime(0)
    setParTimeRemaining(config.parTimeEnabled ? config.parTime : null)
    setIsInfiniteLoop(false)

    startListening({ skipStateReset: true })
  }, [
    audioState.setError,
    audioState.setShotCount,
    audioState.setShotHistory,
    audioState.setCurrentShotTime,
    config.parTimeEnabled,
    config.parTime,
    startListening
  ])

  const startListeningWithRandomDelay = useCallback(() => {
    audioState.setError(null)
    autoRestartCheckedRef.current = false
    stopListening()
    cancelDelayRef.current?.()

    if (restartTimerRef.current) {
      clearTimeout(restartTimerRef.current)
      restartTimerRef.current = null
    }

    shotCountRef.current = 0
    audioState.setShotCount(0)
    audioState.setShotHistory([])
    audioState.setCurrentShotTime(0)
    sessionStartTimeRef.current = 0
    setElapsedTime(0)
    setParTimeRemaining(config.parTimeEnabled ? config.parTime : null)
    setIsInfiniteLoop(false)

    beginStandby()
  }, [
    audioState.setError,
    audioState.setShotCount,
    audioState.setShotHistory,
    audioState.setCurrentShotTime,
    config.parTimeEnabled,
    config.parTime,
    stopListening,
    beginStandby
  ])

  const handleToggleListening = useCallback(() => {
    const currentState = audioState.stateRef.current
    const isActive =
      currentState === AppState.LISTENING ||
      currentState === AppState.DETECTED ||
      currentState === AppState.TIMING

    if (isInfiniteLoop || isActive || isWaitingForRandomDelay) {
      const finalTime = sessionStartTimeRef.current
        ? Date.now() - sessionStartTimeRef.current
        : elapsedTime

      if (finalTime > 0) {
        audioState.setShotHistory(prev => [{
          time: new Date().toLocaleTimeString(),
          id: Date.now(),
          timeSinceStart: finalTime,
          timeSinceLastMatch: finalTime,
          shotNumber: shotCountRef.current + 1,
          totalTime: true
        }, ...prev.slice(0, 18)])
      }

      if (restartTimerRef.current) {
        clearTimeout(restartTimerRef.current)
        restartTimerRef.current = null
      }

      stopListening()
      cancelDelayRef.current?.()
      setIsInfiniteLoop(false)
      autoRestartCheckedRef.current = false
      sessionStartTimeRef.current = 0
      setElapsedTime(0)
      setParTimeRemaining(null)
      return
    }

    startListeningWithTimer()
  }, [
    audioState.stateRef,
    audioState.setShotHistory,
    isInfiniteLoop,
    isWaitingForRandomDelay,
    elapsedTime,
    stopListening,
    startListeningWithTimer
  ])

  // 卸载时清理重启定时器和动画帧
  useEffect(() => {
    return () => {
      if (restartTimerRef.current) {
        clearTimeout(restartTimerRef.current)
        restartTimerRef.current = null
      }
      if (timerRef.current) {
        cancelAnimationFrame(timerRef.current)
        timerRef.current = null
      }
    }
  }, [])

  return {
    // 状态
    state: audioState.state,
    shotCount: audioState.shotCount,
    currentShotTime: audioState.currentShotTime,
    shotHistory: audioState.shotHistory,
    randomDelayCountdown,
    isWaitingForRandomDelay,
    elapsedTime,
    parTimeRemaining,
    isInfiniteLoop,

    // 操作
    startListening,
    stopListening,
    toggleListening: handleToggleListening,
    startListeningWithRandomDelay,

    // Refs / 工具
    analyserRef: refs.analyserRef,
    getStatusInfo
  }
}

/**
 * Shot Timer 专用状态
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
