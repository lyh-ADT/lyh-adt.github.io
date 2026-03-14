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
        <div className="stat-label">射击次数</div>
      </div>
      <div className="stat-card">
        <div className="stat-value">{currentMatch === 0 ? '--' : `${currentMatch}`}</div>
        <div className="stat-label">上次间隔 (ms)</div>
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
      <h3>📋 射击历史</h3>
      <div id="matchList">
        {matchHistory.length === 0 ? (
          <div>暂无射击记录</div>
        ) : (
          matchHistory.map((match, index) => (
            <div key={match.id} className="match-item">
              <span className="match-number">#{matchHistory.length - index}</span>
              <span className="match-interval">
                {match.totalTime
                  ? `总时间：${match.timeSinceStart}ms`
                  : `+${match.timeSinceLastMatch}ms`
                }
              </span>
              <span className="match-time">{match.time}</span>
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
export function NumberSetting({ value, onChange, min, max, unit, isInteger, disabled }) {
  return (
    <>
      <input
        type="number"
        className="setting-input"
        value={value}
        onChange={(e) => {
          const val = parseFloat(e.target.value) || value
          const clamped = Math.max(0, val)
          if (isInteger) {
            onChange(Math.floor(clamped))
          } else {
            onChange(clamped)
          }
        }}
        min={0}
        step={isInteger ? "1" : "0.1"}
        disabled={disabled}
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
export function ToggleSetting({ checked, onChecked, labels }) {
  return (
    <label className="toggle-switch">
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChecked(e.target.checked)}
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
  minDelay,
  setMinDelay,
  maxDelay,
  setMaxDelay,
  threshold,
  setThreshold,
  beepEnabled,
  setBeepEnabled,
  shotBeepEnabled,
  setShotBeepEnabled,
  autoRestartEnabled,
  setAutoRestartEnabled,
  autoRestartLimit,
  setAutoRestartLimit,
  parTimeEnabled,
  setParTimeEnabled,
  parTime,
  setParTime
}) {
  return (
    <div className="settings-card">
      <h3>⚙️ 设置</h3>
      <div className="settings">
        <SettingRow label="最小延迟（秒）">
          <NumberSetting
            value={minDelay}
            onChange={setMinDelay}
            min={0.1}
          />
        </SettingRow>

        <SettingRow label="最大延迟（秒）">
          <NumberSetting
            value={maxDelay}
            onChange={setMaxDelay}
            min={0.1}
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

        <SettingRow label="启动提示音">
          <ToggleSetting
            checked={beepEnabled}
            onChecked={setBeepEnabled}
            labels={['开', '关']}
          />
        </SettingRow>

        <SettingRow label="枪声提示音">
          <ToggleSetting
            checked={shotBeepEnabled}
            onChecked={setShotBeepEnabled}
            labels={['开', '关']}
          />
        </SettingRow>

        <SettingRow label="自动重启">
          <ToggleSetting
            checked={autoRestartEnabled}
            onChecked={setAutoRestartEnabled}
            labels={['开', '关']}
          />
        </SettingRow>

        <SettingRow label="重启射击次数">
          <NumberSetting
            value={autoRestartLimit}
            onChange={setAutoRestartLimit}
            isInteger={true}
            unit="发"
            disabled={!autoRestartEnabled}
          />
        </SettingRow>

        <SettingRow label="启用 Par Time">
          <ToggleSetting
            checked={parTimeEnabled}
            onChecked={setParTimeEnabled}
            labels={['开', '关']}
          />
        </SettingRow>

        <SettingRow label="Par Time（毫秒）">
          <NumberSetting
            value={parTime}
            onChange={setParTime}
            isInteger={true}
            unit="ms"
            disabled={!parTimeEnabled}
          />
        </SettingRow>
      </div>
    </div>
  )
}
