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
  const [orientation, setOrientation] = useState('horizontal')
  const [screenSize, setScreenSize] = useState({ width: window.innerWidth, height: window.innerHeight })
  const [showControls, setShowControls] = useState(true)

  // 根据屏幕方向自动切换直尺方向
  useEffect(() => {
    const handleResize = () => {
      const width = window.innerWidth
      const height = window.innerHeight
      setScreenSize({ width, height })
      setOrientation(width >= height ? 'horizontal' : 'vertical')
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
      {/* 顶部尺子 */}
      {orientation === 'horizontal' && (
        <Ruler
          position="top"
          unit={unit}
          dpi={dpi}
          opacity={opacity}
          screenWidth={screenSize.width}
        />
      )}
      
      {/* 左侧尺子 */}
      {orientation === 'vertical' && (
        <Ruler
          position="left"
          unit={unit}
          dpi={dpi}
          opacity={opacity}
          screenHeight={screenSize.height}
        />
      )}
      
      {/* 底部尺子 */}
      {orientation === 'horizontal' && (
        <Ruler
          position="bottom"
          unit={unit}
          dpi={dpi}
          opacity={opacity}
          screenWidth={screenSize.width}
        />
      )}
      
      {/* 右侧尺子 */}
      {orientation === 'vertical' && (
        <Ruler
          position="right"
          unit={unit}
          dpi={dpi}
          opacity={opacity}
          screenHeight={screenSize.height}
        />
      )}

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
            orientation={orientation}
            setOrientation={setOrientation}
            opacity={opacity}
            setOpacity={setOpacity}
            onCalibrate={() => setShowCalibration(true)}
          />
        )}
      </div>

      {/* 尺寸显示 */}
      <div className="measurement-display">
        {screenSize.width} × {screenSize.height} px | {orientation === 'horizontal' ? screenSize.width : screenSize.height} px = {
          Math.round((orientation === 'horizontal' ? screenSize.width : screenSize.height) / (dpi / 2.54 * 10) * 10) / 10
        } {unit}
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
