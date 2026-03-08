/**
 * 音频录制 Hook
 * 处理音频录制、监听和匹配检测的核心逻辑
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
export function useAudioState() {
  const [state, setState] = useState(AppState.IDLE)
  const [matchCount, setMatchCount] = useState(0)
  const [currentMatch, setCurrentMatch] = useState('--')
  const [matchHistory, setMatchHistory] = useState([])
  const [countdown, setCountdown] = useState(0)
  const [randomDelayCountdown, setRandomDelayCountdown] = useState(0)
  const [isWaitingForRandomDelay, setIsWaitingForRandomDelay] = useState(false)

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
    randomDelayCountdown,
    isWaitingForRandomDelay,
    setMatchCount,
    setCurrentMatch,
    setMatchHistory,
    setCountdown,
    setRandomDelayCountdown,
    setIsWaitingForRandomDelay,
    stateRef,
    updateStatus
  }
}

/**
 * 音频引用 Hook
 */
export function useAudioRefs() {
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
  const randomDelayTimerRef = useRef(null)
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
    randomDelayTimerRef,
    isRecordingRef,
    isListeningRef,
    isDetectingRef,
    matchCountRef
  }
}

/**
 * 音频配置 Hook
 */
export function useAudioConfig(initialConfig = {}) {
  const [config] = useState({
    recordDuration: initialConfig.recordDuration || 5,
    threshold: initialConfig.threshold || 0.6,
    beepEnabled: initialConfig.beepEnabled ?? true,
    autoRestartLimit: initialConfig.autoRestartLimit || 3,
    matchCooldown: 800
  })

  return config
}

/**
 * 蜂鸣器 Hook
 */
export function useBeep(beepEnabled) {
  return useCallback(() => {
    if (!beepEnabled) return

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
  }, [beepEnabled])
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
export function useMatchDetection(refs, config, audioState, playBeep) {
  const {
    updateStatus,
    setMatchCount,
    setCurrentMatch,
    setMatchHistory,
    setIsWaitingForRandomDelay,
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

    if (currentEnergy < refEnergy * 0.1) return

    // 计算匹配分数
    const currentFingerprint = AudioUtils.getAudioFingerprint(new Float32Array(recentAudio))
    const fingerprintScore = AudioUtils.compareFingerprints(referenceFingerprintRef.current, currentFingerprint)
    const currentAvgFFT = AudioUtils.computeAverageFFT(new Float32Array(recentAudio))
    const spectralCorrelation = AudioUtils.computeSpectralCorrelation(referenceFFTRef.current, currentAvgFFT)
    const combinedScore = fingerprintScore * 0.7 + spectralCorrelation * 0.3

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
    }
  }, [config, updateStatus, setCurrentMatch, setMatchCount, setMatchHistory, stateRef, isDetectingRef, matchCountRef, lastMatchTimeRef, listeningStartTimeRef, lastMatchTimeForIntervalRef, inputBufferRef, referenceAudioRef, referenceFFTRef, referenceFingerprintRef])

  return { detectMatch }
}

/**
 * 音频监听操作 Hook
 */
export function useListeningActions(refs, config, audioState, detectMatch, playBeep) {
  const {
    updateStatus,
    setMatchCount,
    setMatchHistory,
    setCurrentMatch,
    setIsWaitingForRandomDelay,
    setRandomDelayCountdown,
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
    scriptProcessorRef,
    randomDelayTimerRef
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

  const stopListening = useCallback((skipResetWaiting = false) => {
    isListeningRef.current = false
    updateStatus(AppState.IDLE)
    if (!skipResetWaiting) {
      setIsWaitingForRandomDelay(false)
    }
    matchCountRef.current = 0

    if (randomDelayTimerRef.current) {
      clearTimeout(randomDelayTimerRef.current)
      randomDelayTimerRef.current = null
    }

    if (scriptProcessorRef.current) {
      scriptProcessorRef.current.disconnect()
      scriptProcessorRef.current = null
    }
  }, [updateStatus, setIsWaitingForRandomDelay, randomDelayTimerRef, scriptProcessorRef])

  const startListeningWithRandomDelay = useCallback(async () => {
    if (!referenceAudioRef.current) {
      alert('请先录制参考音频')
      return
    }

    const delayMs = Math.floor(Math.random() * 4000) + 1000
    const delayInSeconds = delayMs / 1000

    setIsWaitingForRandomDelay(true)
    setRandomDelayCountdown(delayInSeconds)

    const startTime = Date.now()
    const timerInterval = setInterval(() => {
      const elapsed = (Date.now() - startTime) / 1000
      const remaining = delayInSeconds - elapsed
      if (remaining <= 0) {
        clearInterval(timerInterval)
        setRandomDelayCountdown(0)
      } else {
        setRandomDelayCountdown(parseFloat(remaining.toFixed(1)))
      }
    }, 100)

    randomDelayTimerRef.current = setTimeout(() => {
      clearInterval(timerInterval)
      setIsWaitingForRandomDelay(false)
      setRandomDelayCountdown(0)
      playBeep()
      startListening()
    }, delayMs)
  }, [referenceAudioRef, setIsWaitingForRandomDelay, setRandomDelayCountdown, playBeep, startListening, randomDelayTimerRef])

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
    startListeningWithRandomDelay,
    toggleRecording,
    toggleListening
  }
}

/**
 * 状态信息 Hook
 */
export function useStatusInfo(audioState, refs) {
  const { state, isWaitingForRandomDelay, randomDelayCountdown, countdown, currentMatch } = audioState
  const { referenceAudioRef } = refs

  const getStatusInfo = useCallback(() => {
    if (isWaitingForRandomDelay) {
      const countdownDisplay = typeof randomDelayCountdown === 'number' ? randomDelayCountdown.toFixed(1) : '0.0'
      return { text: `随机延时中... 剩余 ${countdownDisplay} 秒`, indicator: 'waiting' }
    }
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
  }, [state, isWaitingForRandomDelay, randomDelayCountdown, countdown, currentMatch, referenceAudioRef])

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
      if (refs.randomDelayTimerRef.current) {
        clearTimeout(refs.randomDelayTimerRef.current)
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])
}
