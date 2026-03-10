import { useState, useCallback, useRef, useEffect } from 'react'
import { useBeep } from '../../hooks/useBeep'
import { useRandomDelay } from '../../hooks/useRandomDelay'
import './RandomDelayBeep.css'

// 格式化时间为 HH:MM:SS.sss
function formatTime(ms) {
  const totalSeconds = Math.floor(ms / 1000)
  const hours = Math.floor(totalSeconds / 3600)
  const minutes = Math.floor((totalSeconds % 3600) / 60)
  const seconds = totalSeconds % 60
  const milliseconds = ms % 1000

  const pad = (num, len = 2) => String(num).padStart(len, '0')

  return `${pad(hours)}:${pad(minutes)}:${pad(seconds)}.${pad(milliseconds, 3)}`
}

function RandomDelayBeep() {
  const [minDelay, setMinDelay] = useState(1)
  const [maxDelay, setMaxDelay] = useState(5)
  const [beepCount, setBeepCount] = useState(0)
  const [history, setHistory] = useState([])
  const [beepEnabled, setBeepEnabled] = useState(true)

  // 计时器状态
  const [isTiming, setIsTiming] = useState(false)
  const [elapsedTime, setElapsedTime] = useState(0)
  const [lastElapsedTime, setLastElapsedTime] = useState(null)

  const timerRef = useRef(null)
  const startTimeRef = useRef(0)

  // 使用蜂鸣器 Hook
  const playBeep = useBeep(beepEnabled)

  // 使用随机延迟 Hook
  const {
    isWaiting,
    countdown,
    delayMs,
    startDelay,
    cancelDelay
  } = useRandomDelay({
    minDelay: minDelay * 1000,
    maxDelay: maxDelay * 1000,
    onComplete: () => {
      // 随机延迟完成，播放 Beep 并开始计时
      playBeep()
      setBeepCount(prev => prev + 1)
      setIsTiming(true)
      startTimeRef.current = Date.now()
      setElapsedTime(0)
    }
  })

  // 计时器更新
  useEffect(() => {
    if (isTiming) {
      timerRef.current = requestAnimationFrame(() => {
        setElapsedTime(Date.now() - startTimeRef.current)
      })
    }

    return () => {
      if (timerRef.current) {
        cancelAnimationFrame(timerRef.current)
      }
    }
  }, [isTiming, elapsedTime])

  // 处理开始
  const handleStart = useCallback(() => {
    if (minDelay >= maxDelay) {
      alert('最小延迟必须小于最大延迟')
      return
    }
    // 开始时清除上次的计时结果
    setLastElapsedTime(null)
    startDelay()
  }, [minDelay, maxDelay, startDelay])

  // 处理取消（等待阶段）
  const handleCancel = useCallback(() => {
    cancelDelay()
  }, [cancelDelay])

  // 处理停止（计时阶段）
  const handleStop = useCallback(() => {
    const finalTime = elapsedTime
    const now = new Date()
    const timeStr = now.toLocaleTimeString()

    // 添加到历史记录
    setHistory(prev => [{
      time: timeStr,
      delay: delayMs / 1000,
      elapsed: finalTime,
      id: Date.now()
    }, ...prev.slice(0, 19)])

    setLastElapsedTime(finalTime)
    setIsTiming(false)
    setElapsedTime(0)

    if (timerRef.current) {
      cancelAnimationFrame(timerRef.current)
    }
  }, [elapsedTime, delayMs])

  return (
    <div className="random-delay-beep-page">
      <div className="random-delay-beep-layout">
        <div className="container">
          <h1>🎲 随机 Beep 计时器</h1>
          <p className="subtitle">随机延迟后发出提示音并开始计时</p>

          {/* 状态显示 */}
          <div className={`status-bar status-card ${
            isWaiting ? 'waiting' : isTiming ? 'timing' : 'idle'
          }`}>
            {isWaiting ? (
              <>
                <span className="status-indicator waiting-icon">⏳</span>
                <span className="status-text">等待中... 剩余 {countdown.toFixed(1)} 秒</span>
              </>
            ) : isTiming ? (
              <>
                <span className="status-indicator timing-icon">⏱️</span>
                <span className="status-text timer-display">{formatTime(elapsedTime)}</span>
              </>
            ) : lastElapsedTime !== null ? (
              <>
                <span className="status-indicator ready-icon">✓</span>
                <span className="status-text timer-display">{formatTime(lastElapsedTime)}</span>
              </>
            ) : (
              <>
                <span className="status-indicator ready-icon">✓</span>
                <span className="status-text">准备就绪</span>
              </>
            )}
          </div>

          {/* 控制按钮 */}
          <div className="controls">
            {!isWaiting && !isTiming && (
              <button
                className="btn btn-primary"
                onClick={handleStart}
              >
                <span className="btn-icon">🎲</span>
                <span>开始随机延迟</span>
              </button>
            )}

            {isWaiting && (
              <>
                <button
                  className="btn btn-primary disabled"
                  disabled
                >
                  <span className="btn-icon">⏳</span>
                  <span>延时中...</span>
                </button>
                <button
                  className="btn btn-danger"
                  onClick={handleCancel}
                >
                  <span className="btn-icon">⏹️</span>
                  <span>取消</span>
                </button>
              </>
            )}

            {isTiming && (
              <button
                className="btn btn-danger"
                onClick={handleStop}
              >
                <span className="btn-icon">⏹️</span>
                <span>停止计时</span>
              </button>
            )}
          </div>
        </div>

        {/* 设置卡片 */}
        <div className="settings-card">
          <h2>⚙️ 设置</h2>

          <div className="setting-item">
            <label htmlFor="minDelay">最小延迟（秒）</label>
            <input
              id="minDelay"
              type="number"
              min="0.1"
              max="10"
              step="0.1"
              value={minDelay}
              onChange={(e) => setMinDelay(parseFloat(e.target.value) || 0.1)}
              disabled={isWaiting || isTiming}
            />
          </div>

          <div className="setting-item">
            <label htmlFor="maxDelay">最大延迟（秒）</label>
            <input
              id="maxDelay"
              type="number"
              min="0.1"
              max="10"
              step="0.1"
              value={maxDelay}
              onChange={(e) => setMaxDelay(parseFloat(e.target.value) || 10)}
              disabled={isWaiting || isTiming}
            />
          </div>

          <div className="setting-item">
            <label htmlFor="beepToggle">启用提示音</label>
            <input
              id="beepToggle"
              type="checkbox"
              checked={beepEnabled}
              onChange={(e) => setBeepEnabled(e.target.checked)}
              disabled={isWaiting || isTiming}
            />
          </div>
        </div>

        {/* 统计 */}
        <div className="stats-card">
          <div className="stats-grid">
            <div className="stat-item">
              <span className="stat-label">Beep 次数</span>
              <span className="stat-value">{beepCount}</span>
            </div>
            <div className="stat-item">
              <span className="stat-label">当前延迟范围</span>
              <span className="stat-value">{minDelay}s - {maxDelay}s</span>
            </div>
          </div>
        </div>

        {/* 历史记录 */}
        {history.length > 0 && (
          <div className="history-card">
            <h2>📋 历史记录</h2>
            <div className="history-list">
              {history.map((item) => (
                <div key={item.id} className="history-item">
                  <span className="history-time">{item.time}</span>
                  <span className="history-delay">
                    {formatTime(item.elapsed)}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default RandomDelayBeep
