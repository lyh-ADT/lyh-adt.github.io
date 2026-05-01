import { useState, useCallback, useEffect } from 'react'
import Ruler from './components/Ruler'
import Controls from './components/Controls'
import CalibrationModal from './components/CalibrationModal'
import './App.css'

const DEFAULT_DPI = 96

function App() {
  const [unit, setUnit] = useState('cm')
  const [dpi, setDpi] = useState(() => {
    const saved = localStorage.getItem('ruler-dpi')
    return saved ? Number(saved) : DEFAULT_DPI
  })
  const [showCalibration, setShowCalibration] = useState(false)
  const [opacity, setOpacity] = useState(0.9)
  const [screenSize, setScreenSize] = useState({ width: window.innerWidth, height: window.innerHeight })
  const [showControls, setShowControls] = useState(true)

  useEffect(() => {
    const handleResize = () => {
      setScreenSize({ width: window.innerWidth, height: window.innerHeight })
    }

    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  const saveDpi = useCallback((newDpi) => {
    setDpi(newDpi)
    localStorage.setItem('ruler-dpi', newDpi.toString())
    setShowCalibration(false)
  }, [])

  return (
    <div className="app">
      <Ruler
        unit={unit}
        dpi={dpi}
        opacity={opacity}
        screenWidth={screenSize.width}
        screenHeight={screenSize.height}
      />

      {/* 控制面板 - 底部中间，可折叠 */}
      <div className={`controls-container ${showControls ? 'expanded' : 'collapsed'}`}>
        <button
          className="controls-toggle"
          onClick={() => setShowControls(!showControls)}
        >
          {showControls ? '▼ 隐藏控制' : '▲ 显示控制'}
        </button>

        {showControls && (
          <Controls
            unit={unit}
            setUnit={setUnit}
            dpi={dpi}
            opacity={opacity}
            setOpacity={setOpacity}
            onCalibrate={() => setShowCalibration(true)}
          />
        )}
      </div>


      {showCalibration && (
        <CalibrationModal
          currentDpi={dpi}
          onSave={saveDpi}
          onClose={() => setShowCalibration(false)}
        />
      )}
    </div>
  )
}

export default App
