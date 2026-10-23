/**
 * 枪声检测与时间格式化工具
 * 这些函数不依赖浏览器 API，便于单元测试。
 */

export const DEFAULT_THRESHOLD = 0.7

export function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value))
}

/**
 * 计算一段采样的 RMS 能量。
 * @param {Float32Array|number[]} samples
 * @param {number} start 起始下标
 * @param {number} length 采样点数量
 * @returns {number}
 */
export function computeRms(samples, start = 0, length = samples.length - start) {
  if (!samples || samples.length === 0) return 0

  const safeStart = clamp(Math.floor(start), 0, samples.length)
  const safeLength = Math.min(Math.floor(length), samples.length - safeStart)
  if (safeLength <= 0) return 0

  let sum = 0
  for (let i = 0; i < safeLength; i++) {
    const value = samples[safeStart + i]
    sum += value * value
  }
  return Math.sqrt(sum / safeLength)
}

/**
 * 把界面上的 0-1 阈值映射为 RMS 阈值。
 * 0 -> 0.01，1 -> 0.30。默认 0.7 对应约 0.213。
 * 这样保持与旧版本的行为兼容，同时让映射关系有明确文档。
 */
export function thresholdToRms(userThreshold = DEFAULT_THRESHOLD) {
  const normalized = clamp(Number(userThreshold) || 0, 0, 1)
  return 0.01 + normalized * 0.29
}

/**
 * 判断当前能量是否达到开枪条件。
 * noiseFloor 用于过滤持续的环境噪声；初始值为 0 时不做噪声门限。
 */
export function isShotCandidate({ rms, userThreshold = DEFAULT_THRESHOLD, noiseFloor = 0 }) {
  if (!Number.isFinite(rms) || rms <= 0) return false

  const threshold = thresholdToRms(userThreshold)
  if (rms < threshold) return false

  // 只有明显高于环境噪声的能量才算枪声，避免持续噪声反复触发。
  if (noiseFloor > 0 && rms < noiseFloor * 2.5) return false

  return true
}

/**
 * 格式化毫秒为 HH:MM:SS.sss。
 */
export function formatTime(ms) {
  if (ms === null || ms === undefined || !Number.isFinite(Number(ms))) {
    return '--:--:--.---'
  }

  const total = Math.max(0, Math.floor(Number(ms)))
  const totalSeconds = Math.floor(total / 1000)
  const hours = Math.floor(totalSeconds / 3600)
  const minutes = Math.floor((totalSeconds % 3600) / 60)
  const seconds = totalSeconds % 60
  const milliseconds = total % 1000
  const pad = (num, len = 2) => String(num).padStart(len, '0')

  return `${pad(hours)}:${pad(minutes)}:${pad(seconds)}.${pad(milliseconds, 3)}`
}
