import { useState, useRef, useCallback, useEffect } from 'react'
import { useAudioDetection, AppState } from '../../hooks/useAudioDetection'
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

  // 使用 Shot Timer Hook
  const {
    state,
    shotCount,
    currentShotTime,
    shotHistory,
    countdown,
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
    let x = 0

    for (let i = 0; i < dataArray.length; i++) {
      const barHeight = (dataArray[i] / 255) * height

      const gradient = ctx.createLinearGradient(0, height, 0, height - barHeight)
      gradient.addColorStop(0, '#667eea')
      gradient.addColorStop(1, '#764ba2')

      ctx.fillStyle = gradient
      ctx.fillRect(x, height - barHeight, barWidth, barHeight)

      x += barWidth + 1
    }
  }, [])

  // 绘制波形
  const drawWaveform = useCallback((data, isRecording) => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext('2d')
    const width = canvas.width
    const height = canvas.height

    ctx.fillStyle = 'rgba(0, 0, 0, 0.3)'
    ctx.fillRect(0, 0, width, height)

    ctx.beginPath()
    ctx.strokeStyle = isRecording ? '#f44336' : '#2196f3'
    ctx.lineWidth = 2

    const sliceWidth = width / data.length
    let x = 0

    for (let i = 0; i < data.length; i++) {
      const v = data[i] * 5
      const y = height / 2 + v * height / 2

      if (i === 0) {
        ctx.moveTo(x, y)
      } else {
        ctx.lineTo(x, y)
      }

      x += sliceWidth
    }

    ctx.stroke()
  }, [])

  // 可视化循环
  useEffect(() => {
    if (state === AppState.LISTENING || state === AppState.DETECTED || state === AppState.TIMING) {
      const animate = () => {
        if (analyserRef.current) {
          const dataArray = new Uint8Array(analyserRef.current.frequencyBinCount)
          analyserRef.current.getByteFrequencyData(dataArray)
          drawFrequencyData(dataArray)
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

  // 如果正在等待随机延迟，显示等待信息
  const displayStatus = isWaitingForRandomDelay
    ? { indicator: 'waiting', text: `等待中... 剩余 ${randomDelayCountdown.toFixed(1)} 秒` }
    : statusInfo

  // 格式化时间为 HH:MM:SS.sss
  const formatTime = (ms) => {
    if (ms === null || ms === undefined) return '--:--:--.---'
    const totalSeconds = Math.floor(ms / 1000)
    const hours = Math.floor(totalSeconds / 3600)
    const minutes = Math.floor((totalSeconds % 3600) / 60)
    const seconds = totalSeconds % 60
    const milliseconds = ms % 1000
    const pad = (num, len = 2) => String(num).padStart(len, '0')
    return `${pad(hours)}:${pad(minutes)}:${pad(seconds)}.${pad(milliseconds, 3)}`
  }

  return (
    <div className="app-layout">
      <div className={`container ${isWaitingForRandomDelay ? 'waiting' : ''}`}>
        <h1>🔫 Shot Timer</h1>
        <p className="subtitle">随机延迟后发出提示音，检测枪声并记录射击间隔时间</p>

        <StatusBar indicator={displayStatus.indicator} text={displayStatus.text} />

        {/* 计时器显示 */}
        <div className="timer-display-card">
          <span className="timer-label">计时</span>
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
            disabled={state === AppState.LISTENING || state === AppState.DETECTED || state === AppState.TIMING || isWaitingForRandomDelay}
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
