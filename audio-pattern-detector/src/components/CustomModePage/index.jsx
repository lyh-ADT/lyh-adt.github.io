import { useState, useCallback, useRef, useEffect } from 'react'
import { useCustomMode, ExecutionState, CurrentNodeType } from '../../hooks/useCustomMode'
import { NodeType, getNodeDisplayName, getNodeIcon } from '../../types/index.js'
import CustomModeEditor from '../CustomModeEditor'
import './CustomModePage.css'

/**
 * 状态栏组件
 */
function StatusBar({ indicator, text }) {
  return (
    <div className="status-bar">
      <div className={`status-indicator ${indicator}`}></div>
      <span className="status-text">{text}</span>
    </div>
  )
}

/**
 * 控制按钮组件
 */
function ControlButton({ onClick, disabled, variant, icon, label }) {
  return (
    <button
      className={`btn btn-${variant}`}
      onClick={onClick}
      disabled={disabled}
    >
      <span>{icon}</span>
      <span>{label}</span>
    </button>
  )
}

/**
 * 可视化画布组件
 */
function Visualizer({ canvasRef }) {
  return (
    <div className="visualizer">
      <canvas ref={canvasRef} id="audioCanvas"></canvas>
    </div>
  )
}

/**
 * 统计卡片组件
 */
function StatsGrid({ matchCount, currentMatch }) {
  return (
    <div className="stats-grid">
      <div className="stat-card">
        <div className="stat-value">{matchCount}</div>
        <div className="stat-label">射击次数</div>
      </div>
      <div className="stat-card">
        <div className="stat-value">{currentMatch === 0 ? '--' : `${currentMatch}ms`}</div>
        <div className="stat-label">当前计时</div>
      </div>
    </div>
  )
}

/**
 * 检测历史组件
 */
function MatchHistoryCard({ matchHistory }) {
  return (
    <div className="match-history-card">
      <h3>📋 射击历史</h3>
      <div id="matchList">
        {matchHistory.length === 0 ? (
          <div className="no-history">暂无射击记录</div>
        ) : (
          matchHistory.map((match, index) => (
            <div key={match.id} className="match-item">
              <span className="match-number">#{matchHistory.length - index}</span>
              <span className="match-interval">
                {match.totalTime
                  ? `总时间：${match.timeSinceStart}ms`
                  : `+${match.timeSinceLastMatch}ms`
                }
              </span>
              <span className="match-time">{match.time}</span>
            </div>
          ))
        )}
      </div>
    </div>
  )
}

/**
 * 自定义模式页面组件
 */
function CustomModePage() {
  // 节点列表状态
  const [nodes, setNodes] = useState([])

  // 使用自定义模式 Hook
  const {
    executionState,
    currentNodeIndex,
    currentNodeType,
    countdown,
    elapsedTime,
    shotCount,
    shotHistory,
    parTimeRemaining,
    analyserRef,
    start,
    stop,
    isRunning,
    isPaused,
    isStopped,
    isCompleted,
    isIdle
  } = useCustomMode(nodes, {
    defaultThreshold: 0.7,
    defaultBeepEnabled: true,
    onNodeStart: (data) => {
      console.log('节点开始:', data)
    },
    onNodeComplete: (data) => {
      console.log('节点完成:', data)
    },
    onSequenceComplete: (data) => {
      console.log('序列完成:', data)
    }
  })

  const canvasRef = useRef(null)
  const visualizerFrameRef = useRef(null)

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

  // 可视化循环
  useEffect(() => {
    if (isRunning && analyserRef.current) {
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
  }, [isRunning, analyserRef, drawFrequencyData])

  // 获取当前状态信息
  const getStatusInfo = () => {
    if (isIdle) {
      return { indicator: 'ready', text: '准备就绪 - 请添加节点并开始' }
    }

    if (isCompleted) {
      return { indicator: 'ready', text: '序列完成' }
    }

    if (isPaused) {
      return { indicator: 'waiting', text: '已暂停' }
    }

    if (isStopped) {
      return { indicator: 'ready', text: '已停止' }
    }

    // 运行中
    const currentNode = nodes[currentNodeIndex]
    if (currentNode) {
      const nodeName = getNodeDisplayName(currentNode.type)
      const icon = getNodeIcon(currentNode.type)

      switch (currentNodeType) {
        case CurrentNodeType.RANDOM_DELAY:
        case CurrentNodeType.FIXED_DELAY:
          return {
            indicator: 'waiting',
            text: `${icon} ${nodeName} - 剩余 ${countdown?.toFixed(1)}s`
          }
        case CurrentNodeType.WAIT_FOR_SHOT:
          return {
            indicator: 'listening',
            text: `${icon} ${nodeName} - 已等待 ${(elapsedTime / 1000).toFixed(1)}s`
          }
        case CurrentNodeType.PAR_TIME:
          return {
            indicator: 'timing',
            text: `${icon} ${nodeName} - Par Time 剩余 ${parTimeRemaining}ms`
          }
        case CurrentNodeType.BEEP:
          return {
            indicator: 'timing',
            text: `${icon} ${nodeName} - 播放中...`
          }
        case CurrentNodeType.RESTART_DELAY:
          return {
            indicator: 'waiting',
            text: `${icon} 等待重启 - 剩余 ${countdown?.toFixed(1)}s`
          }
        default:
          return {
            indicator: 'timing',
            text: `${icon} ${nodeName} - 执行中...`
          }
      }
    }

    return { indicator: 'timing', text: '执行中...' }
  }

  const statusInfo = getStatusInfo()

  // 格式化时间
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

  // 获取当前节点信息
  const getCurrentNodeInfo = () => {
    if (currentNodeIndex < 0 || currentNodeIndex >= nodes.length) return null
    return nodes[currentNodeIndex]
  }

  const currentNode = getCurrentNodeInfo()

  return (
    <div className="custom-mode-page">
      <div className="custom-mode-layout">
        <div className="container">
          <h1>🎯 自定义模式</h1>
          <p className="subtitle">编程式自定义枪声监测流程</p>

          <StatusBar indicator={statusInfo.indicator} text={statusInfo.text} />

          {/* 计时器显示 */}
          <div className="timer-display-card">
            <span className="timer-label">计时</span>
            <span className="timer-value">{formatTime(elapsedTime)}</span>
            {parTimeRemaining !== null && (
              <span className="par-time-remaining">Par Time: {parTimeRemaining}ms</span>
            )}
          </div>

          {/* 当前节点进度 */}
          {currentNode && (isRunning || isPaused) && (
            <div className="current-node-card">
              <span className="node-progress-label">当前节点</span>
              <div className="node-progress-info">
                <span className="node-icon">{getNodeIcon(currentNode.type)}</span>
                <span className="node-name">{getNodeDisplayName(currentNode.type)}</span>
                <span className="node-index">({currentNodeIndex + 1} / {nodes.length})</span>
              </div>
            </div>
          )}

          {/* 控制按钮 */}
          <div className="controls">
            {(isIdle || isCompleted || isStopped) && (
              <ControlButton
                onClick={start}
                variant="primary"
                icon="▶️"
                label="开始执行"
                disabled={nodes.length === 0}
              />
            )}

            {isRunning && (
              <ControlButton
                onClick={stop}
                variant="danger"
                icon="⏹️"
                label="停止"
              />
            )}

            {isPaused && (
              <>
                <ControlButton
                  onClick={start}
                  variant="primary"
                  icon="▶️"
                  label="继续"
                />
                <ControlButton
                  onClick={stop}
                  variant="danger"
                  icon="⏹️"
                  label="停止"
                />
              </>
            )}
          </div>

          <Visualizer canvasRef={canvasRef} />

          <StatsGrid matchCount={shotCount} currentMatch={elapsedTime} />
        </div>

        <MatchHistoryCard matchHistory={shotHistory} />

        {/* 自定义模式编辑器 */}
        <div className="editor-section">
          <CustomModeEditor
            nodes={nodes}
            onNodesChange={setNodes}
            disabled={isRunning || isPaused}
          />
        </div>
      </div>
    </div>
  )
}

export default CustomModePage
