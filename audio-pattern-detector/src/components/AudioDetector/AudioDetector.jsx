import { useState, useRef, useCallback, useEffect } from 'react'
import { useAudioDetection, AppState } from '../../hooks/useAudioDetection'
import { formatTime } from '../../utils/audioDetection'
import {
  StatusBar,
  ControlButton,
  Visualizer,
  StatsGrid,
  MatchHistoryCard,
  SettingsCard
} from './index.jsx'
import './styles.css'

function AudioDetector() {
  // 本地设置状态
  const [minDelay, setMinDelay] = useState(1)
  const [maxDelay, setMaxDelay] = useState(5)
  const [threshold, setThreshold] = useState(0.7)
  const [beepEnabled, setBeepEnabled] = useState(true)
  const [shotBeepEnabled, setShotBeepEnabled] = useState(true)
  const [autoRestartEnabled, setAutoRestartEnabled] = useState(false)
  const [autoRestartLimit, setAutoRestartLimit] = useState(5)
  const [parTimeEnabled, setParTimeEnabled] = useState(false)
  const [parTime, setParTime] = useState(1000)

  const canvasRef = useRef(null)
  const visualizerFrameRef = useRef(null)
  const frequencyDataRef = useRef(null)

  // 使用 Shot Timer Hook
  const {
    state,
    shotCount,
    currentShotTime,
    shotHistory,
    randomDelayCountdown,
    isWaitingForRandomDelay,
    toggleListening,
    startListeningWithRandomDelay,
    getStatusInfo,
    analyserRef,
    elapsedTime,
    parTimeRemaining,
    isInfiniteLoop
  } = useAudioDetection({
    threshold,
    beepEnabled,
    shotBeepEnabled,
    autoRestartEnabled,
    autoRestartLimit,
    minDelay,
    maxDelay,
    parTimeEnabled,
    parTime
  })

  // 绘制频谱
  const drawFrequencyData = useCallback((dataArray) => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext('2d')
    const width = canvas.width
    const height = canvas.height

    ctx.fillStyle = 'rgba(0, 0, 0, 0.3)'
    ctx.fillRect(0, 0, width, height)

    const barWidth = (width / dataArray.length) * 2.5
    const gradient = ctx.createLinearGradient(0, height, 0, 0)
    gradient.addColorStop(0, '#667eea')
    gradient.addColorStop(1, '#764ba2')
    ctx.fillStyle = gradient

    let x = 0
    for (let i = 0; i < dataArray.length; i++) {
      const barHeight = (dataArray[i] / 255) * height
      ctx.fillRect(x, height - barHeight, barWidth, barHeight)
      x += barWidth + 1
    }
  }, [])

  // 可视化循环
  useEffect(() => {
    if (state === AppState.LISTENING || state === AppState.DETECTED || state === AppState.TIMING) {
      const animate = () => {
        if (analyserRef.current) {
          const binCount = analyserRef.current.frequencyBinCount
          if (!frequencyDataRef.current || frequencyDataRef.current.length !== binCount) {
            frequencyDataRef.current = new Uint8Array(binCount)
          }
          analyserRef.current.getByteFrequencyData(frequencyDataRef.current)
          drawFrequencyData(frequencyDataRef.current)
          visualizerFrameRef.current = requestAnimationFrame(animate)
        }
      }
      animate()
    }

    return () => {
      if (visualizerFrameRef.current) {
        cancelAnimationFrame(visualizerFrameRef.current)
      }
    }
  }, [state, drawFrequencyData])

  const statusInfo = getStatusInfo()

  // 等待随机延迟 / 自动重启的 1 秒间隔都显示更明确的提示
  const isRestarting = isInfiniteLoop && state === AppState.IDLE && !isWaitingForRandomDelay
  const displayStatus = isWaitingForRandomDelay
    ? { indicator: 'waiting', text: `等待中... 剩余 ${randomDelayCountdown.toFixed(1)} 秒` }
    : isRestarting
      ? { indicator: 'waiting', text: '自动重启准备中...' }
      : statusInfo

  return (
    <div className="app-layout">
      <div className={`container ${isWaitingForRandomDelay ? 'waiting' : ''}`}>
        <h1>🔫 Shot Timer</h1>
        <p className="subtitle">随机延迟后发出提示音，检测枪声并记录射击间隔时间</p>

        <StatusBar indicator={displayStatus.indicator} text={displayStatus.text} />

        {/* 计时器显示 */}
        <div className="timer-display-card">
          <span className="timer-label">总计时</span>
          <span className="timer-value">{formatTime(elapsedTime)}</span>
          {parTimeEnabled && parTimeRemaining !== null && elapsedTime > 0 && (
            <span className="par-time-remaining">Par Time: {parTimeRemaining}ms</span>
          )}
        </div>

        <div className="controls">
          <ControlButton
            onClick={toggleListening}
            variant="primary"
            icon={(state === AppState.LISTENING || state === AppState.DETECTED || state === AppState.TIMING || isInfiniteLoop || isWaitingForRandomDelay) ? '⏹️' : '▶️'}
            label={(state === AppState.LISTENING || state === AppState.DETECTED || state === AppState.TIMING || isInfiniteLoop || isWaitingForRandomDelay) ? '停止' : '开始'}
          />
          <ControlButton
            onClick={startListeningWithRandomDelay}
            variant="warning"
            icon="🎲"
            label={isWaitingForRandomDelay ? '延时中...' : '随机延时启动'}
            disabled={state === AppState.LISTENING || state === AppState.DETECTED || state === AppState.TIMING || isWaitingForRandomDelay || isInfiniteLoop}
          />
        </div>

        <Visualizer canvasRef={canvasRef} />

        <StatsGrid matchCount={shotCount} currentMatch={currentShotTime} />
      </div>

      <MatchHistoryCard matchHistory={shotHistory} />

      <SettingsCard
        minDelay={minDelay}
        setMinDelay={setMinDelay}
        maxDelay={maxDelay}
        setMaxDelay={setMaxDelay}
        threshold={threshold}
        setThreshold={setThreshold}
        beepEnabled={beepEnabled}
        setBeepEnabled={setBeepEnabled}
        shotBeepEnabled={shotBeepEnabled}
        setShotBeepEnabled={setShotBeepEnabled}
        autoRestartEnabled={autoRestartEnabled}
        setAutoRestartEnabled={setAutoRestartEnabled}
        autoRestartLimit={autoRestartLimit}
        setAutoRestartLimit={setAutoRestartLimit}
        parTimeEnabled={parTimeEnabled}
        setParTimeEnabled={setParTimeEnabled}
        parTime={parTime}
        setParTime={setParTime}
      />
    </div>
  )
}

export default AudioDetector
