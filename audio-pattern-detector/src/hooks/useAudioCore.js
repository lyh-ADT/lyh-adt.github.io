/**
 * 音频核心 Hook - 可复用的音频录制和检测逻辑
 * 不包含 beep 和随机延迟功能，这些功能由上层 Hook 组合
 */

import { useState, useRef, useCallback, useEffect } from 'react'
import AudioUtils from '../utils/AudioUtils'

// 状态枚举
export const AppState = {
  IDLE: 'idle',
  RECORDING: 'recording',
  LISTENING: 'listening',
  DETECTED: 'detected'
}

/**
 * 音频状态管理 Hook
 */
export function useAudioCoreState() {
  const [state, setState] = useState(AppState.IDLE)
  const [matchCount, setMatchCount] = useState(0)
  const [currentMatch, setCurrentMatch] = useState('--')
  const [matchHistory, setMatchHistory] = useState([])
  const [countdown, setCountdown] = useState(0)

  // Ref for state access in callbacks
  const stateRef = useRef(state)

  // Update state
  const updateStatus = useCallback((newState) => {
    setState(newState)
    stateRef.current = newState
  }, [])

  return {
    state,
    matchCount,
    currentMatch,
    matchHistory,
    countdown,
    setMatchCount,
    setCurrentMatch,
    setMatchHistory,
    setCountdown,
    stateRef,
    updateStatus
  }
}

/**
 * 音频引用 Hook
 */
export function useAudioCoreRefs() {
  const audioContextRef = useRef(null)
  const analyserRef = useRef(null)
  const mediaStreamRef = useRef(null)
  const recorderRef = useRef(null)
  const scriptProcessorRef = useRef(null)
  const referenceAudioRef = useRef(null)
  const referenceFFTRef = useRef(null)
  const referenceFingerprintRef = useRef(null)
  const inputBufferRef = useRef([])
  const audioBufferRef = useRef([])
  const animationFrameRef = useRef(null)
  const lastMatchTimeRef = useRef(0)
  const listeningStartTimeRef = useRef(0)
  const lastMatchTimeForIntervalRef = useRef(0)
  const isRecordingRef = useRef(false)
  const isListeningRef = useRef(false)
  const isDetectingRef = useRef(false)
  const matchCountRef = useRef(0)

  return {
    audioContextRef,
    analyserRef,
    mediaStreamRef,
    recorderRef,
    scriptProcessorRef,
    referenceAudioRef,
    referenceFFTRef,
    referenceFingerprintRef,
    inputBufferRef,
    audioBufferRef,
    animationFrameRef,
    lastMatchTimeRef,
    listeningStartTimeRef,
    lastMatchTimeForIntervalRef,
    isRecordingRef,
    isListeningRef,
    isDetectingRef,
    matchCountRef
  }
}

/**
 * 音频配置 Hook
 */
export function useAudioCoreConfig(initialConfig = {}) {
  const [config] = useState({
    recordDuration: initialConfig.recordDuration || 5,
    threshold: initialConfig.threshold || 0.6,
    matchCooldown: 800
  })

  return config
}

/**
 * 音频录制操作 Hook
 */
export function useRecordingActions(state, refs, config, updateStatus) {
  const finishRecording = useCallback(() => {
    updateStatus(AppState.IDLE)

    if (refs.recorderRef.current) {
      refs.recorderRef.current.disconnect()
      refs.recorderRef.current = null
    }

    if (refs.audioBufferRef.current.length > 0) {
      refs.referenceAudioRef.current = new Float32Array(refs.audioBufferRef.current)
      refs.referenceFFTRef.current = AudioUtils.computeAverageFFT(refs.referenceAudioRef.current)
      refs.referenceFingerprintRef.current = AudioUtils.getAudioFingerprint(refs.referenceAudioRef.current)

      const sampleRate = refs.audioContextRef.current?.sampleRate || 44100
      console.log('参考音频时长:', (refs.referenceAudioRef.current.length / sampleRate).toFixed(2), '秒')
    }
  }, [updateStatus, refs])

  const startRecording = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: false,
          noiseReduction: false,
          autoGainControl: false
        }
      })

      refs.mediaStreamRef.current = stream

      const audioContext = new AudioContext()
      refs.audioContextRef.current = audioContext

      const source = audioContext.createMediaStreamSource(stream)
      const analyser = audioContext.createAnalyser()
      analyser.fftSize = 2048
      refs.analyserRef.current = analyser
      source.connect(analyser)

      const duration = config.recordDuration * 1000
      refs.audioBufferRef.current = []
      refs.inputBufferRef.current = []

      const recorder = audioContext.createScriptProcessor(1024, 1, 1)
      const startTime = Date.now()

      refs.isRecordingRef.current = true

      recorder.onaudioprocess = (e) => {
        if (!refs.isRecordingRef.current) return

        const inputData = e.inputBuffer.getChannelData(0)
        refs.audioBufferRef.current.push(...inputData)

        const elapsed = Date.now() - startTime
        const remaining = Math.max(0, (duration - elapsed) / 1000)
        // Note: countdown update handled by caller

        if (elapsed >= duration) {
          refs.isRecordingRef.current = false
          finishRecording()
        }
      }

      refs.recorderRef.current = recorder
      source.connect(recorder)
      recorder.connect(audioContext.destination)

      updateStatus(AppState.RECORDING)
    } catch (err) {
      console.error('录制失败:', err)
      updateStatus(AppState.IDLE)
    }
  }, [config.recordDuration, updateStatus, finishRecording, refs])

  const stopRecording = useCallback(() => {
    refs.isRecordingRef.current = false

    if (refs.recorderRef.current) {
      refs.recorderRef.current.disconnect()
      refs.recorderRef.current = null
    }

    if (refs.audioBufferRef.current.length > 0) {
      refs.referenceAudioRef.current = new Float32Array(refs.audioBufferRef.current)
      refs.referenceFFTRef.current = AudioUtils.computeAverageFFT(refs.referenceAudioRef.current)
      refs.referenceFingerprintRef.current = AudioUtils.getAudioFingerprint(refs.referenceAudioRef.current)
    }

    updateStatus(AppState.IDLE)
  }, [updateStatus, refs])

  return { startRecording, stopRecording, finishRecording }
}

/**
 * 音频匹配检测 Hook
 */
export function useMatchDetection(refs, config, audioState, onMatch) {
  const {
    updateStatus,
    setMatchCount,
    setCurrentMatch,
    setMatchHistory,
    stateRef
  } = audioState

  const {
    isDetectingRef,
    matchCountRef,
    lastMatchTimeRef,
    listeningStartTimeRef,
    lastMatchTimeForIntervalRef,
    inputBufferRef,
    referenceAudioRef,
    referenceFFTRef,
    referenceFingerprintRef
  } = refs

  // 检测匹配
  const detectMatch = useCallback(() => {
    const now = Date.now()

    if (isDetectingRef.current) return
    if (now - lastMatchTimeRef.current < config.matchCooldown) return

    if (!referenceAudioRef.current || inputBufferRef.current.length < referenceAudioRef.current.length) {
      return
    }

    const recentAudio = inputBufferRef.current.slice(
      inputBufferRef.current.length - referenceAudioRef.current.length
    )

    // 检查音频能量
    let currentEnergy = 0
    for (let i = 0; i < recentAudio.length; i++) {
      currentEnergy += recentAudio[i] * recentAudio[i]
    }

    let refEnergy = 0
    for (let i = 0; i < referenceAudioRef.current.length; i++) {
      refEnergy += referenceAudioRef.current[i] * referenceAudioRef.current[i]
    }

    // 能量必须在参考音频的 20%-400% 之间
    if (currentEnergy < refEnergy * 0.2 || currentEnergy > refEnergy * 4) return

    // 计算匹配分数
    const currentFingerprint = AudioUtils.getAudioFingerprint(new Float32Array(recentAudio))
    const fingerprintScore = AudioUtils.compareFingerprints(referenceFingerprintRef.current, currentFingerprint)
    const currentAvgFFT = AudioUtils.computeAverageFFT(new Float32Array(recentAudio))
    const spectralCorrelation = AudioUtils.computeSpectralCorrelation(referenceFFTRef.current, currentAvgFFT)

    // 添加时域相关性检查（轻量级）
    const timeDomainCorrelation = AudioUtils.computeTimeDomainCorrelation(referenceAudioRef.current, new Float32Array(recentAudio))

    // 综合评分：指纹 50%，频谱 35%，时域 15%
    const combinedScore = fingerprintScore * 0.5 + spectralCorrelation * 0.35 + timeDomainCorrelation * 0.15

    setCurrentMatch(combinedScore.toFixed(2))

    if (combinedScore >= config.threshold) {
      isDetectingRef.current = true

      const timeSinceStart = now - listeningStartTimeRef.current
      const timeSinceLastMatch = lastMatchTimeForIntervalRef.current !== 0
        ? now - lastMatchTimeForIntervalRef.current
        : timeSinceStart

      lastMatchTimeRef.current = now
      lastMatchTimeForIntervalRef.current = now

      setMatchCount(prev => prev + 1)
      matchCountRef.current += 1

      const nowDate = new Date()
      const timeStr = nowDate.toLocaleTimeString()

      setMatchHistory(prev => [{
        time: timeStr,
        score: combinedScore,
        id: now,
        timeSinceStart,
        timeSinceLastMatch
      }, ...prev.slice(0, 18)])

      inputBufferRef.current = []
      updateStatus(AppState.DETECTED)

      setTimeout(() => {
        if (stateRef.current === AppState.DETECTED) {
          updateStatus(AppState.LISTENING)
        }
      }, 500)

      setTimeout(() => {
        isDetectingRef.current = false
      }, 2000)

      // 回调通知匹配事件
      if (onMatch) {
        onMatch({
          score: combinedScore,
          timeSinceStart,
          timeSinceLastMatch
        })
      }
    }
  }, [config, updateStatus, setCurrentMatch, setMatchCount, setMatchHistory, stateRef, isDetectingRef, matchCountRef, lastMatchTimeRef, listeningStartTimeRef, lastMatchTimeForIntervalRef, inputBufferRef, referenceAudioRef, referenceFFTRef, referenceFingerprintRef, onMatch])

  return { detectMatch }
}

/**
 * 音频监听操作 Hook
 */
export function useListeningActions(refs, config, audioState, detectMatch) {
  const {
    updateStatus,
    setMatchCount,
    setMatchHistory,
    setCurrentMatch,
    stateRef
  } = audioState

  const {
    isListeningRef,
    isDetectingRef,
    matchCountRef,
    lastMatchTimeRef,
    lastMatchTimeForIntervalRef,
    listeningStartTimeRef,
    inputBufferRef,
    referenceAudioRef,
    mediaStreamRef,
    audioContextRef,
    analyserRef,
    scriptProcessorRef
  } = refs

  const startListening = useCallback(async () => {
    if (!referenceAudioRef.current) {
      alert('请先录制参考音频')
      return
    }

    setMatchCount(0)
    setMatchHistory([])
    setCurrentMatch('--')
    inputBufferRef.current = []
    lastMatchTimeRef.current = 0
    lastMatchTimeForIntervalRef.current = 0
    listeningStartTimeRef.current = Date.now()
    isDetectingRef.current = false
    matchCountRef.current = 0

    const stream = mediaStreamRef.current
    const audioContext = audioContextRef.current

    if (!stream || !audioContext) {
      try {
        const newStream = await navigator.mediaDevices.getUserMedia({
          audio: {
            echoCancellation: false,
            noiseReduction: false,
            autoGainControl: false
          }
        })
        mediaStreamRef.current = newStream

        const newAudioContext = new AudioContext()
        audioContextRef.current = newAudioContext

        const source = newAudioContext.createMediaStreamSource(newStream)
        const analyser = newAudioContext.createAnalyser()
        analyser.fftSize = 2048
        analyserRef.current = analyser
        source.connect(analyser)
      } catch (err) {
        console.error('获取音频流失败:', err)
        updateStatus(AppState.IDLE)
        return
      }
    }

    updateStatus(AppState.LISTENING)

    const audioCtx = audioContextRef.current
    const source = audioCtx.createMediaStreamSource(mediaStreamRef.current)

    const scriptProcessor = audioCtx.createScriptProcessor(2048, 1, 1)
    scriptProcessorRef.current = scriptProcessor

    isListeningRef.current = true

    scriptProcessor.onaudioprocess = (e) => {
      if (!isListeningRef.current || stateRef.current !== AppState.LISTENING || isDetectingRef.current) return

      const inputData = e.inputBuffer.getChannelData(0)
      inputBufferRef.current.push(...inputData)

      const maxBufferSize = referenceAudioRef.current.length * 2
      if (inputBufferRef.current.length > maxBufferSize) {
        inputBufferRef.current = inputBufferRef.current.slice(-maxBufferSize)
      }

      detectMatch()
    }

    source.connect(scriptProcessor)
    scriptProcessor.connect(audioCtx.destination)
  }, [updateStatus, detectMatch, setMatchCount, setMatchHistory, setCurrentMatch, stateRef, isListeningRef, isDetectingRef, matchCountRef, lastMatchTimeRef, lastMatchTimeForIntervalRef, listeningStartTimeRef, inputBufferRef, referenceAudioRef, mediaStreamRef, audioContextRef, analyserRef, scriptProcessorRef])

  const stopListening = useCallback(() => {
    isListeningRef.current = false
    updateStatus(AppState.IDLE)
    matchCountRef.current = 0

    if (scriptProcessorRef.current) {
      scriptProcessorRef.current.disconnect()
      scriptProcessorRef.current = null
    }
  }, [updateStatus, scriptProcessorRef])

  const toggleRecording = useCallback(() => {
    if (stateRef.current === AppState.RECORDING) {
      // stopRecording would be called from outside
    } else {
      stopListening()
      // startRecording would be called from outside
    }
  }, [stopListening, stateRef])

  const toggleListening = useCallback(() => {
    if (stateRef.current === AppState.LISTENING || stateRef.current === AppState.DETECTED) {
      stopListening()
    } else {
      startListening()
    }
  }, [stopListening, startListening, stateRef])

  return {
    startListening,
    stopListening,
    toggleRecording,
    toggleListening
  }
}

/**
 * 状态信息 Hook
 */
export function useStatusInfo(audioState, refs) {
  const { state, countdown, currentMatch } = audioState
  const { referenceAudioRef } = refs

  const getStatusInfo = useCallback(() => {
    switch (state) {
      case AppState.RECORDING:
        return { text: `正在录制... 剩余 ${countdown} 秒`, indicator: 'recording' }
      case AppState.LISTENING:
        return { text: '正在监听参考音频...', indicator: 'listening' }
      case AppState.DETECTED:
        return { text: `🎯 检测到匹配！(${currentMatch})`, indicator: 'detected' }
      default:
        return { text: referenceAudioRef.current ? '参考音频已录制，点击"开始监听"' : '准备就绪', indicator: 'ready' }
    }
  }, [state, countdown, currentMatch, referenceAudioRef])

  return { getStatusInfo }
}

/**
 * 清理 Hook
 */
export function useCleanup(refs) {
  useEffect(() => {
    return () => {
      if (refs.animationFrameRef.current) {
        cancelAnimationFrame(refs.animationFrameRef.current)
      }
      if (refs.mediaStreamRef.current) {
        refs.mediaStreamRef.current.getTracks().forEach(track => track.stop())
      }
      if (refs.audioContextRef.current) {
        refs.audioContextRef.current.close()
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])
}
