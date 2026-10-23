import { useState, useCallback, useRef, useEffect } from 'react'
import { useCue } from '../../hooks/useBeep'
import { useRandomDelay } from '../../hooks/useRandomDelay'
import { formatTime } from '../../utils/audioDetection'
import './RandomDelayBeep.css'

function RandomDelayBeep() {
  const [minDelay, setMinDelay] = useState(1)
  const [maxDelay, setMaxDelay] = useState(5)
  const [beepCount, setBeepCount] = useState(0)
  const [history, setHistory] = useState([])
  const [beepEnabled, setBeepEnabled] = useState(true)

  // Par Time 设置（毫秒）
  const [parTime, setParTime] = useState(30000)
  const [parTimeEnabled, setParTimeEnabled] = useState(false)
  const [parTimeRemaining, setParTimeRemaining] = useState(null)

  // 计时器状态
  const [isTiming, setIsTiming] = useState(false)
  const [elapsedTime, setElapsedTime] = useState(0)
  const [lastElapsedTime, setLastElapsedTime] = useState(null)

  const startTimeRef = useRef(0)
  const playStartBeepRef = useRef(null)
  const playParTimeBeepRef = useRef(null)
  const parTimeFiredRef = useRef(false)

  const playStandbyBeep = useCue(beepEnabled, 'standby')
  const playStartBeep = useCue(beepEnabled, 'start')
  const playParTimeBeep = useCue(beepEnabled, 'parTime')

  useEffect(() => {
    playStartBeepRef.current = playStartBeep
  }, [playStartBeep])

  useEffect(() => {
    playParTimeBeepRef.current = playParTimeBeep
  }, [playParTimeBeep])

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
      playStartBeepRef.current?.()
      setBeepCount(prev => prev + 1)
      setIsTiming(true)
      startTimeRef.current = Date.now()
      setElapsedTime(0)
      setLastElapsedTime(null)
      setParTimeRemaining(parTimeEnabled ? parTime : null)
      parTimeFiredRef.current = false
    }
  })

  // 单一 rAF 循环同时更新普通计时和 Par Time，避免每次渲染重启多个循环。
  useEffect(() => {
    if (!isTiming) return undefined

    let frameId = null

    const tick = () => {
      const now = Date.now()
      const elapsed = now - startTimeRef.current
      setElapsedTime(elapsed)

      if (parTimeEnabled && parTime > 0) {
        const remaining = Math.max(0, parTime - elapsed)
        setParTimeRemaining(remaining)

        if (remaining <= 0 && !parTimeFiredRef.current) {
          parTimeFiredRef.current = true
          playParTimeBeepRef.current?.()

          setHistory(prev => [{
            time: new Date().toLocaleTimeString(),
            delay: delayMs / 1000,
            elapsed,
            id: Date.now(),
            timeout: true
          }, ...prev.slice(0, 19)])

          setLastElapsedTime(elapsed)
          setIsTiming(false)
          setElapsedTime(0)
          setParTimeRemaining(null)
          return
        }
      } else {
        setParTimeRemaining(null)
      }

      frameId = requestAnimationFrame(tick)
    }

    tick()

    return () => {
      if (frameId) cancelAnimationFrame(frameId)
    }
  }, [isTiming, parTimeEnabled, parTime, delayMs])

  const handleStart = useCallback(() => {
    if (minDelay >= maxDelay) {
      alert('最小延迟必须小于最大延迟')
      return
    }

    setLastElapsedTime(null)
    setParTimeRemaining(parTimeEnabled ? parTime : null)
    parTimeFiredRef.current = false
    playStandbyBeep()
    startDelay()
  }, [minDelay, maxDelay, parTimeEnabled, parTime, playStandbyBeep, startDelay])

  const handleCancel = useCallback(() => {
    cancelDelay()
    setParTimeRemaining(null)
  }, [cancelDelay])

  const handleStop = useCallback(() => {
    const finalTime = Math.max(0, Date.now() - startTimeRef.current)

    setHistory(prev => [{
      time: new Date().toLocaleTimeString(),
      delay: delayMs / 1000,
      elapsed: finalTime,
      id: Date.now()
    }, ...prev.slice(0, 19)])

    setLastElapsedTime(finalTime)
    setIsTiming(false)
    setElapsedTime(0)
    setParTimeRemaining(null)
    parTimeFiredRef.current = false
  }, [delayMs])

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
                {parTimeEnabled && parTimeRemaining !== null && (
                  <span className="status-countdown">Par Time: {parTimeRemaining}ms</span>
                )}
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

          <div className="setting-item">
            <label htmlFor="parTimeToggle">启用 Par Time</label>
            <input
              id="parTimeToggle"
              type="checkbox"
              checked={parTimeEnabled}
              onChange={(e) => setParTimeEnabled(e.target.checked)}
              disabled={isWaiting || isTiming}
            />
          </div>

          <div className="setting-item">
            <label htmlFor="parTime">Par Time（毫秒）</label>
            <input
              id="parTime"
              type="number"
              min="100"
              max="60000"
              step="100"
              value={parTime}
              onChange={(e) => setParTime(Math.max(100, Math.min(60000, parseInt(e.target.value, 10) || parTime)))}
              disabled={isWaiting || isTiming || !parTimeEnabled}
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
            {parTimeEnabled && (
              <div className="stat-item">
                <span className="stat-label">Par Time</span>
                <span className="stat-value">{parTime}ms</span>
              </div>
            )}
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
