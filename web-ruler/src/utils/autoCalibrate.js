/**
 * Auto Calibration Utility
 *
 * Orchestrates the 3-layer calibration fallback:
 *   Layer 1: Screen Details API (browser API - most accurate)
 *   Layer 2: Device Database Match (device fingerprint - good accuracy)
 *   Layer 3: Manual Fallback (user must calibrate manually)
 *
 * Called by App.jsx on first load to automatically calibrate the ruler.
 */

import { detectDevice } from '../data/deviceDb'

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------
const STORAGE_KEY = 'ruler-dpi'

// ---------------------------------------------------------------------------
// Layer 1: Screen Details API
// ---------------------------------------------------------------------------
/**
 * Try to obtain the device DPI from browser APIs.
 *
 * Uses window.devicePixelRatio combined with physical screen dimensions
 * to calculate an effective PPI value. Returns null if the API is not
 * available or the result is unusable.
 *
 * @returns {{ dpi: number } | null}
 */
function tryScreenDetailsApi() {
  try {
    const dpr = window.devicePixelRatio

    // devicePixelRatio is not available or is 1 (no scaling detected)
    if (!dpr || dpr < 1) {
      console.log('[autoCalibrate] Layer 1: devicePixelRatio not useful')
      return null
    }

    // Calculate DPI: standard 96 DPI * device pixel ratio
    // 96 DPI is the CSS reference pixel density
    const baseDpi = 96
    const dpi = Math.round(baseDpi * dpr)

    // Sanity check: DPI should be between 72 and 600
    if (dpi < 72 || dpi > 600) {
      console.log(`[autoCalibrate] Layer 1: DPI ${dpi} out of reasonable range`)
      return null
    }

    console.log(
      `[autoCalibrate] Layer 1 (Screen Details API): devicePixelRatio=${dpr}, calculated DPI=${dpi}`
    )
    return { dpi }
  } catch (err) {
    console.log(`[autoCalibrate] Layer 1 error: ${err.message}`)
    return null
  }
}

// ---------------------------------------------------------------------------
// Layer 2: Device Database Match
// ---------------------------------------------------------------------------
/**
 * Try to match the current device against the device database.
 *
 * Uses detectDevice() which parses userAgent and screen dimensions
 * to find a matching device entry. Returns the PPI from the matched device.
 *
 * @returns {{ dpi: number } | null}
 */
function tryDeviceDatabase() {
  try {
    const device = detectDevice()

    if (!device) {
      console.log('[autoCalibrate] Layer 2: no device matched')
      return null
    }

    console.log(
      `[autoCalibrate] Layer 2 (Device Database): matched "${device.name}" at ${device.ppi} PPI`
    )
    return { dpi: device.ppi }
  } catch (err) {
    console.log(`[autoCalibrate] Layer 2 error: ${err.message}`)
    return null
  }
}

// ---------------------------------------------------------------------------
// localStorage Persistence
// ---------------------------------------------------------------------------
/**
 * Save a calibrated DPI value to localStorage.
 *
 * @param {number} dpi
 */
function saveDpi(dpi) {
  try {
    localStorage.setItem(STORAGE_KEY, String(dpi))
    console.log(`[autoCalibrate] Saved DPI=${dpi} to localStorage`)
  } catch (err) {
    console.warn(`[autoCalibrate] Failed to save DPI: ${err.message}`)
  }
}

/**
 * Read the saved DPI from localStorage.
 *
 * @returns {number | null} The saved DPI, or null if not found / invalid.
 */
function getSavedDpi() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw === null) return null

    const dpi = parseInt(raw, 10)
    if (isNaN(dpi) || dpi < 72 || dpi > 600) {
      console.log(`[autoCalibrate] Invalid saved DPI: ${raw}`)
      return null
    }

    console.log(`[autoCalibrate] Loaded saved DPI=${dpi} from localStorage`)
    return dpi
  } catch (err) {
    console.warn(`[autoCalibrate] Failed to read saved DPI: ${err.message}`)
    return null
  }
}

// ---------------------------------------------------------------------------
// Main: Auto Calibrate (3-layer fallback)
// ---------------------------------------------------------------------------
/**
 * Run the 3-layer calibration fallback.
 *
 * 1. Try Screen Details API (Layer 1)
 * 2. Try Device Database Match (Layer 2)
 * 3. Return failure — user must calibrate manually (Layer 3)
 *
 * On success, the DPI is automatically saved to localStorage.
 *
 * @returns {{ success: boolean, dpi: number|null, layer: string|null }}
 */
function autoCalibrate() {
  console.log('[autoCalibrate] Starting auto calibration...')

  // Layer 1: Screen Details API
  const layer1 = tryScreenDetailsApi()
  if (layer1 && layer1.dpi) {
    saveDpi(layer1.dpi)
    return { success: true, dpi: layer1.dpi, layer: 'screen-api' }
  }

  // Layer 2: Device Database
  const layer2 = tryDeviceDatabase()
  if (layer2 && layer2.dpi) {
    saveDpi(layer2.dpi)
    return { success: true, dpi: layer2.dpi, layer: 'device-db' }
  }

  // Layer 3: No automatic calibration possible
  console.log('[autoCalibrate] All layers failed. User must calibrate manually.')
  return { success: false, dpi: null, layer: null }
}

// ---------------------------------------------------------------------------
// Exports
// ---------------------------------------------------------------------------
export { tryScreenDetailsApi, tryDeviceDatabase, saveDpi, getSavedDpi, autoCalibrate }
