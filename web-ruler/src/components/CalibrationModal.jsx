import { useState } from 'react'
import './CalibrationModal.css'

const REFERENCE_CARDS = [
  { name: '银行卡/信用卡', width: 8.56, unit: 'cm' },
  { name: '身份证', width: 8.56, unit: 'cm' },
  { name: 'SIM 卡', width: 2.5, unit: 'cm' },
  { name: '一元硬币', width: 2.5, unit: 'cm' },
]

function CalibrationModal({ currentDpi, onSave, onClose }) {
  const [customWidth, setCustomWidth] = useState('')
  const [measuredPx, setMeasuredPx] = useState('')

  const calculateDpi = (widthCm, widthPx) => {
    return Math.round((widthPx / widthCm) * 2.54 * 96 / 96)
  }

  const handleQuickCalibrate = (card) => {
    const px = prompt(`请将${card.name}放在屏幕上，用标尺测量其宽度（像素）：`)
    if (px && !isNaN(Number(px))) {
      const newDpi = calculateDpi(card.width, Number(px))
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
            />
          </div>
          <div className="input-row">
            <label>测量像素:</label>
            <input 
              type="number" 
              value={measuredPx}
              onChange={e => setMeasuredPx(e.target.value)}
              placeholder="如：380"
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
