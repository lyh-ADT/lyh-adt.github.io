# Auto Calibration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement three-layer automatic screen calibration system with manual fallback

**Architecture:** Layer 1 (Screen Details API) → Layer 2 (Device Database) → Layer 3 (Manual with warning). Auto-detect on first load, save DPI to localStorage, show appropriate UI state based on which layer succeeds.

**Tech Stack:** React 18, Vite, vanilla JavaScript for device detection, localStorage for persistence

---

## File Structure

**New Files:**
- `src/utils/autoCalibrate.js` - Auto calibration logic (Layer 1 + Layer 2 orchestration)
- `src/data/deviceDb.js` - Device size database with detection functions

**Modified Files:**
- `src/App.jsx` - Integrate auto calibration on mount, handle UI states
- `src/components/CalibrationModal.jsx` - Add warning banner for manual fallback
- `src/components/CalibrationModal.css` - Warning banner styles

**No new tests required** - This is a small utility feature; manual testing via browser is sufficient.

---

### Task 1: Device Database

**Files:**
- Create: `src/data/deviceDb.js`

- [ ] **Step 1: Create device database file**

```js
// Device database with screen specs (width px, height px, PPI)
export const DEVICE_DB = {
  // iPhone
  'iPhone 15 Pro Max': { width: 430, height: 932, ppi: 460 },
  'iPhone 15 Pro': { width: 393, height: 852, ppi: 460 },
  'iPhone 15 Plus': { width: 430, height: 932, ppi: 460 },
  'iPhone 15': { width: 393, height: 852, ppi: 460 },
  'iPhone 14 Pro Max': { width: 430, height: 932, ppi: 460 },
  'iPhone 14 Pro': { width: 393, height: 852, ppi: 460 },
  'iPhone 14 Plus': { width: 428, height: 926, ppi: 458 },
  'iPhone 14': { width: 390, height: 844, ppi: 460 },
  'iPhone 13 Pro Max': { width: 428, height: 926, ppi: 458 },
  'iPhone 13 Pro': { width: 390, height: 844, ppi: 460 },
  'iPhone 13': { width: 390, height: 844, ppi: 460 },
  'iPhone 13 Mini': { width: 375, height: 812, ppi: 476 },
  'iPhone 12 Pro Max': { width: 428, height: 926, ppi: 458 },
  'iPhone 12 Pro': { width: 390, height: 844, ppi: 460 },
  'iPhone 12': { width: 390, height: 844, ppi: 460 },
  'iPhone 12 Mini': { width: 375, height: 812, ppi: 476 },
  'iPhone SE': { width: 375, height: 667, ppi: 326 },
  'iPhone 11 Pro Max': { width: 414, height: 896, ppi: 458 },
  'iPhone 11 Pro': { width: 375, height: 812, ppi: 458 },
  'iPhone 11': { width: 414, height: 896, ppi: 326 },
  'iPhone Xs Max': { width: 414, height: 896, ppi: 458 },
  'iPhone Xs': { width: 375, height: 812, ppi: 458 },
  'iPhone Xr': { width: 414, height: 896, ppi: 326 },
  'iPhone X': { width: 375, height: 812, ppi: 458 },
  
  // iPad
  'iPad Pro 12.9': { width: 2048, height: 2732, ppi: 264 },
  'iPad Pro 11': { width: 1668, height: 2388, ppi: 264 },
  'iPad Pro 10.5': { width: 1668, height: 2224, ppi: 264 },
  'iPad Air': { width: 1640, height: 2360, ppi: 264 },
  'iPad Mini': { width: 1620, height: 2160, ppi: 326 },
  
  // Samsung Galaxy
  'Galaxy S24 Ultra': { width: 1440, height: 3120, ppi: 501 },
  'Galaxy S24+': { width: 1440, height: 3120, ppi: 493 },
  'Galaxy S24': { width: 1080, height: 2340, ppi: 493 },
  'Galaxy S23 Ultra': { width: 1440, height: 3088, ppi: 501 },
  'Galaxy S23+': { width: 1080, height: 2340, ppi: 493 },
  'Galaxy S23': { width: 1080, height: 2340, ppi: 493 },
  'Galaxy S22 Ultra': { width: 1440, height: 3088, ppi: 501 },
  'Galaxy S22': { width: 1080, height: 2340, ppi: 493 },
  'Galaxy Z Fold 5': { width: 1812, height: 2176, ppi: 374 },
  'Galaxy Z Flip 5': { width: 1080, height: 2640, ppi: 426 },
  
  // Google Pixel
  'Pixel 8 Pro': { width: 1344, height: 2992, ppi: 489 },
  'Pixel 8': { width: 1080, height: 2400, ppi: 428 },
  'Pixel 7 Pro': { width: 1440, height: 3120, ppi: 512 },
  'Pixel 7': { width: 1080, height: 2400, ppi: 416 },
  'Pixel 6 Pro': { width: 1440, height: 3120, ppi: 512 },
  'Pixel 6': { width: 1080, height: 2400, ppi: 411 },
  
  // Common Desktop Monitors (resolution, assumed size → PPI)
  '24inch 1080p': { width: 1920, height: 1080, ppi: 92 },
  '24inch 1440p': { width: 2560, height: 1440, ppi: 123 },
  '27inch 1080p': { width: 1920, height: 1080, ppi: 82 },
  '27inch 1440p': { width: 2560, height: 1440, ppi: 109 },
  '27inch 4K': { width: 3840, height: 2160, ppi: 163 },
  '32inch 4K': { width: 3840, height: 2160, ppi: 140 },
  '13inch 1080p': { width: 1920, height: 1080, ppi: 170 },
  '14inch 1080p': { width: 1920, height: 1080, ppi: 157 },
  '15inch 1080p': { width: 1920, height: 1080, ppi: 147 },
  '16inch 1440p': { width: 2560, height: 1600, ppi: 189 },
};

// Detect device from user agent
export function detectDevice() {
  const ua = navigator.userAgent;
  
  // iPhone detection
  const iphoneMatch = ua.match(/iPhone\s*([0-9]+)\s*(Pro\s*Max|Pro|Plus|Mini)?/i);
  if (iphoneMatch) {
    const model = `iPhone ${iphoneMatch[1]}${iphoneMatch[2] ? ' ' + iphoneMatch[2].trim() : ''}`;
    const device = findDevice(model);
    if (device) return device;
  }
  
  // iPad detection
  if (ua.includes('iPad')) {
    const ipadMatch = ua.match(/iPad\s*(Pro\s*([0-9.]+)?|Air|Mini)/i);
    if (ipadMatch) {
      const model = `iPad ${ipadMatch[1]}`;
      const device = findDevice(model);
      if (device) return device;
  }
  }
  
  // Android detection (Samsung)
  const samsungMatch = ua.match(/SM-([A-Za-z0-9]+)/);
  if (samsungMatch) {
    const modelCode = samsungMatch[1];
    // Map common Samsung model codes to names
    const samsungMap = {
      'S918': 'Galaxy S23 Ultra',
      'S916': 'Galaxy S23+',
      'S911': 'Galaxy S23',
      'S928': 'Galaxy S24 Ultra',
      'S926': 'Galaxy S24+',
      'S921': 'Galaxy S24',
      'F946': 'Galaxy Z Fold 5',
      'F731': 'Galaxy Z Flip 5',
    };
    if (samsungMap[modelCode]) {
      const device = findDevice(samsungMap[modelCode]);
      if (device) return device;
    }
  }
  
  // Pixel detection
  const pixelMatch = ua.match(/Pixel\s*([0-9]+)\s*(Pro)?/i);
  if (pixelMatch) {
    const model = `Pixel ${pixelMatch[1]}${pixelMatch[2] ? ' Pro' : ''}`;
    const device = findDevice(model);
    if (device) return device;
  }
  
  return null;
}

function findDevice(modelName) {
  const target = modelName.toUpperCase();
  for (const [name, specs] of Object.entries(DEVICE_DB)) {
    if (name.toUpperCase().includes(target) || target.includes(name.toUpperCase())) {
      return { name, specs };
    }
  }
  return null;
}
```

- [ ] **Step 2: Commit**

```bash
git add src/data/deviceDb.js
git commit -m "feat: add device database for auto calibration Layer 2"
```

---

### Task 2: Auto Calibration Utility

**Files:**
- Create: `src/utils/autoCalibrate.js`

- [ ] **Step 1: Create auto calibration utility**

```js
import { detectDevice } from '../data/deviceDb';

const STORAGE_KEY = 'ruler-dpi';

// Try to get DPI from Screen Details API (Layer 1)
export async function tryScreenDetailsApi() {
  try {
    // Method 1: Screen Details API (Chrome 114+)
    if (navigator.getScreenDetails) {
      const details = await navigator.getScreenDetails();
      // The API may provide physical dimensions
      if (details && details.screens && details.screens.length > 0) {
        const screen = details.screens[0];
        // Some implementations provide availWidth/availHeight in physical pixels
        // This is a best-effort approach
        console.log('[AutoCalibrate] Screen Details API available');
      }
    }
    
    // Method 2: Non-standard but widely supported properties
    if (window.screen.deviceXDPI) {
      const dpi = window.screen.deviceXDPI;
      console.log('[AutoCalibrate] Got DPI from deviceXDPI:', dpi);
      return dpi;
    }
    
    if (window.screen.logicalXDPI) {
      const dpi = window.screen.logicalXDPI;
      console.log('[AutoCalibrate] Got DPI from logicalXDPI:', dpi);
      return dpi;
    }
  } catch (e) {
    console.log('[AutoCalibrate] Screen Details API error:', e);
  }
  
  return null;
}

// Try to get DPI from device database (Layer 2)
export async function tryDeviceDatabase() {
  const device = detectDevice();
  if (device) {
    console.log('[AutoCalibrate] Device detected:', device.name, device.specs);
    return device.specs.ppi;
  }
  
  console.log('[AutoCalibrate] No device match found');
  return null;
}

// Save DPI to localStorage
export function saveDpi(dpi) {
  localStorage.setItem(STORAGE_KEY, dpi.toString());
  console.log('[AutoCalibrate] Saved DPI:', dpi);
}

// Get saved DPI from localStorage
export function getSavedDpi() {
  const saved = localStorage.getItem(STORAGE_KEY);
  return saved ? Number(saved) : null;
}

// Main calibration function - tries all layers
export async function autoCalibrate() {
  console.log('[AutoCalibrate] Starting auto calibration...');
  
  // Layer 1: Screen Details API
  const layer1Dpi = await tryScreenDetailsApi();
  if (layer1Dpi) {
    saveDpi(layer1Dpi);
    return { success: true, dpi: layer1Dpi, layer: 'Screen Details API' };
  }
  
  // Layer 2: Device Database
  const layer2Dpi = await tryDeviceDatabase();
  if (layer2Dpi) {
    saveDpi(layer2Dpi);
    return { success: true, dpi: layer2Dpi, layer: 'Device Database' };
  }
  
  // All layers failed
  return { success: false, layer: 'Manual Fallback' };
}
```

- [ ] **Step 2: Commit**

```bash
git add src/utils/autoCalibrate.js
git commit -m "feat: add auto calibration utility with 3-layer fallback"
```

---

### Task 3: Update App.jsx

**Files:**
- Modify: `src/App.jsx`

- [ ] **Step 1: Add auto calibration state and effect**

Read the current App.jsx first, then add:

```jsx
import { useState, useCallback, useEffect } from 'react'
import Ruler from './components/Ruler'
import Controls from './components/Controls'
import CalibrationModal from './components/CalibrationModal'
import { autoCalibrate, getSavedDpi } from './utils/autoCalibrate'
import './App.css'

const DEFAULT_DPI = 96

function App() {
  const [unit, setUnit] = useState('cm')
  const [dpi, setDpi] = useState(() => getSavedDpi() || DEFAULT_DPI)
  const [showCalibration, setShowCalibration] = useState(false)
  const [opacity, setOpacity] = useState(0.9)
  const [screenSize, setScreenSize] = useState({ width: window.innerWidth, height: window.innerHeight })
  const [showControls, setShowControls] = useState(true)
  const [calibrationStatus, setCalibrationStatus] = useState('checking') // 'checking' | 'success' | 'manual'
  const [detectedInfo, setDetectedInfo] = useState('')

  // Auto-calibrate on first load
  useEffect(() => {
    const runAutoCalibrate = async () => {
      const savedDpi = getSavedDpi();
      if (savedDpi) {
        // Already calibrated, skip auto-detect
        setCalibrationStatus('success');
        return;
      }
      
      // Show "checking" state briefly
      setCalibrationStatus('checking');
      
      // Try auto calibration
      const result = await autoCalibrate();
      
      if (result.success) {
        setDpi(result.dpi);
        setDetectedInfo(`${result.layer} - DPI: ${result.dpi}`);
        setCalibrationStatus('success');
        
        // Hide success message after 2 seconds
        setTimeout(() => {
          setCalibrationStatus('success-hidden');
        }, 2000);
      } else {
        // Show manual calibration modal with warning
        setCalibrationStatus('manual');
        setShowCalibration(true);
      }
    };
    
    runAutoCalibrate();
  }, []);

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
    setCalibrationStatus('success');
    setDetectedInfo('Manual calibration - DPI: ' + newDpi);
    
    setTimeout(() => {
      setCalibrationStatus('success-hidden');
    }, 2000);
  }, [])

  return (
    <div className="app">
      {/* Calibration Status Toast */}
      {calibrationStatus === 'checking' && (
        <div className="calibration-toast calibration-toast-checking">
          <span className="toast-icon">🔄</span>
          <span>正在自动检测屏幕尺寸...</span>
          <button 
            className="toast-skip"
            onClick={() => {
              setCalibrationStatus('manual');
              setShowCalibration(true);
            }}
          >
            跳过 →
          </button>
        </div>
      )}
      
      {calibrationStatus === 'success' && (
        <div className="calibration-toast calibration-toast-success">
          <span className="toast-icon">✓</span>
          <span>已自动校准 {detectedInfo && `(${detectedInfo})`}</span>
        </div>
      )}

      <Ruler
        unit={unit}
        dpi={dpi}
        opacity={opacity}
        screenWidth={screenSize.width}
        screenHeight={screenSize.height}
      />

      {/* Control Panel */}
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
          showWarning={calibrationStatus === 'manual'}
        />
      )}
    </div>
  )
}

export default App
```

- [ ] **Step 2: Add calibration toast styles to App.css**

Add to `src/App.css`:

```css
.calibration-toast {
  position: fixed;
  top: 20px;
  left: 50%;
  transform: translateX(-50%);
  padding: 12px 24px;
  background: #fff;
  border: 2px solid #000;
  border-radius: 8px;
  box-shadow: 0 4px 12px rgba(0,0,0,0.15);
  z-index: 2000;
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 14px;
  font-weight: 500;
  animation: slideDown 0.3s ease;
}

@keyframes slideDown {
  from {
    opacity: 0;
    transform: translateX(-50%) translateY(-20px);
  }
  to {
    opacity: 1;
    transform: translateX(-50%) translateY(0);
  }
}

.calibration-toast-checking {
  background: #fffbeb;
  border-color: #f59e0b;
}

.calibration-toast-success {
  background: #ecfdf5;
  border-color: #10b981;
}

.toast-icon {
  font-size: 16px;
}

.toast-skip {
  margin-left: 12px;
  padding: 4px 12px;
  background: transparent;
  border: 1px solid #999;
  border-radius: 4px;
  cursor: pointer;
  font-size: 12px;
  transition: all 0.1s;
}

.toast-skip:hover {
  background: #f0f0f0;
}
```

- [ ] **Step 3: Commit**

```bash
git add src/App.jsx src/App.css
git commit -m "feat: integrate auto calibration flow in App"
```

---

### Task 4: Update CalibrationModal

**Files:**
- Modify: `src/components/CalibrationModal.jsx`
- Modify: `src/components/CalibrationModal.css`

- [ ] **Step 1: Add warning banner to CalibrationModal.jsx**

Read the current CalibrationModal.jsx first, then modify the component signature and add warning:

```jsx
import { useState } from 'react'
import './CalibrationModal.css'

const REFERENCE_CARDS = [
  { name: '银行卡/信用卡', width: 8.56, unit: 'cm' },
  { name: '身份证', width: 8.56, unit: 'cm' },
  { name: 'SIM 卡', width: 2.5, unit: 'cm' },
  { name: '一元硬币', width: 2.5, unit: 'cm' },
]

function CalibrationModal({ currentDpi, onSave, onClose, showWarning }) {
  const [customWidth, setCustomWidth] = useState('')
  const [measuredPx, setMeasuredPx] = useState('')

  const calculateDpi = (widthCm, widthPx) => {
    return Math.round((widthPx / widthCm) * 2.54)
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
        
        {showWarning && (
          <div className="calibration-warning">
            <div className="warning-icon">⚠️</div>
            <div className="warning-content">
              <strong>无法自动获取屏幕尺寸</strong>
              <p>当前浏览器不支持自动校准 API。请手动完成校准以保证测量准确。</p>
              <p className="browser-hint">建议使用 Chrome/Edge 浏览器以获得自动校准功能。</p>
            </div>
          </div>
        )}
        
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
```

- [ ] **Step 2: Add warning styles to CalibrationModal.css**

Add to `src/components/CalibrationModal.css`:

```css
.calibration-warning {
  background: #fef3c7;
  border: 2px solid #f59e0b;
  border-radius: 8px;
  padding: 16px;
  margin-bottom: 16px;
  display: flex;
  gap: 12px;
}

.warning-icon {
  font-size: 24px;
  flex-shrink: 0;
}

.warning-content strong {
  display: block;
  color: #92400e;
  font-size: 15px;
  margin-bottom: 8px;
}

.warning-content p {
  color: #78350f;
  font-size: 14px;
  margin: 4px 0;
  line-height: 1.5;
}

.browser-hint {
  margin-top: 8px !important;
  padding-top: 8px;
  border-top: 1px solid #fcd34d;
  font-style: italic;
}
```

- [ ] **Step 3: Commit**

```bash
git add src/components/CalibrationModal.jsx src/components/CalibrationModal.css
git commit -m "feat: add warning banner to manual calibration modal"
```

---

### Task 5: Test and Verify

**Files:** Test in browser

- [ ] **Step 1: Build and verify no errors**

```bash
npm run build
```

Expected: Build succeeds with no errors

- [ ] **Step 2: Test in Chrome/Edge (Layer 1)**

1. Open dev server in Chrome/Edge
2. Clear localStorage: `localStorage.clear()`
3. Reload page
4. Verify: Auto-detect toast appears, then success message
5. Check console for `[AutoCalibrate]` logs

- [ ] **Step 3: Test in Firefox (Layer 2 fallback)**

1. Open dev server in Firefox
2. Clear localStorage
3. Reload page
4. Verify: If on mobile, device database matches; if desktop, shows manual modal with warning

- [ ] **Step 4: Test manual calibration (Layer 3)**

1. In any browser, click "跳过" during auto-detect
2. Verify: Manual calibration modal shows with yellow warning banner
3. Verify: Warning text reads "无法自动获取屏幕尺寸"
4. Verify: Browser recommendation shows
5. Verify: Reference cards (bank card, ID, SIM, coin) still work

- [ ] **Step 5: Verify localStorage persistence**

1. Calibrate manually or automatically
2. Reload page
3. Verify: No auto-detect toast, uses saved DPI

---

## Summary

**Total commits:** 4
1. Device database
2. Auto calibration utility
3. App integration with UI states
4. Calibration modal warning banner

**Key behaviors:**
- First load: Auto-detect → Success toast (2s) OR Manual modal with warning
- Subsequent loads: Use saved DPI, skip auto-detect
- Manual calibration retains all existing reference card options
