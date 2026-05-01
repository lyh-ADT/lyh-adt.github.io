import { useState } from 'react'
import './CalibrationModal.css'

const REFERENCE_CARDS = [
  { name: '银行卡/信用卡', width: 8.56, unit: 'cm' },
  { name: '身份证', width: 8.56, unit: 'cm' },
  { name: 'SIM 卡', width: 2.5, unit: 'cm' },
  { name: '一元硬币', width: 2.5, unit: 'cm' },
]

const CM_PER_INCH = 2.54

function CalibrationModal({ currentDpi, onSave, onClose, showWarning = false }) {
  const [customWidth, setCustomWidth] = useState('')
  const [measuredPx, setMeasuredPx] = useState('')

  const calculateDpi = (widthCm, widthPx) => {
    return Math.round((widthPx / widthCm) * CM_PER_INCH)
  }

  const handleQuickCalibrate = (card) => {
    const px = prompt(`请将${card.name}放在屏幕上，用标尺测量其宽度（像素）：`)
    const pxNum = Number(px)
    if (px && !isNaN(pxNum) && pxNum > 0) {
      const newDpi = calculateDpi(card.width, pxNum)
      onSave(newDpi)
    }
  }

  const handleCustomCalibrate = () => {
    if (customWidth && measuredPx) {
      const newDpi = calculateDpi(Number(customWidth), Number(measuredPx))
      onSave(newDpi)
    }
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()}>
        <h2>屏幕校准</h2>
        <p className="modal-hint">
          当前 DPI: <strong>{currentDpi}</strong>
        </p>

        {showWarning && (
          <div className="calibration-warning">
            <span className="warning-icon">&#9888;</span>
            <div className="warning-content">
              <p>自动校准未能检测到您的屏幕信息，请手动校准以获得准确的标尺尺寸。</p>
              <p className="browser-hint">部分浏览器出于隐私考虑不暴露屏幕信息，建议使用 Chrome 浏览器以启用自动校准。</p>
            </div>
          </div>
        )}

        <div className="calibrate-section">
          <h3>快速校准</h3>
          <p>选择参照物，输入测量的像素值：</p>
          <div className="card-list">
            {REFERENCE_CARDS.map(card => (
              <button 
                key={card.name}
                className="card-btn"
                onClick={() => handleQuickCalibrate(card)}
              >
                {card.name} ({card.width}{card.unit})
              </button>
            ))}
          </div>
        </div>

        <div className="calibrate-section">
          <h3>自定义校准</h3>
          <div className="input-row">
            <label>实际宽度 (cm):</label>
            <input
              type="number"
              value={customWidth}
              onChange={e => setCustomWidth(e.target.value)}
              placeholder="如：10"
              min="0.1"
              step="any"
            />
          </div>
          <div className="input-row">
            <label>测量像素:</label>
            <input
              type="number"
              value={measuredPx}
              onChange={e => setMeasuredPx(e.target.value)}
              placeholder="如：380"
              min="0.1"
              step="any"
            />
          </div>
          <button 
            className="btn-calibrate"
            onClick={handleCustomCalibrate}
            disabled={!customWidth || !measuredPx}
          >
            计算并保存
          </button>
        </div>

        <button className="btn-close" onClick={onClose}>
          取消
        </button>
      </div>
    </div>
  )
}

export default CalibrationModal
