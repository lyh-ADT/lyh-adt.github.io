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
  const [recordDuration, setRecordDuration] = useState(5)
  const [threshold, setThreshold] = useState(0.6)
  const [beepEnabled, setBeepEnabled] = useState(true)
  const [autoRestartLimit, setAutoRestartLimit] = useState(3)

  const canvasRef = useRef(null)
  const visualizerFrameRef = useRef(null)

  // 使用音频检测 Hook
  const {
    state,
    matchCount,
    currentMatch,
    matchHistory,
    countdown,
    randomDelayCountdown,
    isWaitingForRandomDelay,
    toggleRecording,
    toggleListening,
    startListeningWithRandomDelay,
    getStatusInfo,
    analyserRef
  } = useAudioDetection()

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
    if (state === AppState.RECORDING || state === AppState.LISTENING) {
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

  return (
    <div className="app-layout">
      <div className={`container ${isWaitingForRandomDelay ? 'waiting' : ''}`}>
        <h1>🎤 音频模式检测器</h1>
        <p className="subtitle">录制参考音频并实时检测其出现</p>

        <StatusBar indicator={statusInfo.indicator} text={statusInfo.text} />

        <div className="controls">
          <ControlButton
            onClick={toggleRecording}
            variant={state === AppState.RECORDING ? 'danger' : 'primary'}
            icon={state === AppState.RECORDING ? '⏹️' : '🔴'}
            label={state === AppState.RECORDING ? '停止录制' : '录制参考音频'}
          />
          <ControlButton
            onClick={toggleListening}
            variant="secondary"
            icon={state === AppState.LISTENING || state === AppState.DETECTED ? '⏹️' : '👂'}
            label={state === AppState.LISTENING || state === AppState.DETECTED ? '停止监听' : '开始监听'}
          />
          <ControlButton
            onClick={startListeningWithRandomDelay}
            variant="warning"
            icon="🎲"
            label={isWaitingForRandomDelay ? '延时中...' : '随机延时监听'}
          />
        </div>

        <Visualizer canvasRef={canvasRef} />

        <StatsGrid matchCount={matchCount} currentMatch={currentMatch} />
      </div>

      <MatchHistoryCard matchHistory={matchHistory} />

      <SettingsCard
        recordDuration={recordDuration}
        setRecordDuration={setRecordDuration}
        threshold={threshold}
        setThreshold={setThreshold}
        beepEnabled={beepEnabled}
        setBeepEnabled={setBeepEnabled}
        autoRestartLimit={autoRestartLimit}
        setAutoRestartLimit={setAutoRestartLimit}
      />
    </div>
  )
}

export default AudioDetector
