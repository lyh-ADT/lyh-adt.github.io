/**
 * Device Database for Auto Calibration (Layer 2)
 *
 * Contains screen specifications (width px, height px, PPI) for common devices.
 * Used as an automatic fallback when Screen Details API is unavailable.
 *
 * The 3-layer calibration fallback system:
 *   Layer 1: Screen Details API (automatic)
 *   Layer 2: Device Database Match (this file - automatic fallback)
 *   Layer 3: Manual Calibration with warning (final fallback)
 */

// ---------------------------------------------------------------------------
// Device Database
// ---------------------------------------------------------------------------
// Each entry contains:
//   name       - Human-readable device name
//   width      - Logical screen width in CSS pixels
//   height     - Logical screen height in CSS pixels
//   ppi        - Physical pixels-per-inch (DPI) of the display
//   uaPattern  - RegExp to match the device in navigator.userAgent
// ---------------------------------------------------------------------------

/** @type {Array<{name: string, width: number, height: number, ppi: number, uaPattern: RegExp}>} */
export const DEVICE_DB = [
  // ---- iPhone (X through 15 series) ----
  // iPhone X / XS / 11 Pro
  {
    name: 'iPhone X / XS / 11 Pro',
    width: 375,
    height: 812,
    ppi: 458,
    uaPattern: /iPhone1[01],[01]|iPhone12,[35]/,
  },
  // iPhone XR / 11
  {
    name: 'iPhone XR / 11',
    width: 414,
    height: 896,
    ppi: 326,
    uaPattern: /iPhone11,[68]|iPhone12,[15]/,
  },
  // iPhone XS Max / 11 Pro Max
  {
    name: 'iPhone XS Max / 11 Pro Max',
    width: 414,
    height: 896,
    ppi: 458,
    uaPattern: /iPhone11,[46]|iPhone12,[35]/,
  },
  // iPhone 12 / 12 Pro
  {
    name: 'iPhone 12 / 12 Pro',
    width: 390,
    height: 844,
    ppi: 460,
    uaPattern: /iPhone13,[13]/,
  },
  // iPhone 12 Mini
  {
    name: 'iPhone 12 Mini',
    width: 375,
    height: 812,
    ppi: 476,
    uaPattern: /iPhone13,[14]/,
  },
  // iPhone 12 Pro Max
  {
    name: 'iPhone 12 Pro Max',
    width: 428,
    height: 926,
    ppi: 458,
    uaPattern: /iPhone13,[42]/,
  },
  // iPhone 13 / 13 Pro
  {
    name: 'iPhone 13 / 13 Pro',
    width: 390,
    height: 844,
    ppi: 460,
    uaPattern: /iPhone14,[45]/,
  },
  // iPhone 13 Mini
  {
    name: 'iPhone 13 Mini',
    width: 375,
    height: 812,
    ppi: 476,
    uaPattern: /iPhone14,[74]/,
  },
  // iPhone 13 Pro Max
  {
    name: 'iPhone 13 Pro Max',
    width: 428,
    height: 926,
    ppi: 458,
    uaPattern: /iPhone14,[32]/,
  },
  // iPhone 14 / 14 Plus
  {
    name: 'iPhone 14 / 14 Plus',
    width: 390,
    height: 844,
    ppi: 460,
    uaPattern: /iPhone14,[76]/,
  },
  // iPhone 14 Pro / 14 Pro Max
  {
    name: 'iPhone 14 Pro',
    width: 393,
    height: 852,
    ppi: 460,
    uaPattern: /iPhone15,[23]/,
  },
  {
    name: 'iPhone 14 Pro Max',
    width: 430,
    height: 932,
    ppi: 460,
    uaPattern: /iPhone15,[45]/,
  },
  // iPhone 15 / 15 Plus
  {
    name: 'iPhone 15',
    width: 393,
    height: 852,
    ppi: 460,
    uaPattern: /iPhone15,[23]/,
  },
  {
    name: 'iPhone 15 Plus',
    width: 430,
    height: 932,
    ppi: 460,
    uaPattern: /iPhone16,[12]/,
  },
  // iPhone 15 Pro / 15 Pro Max
  {
    name: 'iPhone 15 Pro',
    width: 393,
    height: 852,
    ppi: 460,
    uaPattern: /iPhone16,[23]/,
  },
  {
    name: 'iPhone 15 Pro Max',
    width: 430,
    height: 932,
    ppi: 460,
    uaPattern: /iPhone17,[12]/,
  },

  // ---- iPad (Pro, Air, Mini) ----
  // iPad Pro 12.9-inch (various generations)
  {
    name: 'iPad Pro 12.9"',
    width: 1024,
    height: 1366,
    ppi: 264,
    uaPattern: /iPad1[3-6],[4-8]/,
  },
  // iPad Pro 11-inch
  {
    name: 'iPad Pro 11"',
    width: 834,
    height: 1194,
    ppi: 264,
    uaPattern: /iPad13,[1-8]/,
  },
  // iPad Pro 10.9-inch
  {
    name: 'iPad Pro 10.9"',
    width: 834,
    height: 1194,
    ppi: 264,
    uaPattern: /iPad13,[456]|iPad14,[34]/,
  },
  // iPad Air
  {
    name: 'iPad Air',
    width: 820,
    height: 1180,
    ppi: 264,
    uaPattern: /iPad13,16|iPad13,17|iPad14,[1256]/,
  },
  // iPad Mini
  {
    name: 'iPad Mini',
    width: 744,
    height: 1133,
    ppi: 326,
    uaPattern: /iPad14,[12]/,
  },
  // Generic iPad fallback
  {
    name: 'iPad (generic)',
    width: 768,
    height: 1024,
    ppi: 264,
    uaPattern: /iPad/,
  },

  // ---- Samsung Galaxy S22-S24 series ----
  // Galaxy S22
  {
    name: 'Samsung Galaxy S22',
    width: 360,
    height: 780,
    ppi: 426,
    uaPattern: /SM-S901B|SM-S901U/,
  },
  // Galaxy S22+
  {
    name: 'Samsung Galaxy S22+',
    width: 384,
    height: 816,
    ppi: 393,
    uaPattern: /SM-S906B|SM-S906U/,
  },
  // Galaxy S22 Ultra
  {
    name: 'Samsung Galaxy S22 Ultra',
    width: 384,
    height: 816,
    ppi: 500,
    uaPattern: /SM-S908B|SM-S908U/,
  },
  // Galaxy S23
  {
    name: 'Samsung Galaxy S23',
    width: 360,
    height: 780,
    ppi: 426,
    uaPattern: /SM-S911B|SM-S911U/,
  },
  // Galaxy S23+
  {
    name: 'Samsung Galaxy S23+',
    width: 384,
    height: 816,
    ppi: 393,
    uaPattern: /SM-S916B|SM-S916U/,
  },
  // Galaxy S23 Ultra
  {
    name: 'Samsung Galaxy S23 Ultra',
    width: 384,
    height: 816,
    ppi: 500,
    uaPattern: /SM-S918B|SM-S918U/,
  },
  // Galaxy S24
  {
    name: 'Samsung Galaxy S24',
    width: 360,
    height: 780,
    ppi: 430,
    uaPattern: /SM-S921B|SM-S921U/,
  },
  // Galaxy S24+
  {
    name: 'Samsung Galaxy S24+',
    width: 384,
    height: 816,
    ppi: 401,
    uaPattern: /SM-S926B|SM-S926U/,
  },
  // Galaxy S24 Ultra
  {
    name: 'Samsung Galaxy S24 Ultra',
    width: 384,
    height: 816,
    ppi: 505,
    uaPattern: /SM-S928B|SM-S928U/,
  },

  // ---- Samsung Galaxy Z Fold / Flip ----
  // Galaxy Z Fold 4
  {
    name: 'Samsung Galaxy Z Fold 4',
    width: 344,
    height: 826,
    ppi: 408,
    uaPattern: /SM-F936B|SM-F936U/,
  },
  // Galaxy Z Fold 5
  {
    name: 'Samsung Galaxy Z Fold 5',
    width: 344,
    height: 826,
    ppi: 408,
    uaPattern: /SM-F946B|SM-F946U/,
  },
  // Galaxy Z Fold 6
  {
    name: 'Samsung Galaxy Z Fold 6',
    width: 344,
    height: 840,
    ppi: 413,
    uaPattern: /SM-F956B|SM-F956U/,
  },
  // Galaxy Z Flip 4
  {
    name: 'Samsung Galaxy Z Flip 4',
    width: 300,
    height: 696,
    ppi: 425,
    uaPattern: /SM-F731B|SM-F731U/,
  },
  // Galaxy Z Flip 5
  {
    name: 'Samsung Galaxy Z Flip 5',
    width: 300,
    height: 696,
    ppi: 425,
    uaPattern: /SM-F741B|SM-F741U/,
  },
  // Galaxy Z Flip 6
  {
    name: 'Samsung Galaxy Z Flip 6',
    width: 312,
    height: 718,
    ppi: 447,
    uaPattern: /SM-F751B|SM-F751U/,
  },

  // ---- Google Pixel 6-8 series ----
  // Pixel 6
  {
    name: 'Google Pixel 6',
    width: 412,
    height: 912,
    ppi: 442,
    uaPattern: /Pixel 6/,
  },
  // Pixel 6 Pro
  {
    name: 'Google Pixel 6 Pro',
    width: 412,
    height: 892,
    ppi: 524,
    uaPattern: /Pixel 6 Pro/,
  },
  // Pixel 6a
  {
    name: 'Google Pixel 6a',
    width: 412,
    height: 892,
    ppi: 442,
    uaPattern: /Pixel 6a/,
  },
  // Pixel 7
  {
    name: 'Google Pixel 7',
    width: 412,
    height: 912,
    ppi: 442,
    uaPattern: /Pixel 7/,
  },
  // Pixel 7 Pro
  {
    name: 'Google Pixel 7 Pro',
    width: 412,
    height: 892,
    ppi: 524,
    uaPattern: /Pixel 7 Pro/,
  },
  // Pixel 7a
  {
    name: 'Google Pixel 7a',
    width: 412,
    height: 892,
    ppi: 442,
    uaPattern: /Pixel 7a/,
  },
  // Pixel 8
  {
    name: 'Google Pixel 8',
    width: 412,
    height: 912,
    ppi: 452,
    uaPattern: /Pixel 8/,
  },
  // Pixel 8 Pro
  {
    name: 'Google Pixel 8 Pro',
    width: 412,
    height: 892,
    ppi: 524,
    uaPattern: /Pixel 8 Pro/,
  },

  // ---- Common Desktop Monitor Resolutions ----
  // 1080p (Full HD) monitors at various sizes
  {
    name: '19" 1080p Monitor',
    width: 1920,
    height: 1080,
    ppi: 116,
    uaPattern: null, // desktop detected separately
  },
  {
    name: '22" 1080p Monitor',
    width: 1920,
    height: 1080,
    ppi: 101,
    uaPattern: null,
  },
  {
    name: '24" 1080p Monitor',
    width: 1920,
    height: 1080,
    ppi: 92,
    uaPattern: null,
  },
  {
    name: '27" 1080p Monitor',
    width: 1920,
    height: 1080,
    ppi: 82,
    uaPattern: null,
  },
  // 1440p (QHD / 2K) monitors
  {
    name: '27" 1440p Monitor',
    width: 2560,
    height: 1440,
    ppi: 109,
    uaPattern: null,
  },
  {
    name: '32" 1440p Monitor',
    width: 2560,
    height: 1440,
    ppi: 92,
    uaPattern: null,
  },
  // 4K (UHD) monitors
  {
    name: '27" 4K Monitor',
    width: 3840,
    height: 2160,
    ppi: 163,
    uaPattern: null,
  },
  {
    name: '32" 4K Monitor',
    width: 3840,
    height: 2160,
    ppi: 138,
    uaPattern: null,
  },
  {
    name: '43" 4K Monitor',
    width: 3840,
    height: 2160,
    ppi: 103,
    uaPattern: null,
  },
  // 5K monitors
  {
    name: '27" 5K Monitor (iMac)',
    width: 5120,
    height: 2880,
    ppi: 218,
    uaPattern: null,
  },
  // MacBook / high-DPI laptops
  {
    name: '13" MacBook Pro / Air (Retina)',
    width: 1440,
    height: 900,
    ppi: 227,
    uaPattern: null,
  },
  {
    name: '14" MacBook Pro (Retina)',
    width: 1512,
    height: 982,
    ppi: 254,
    uaPattern: null,
  },
  {
    name: '16" MacBook Pro (Retina)',
    width: 1728,
    height: 1117,
    ppi: 226,
    uaPattern: null,
  },
]

// ---------------------------------------------------------------------------
// Internal Helper: Fuzzy Match
// ---------------------------------------------------------------------------
/**
 * Find the best-matching device from the database using multiple strategies.
 *
 * Strategies (in order of preference):
 *   1. Exact userAgent regex match
 *   2. Resolution match (exact width x height)
 *   3. Resolution range match (within 10% tolerance)
 *
 * @param {Array} db       - The device database array
 * @param {string} ua      - navigator.userAgent
 * @param {number} scrW    - window.screen.width
 * @param {number} scrH    - window.screen.height
 * @returns {{name: string, width: number, height: number, ppi: number}|null}
 */
function findDevice(db, ua, scrW, scrH) {
  // Strategy 1: Exact userAgent regex match
  for (const device of db) {
    if (device.uaPattern && device.uaPattern.test(ua)) {
      return { name: device.name, width: device.width, height: device.height, ppi: device.ppi }
    }
  }

  // Strategy 2: Exact resolution match
  const w = Math.min(scrW, scrH)
  const h = Math.max(scrW, scrH)
  for (const device of db) {
    const dw = Math.min(device.width, device.height)
    const dh = Math.max(device.width, device.height)
    if (dw === w && dh === h) {
      return { name: device.name, width: device.width, height: device.height, ppi: device.ppi }
    }
  }

  // Strategy 3: Resolution range match (within 10% tolerance)
  if (w === 0 || h === 0) return null
  const tolerance = 0.1
  for (const device of db) {
    const dw = Math.min(device.width, device.height)
    const dh = Math.max(device.width, device.height)
    const wDiff = Math.abs(dw - w) / w
    const hDiff = Math.abs(dh - h) / h
    if (wDiff < tolerance && hDiff < tolerance) {
      return { name: device.name, width: device.width, height: device.height, ppi: device.ppi }
    }
  }

  return null
}

// ---------------------------------------------------------------------------
// Public API: detectDevice
// ---------------------------------------------------------------------------
/**
 * Detect the current device and return its screen specifications.
 *
 * Parses navigator.userAgent and screen dimensions to find a matching device
 * in the database. Returns null if no match is found (caller should fall
 * through to Layer 3: manual calibration).
 *
 * @returns {{name: string, width: number, height: number, ppi: number}|null}
 *   Device object with screen specs, or null if unmatched.
 *
 * @example
 *   const device = detectDevice()
 *   if (device) {
 *     console.log(`Matched: ${device.name} at ${device.ppi} PPI`)
 *   }
 */
export function detectDevice() {
  const ua = navigator.userAgent
  const scrW = window.screen.width
  const scrH = window.screen.height

  return findDevice(DEVICE_DB, ua, scrW, scrH)
}
