import { useState, useCallback, useEffect } from 'react'
import Ruler from './components/Ruler'
import Controls from './components/Controls'
import CalibrationModal from './components/CalibrationModal'
import { autoCalibrate, getSavedDpi } from './utils/autoCalibrate'
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
  const [calibrationStatus, setCalibrationStatus] = useState('checking')
  const [detectedInfo, setDetectedInfo] = useState(null)

  // Auto-calibrate on first load
  useEffect(() => {
    // Check if user already has a saved DPI
    const savedDpi = getSavedDpi()
    if (savedDpi) {
      // Already calibrated, skip auto-check
      setDpi(savedDpi)
      setCalibrationStatus('success-hidden')
      return
    }

    // Run auto-calibration
    const result = autoCalibrate()
    if (result.success) {
      setDpi(result.dpi)
      setCalibrationStatus('success')
      setDetectedInfo({
        dpi: result.dpi,
        layer: result.layer,
      })

      // Auto-hide success toast after 3s
      const timer = setTimeout(() => {
        setCalibrationStatus('success-hidden')
      }, 3000)
      return () => clearTimeout(timer)
    } else {
      // All layers failed, show manual calibration prompt
      setCalibrationStatus('manual')
    }
  }, [])

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
    setCalibrationStatus('success')
    setDetectedInfo({ dpi: newDpi, layer: 'manual' })

    // Auto-hide success toast after 3s
    const timer = setTimeout(() => {
      setCalibrationStatus('success-hidden')
    }, 3000)
    return () => clearTimeout(timer)
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

      {/* Auto Calibration Toast */}
      {calibrationStatus === 'checking' && (
        <div className="calibration-toast calibration-toast-checking">
          <span className="toast-icon">⏳</span>
          <span>正在自动校准 DPI...</span>
        </div>
      )}
      {calibrationStatus === 'success' && detectedInfo && (
        <div className="calibration-toast calibration-toast-success">
          <span className="toast-icon">✓</span>
          <span>
            自动校准成功: {detectedInfo.dpi} DPI
            ({detectedInfo.layer === 'screen-api' ? '屏幕 API' : '设备数据库'})
          </span>
          <button
            className="toast-skip"
            onClick={() => setCalibrationStatus('success-hidden')}
          >
            关闭
          </button>
        </div>
      )}

      {showCalibration && (
        <CalibrationModal
          currentDpi={dpi}
          onSave={saveDpi}
          onClose={() => setShowCalibration(false)}
          showWarning={calibrationStatus === 'manual'}
        />
      )}
    </div>
  )
}

export default App
