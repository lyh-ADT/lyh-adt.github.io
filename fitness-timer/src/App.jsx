import { useState, useEffect } from 'react'
import './App.css'

function App() {
  // 从localStorage加载数据
  const loadData = () => {
    const saved = localStorage.getItem('workoutData')
    return saved ? JSON.parse(saved) : []
  }

  const [workoutHistory, setWorkoutHistory] = useState(loadData())
  const [currentSets, setCurrentSets] = useState(0)
  const [currentRestTimes, setCurrentRestTimes] = useState([])
  const [restTime, setRestTime] = useState(0)
  const [isResting, setIsResting] = useState(false)
  const [restStartTime, setRestStartTime] = useState(null)
  const [isDrawerOpen, setIsDrawerOpen] = useState(false)

  // 保存数据到localStorage
  useEffect(() => {
    localStorage.setItem('workoutData', JSON.stringify(workoutHistory))
  }, [workoutHistory])

  // 休息计时器 - 使用时间戳确保切换到后台也能正确计时
  useEffect(() => {
    let timer
    if (isResting && restStartTime) {
      const updateRestTime = () => {
        const elapsed = Math.floor((Date.now() - restStartTime) / 1000)
        setRestTime(elapsed)
      }

      // 立即更新一次
      updateRestTime()

      // 每秒更新
      timer = setInterval(updateRestTime, 1000)
    }
    return () => clearInterval(timer)
  }, [isResting, restStartTime])

  // 添加一组 - 自动开始休息
  const addSet = () => {
    setCurrentSets(prev => prev + 1)
    // 自动开始休息计时
    startRest()
  }

  // 开始休息
  const startRest = () => {
    setRestStartTime(Date.now())
    setRestTime(0)
    setIsResting(true)
  }

  // 停止休息并记录时长
  const stopRest = () => {
    if (isResting && restTime > 0) {
      // 添加到当前训练的休息时长数组
      setCurrentRestTimes(prev => [...prev, restTime])
    }
    setIsResting(false)
    setRestStartTime(null)
    setRestTime(0)
  }

  // 完成本次训练
  const finishWorkout = () => {
    if (currentSets > 0) {
      // 如果正在休息，先停止并记录
      if (isResting && restTime > 0) {
        setCurrentRestTimes(prev => {
          const newRestTimes = [...prev, restTime]
          // 保存训练记录
          const workout = {
            id: Date.now(),
            sets: currentSets,
            restTimes: newRestTimes,
            date: new Date().toLocaleString('zh-CN')
          }
          setWorkoutHistory(prev => [workout, ...prev])
          return []
        })
      } else {
        // 保存训练记录
        const workout = {
          id: Date.now(),
          sets: currentSets,
          restTimes: currentRestTimes,
          date: new Date().toLocaleString('zh-CN')
        }
        setWorkoutHistory(prev => [workout, ...prev])
        setCurrentRestTimes([])
      }

      setCurrentSets(0)
      setIsResting(false)
      setRestStartTime(null)
      setRestTime(0)
    }
  }

  // 删除训练记录
  const deleteWorkout = (id) => {
    setWorkoutHistory(prev => prev.filter(w => w.id !== id))
  }

  // 清空所有记录
  const clearAll = () => {
    if (window.confirm('确定要清空所有记录吗？')) {
      setWorkoutHistory([])
    }
  }

  // 切换抽屉
  const toggleDrawer = (event) => {
    setIsDrawerOpen(prev => !prev)
    event.stopPropagation()
  }

  const closeDrawer = () => {
    setIsDrawerOpen(false);
  }

  // 格式化时间显示
  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  return (
    <div className="app" onClick={closeDrawer}>
      <div className="container">
        <div className="main-content">
          {/* 当前训练 */}
          <section className="current-workout">
            <div className="sets-counter">
              <div className="sets-label">当前组数</div>
              <div className="sets-display">{currentSets}</div>
              <button onClick={addSet} className="btn btn-primary btn-large">
                完成一组
              </button>
            </div>

            {/* 休息计时器 */}
            {isResting && (
              <div className="rest-timer">
                <div className="rest-label">组间休息中</div>
                <div className="timer-display">{formatTime(restTime)}</div>
                <button onClick={stopRest} className="btn btn-secondary btn-large">
                  停止休息
                </button>
              </div>
            )}

            <button
              onClick={finishWorkout}
              className="btn btn-success btn-large"
              disabled={currentSets === 0}
            >
              完成训练
            </button>
          </section>

          {/* 当前训练的休息记录预览 */}
          {currentRestTimes.length > 0 && (
            <div className="current-rests">
              <div className="current-rests-label">本次休息记录</div>
              <div className="current-rests-list">
                {currentRestTimes.map((time, index) => (
                  <span key={index} className="rest-chip">
                    {formatTime(time)}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* 抽屉触发按钮 - 固定在底部 */}
      <button onClick={toggleDrawer} className="drawer-trigger">
        <span>训练历史</span>
        <span className={`drawer-icon ${isDrawerOpen ? 'open' : ''}`}>▲</span>
      </button>

      {/* 抽屉 */}
      <div className={`drawer ${isDrawerOpen ? 'open' : ''}`} onClick={(event) => event.stopPropagation()}>
        <div className="drawer-content">
          <div className="drawer-header">
            <div className="drawer-title">训练历史</div>
            {workoutHistory.length > 0 && (
              <button onClick={clearAll} className="btn-text">
                清空
              </button>
            )}
          </div>

          {workoutHistory.length === 0 ? (
            <div className="empty-message">暂无记录</div>
          ) : (
            <div className="workout-list">
              {workoutHistory.map(workout => (
                <div key={workout.id} className="workout-item">
                  <div className="workout-info">
                    <div className="workout-header">
                      <span className="workout-sets">{workout.sets} 组</span>
                      <span className="workout-date">{workout.date}</span>
                    </div>
                    {workout.restTimes?.length > 0 && (
                      <div className="workout-rests">
                        <span className="workout-rests-label">休息时长：</span>
                        {workout.restTimes.map((time, index) => (
                          <span key={index} className="rest-time">
                            {formatTime(time)}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                  <button
                    onClick={() => deleteWorkout(workout.id)}
                    className="btn-icon"
                    aria-label="删除"
                  >
                    ✕
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default App
