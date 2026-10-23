/**
 * 计时提示音定义
 *
 * 三种关键提示音必须能凭听感区分：
 * - standby：待机/随机延迟开始，低频单音
 * - start：正式计时开始，高频较长的方波
 * - parTime：Par Time 到期，先高后低的双音
 * - shot：检测到枪声，极短的高频点击
 */

export const BEEP_CUES = {
  standby: {
    label: '待机',
    tones: [
      { frequency: 600, duration: 120, volume: 0.35, type: 'sine' }
    ]
  },
  start: {
    label: '启动',
    tones: [
      { frequency: 1400, duration: 160, volume: 0.45, type: 'square' }
    ]
  },
  parTime: {
    label: 'Par Time',
    tones: [
      { frequency: 1000, duration: 90, volume: 0.4, type: 'sine', gapAfter: 70 },
      { frequency: 720, duration: 140, volume: 0.4, type: 'sine' }
    ]
  },
  shot: {
    label: '枪声',
    tones: [
      { frequency: 1800, duration: 35, volume: 0.28, type: 'square' }
    ]
  }
}

export function getCue(name) {
  return BEEP_CUES[name] || null
}
