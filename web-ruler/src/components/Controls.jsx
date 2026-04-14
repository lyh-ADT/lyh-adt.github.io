import './Controls.css'

function Controls({ unit, setUnit, dpi, orientation, setOrientation, opacity, setOpacity, onCalibrate }) {
  return (
    <div className="controls">
      <div className="control-section">
        <span className="control-label">单位:</span>
        <div className="btn-group">
          <button className={unit === 'cm' ? 'active' : ''} onClick={() => setUnit('cm')}>cm</button>
          <button className={unit === 'inch' ? 'active' : ''} onClick={() => setUnit('inch')}>inch</button>
          <button className={unit === 'px' ? 'active' : ''} onClick={() => setUnit('px')}>px</button>
        </div>
      </div>

      <div className="control-section">
        <span className="control-label">方向:</span>
        <div className="btn-group">
          <button className={orientation === 'horizontal' ? 'active' : ''} onClick={() => setOrientation('horizontal')}>横</button>
          <button className={orientation === 'vertical' ? 'active' : ''} onClick={() => setOrientation('vertical')}>竖</button>
        </div>
      </div>

      <div className="control-section">
        <span className="control-label">DPI:</span>
        <span className="control-value">{dpi}</span>
        <button className="btn-small" onClick={onCalibrate}>校准</button>
      </div>

      <div className="control-section">
        <span className="control-label">透明度:</span>
        <input
          type="range"
          min="0.3"
          max="1"
          step="0.1"
          value={opacity}
          onChange={(e) => setOpacity(Number(e.target.value))}
          className="slider"
        />
        <span className="control-value">{Math.round(opacity * 100)}%</span>
      </div>
    </div>
  )
}

export default Controls
