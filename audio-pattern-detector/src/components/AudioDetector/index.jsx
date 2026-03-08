import React from 'react'

/**
 * 状态栏组件
 */
export function StatusBar({ indicator, text }) {
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
export function ControlButton({ onClick, disabled, variant, icon, label }) {
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
export function Visualizer({ canvasRef }) {
  return (
    <div className="visualizer">
      <canvas ref={canvasRef} id="audioCanvas"></canvas>
    </div>
  )
}

/**
 * 统计卡片组件
 */
export function StatsGrid({ matchCount, currentMatch }) {
  return (
    <div className="stats-grid">
      <div className="stat-card">
        <div className="stat-value">{matchCount}</div>
        <div className="stat-label">匹配次数</div>
      </div>
      <div className="stat-card">
        <div className="stat-value">{currentMatch}</div>
        <div className="stat-label">当前匹配度</div>
      </div>
    </div>
  )
}

/**
 * 检测历史组件
 */
export function MatchHistoryCard({ matchHistory }) {
  return (
    <div className="match-history-card">
      <h3>📋 检测历史</h3>
      <div id="matchList">
        {matchHistory.length === 0 ? (
          <div>暂无匹配记录</div>
        ) : (
          matchHistory.map((match) => (
            <div key={match.id} className="match-item">
              <span className="match-interval">+{match.timeSinceLastMatch}ms</span>
              <span className="match-score">{(match.score * 100).toFixed(0)}%</span>
              <span className="match-time">{match.time} (累计：{match.timeSinceStart}ms)</span>
            </div>
          ))
        )}
      </div>
    </div>
  )
}

/**
 * 设置项组件
 */
export function SettingRow({ label, children }) {
  return (
    <div className="setting-row">
      <span className="setting-label">{label}</span>
      {children}
    </div>
  )
}

/**
 * 数字输入设置
 */
export function NumberSetting({ value, onChange, min, max, unit }) {
  return (
    <>
      <input
        type="number"
        className="setting-input"
        value={value}
        onChange={(e) => onChange(Math.max(min, Math.min(max, parseInt(e.target.value) || value)))}
        min={min}
        max={max}
      />
      {unit && <span className="setting-label">{unit}</span>}
    </>
  )
}

/**
 * 滑块设置
 */
export function SliderSetting({ value, onChange, min, max, step = 1, formatValue }) {
  return (
    <>
      <input
        type="range"
        className="threshold-slider"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
      <span className="setting-label">{formatValue ? formatValue(value) : value}</span>
    </>
  )
}

/**
 * 开关设置
 */
export function ToggleSetting({ checked, onChange, labels }) {
  return (
    <label className="toggle-switch">
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
      />
      <span className="toggle-slider"></span>
      <span className="toggle-label">{checked ? labels[0] : labels[1]}</span>
    </label>
  )
}

/**
 * 设置卡片组件
 */
export function SettingsCard({
  recordDuration,
  setRecordDuration,
  threshold,
  setThreshold,
  beepEnabled,
  setBeepEnabled,
  autoRestartLimit,
  setAutoRestartLimit
}) {
  return (
    <div className="settings-card">
      <h3>⚙️ 设置</h3>
      <div className="settings">
        <SettingRow label="录制时长 (秒)">
          <NumberSetting
            value={recordDuration}
            onChange={setRecordDuration}
            min={1}
            max={10}
          />
        </SettingRow>

        <SettingRow label="检测阈值">
          <SliderSetting
            value={threshold * 100}
            onChange={(v) => setThreshold(v / 100)}
            min={0}
            max={100}
            formatValue={(v) => (v / 100).toFixed(2)}
          />
        </SettingRow>

        <SettingRow label="蜂鸣器提示音">
          <ToggleSetting
            checked={beepEnabled}
            onChange={setBeepEnabled}
            labels={['开', '关']}
          />
        </SettingRow>

        <SettingRow label="自动重启次数上限">
          <NumberSetting
            value={autoRestartLimit}
            onChange={setAutoRestartLimit}
            min={1}
            max={100}
            unit="次"
          />
        </SettingRow>
      </div>
    </div>
  )
}
