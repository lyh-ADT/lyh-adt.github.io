import { describe, it, expect } from 'vitest'
import {
  computeRms,
  thresholdToRms,
  isShotCandidate,
  clamp,
  formatTime
} from './audioDetection'

describe('audioDetection', () => {
  describe('computeRms', () => {
    it('全零输入返回 0', () => {
      expect(computeRms(new Float32Array(512))).toBe(0)
    })

    it('正弦波的 RMS 约为幅值 / sqrt(2)', () => {
      const samples = new Float32Array(4096)
      for (let i = 0; i < samples.length; i++) {
        samples[i] = Math.sin(2 * Math.PI * 440 * i / 44100) * 0.5
      }
      expect(computeRms(samples)).toBeCloseTo(0.5 / Math.SQRT2, 2)
    })

    it('支持只计算尾部窗口', () => {
      const samples = new Float32Array(1024)
      samples.fill(0.2, 512)
      expect(computeRms(samples, 512, 512)).toBeCloseTo(0.2, 5)
      expect(computeRms(samples, 0, 512)).toBe(0)
    })

    it('越界参数不会抛错', () => {
      expect(computeRms(new Float32Array(10), 20, 10)).toBe(0)
      expect(computeRms(new Float32Array(10), -5, 100)).toBeCloseTo(0, 5)
    })
  })

  describe('thresholdToRms', () => {
    it('边界值正确', () => {
      expect(thresholdToRms(0)).toBeCloseTo(0.01, 10)
      expect(thresholdToRms(1)).toBeCloseTo(0.30, 10)
    })

    it('默认值映射到约 0.213 RMS', () => {
      expect(thresholdToRms(0.7)).toBeCloseTo(0.213, 5)
    })

    it('会夹取非法值', () => {
      expect(thresholdToRms(-1)).toBeCloseTo(0.01, 10)
      expect(thresholdToRms(2)).toBeCloseTo(0.30, 10)
      expect(thresholdToRms(Number.NaN)).toBeCloseTo(0.01, 10)
    })
  })

  describe('isShotCandidate', () => {
    it('低于绝对阈值不触发', () => {
      expect(isShotCandidate({ rms: 0.05, userThreshold: 0.7 })).toBe(false)
    })

    it('高于绝对阈值且高于噪声底时触发', () => {
      expect(isShotCandidate({ rms: 0.25, userThreshold: 0.7 })).toBe(true)
    })

    it('持续噪声不触发', () => {
      expect(isShotCandidate({ rms: 0.22, userThreshold: 0.7, noiseFloor: 0.1 })).toBe(false)
    })

    it('非法 RMS 不触发', () => {
      expect(isShotCandidate({ rms: Number.NaN, userThreshold: 0.7 })).toBe(false)
      expect(isShotCandidate({ rms: -1, userThreshold: 0.7 })).toBe(false)
    })
  })

  describe('clamp', () => {
    it('限制在区间内', () => {
      expect(clamp(5, 0, 1)).toBe(1)
      expect(clamp(-5, 0, 1)).toBe(0)
      expect(clamp(0.5, 0, 1)).toBe(0.5)
    })
  })

  describe('formatTime', () => {
    it('格式化毫秒', () => {
      expect(formatTime(0)).toBe('00:00:00.000')
      expect(formatTime(1234)).toBe('00:00:01.234')
      expect(formatTime(3661001)).toBe('01:01:01.001')
    })

    it('处理空值和负数', () => {
      expect(formatTime(null)).toBe('--:--:--.---')
      expect(formatTime(undefined)).toBe('--:--:--.---')
      expect(formatTime(-1)).toBe('00:00:00.000')
    })
  })
})
