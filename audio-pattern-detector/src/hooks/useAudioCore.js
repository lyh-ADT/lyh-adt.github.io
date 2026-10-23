/**
 * 音频采集与枪声检测核心 Hook
 *
 * 设计要点：
 * - 整个应用复用同一个 AudioContext / MediaStream。
 * - 开始监听时创建 ScriptProcessor，停止时立即断开并清空回调，
 *   避免反复开始/停止后多个 processor 同时工作。
 * - 检测配置通过 ref 读取，节点阈值、灵敏度可以即时生效。
 */

import { useState, useRef, useCallback, useEffect } from 'react'
import { computeRms, isShotCandidate } from '../utils/audioDetection'

// 状态枚举
export const AppState = {
  IDLE: 'idle',
  LISTENING: 'listening',
  DETECTED: 'detected',
  TIMING: 'timing'
}

const PROCESSOR_BUFFER_SIZE = 512
const MAX_BUFFER_SECONDS = 2
const DEFAULT_WINDOW_SIZE = 512
const DEFAULT_REFRACTORY_MS = 60
const DEFAULT_MATCH_COOLDOWN_MS = 80

const MIC_CONSTRAINTS = {
  echoCancellation: false,
  noiseSuppression: false,
  autoGainControl: false
}

/**
 * 音频状态管理 Hook
 */
export function useAudioCoreState() {
  const [state, setState] = useState(AppState.IDLE)
  const [error, setError] = useState(null)
  const stateRef = useRef(AppState.IDLE)

  const updateStatus = useCallback((newState) => {
    stateRef.current = newState
    setState(newState)
  }, [])

  return { state, stateRef, error, setError, updateStatus }
}

/**
 * 音频引用 Hook
 */
export function useAudioCoreRefs() {
  const audioContextRef = useRef(null)
  const analyserRef = useRef(null)
  const mediaStreamRef = useRef(null)
  const sourceRef = useRef(null)
  const sourceStreamRef = useRef(null)
  const scriptProcessorRef = useRef(null)
  const inputBufferRef = useRef([])
  const isListeningRef = useRef(false)
  const listeningStartTimeRef = useRef(0)
  const lastMatchTimeRef = useRef(0)
  const suppressUntilRef = useRef(0)
  const noiseFloorRef = useRef(0)

  return {
    audioContextRef,
    analyserRef,
    mediaStreamRef,
    sourceRef,
    sourceStreamRef,
    scriptProcessorRef,
    inputBufferRef,
    isListeningRef,
    listeningStartTimeRef,
    lastMatchTimeRef,
    suppressUntilRef,
    noiseFloorRef
  }
}

/**
 * 枪声检测 Hook
 *
 * @param {Object} refs useAudioCoreRefs() 的返回值
 * @param {Object} configRef 配置 ref，包含 threshold / beepEnabled / matchCooldown /
 *   refractoryMs / windowSize / manageStats
 * @param {Object} audioState 状态和 setter
 * @param {Function} playBeep 播放枪声提示音
 * @param {Function} onShotDetected 检测到枪声后的回调
 */
export function useShotDetection(refs, configRef, audioState, playBeep, onShotDetected = null) {
  const {
    updateStatus,
    setShotCount,
    setCurrentShotTime,
    setShotHistory,
    stateRef
  } = audioState

  const {
    shotCountRef,
    inputBufferRef,
    listeningStartTimeRef,
    lastMatchTimeRef,
    suppressUntilRef,
    noiseFloorRef
  } = refs

  const playBeepRef = useRef(playBeep)
  const onShotDetectedRef = useRef(onShotDetected)

  useEffect(() => {
    playBeepRef.current = playBeep
  }, [playBeep])

  useEffect(() => {
    onShotDetectedRef.current = onShotDetected
  }, [onShotDetected])

  const detectShot = useCallback(() => {
    const config = configRef.current || {}
    const now = Date.now()

    if (now < suppressUntilRef.current) return

    const matchCooldown = Number.isFinite(config.matchCooldown)
      ? Math.max(0, config.matchCooldown)
      : DEFAULT_MATCH_COOLDOWN_MS

    if (now - lastMatchTimeRef.current < matchCooldown) return

    const windowSize = Math.max(
      128,
      Math.floor(config.windowSize || DEFAULT_WINDOW_SIZE)
    )
    const buffer = inputBufferRef.current
    if (buffer.length < windowSize) return

    const rms = computeRms(buffer, buffer.length - windowSize, windowSize)
    const noiseFloor = noiseFloorRef.current
    const threshold = config.threshold

    if (!isShotCandidate({ rms, userThreshold: threshold, noiseFloor })) {
      // 缓慢跟踪环境噪声；只有非枪声窗口才更新，避免枪声把噪声底抬高。
      const alpha = 0.03
      noiseFloorRef.current = noiseFloor === 0
        ? rms
        : noiseFloor * (1 - alpha) + rms * alpha
      return
    }

    const previousMatchTime = lastMatchTimeRef.current
    const timeSinceStart = listeningStartTimeRef.current
      ? now - listeningStartTimeRef.current
      : 0
    const timeSinceLastShot = previousMatchTime > 0
      ? now - previousMatchTime
      : timeSinceStart

    lastMatchTimeRef.current = now
    suppressUntilRef.current = now + (
      Number.isFinite(config.refractoryMs)
        ? Math.max(20, config.refractoryMs)
        : DEFAULT_REFRACTORY_MS
    )

    let shotNumber = null

    if (config.manageStats !== false) {
      shotNumber = (shotCountRef?.current || 0) + 1
      if (shotCountRef) shotCountRef.current = shotNumber

      setShotCount(shotNumber)
      setCurrentShotTime(shotNumber === 1 ? 0 : timeSinceLastShot)
      setShotHistory(prev => [{
        time: new Date().toLocaleTimeString(),
        id: now,
        timeSinceStart,
        timeSinceLastMatch: timeSinceLastShot,
        shotNumber
      }, ...prev.slice(0, 18)])
    }

    updateStatus(AppState.DETECTED)

    if (config.beepEnabled !== false) {
      playBeepRef.current?.()
    }

    const holdMs = Number.isFinite(config.detectedHoldMs)
      ? config.detectedHoldMs
      : 200

    setTimeout(() => {
      if (stateRef.current === AppState.DETECTED) {
        updateStatus(AppState.TIMING)
      }
    }, holdMs)

    onShotDetectedRef.current?.({
      rms,
      shotNumber,
      timeSinceStart,
      timeSinceLastShot
    })
  }, [
    configRef,
    updateStatus,
    setShotCount,
    setCurrentShotTime,
    setShotHistory,
    stateRef,
    shotCountRef,
    inputBufferRef,
    listeningStartTimeRef,
    lastMatchTimeRef,
    suppressUntilRef,
    noiseFloorRef
  ])

  return { detectShot }
}

/**
 * Shot Timer 监听操作 Hook
 *
 * 复用同一个音频上下文和输入流；每次 start 只创建一个新的 ScriptProcessor，
 * stop 时把它断开并清空回调，防止重复监听。
 */
export function useListeningActionsForShot(refs, audioState, detectShot) {
  const {
    updateStatus,
    setError,
    setShotCount,
    setShotHistory,
    setCurrentShotTime,
    stateRef
  } = audioState

  const {
    audioContextRef,
    analyserRef,
    mediaStreamRef,
    sourceRef,
    sourceStreamRef,
    scriptProcessorRef,
    inputBufferRef,
    isListeningRef,
    listeningStartTimeRef,
    lastMatchTimeRef,
    suppressUntilRef,
    noiseFloorRef,
    shotCountRef
  } = refs

  const detectShotRef = useRef(detectShot)
  const startRequestRef = useRef(0)

  useEffect(() => {
    detectShotRef.current = detectShot
  }, [detectShot])

  // 组件卸载时让尚未完成的 startListening 失效。
  useEffect(() => {
    return () => {
      startRequestRef.current += 1
    }
  }, [])

  const disconnectProcessor = useCallback(() => {
    const processor = scriptProcessorRef.current
    if (!processor) return

    processor.onaudioprocess = null
    try {
      processor.disconnect()
    } catch {
      // 已经断开时忽略。
    }
    scriptProcessorRef.current = null
  }, [scriptProcessorRef])

  const ensureAudioGraph = useCallback(async () => {
    let stream = mediaStreamRef.current
    const hasLiveTrack = stream?.getAudioTracks?.().some(track => track.readyState === 'live')

    if (!stream || !hasLiveTrack) {
      stream = await navigator.mediaDevices.getUserMedia({ audio: MIC_CONSTRAINTS })
      mediaStreamRef.current = stream
      sourceStreamRef.current = null
    }

    let context = audioContextRef.current
    if (!context || context.state === 'closed') {
      const AudioContextClass = window.AudioContext || window.webkitAudioContext
      if (!AudioContextClass) {
        throw new Error('当前浏览器不支持 Web Audio API')
      }
      context = new AudioContextClass()
      audioContextRef.current = context
      sourceRef.current = null
      sourceStreamRef.current = null
      analyserRef.current = null
    }

    if (context.state === 'suspended') {
      await context.resume()
    }

    if (!sourceRef.current || sourceStreamRef.current !== stream) {
      try {
        sourceRef.current?.disconnect()
      } catch {
        // 忽略旧 source 的断开错误。
      }

      const source = context.createMediaStreamSource(stream)
      const analyser = context.createAnalyser()
      analyser.fftSize = 2048
      source.connect(analyser)

      sourceRef.current = source
      sourceStreamRef.current = stream
      analyserRef.current = analyser
    }

    return context
  }, [
    audioContextRef,
    analyserRef,
    mediaStreamRef,
    sourceRef,
    sourceStreamRef
  ])

  const startListening = useCallback(async (options = {}) => {
    const {
      keepLastMatchTime = false,
      skipStateReset = false,
      guardMs = 0
    } = options
    const requestId = startRequestRef.current + 1
    startRequestRef.current = requestId

    setError(null)

    if (!skipStateReset) {
      setShotCount(0)
      setShotHistory([])
      setCurrentShotTime(0)
      if (shotCountRef) shotCountRef.current = 0
    }

    inputBufferRef.current = []
    lastMatchTimeRef.current = keepLastMatchTime ? lastMatchTimeRef.current : 0
    // guard 从用户触发开始计算（例如随机延迟后的提示音），
    // 这样麦克风初始化较慢时不会额外吞掉开头的声音。
    suppressUntilRef.current = Date.now() + Math.max(0, guardMs)
    noiseFloorRef.current = 0
    isListeningRef.current = false
    disconnectProcessor()

    try {
      const context = await ensureAudioGraph()

      // 初始化期间用户可能已经停止或重新开始，过期请求直接丢弃。
      if (requestId !== startRequestRef.current) return
      if (context.state === 'closed') return

      // 真正开始收音后再记录起点，避免把 getUserMedia 的等待时间算进成绩。
      listeningStartTimeRef.current = Date.now()

      const processor = context.createScriptProcessor(PROCESSOR_BUFFER_SIZE, 1, 1)
      const maxBufferSize = Math.max(
        PROCESSOR_BUFFER_SIZE * 2,
        Math.floor(context.sampleRate * MAX_BUFFER_SECONDS)
      )

      processor.onaudioprocess = (event) => {
        if (!isListeningRef.current) return

        const currentState = stateRef.current
        if (
          currentState !== AppState.LISTENING &&
          currentState !== AppState.DETECTED &&
          currentState !== AppState.TIMING
        ) {
          return
        }

        const input = event.inputBuffer.getChannelData(0)
        const buffer = inputBufferRef.current
        for (let i = 0; i < input.length; i++) {
          buffer.push(input[i])
        }

        if (buffer.length > maxBufferSize) {
          inputBufferRef.current = buffer.slice(-maxBufferSize)
        }

        detectShotRef.current?.()
      }

      sourceRef.current.connect(processor)
      processor.connect(context.destination)
      scriptProcessorRef.current = processor

      isListeningRef.current = true
      updateStatus(AppState.LISTENING)
    } catch (err) {
      console.error('无法开始监听麦克风:', err)
      disconnectProcessor()
      isListeningRef.current = false
      setError('无法访问麦克风，请检查浏览器权限，并确保页面运行在 HTTPS 或 localhost 下。')
      updateStatus(AppState.IDLE)
    }
  }, [
    setShotCount,
    setShotHistory,
    setCurrentShotTime,
    shotCountRef,
    inputBufferRef,
    listeningStartTimeRef,
    lastMatchTimeRef,
    suppressUntilRef,
    noiseFloorRef,
    isListeningRef,
    startRequestRef,
    disconnectProcessor,
    ensureAudioGraph,
    sourceRef,
    scriptProcessorRef,
    stateRef,
    setError,
    updateStatus
  ])

  const stopListening = useCallback(() => {
    startRequestRef.current += 1
    isListeningRef.current = false
    disconnectProcessor()
    inputBufferRef.current = []
    updateStatus(AppState.IDLE)
  }, [
    isListeningRef,
    startRequestRef,
    disconnectProcessor,
    inputBufferRef,
    updateStatus
  ])

  return { startListening, stopListening }
}

/**
 * 状态信息 Hook
 */
export function useStatusInfo(audioState) {
  const { state, currentShotTime, shotCount, error } = audioState

  return {
    getStatusInfo: useCallback(() => {
      if (error) {
        return { text: error, indicator: 'ready' }
      }

      switch (state) {
        case AppState.LISTENING:
          return { text: '等待枪声...', indicator: 'listening' }
        case AppState.TIMING:
          return { text: `🎯 已射击 ${shotCount} 发`, indicator: 'timing' }
        case AppState.DETECTED:
          return { text: `🎯 检测到枪声！(+${currentShotTime}ms)`, indicator: 'detected' }
        default:
          return { text: '准备就绪', indicator: 'ready' }
      }
    }, [state, currentShotTime, shotCount, error])
  }
}

/**
 * 页面卸载时释放麦克风和 AudioContext
 */
export function useCleanup(refs) {
  useEffect(() => {
    return () => {
      const processor = refs.scriptProcessorRef.current
      if (processor) {
        processor.onaudioprocess = null
        try {
          processor.disconnect()
        } catch {
          // 忽略。
        }
        refs.scriptProcessorRef.current = null
      }

      try {
        refs.sourceRef.current?.disconnect()
      } catch {
        // 忽略。
      }
      refs.sourceRef.current = null
      refs.sourceStreamRef.current = null

      try {
        refs.analyserRef.current?.disconnect()
      } catch {
        // 忽略。
      }
      refs.analyserRef.current = null

      const context = refs.audioContextRef.current
      if (context && context.state !== 'closed') {
        context.close().catch(() => {})
      }
      refs.audioContextRef.current = null

      const stream = refs.mediaStreamRef.current
      if (stream) {
        stream.getTracks().forEach(track => track.stop())
      }
      refs.mediaStreamRef.current = null
    }
    // refs 中的 ref 对象在组件生命周期内是稳定的。
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])
}
