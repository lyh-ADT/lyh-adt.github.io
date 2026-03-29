/**
 * 自定义模式执行引擎 Hook
 * 按顺序执行节点列表，支持循环、条件跳转等
 */

import { useState, useCallback, useRef, useEffect } from 'react'
import { NodeType, createNode } from '../types/index.js'
import { useBeep } from './useBeep'
import { useAudioCoreState, useAudioCoreRefs, useShotDetection, useListeningActionsForShot, AppState } from './useAudioCore'

// 执行状态
export const ExecutionState = {
  IDLE: 'idle',           // 空闲
  RUNNING: 'running',     // 运行中
  PAUSED: 'paused',       // 暂停
  STOPPED: 'stopped',     // 已停止
  COMPLETED: 'completed'  // 已完成
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

/**
 * 自定义模式 Hook
 * @param {Array} nodes - 节点列表
 * @param {Object} options - 配置选项
 * @returns {Object} 执行状态和控制函数
 */
export function useCustomMode(nodes = [], options = {}) {
  const {
    onNodeStart = null,
    onNodeComplete = null,
    onSequenceComplete = null,
    defaultThreshold = 0.7,
    defaultBeepEnabled = true
  } = options

  // 执行状态
  const [executionState, setExecutionState] = useState(ExecutionState.IDLE)
  const [currentNodeIndex, setCurrentNodeIndex] = useState(-1)
  const [currentNodeType, setCurrentNodeType] = useState(CurrentNodeType.NONE)
  const [countdown, setCountdown] = useState(null)
  const [elapsedTime, setElapsedTime] = useState(0)
  const [shotCount, setShotCount] = useState(0)
  const [shotHistory, setShotHistory] = useState([])
  const [parTimeRemaining, setParTimeRemaining] = useState(null)

  // Refs
  const nodesRef = useRef(nodes)
  const executionStateRef = useRef(ExecutionState.IDLE)
  const currentNodeIndexRef = useRef(-1)
  const currentNodeTypeRef = useRef(CurrentNodeType.NONE)
  const timerRef = useRef(null)
  const parTimeTimerRef = useRef(null)
  const startTimeRef = useRef(0)
  const parTimeStartTimeRef = useRef(0)
  const sequenceStartTimeRef = useRef(0)
  const shotCountRef = useRef(0)
  const shotHistoryRef = useRef([])
  const onNodeCompleteRef = useRef(null)
  const onSequenceCompleteRef = useRef(null)

  // 更新 refs
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

  // 合并 refs（使用外部的 shotCountRef 而不是 coreRefs 中的）
  const refs = {
    ...coreRefs,
    shotCountRef
  }

  // 扩展 audioState 以包含 useListeningActionsForShot 需要的函数
  const audioState = {
    ...audioCoreState,
    setShotCount,
    setShotHistory,
    setCurrentShotTime: () => {} // 空函数，因为 custom mode 不使用这个
  }

  // 蜂鸣器
  const playBeep = useBeep(defaultBeepEnabled)

  // 为每个节点创建独立的枪声检测 Hook
  const [shotDetectionConfig, setShotDetectionConfig] = useState({
    threshold: defaultThreshold,
    beepEnabled: true
  })

  // 创建回调函数的 ref，确保每次都使用最新的逻辑
  const onShotDetectedCallbackRef = useRef(null)

  const playShotBeep = useBeep(shotDetectionConfig.beepEnabled)

  // 创建枪声检测的 ref，用于在回调中访问最新状态
  const shotDetectionConfigRef = useRef(shotDetectionConfig)
  useEffect(() => {
    shotDetectionConfigRef.current = shotDetectionConfig
  }, [shotDetectionConfig])

  // 创建 detectShot 的包装函数
  const detectShotRef = useRef(null)

  // 设置回调函数
  useEffect(() => {
    onShotDetectedCallbackRef.current = (shotData) => {
      console.log('枪声检测回调触发，当前节点类型:', currentNodeTypeRef.current)
      // 枪声检测回调 - 只在等待枪声节点时执行
      if (currentNodeTypeRef.current === CurrentNodeType.WAIT_FOR_SHOT) {
        console.log('执行 handleShotDetected')
        handleShotDetectedRef.current(shotData)
      } else {
        console.log('跳过，因为当前不是等待枪声节点')
      }
    }
  }, [])

  const { detectShot } = useShotDetection(refs, {
    threshold: shotDetectionConfigRef.current.threshold,
    matchCooldown: 100
  }, audioState, playShotBeep, (shotData) => {
    // 通过 ref 调用最新的回调
    if (onShotDetectedCallbackRef.current) {
      onShotDetectedCallbackRef.current(shotData)
    }
  })

  // 保存 detectShot 到 ref
  useEffect(() => {
    detectShotRef.current = detectShot
  }, [detectShot])

  const {
    startListening,
    stopListening
  } = useListeningActionsForShot(refs, {
    threshold: shotDetectionConfigRef.current.threshold,
    matchCooldown: 100
  }, audioState, detectShot)

  // 播放蜂鸣器节点
  const playBeepNode = useCallback((config) => {
    if (!config) return

    const { duration = 100, frequency = 1000, volume = 0.5 } = config

    try {
      const audioContext = new (window.AudioContext || window.webkitAudioContext)()
      const oscillator = audioContext.createOscillator()
      const gainNode = audioContext.createGain()

      oscillator.connect(gainNode)
      gainNode.connect(audioContext.destination)
      oscillator.type = 'sine'
      oscillator.frequency.value = frequency
      gainNode.gain.setValueAtTime(volume, audioContext.currentTime)
      oscillator.start(audioContext.currentTime)

      setTimeout(() => {
        gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + duration / 1000)
        oscillator.stop(audioContext.currentTime + duration / 1000)
        setTimeout(() => audioContext.close(), duration + 50)
      }, duration)
    } catch (err) {
      console.error('播放蜂鸣器失败:', err)
    }
  }, [])

  // 处理枪声检测
  const handleShotDetectedRef = useRef(null)
  const handleShotDetected = useCallback((shotData) => {
    console.log('handleShotDetected 被调用')
    // 更新射击计数
    shotCountRef.current += 1
    setShotCount(shotCountRef.current)

    // 添加到历史记录
    const now = new Date()
    const timeStr = now.toLocaleTimeString()
    const timeSinceStart = Date.now() - startTimeRef.current

    const newHistory = [{
      time: timeStr,
      id: Date.now(),
      timeSinceStart,
      timeSinceLastMatch: shotData?.timeSinceLastMatch || timeSinceStart,
      shotNumber: shotCountRef.current
    }, ...shotHistoryRef.current.slice(0, 18)]

    setShotHistory(newHistory)
    shotHistoryRef.current = newHistory

    console.log('检测到枪声，继续下一个节点，当前索引:', currentNodeIndexRef.current)

    // 等待枪声节点完成，继续下一个节点
    executeNextNodeRef.current()
  }, [])

  // 保存 handleShotDetected 到 ref
  useEffect(() => {
    handleShotDetectedRef.current = handleShotDetected
  }, [handleShotDetected])

  // 执行下一个节点
  const executeNextNodeRef = useRef(null)
  const executeNodeRef = useRef(null)

  // 执行下一个节点
  const executeNextNode = useCallback(() => {
    if (executionStateRef.current !== ExecutionState.RUNNING) {
      return
    }

    const nextIndex = currentNodeIndexRef.current + 1

    if (nextIndex >= nodesRef.current.length) {
      // 序列完成
      setExecutionState(ExecutionState.COMPLETED)
      executionStateRef.current = ExecutionState.COMPLETED
      onSequenceCompleteRef.current?.({
        shotCount: shotCountRef.current,
        shotHistory: shotHistoryRef.current,
        totalTime: Date.now() - sequenceStartTimeRef.current
      })
      setCurrentNodeIndex(-1)
      setCurrentNodeType(CurrentNodeType.NONE)
      currentNodeTypeRef.current = CurrentNodeType.NONE
      return
    }

    executeNodeRef.current(nextIndex)
  }, [])

  // 执行指定节点
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
    sequenceStartTimeRef.current = Date.now()

    const { type, config } = node

    // 通知节点开始
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

  // 保存函数到 refs
  useEffect(() => {
    executeNextNodeRef.current = executeNextNode
  }, [executeNextNode])

  useEffect(() => {
    executeNodeRef.current = executeNode
  }, [executeNode])

  // 执行随机延迟节点
  const executeRandomDelayNode = useCallback((config) => {
    setCurrentNodeType(CurrentNodeType.RANDOM_DELAY)
    currentNodeTypeRef.current = CurrentNodeType.RANDOM_DELAY

    const minDelay = config?.minDelay || 1000
    const maxDelay = config?.maxDelay || 5000
    const delay = Math.floor(Math.random() * (maxDelay - minDelay + 1)) + minDelay

    setCountdown(delay / 1000)
    setElapsedTime(0)

    const startTime = Date.now()
    const updateInterval = setInterval(() => {
      const elapsed = (Date.now() - startTime) / 1000
      const remaining = Math.max(0, (delay / 1000) - elapsed)
      setCountdown(parseFloat(remaining.toFixed(1)))
      setElapsedTime(Math.floor(elapsed * 1000))

      if (remaining <= 0) {
        clearInterval(updateInterval)
        setCountdown(0)
        onNodeCompleteRef.current?.({ node: { type: NodeType.RandomDelay, config } })
        executeNextNode()
      }
    }, 100)

    timerRef.current = { type: 'randomDelay', cleanup: () => clearInterval(updateInterval) }
  }, [])

  // 执行固定延迟节点
  const executeFixedDelayNode = useCallback((config) => {
    setCurrentNodeType(CurrentNodeType.FIXED_DELAY)
    currentNodeTypeRef.current = CurrentNodeType.FIXED_DELAY

    const delay = config?.delay || 1000
    setCountdown(delay / 1000)
    setElapsedTime(0)

    const startTime = Date.now()
    const updateInterval = setInterval(() => {
      const elapsed = (Date.now() - startTime) / 1000
      const remaining = Math.max(0, (delay / 1000) - elapsed)
      setCountdown(parseFloat(remaining.toFixed(1)))
      setElapsedTime(Math.floor(elapsed * 1000))

      if (remaining <= 0) {
        clearInterval(updateInterval)
        setCountdown(0)
        onNodeCompleteRef.current?.({ node: { type: NodeType.FixedDelay, config } })
        executeNextNode()
      }
    }, 100)

    timerRef.current = { type: 'fixedDelay', cleanup: () => clearInterval(updateInterval) }
  }, [])

  // 执行等待枪声节点
  const executeWaitForShotNode = useCallback((config) => {
    console.log('执行等待枪声节点')
    setCurrentNodeType(CurrentNodeType.WAIT_FOR_SHOT)
    currentNodeTypeRef.current = CurrentNodeType.WAIT_FOR_SHOT

    setShotDetectionConfig({
      threshold: config?.threshold || defaultThreshold,
      beepEnabled: config?.beepEnabled ?? true
    })

    setElapsedTime(0)
    setCountdown(null)
    startTimeRef.current = Date.now()

    // 清空音频缓冲区，防止之前的枪声数据导致误触发
    refs.inputBufferRef.current = []
    refs.isDetectingRef.current = false

    // 启动音频监听（保持 lastMatchTime 以启用 cooldown）
    startListening(true)

    // 更新计时器
    const animate = () => {
      if (currentNodeTypeRef.current === CurrentNodeType.WAIT_FOR_SHOT &&
          executionStateRef.current === ExecutionState.RUNNING) {
        setElapsedTime(Date.now() - startTimeRef.current)
        timerRef.current = { type: 'waitShot', cleanup: () => {} }
        requestAnimationFrame(animate)
      }
    }
    requestAnimationFrame(animate)
  }, [startListening, defaultThreshold])

  // 执行 Par Time 节点
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

        onNodeCompleteRef.current?.({ node: { type: NodeType.ParTime, config }, timeout: true })

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
          setCurrentNodeType(CurrentNodeType.NONE)
          currentNodeTypeRef.current = CurrentNodeType.NONE
        } else {
          executeNextNode()
        }
      } else {
        parTimeTimerRef.current = requestAnimationFrame(updateParTime)
      }
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
  }, [playBeep, stopListening, executeNextNode])

  // 执行蜂鸣器节点
  const executeBeepNode = useCallback((config) => {
    setCurrentNodeType(CurrentNodeType.BEEP)
    currentNodeTypeRef.current = CurrentNodeType.BEEP

    playBeepNode(config)

    const duration = config?.duration || 100

    setTimeout(() => {
      onNodeCompleteRef.current?.({ node: { type: NodeType.Beep, config } })
      executeNextNode()
    }, duration + 50)

    timerRef.current = { type: 'beep', cleanup: () => {} }
  }, [playBeepNode, executeNextNode])

  // 执行自动重启节点
  const executeAutoRestartNode = useCallback((config) => {
    setCurrentNodeType(CurrentNodeType.RESTART_DELAY)
    currentNodeTypeRef.current = CurrentNodeType.RESTART_DELAY

    const shotCount = config?.shotCount || 5
    const delayBeforeRestart = config?.delayBeforeRestart || 1000

    // 等待达到射击次数后重启
    const checkRestart = () => {
      if (shotCountRef.current >= shotCount) {
        // 达到射击次数，延迟后重启
        setCountdown(delayBeforeRestart / 1000)

        const startTime = Date.now()
        const updateInterval = setInterval(() => {
          const elapsed = (Date.now() - startTime) / 1000
          const remaining = Math.max(0, (delayBeforeRestart / 1000) - elapsed)
          setCountdown(parseFloat(remaining.toFixed(1)))

          if (remaining <= 0) {
            clearInterval(updateInterval)
            // 重启序列
            shotCountRef.current = 0
            setShotCount(0)
            setShotHistory([])
            executeNode(0)
          }
        }, 100)

        timerRef.current = { type: 'restartDelay', cleanup: () => clearInterval(updateInterval) }
      } else {
        // 继续等待枪声
        setElapsedTime(Date.now() - sequenceStartTimeRef.current)
        timerRef.current = { type: 'autoRestartWait', cleanup: () => {} }
        requestAnimationFrame(checkRestart)
      }
    }

    checkRestart()
  }, [executeNode])

  // 开始执行
  const start = useCallback(() => {
    if (nodesRef.current.length === 0) {
      console.warn('没有节点可执行')
      return
    }

    setExecutionState(ExecutionState.RUNNING)
    executionStateRef.current = ExecutionState.RUNNING
    setCurrentNodeIndex(-1)
    setCurrentNodeType(CurrentNodeType.NONE)
    currentNodeTypeRef.current = CurrentNodeType.NONE
    setShotCount(0)
    setShotHistory([])
    shotCountRef.current = 0
    shotHistoryRef.current = []
    sequenceStartTimeRef.current = Date.now()

    // 开始执行第一个节点
    executeNodeRef.current(0)
  }, [])

  // 停止执行
  const stop = useCallback(() => {
    // 清理计时器
    if (timerRef.current?.cleanup) {
      timerRef.current.cleanup()
    }
    if (parTimeTimerRef.current) {
      cancelAnimationFrame(parTimeTimerRef.current)
    }

    // 停止音频监听
    stopListening()

    setExecutionState(ExecutionState.STOPPED)
    executionStateRef.current = ExecutionState.STOPPED
    setCurrentNodeIndex(-1)
    setCurrentNodeType(CurrentNodeType.NONE)
    currentNodeTypeRef.current = CurrentNodeType.NONE
    setCountdown(null)
    setElapsedTime(0)
    setParTimeRemaining(null)
  }, [stopListening])

  // 暂停执行
  const pause = useCallback(() => {
    if (executionStateRef.current !== ExecutionState.RUNNING) {
      return
    }

    // 清理计时器
    if (timerRef.current?.cleanup) {
      timerRef.current.cleanup()
    }
    if (parTimeTimerRef.current) {
      cancelAnimationFrame(parTimeTimerRef.current)
    }

    stopListening()

    setExecutionState(ExecutionState.PAUSED)
    executionStateRef.current = ExecutionState.PAUSED
  }, [stopListening])

  // 恢复执行
  const resume = useCallback(() => {
    if (executionStateRef.current !== ExecutionState.PAUSED) {
      return
    }

    setExecutionState(ExecutionState.RUNNING)
    executionStateRef.current = ExecutionState.RUNNING

    // 从当前节点继续
    executeNode(currentNodeIndexRef.current)
  }, [executeNode])

  // 清理
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
    // 状态
    executionState,
    currentNodeIndex,
    currentNodeType,
    countdown,
    elapsedTime,
    shotCount: shotCountRef.current,
    shotHistory,
    parTimeRemaining,
    currentNodes: nodesRef.current,

    // 音频 refs（用于可视化）
    analyserRef: refs.analyserRef,

    // 控制函数
    start,
    stop,
    pause,
    resume,

    // 工具函数
    isRunning: executionState === ExecutionState.RUNNING,
    isPaused: executionState === ExecutionState.PAUSED,
    isStopped: executionState === ExecutionState.STOPPED,
    isCompleted: executionState === ExecutionState.COMPLETED,
    isIdle: executionState === ExecutionState.IDLE
  }
}
