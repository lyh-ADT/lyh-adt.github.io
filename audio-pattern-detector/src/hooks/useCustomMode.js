/**
 * 自定义模式执行引擎
 * 按顺序执行节点列表，支持随机延迟、等待枪声、Par Time、蜂鸣器和自动重启。
 */

import { useState, useCallback, useRef, useEffect } from 'react'
import { NodeType } from '../types/index.js'
import { useBeep, playTone } from './useBeep'
import {
  useAudioCoreState,
  useAudioCoreRefs,
  useShotDetection,
  useListeningActionsForShot,
  useCleanup
} from './useAudioCore'

// 执行状态
export const ExecutionState = {
  IDLE: 'idle',
  RUNNING: 'running',
  STOPPED: 'stopped',
  COMPLETED: 'completed'
}

// 当前节点类型
export const CurrentNodeType = {
  NONE: 'none',
  RANDOM_DELAY: 'random_delay',
  WAIT_FOR_SHOT: 'wait_for_shot',
  PAR_TIME: 'par_time',
  FIXED_DELAY: 'fixed_delay',
  BEEP: 'beep',
  RESTART_DELAY: 'restart_delay'
}

const DETECTION_WINDOW_SIZE = 512
const MATCH_COOLDOWN_MS = 80
const REFRACTORY_MS = 60

/**
 * 自定义模式 Hook
 */
export function useCustomMode(nodes = [], options = {}) {
  const {
    onNodeStart = null,
    onNodeComplete = null,
    onSequenceComplete = null,
    defaultThreshold = 0.7,
    defaultBeepEnabled = true
  } = options

  const [executionState, setExecutionState] = useState(ExecutionState.IDLE)
  const [currentNodeIndex, setCurrentNodeIndex] = useState(-1)
  const [currentNodeType, setCurrentNodeType] = useState(CurrentNodeType.NONE)
  const [countdown, setCountdown] = useState(null)
  const [elapsedTime, setElapsedTime] = useState(0)
  const [shotCount, setShotCount] = useState(0)
  const [shotHistory, setShotHistory] = useState([])
  const [parTimeRemaining, setParTimeRemaining] = useState(null)

  const nodesRef = useRef(nodes)
  const executionStateRef = useRef(ExecutionState.IDLE)
  const currentNodeIndexRef = useRef(-1)
  const currentNodeTypeRef = useRef(CurrentNodeType.NONE)
  const timerRef = useRef(null)
  const parTimeTimerRef = useRef(null)
  const startTimeRef = useRef(0)
  const parTimeStartTimeRef = useRef(0)
  const sequenceStartTimeRef = useRef(0)
  const lastNodeEndTimeRef = useRef(0)
  const shotCountRef = useRef(0)
  const shotHistoryRef = useRef([])
  const onNodeCompleteRef = useRef(null)
  const onSequenceCompleteRef = useRef(null)

  useEffect(() => {
    nodesRef.current = nodes
  }, [nodes])

  useEffect(() => {
    onNodeCompleteRef.current = onNodeComplete
  }, [onNodeComplete])

  useEffect(() => {
    onSequenceCompleteRef.current = onSequenceComplete
  }, [onSequenceComplete])

  useEffect(() => {
    shotHistoryRef.current = shotHistory
  }, [shotHistory])

  // 音频核心状态
  const audioCoreState = useAudioCoreState()
  const coreRefs = useAudioCoreRefs()
  const refs = { ...coreRefs, shotCountRef }

  const setCurrentShotTime = useCallback(() => {}, [])

  const audioState = {
    ...audioCoreState,
    setShotCount,
    setShotHistory,
    setCurrentShotTime
  }

  const playBeep = useBeep(defaultBeepEnabled, { duration: 120, volume: 0.4 })
  const playShotBeep = useBeep(true, { duration: 50, volume: 0.35 })

  // 检测配置通过 ref 传递，节点开始时同步写入，避免状态更新延迟导致阈值滞后。
  const shotConfigRef = useRef({
    threshold: defaultThreshold,
    beepEnabled: true,
    matchCooldown: MATCH_COOLDOWN_MS,
    refractoryMs: REFRACTORY_MS,
    windowSize: DETECTION_WINDOW_SIZE,
    manageStats: false,
    detectedHoldMs: 200
  })

  const configureShotDetection = useCallback((config) => {
    shotConfigRef.current = {
      ...shotConfigRef.current,
      threshold: config?.threshold ?? defaultThreshold,
      beepEnabled: config?.beepEnabled ?? true
    }
  }, [defaultThreshold])

  const handleShotDetectedRef = useRef(null)
  const executeNextNodeRef = useRef(null)
  const executeNodeRef = useRef(null)

  const { detectShot } = useShotDetection(
    refs,
    shotConfigRef,
    audioState,
    playShotBeep,
    (shotData) => {
      if (currentNodeTypeRef.current === CurrentNodeType.WAIT_FOR_SHOT) {
        handleShotDetectedRef.current?.(shotData)
      }
    }
  )

  const { startListening, stopListening } = useListeningActionsForShot(
    refs,
    audioState,
    detectShot
  )

  useCleanup(refs)

  const playBeepNode = useCallback((config) => {
    if (!config) return
    playTone({
      duration: config.duration ?? 100,
      frequency: config.frequency ?? 1000,
      volume: config.volume ?? 0.5,
      type: 'sine'
    })
  }, [])

  const handleShotDetected = useCallback((shotData) => {
    shotCountRef.current += 1
    setShotCount(shotCountRef.current)

    const now = Date.now()
    const timeSinceStart = now - sequenceStartTimeRef.current
    const timeSinceLastNode = lastNodeEndTimeRef.current !== 0
      ? timeSinceStart - (lastNodeEndTimeRef.current - sequenceStartTimeRef.current)
      : timeSinceStart

    lastNodeEndTimeRef.current = now

    const node = nodesRef.current[currentNodeIndexRef.current]
    const newHistory = [{
      time: new Date().toLocaleTimeString(),
      id: now,
      timeSinceStart,
      timeSinceLastMatch: timeSinceLastNode,
      shotNumber: shotCountRef.current,
      nodeType: 'waitForShot'
    }, ...shotHistoryRef.current.slice(0, 18)]

    setShotHistory(newHistory)
    shotHistoryRef.current = newHistory

    onNodeCompleteRef.current?.({
      node,
      index: currentNodeIndexRef.current,
      totalNodes: nodesRef.current.length,
      elapsedTime: now - startTimeRef.current,
      shot: true,
      shotData
    })

    // 先停止监听，避免后续节点执行期间继续累计枪声。
    stopListening()
    executeNextNodeRef.current()
  }, [stopListening])

  useEffect(() => {
    handleShotDetectedRef.current = handleShotDetected
  }, [handleShotDetected])

  const addNodeCompleteToHistory = useCallback((node, nodeElapsedTime) => {
    const now = Date.now()
    const timeSinceStart = now - sequenceStartTimeRef.current
    const timeSinceLastNode = lastNodeEndTimeRef.current !== 0
      ? timeSinceStart - (lastNodeEndTimeRef.current - sequenceStartTimeRef.current)
      : timeSinceStart

    lastNodeEndTimeRef.current = now

    const newHistory = [{
      time: new Date().toLocaleTimeString(),
      id: now,
      timeSinceStart,
      timeSinceLastMatch: timeSinceLastNode,
      shotNumber: shotCountRef.current,
      nodeType: node.type,
      nodeCompleted: true
    }, ...shotHistoryRef.current.slice(0, 18)]

    setShotHistory(newHistory)
    shotHistoryRef.current = newHistory

    onNodeCompleteRef.current?.({
      node,
      index: currentNodeIndexRef.current,
      totalNodes: nodesRef.current.length,
      elapsedTime: nodeElapsedTime
    })
  }, [])

  const executeNextNode = useCallback(() => {
    if (executionStateRef.current !== ExecutionState.RUNNING) {
      return
    }

    const nextIndex = currentNodeIndexRef.current + 1

    if (nextIndex >= nodesRef.current.length) {
      setExecutionState(ExecutionState.COMPLETED)
      executionStateRef.current = ExecutionState.COMPLETED

      stopListening()

      onSequenceCompleteRef.current?.({
        shotCount: shotCountRef.current,
        shotHistory: shotHistoryRef.current,
        totalTime: Date.now() - sequenceStartTimeRef.current
      })

      setCurrentNodeIndex(-1)
      currentNodeIndexRef.current = -1
      setCurrentNodeType(CurrentNodeType.NONE)
      currentNodeTypeRef.current = CurrentNodeType.NONE
      return
    }

    executeNodeRef.current(nextIndex)
  }, [stopListening])

  useEffect(() => {
    executeNextNodeRef.current = executeNextNode
  }, [executeNextNode])

  const executeNode = useCallback((index) => {
    if (executionStateRef.current !== ExecutionState.RUNNING) {
      return
    }

    const node = nodesRef.current[index]
    if (!node) {
      executeNextNodeRef.current()
      return
    }

    setCurrentNodeIndex(index)
    currentNodeIndexRef.current = index
    startTimeRef.current = Date.now()
    setCurrentNodeType(CurrentNodeType.NONE)
    currentNodeTypeRef.current = CurrentNodeType.NONE

    const { type, config } = node

    onNodeStart?.({ node, index, totalNodes: nodesRef.current.length })

    switch (type) {
      case NodeType.RandomDelay:
        executeRandomDelayNode(config)
        break
      case NodeType.FixedDelay:
        executeFixedDelayNode(config)
        break
      case NodeType.WaitForShot:
        executeWaitForShotNode(config)
        break
      case NodeType.ParTime:
        executeParTimeNode(config)
        break
      case NodeType.Beep:
        executeBeepNode(config)
        break
      case NodeType.AutoRestart:
        executeAutoRestartNode(config)
        break
      default:
        console.warn('未知节点类型:', type)
        executeNextNodeRef.current()
    }
  }, [onNodeStart])

  useEffect(() => {
    executeNodeRef.current = executeNode
  }, [executeNode])

  const executeRandomDelayNode = useCallback((config) => {
    setCurrentNodeType(CurrentNodeType.RANDOM_DELAY)
    currentNodeTypeRef.current = CurrentNodeType.RANDOM_DELAY

    const minDelay = config?.minDelay || 1000
    const maxDelay = Math.max(minDelay, config?.maxDelay || 5000)
    const delay = Math.floor(Math.random() * (maxDelay - minDelay + 1)) + minDelay

    setCountdown(delay / 1000)
    setElapsedTime(0)

    const startTime = Date.now()
    const updateInterval = setInterval(() => {
      const elapsed = Date.now() - startTime
      const remaining = Math.max(0, delay - elapsed)
      setCountdown(parseFloat((remaining / 1000).toFixed(1)))
      setElapsedTime(elapsed)

      if (remaining <= 0) {
        clearInterval(updateInterval)
        setCountdown(0)
        if (config?.beepOnComplete) {
          playBeep()
        }
        addNodeCompleteToHistory({ type: NodeType.RandomDelay }, delay)
        executeNextNodeRef.current()
      }
    }, 100)

    timerRef.current = { type: 'randomDelay', cleanup: () => clearInterval(updateInterval) }
  }, [addNodeCompleteToHistory, playBeep])

  const executeFixedDelayNode = useCallback((config) => {
    setCurrentNodeType(CurrentNodeType.FIXED_DELAY)
    currentNodeTypeRef.current = CurrentNodeType.FIXED_DELAY

    const delay = config?.delay || 1000
    setCountdown(delay / 1000)
    setElapsedTime(0)

    const startTime = Date.now()
    const updateInterval = setInterval(() => {
      const elapsed = Date.now() - startTime
      const remaining = Math.max(0, delay - elapsed)
      setCountdown(parseFloat((remaining / 1000).toFixed(1)))
      setElapsedTime(elapsed)

      if (remaining <= 0) {
        clearInterval(updateInterval)
        setCountdown(0)
        addNodeCompleteToHistory({ type: NodeType.FixedDelay }, delay)
        executeNextNodeRef.current()
      }
    }, 100)

    timerRef.current = { type: 'fixedDelay', cleanup: () => clearInterval(updateInterval) }
  }, [addNodeCompleteToHistory])

  const executeWaitForShotNode = useCallback((config) => {
    setCurrentNodeType(CurrentNodeType.WAIT_FOR_SHOT)
    currentNodeTypeRef.current = CurrentNodeType.WAIT_FOR_SHOT

    configureShotDetection(config)

    setElapsedTime(0)
    setCountdown(null)
    startTimeRef.current = Date.now()

    // 先停掉上一个节点可能残留的监听，再开始新的监听。
    stopListening()

    const animate = () => {
      if (
        currentNodeTypeRef.current !== CurrentNodeType.WAIT_FOR_SHOT ||
        executionStateRef.current !== ExecutionState.RUNNING
      ) {
        return
      }
      setElapsedTime(Date.now() - startTimeRef.current)
      requestAnimationFrame(animate)
    }
    requestAnimationFrame(animate)

    timerRef.current = { type: 'waitShot', cleanup: () => {} }

    startListening({ skipStateReset: true, keepLastMatchTime: true })
  }, [configureShotDetection, startListening, stopListening])

  const executeParTimeNode = useCallback((config) => {
    setCurrentNodeType(CurrentNodeType.PAR_TIME)
    currentNodeTypeRef.current = CurrentNodeType.PAR_TIME

    const parTime = config?.parTime || 1000
    const stopOnTimeout = config?.stopOnTimeout ?? false
    const beepOnTimeout = config?.beepOnTimeout ?? true

    setParTimeRemaining(parTime)
    setElapsedTime(0)
    parTimeStartTimeRef.current = Date.now()

    const updateParTime = () => {
      const elapsed = Date.now() - parTimeStartTimeRef.current
      const remaining = Math.max(0, parTime - elapsed)
      setParTimeRemaining(Math.floor(remaining))
      setElapsedTime(Math.floor(elapsed))

      if (remaining <= 0) {
        setParTimeRemaining(null)

        if (beepOnTimeout) {
          playBeep()
        }

        addNodeCompleteToHistory({ type: NodeType.ParTime }, parTime)

        if (stopOnTimeout) {
          stopListening()
          setExecutionState(ExecutionState.COMPLETED)
          executionStateRef.current = ExecutionState.COMPLETED
          onSequenceCompleteRef.current?.({
            shotCount: shotCountRef.current,
            shotHistory: shotHistoryRef.current,
            totalTime: Date.now() - sequenceStartTimeRef.current,
            timeout: true
          })
          setCurrentNodeIndex(-1)
          currentNodeIndexRef.current = -1
          setCurrentNodeType(CurrentNodeType.NONE)
          currentNodeTypeRef.current = CurrentNodeType.NONE
        } else {
          executeNextNodeRef.current()
        }
        return
      }

      parTimeTimerRef.current = requestAnimationFrame(updateParTime)
    }

    updateParTime()

    timerRef.current = {
      type: 'parTime',
      cleanup: () => {
        if (parTimeTimerRef.current) {
          cancelAnimationFrame(parTimeTimerRef.current)
        }
      }
    }
  }, [addNodeCompleteToHistory, playBeep, stopListening])

  const executeBeepNode = useCallback((config) => {
    setCurrentNodeType(CurrentNodeType.BEEP)
    currentNodeTypeRef.current = CurrentNodeType.BEEP

    playBeepNode(config)

    const duration = config?.duration || 100
    const timeout = setTimeout(() => {
      addNodeCompleteToHistory({ type: NodeType.Beep }, duration)
      executeNextNodeRef.current()
    }, duration + 50)

    timerRef.current = {
      type: 'beep',
      cleanup: () => clearTimeout(timeout)
    }
  }, [addNodeCompleteToHistory, playBeepNode])

  const executeAutoRestartNode = useCallback((config) => {
    setCurrentNodeType(CurrentNodeType.RESTART_DELAY)
    currentNodeTypeRef.current = CurrentNodeType.RESTART_DELAY

    const delayBeforeRestart = config?.delayBeforeRestart ?? 1000
    addNodeCompleteToHistory({ type: NodeType.AutoRestart }, delayBeforeRestart)

    setCountdown(delayBeforeRestart / 1000)
    setElapsedTime(0)

    const startTime = Date.now()
    const updateInterval = setInterval(() => {
      const elapsed = Date.now() - startTime
      const remaining = Math.max(0, delayBeforeRestart - elapsed)
      setCountdown(parseFloat((remaining / 1000).toFixed(1)))

      if (remaining <= 0) {
        clearInterval(updateInterval)

        // 新一轮序列必须重新建立时间基准。
        shotCountRef.current = 0
        setShotCount(0)
        setShotHistory([])
        shotHistoryRef.current = []
        sequenceStartTimeRef.current = Date.now()
        lastNodeEndTimeRef.current = 0
        setCurrentNodeIndex(-1)
        currentNodeIndexRef.current = -1
        setParTimeRemaining(null)
        setElapsedTime(0)

        executeNodeRef.current(0)
      }
    }, 100)

    timerRef.current = { type: 'restartDelay', cleanup: () => clearInterval(updateInterval) }
  }, [addNodeCompleteToHistory])

  const start = useCallback(() => {
    if (nodesRef.current.length === 0) {
      console.warn('没有节点可执行')
      return
    }

    if (timerRef.current?.cleanup) {
      timerRef.current.cleanup()
    }
    if (parTimeTimerRef.current) {
      cancelAnimationFrame(parTimeTimerRef.current)
    }
    stopListening()
    audioCoreState.setError(null)

    setExecutionState(ExecutionState.RUNNING)
    executionStateRef.current = ExecutionState.RUNNING
    setCurrentNodeIndex(-1)
    currentNodeIndexRef.current = -1
    setCurrentNodeType(CurrentNodeType.NONE)
    currentNodeTypeRef.current = CurrentNodeType.NONE
    setCountdown(null)
    setElapsedTime(0)
    setParTimeRemaining(null)
    setShotCount(0)
    setShotHistory([])
    shotCountRef.current = 0
    shotHistoryRef.current = []
    sequenceStartTimeRef.current = Date.now()
    lastNodeEndTimeRef.current = 0

    executeNodeRef.current(0)
  }, [audioCoreState.setError, stopListening])

  const stop = useCallback(() => {
    if (timerRef.current?.cleanup) {
      timerRef.current.cleanup()
      timerRef.current = null
    }
    if (parTimeTimerRef.current) {
      cancelAnimationFrame(parTimeTimerRef.current)
      parTimeTimerRef.current = null
    }

    stopListening()

    setExecutionState(ExecutionState.STOPPED)
    executionStateRef.current = ExecutionState.STOPPED
    setCurrentNodeIndex(-1)
    currentNodeIndexRef.current = -1
    setCurrentNodeType(CurrentNodeType.NONE)
    currentNodeTypeRef.current = CurrentNodeType.NONE
    setCountdown(null)
    setElapsedTime(0)
    setParTimeRemaining(null)
  }, [stopListening])

  // 麦克风不可用时停止正在运行的序列，避免卡在等待枪声节点。
  useEffect(() => {
    if (audioCoreState.error && executionStateRef.current === ExecutionState.RUNNING) {
      stop()
    }
  }, [audioCoreState.error, stop])

  // 卸载时清理定时器和麦克风
  useEffect(() => {
    return () => {
      if (timerRef.current?.cleanup) {
        timerRef.current.cleanup()
      }
      if (parTimeTimerRef.current) {
        cancelAnimationFrame(parTimeTimerRef.current)
      }
      stopListening()
    }
  }, [stopListening])

  return {
    executionState,
    error: audioCoreState.error,
    currentNodeIndex,
    currentNodeType,
    countdown,
    elapsedTime,
    shotCount,
    shotHistory,
    parTimeRemaining,
    currentNodes: nodesRef.current,

    analyserRef: refs.analyserRef,

    start,
    stop,

    isRunning: executionState === ExecutionState.RUNNING,
    isStopped: executionState === ExecutionState.STOPPED,
    isCompleted: executionState === ExecutionState.COMPLETED,
    isIdle: executionState === ExecutionState.IDLE
  }
}
