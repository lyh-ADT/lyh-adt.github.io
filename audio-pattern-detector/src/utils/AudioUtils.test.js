/**
 * AudioUtils 单元测试
 */

import { describe, it, expect } from 'vitest'
import AudioUtils from './AudioUtils'

describe('AudioUtils', () => {
  describe('computeFFT', () => {
    it('应该正确计算短音频的 FFT', () => {
      // 创建一个简单的正弦波
      const N = 2048
      const freq = 440 // Hz
      const sampleRate = 44100
      const audioData = new Float32Array(N)

      for (let i = 0; i < N; i++) {
        audioData[i] = Math.sin(2 * Math.PI * freq * i / sampleRate)
      }

      const fft = AudioUtils.computeFFT(audioData, N)

      // FFT 结果应该是有效的数字
      expect(fft).toBeInstanceOf(Float32Array)
      expect(fft.length).toBe(N / 2)

      // 检查没有 NaN 或 Infinity
      for (let i = 0; i < fft.length; i++) {
        expect(Number.isNaN(fft[i])).toBe(false)
        expect(Number.isFinite(fft[i])).toBe(true)
      }
    })

    it('应该处理比 N 短的音频数据', () => {
      const audioData = new Float32Array(100)
      audioData.fill(0.5)

      const fft = AudioUtils.computeFFT(audioData, 2048)

      expect(fft).toBeInstanceOf(Float32Array)
      expect(fft.length).toBe(1024)
    })

    it('应该处理比 N 长的音频数据', () => {
      const audioData = new Float32Array(4096)
      audioData.fill(0.5)

      const fft = AudioUtils.computeFFT(audioData, 2048)

      expect(fft).toBeInstanceOf(Float32Array)
      expect(fft.length).toBe(1024)
    })

    it('全零输入应该返回全零输出', () => {
      const audioData = new Float32Array(2048)
      audioData.fill(0)

      const fft = AudioUtils.computeFFT(audioData, 2048)

      for (let i = 0; i < fft.length; i++) {
        expect(fft[i]).toBeCloseTo(0, 10)
      }
    })
  })

  describe('computeAverageFFT', () => {
    it('应该正确计算长音频的平均 FFT', () => {
      // 创建 5 秒的静音
      const sampleRate = 44100
      const duration = 5
      const audioData = new Float32Array(sampleRate * duration)

      const avgFFT = AudioUtils.computeAverageFFT(audioData, 2048, 1024)

      expect(avgFFT).toBeInstanceOf(Float32Array)
      expect(avgFFT.length).toBe(1024)
    })

    it('应该处理短音频', () => {
      const audioData = new Float32Array(1000)
      audioData.fill(0.5)

      const avgFFT = AudioUtils.computeAverageFFT(audioData, 2048, 1024)

      expect(avgFFT).toBeInstanceOf(Float32Array)
      expect(avgFFT.length).toBe(1024)
    })

    it('不应该返回 NaN', () => {
      const sampleRate = 44100
      const audioData = new Float32Array(sampleRate)

      // 添加一些噪声
      for (let i = 0; i < audioData.length; i++) {
        audioData[i] = Math.random() * 0.1
      }

      const avgFFT = AudioUtils.computeAverageFFT(audioData, 4096, 2048)

      for (let i = 0; i < avgFFT.length; i++) {
        expect(Number.isNaN(avgFFT[i])).toBe(false)
        expect(Number.isFinite(avgFFT[i])).toBe(true)
      }
    })
  })

  describe('computeSpectralCorrelation', () => {
    it('相同频谱的相关性应该接近 1', () => {
      const spectrum = new Float32Array(1024)
      for (let i = 0; i < spectrum.length; i++) {
        spectrum[i] = Math.random()
      }

      const correlation = AudioUtils.computeSpectralCorrelation(spectrum, spectrum)

      expect(correlation).toBeGreaterThanOrEqual(0)
      expect(correlation).toBeLessThanOrEqual(1)
      expect(correlation).toBeCloseTo(1, 1)
    })

    it('不同频谱的相关性应该较低', () => {
      const spectrum1 = new Float32Array(1024)
      const spectrum2 = new Float32Array(1024)

      for (let i = 0; i < spectrum1.length; i++) {
        spectrum1[i] = Math.random()
        spectrum2[i] = Math.random()
      }

      const correlation = AudioUtils.computeSpectralCorrelation(spectrum1, spectrum2)

      expect(correlation).toBeGreaterThanOrEqual(0)
      expect(correlation).toBeLessThanOrEqual(1)
    })

    it('全零输入应该返回默认值', () => {
      const zeros = new Float32Array(1024)
      const correlation = AudioUtils.computeSpectralCorrelation(zeros, zeros)

      expect(correlation).toBe(0.5)
    })

    it('不应该返回 NaN', () => {
      const spectrum1 = new Float32Array(1024)
      const spectrum2 = new Float32Array(1024)

      for (let i = 0; i < spectrum1.length; i++) {
        spectrum1[i] = Math.random() * 100
        spectrum2[i] = Math.random() * 100
      }

      const correlation = AudioUtils.computeSpectralCorrelation(spectrum1, spectrum2)

      expect(Number.isNaN(correlation)).toBe(false)
      expect(Number.isFinite(correlation)).toBe(true)
    })
  })

  describe('getAudioFingerprint', () => {
    it('应该生成有效的指纹', () => {
      const audioData = new Float32Array(44100) // 1 秒
      for (let i = 0; i < audioData.length; i++) {
        audioData[i] = Math.sin(2 * Math.PI * 440 * i / 44100)
      }

      const fingerprint = AudioUtils.getAudioFingerprint(audioData, 32)

      expect(fingerprint).toBeInstanceOf(Float32Array)
      expect(fingerprint.length).toBe(32)
    })

    it('指纹值应该在 0-1 范围内', () => {
      const audioData = new Float32Array(44100)
      for (let i = 0; i < audioData.length; i++) {
        audioData[i] = Math.random() * 0.5
      }

      const fingerprint = AudioUtils.getAudioFingerprint(audioData, 32)

      for (let i = 0; i < fingerprint.length; i++) {
        expect(fingerprint[i]).toBeGreaterThanOrEqual(0)
        expect(fingerprint[i]).toBeLessThanOrEqual(1)
      }
    })

    it('不应该包含 NaN', () => {
      const audioData = new Float32Array(44100)
      for (let i = 0; i < audioData.length; i++) {
        audioData[i] = Math.random() * 0.5
      }

      const fingerprint = AudioUtils.getAudioFingerprint(audioData, 32)

      for (let i = 0; i < fingerprint.length; i++) {
        expect(Number.isNaN(fingerprint[i])).toBe(false)
      }
    })
  })

  describe('compareFingerprints', () => {
    it('相同指纹的相似度应该为 1', () => {
      const fingerprint = new Float32Array(32)
      for (let i = 0; i < fingerprint.length; i++) {
        fingerprint[i] = Math.random()
      }

      const similarity = AudioUtils.compareFingerprints(fingerprint, fingerprint)

      expect(similarity).toBeCloseTo(1, 5)
    })

    it('不同指纹的相似度应该较低', () => {
      const fp1 = new Float32Array(32)
      const fp2 = new Float32Array(32)

      for (let i = 0; i < fp1.length; i++) {
        fp1[i] = Math.random()
        fp2[i] = Math.random()
      }

      const similarity = AudioUtils.compareFingerprints(fp1, fp2)

      expect(similarity).toBeGreaterThanOrEqual(0)
      expect(similarity).toBeLessThanOrEqual(1)
    })

    it('不应该返回 NaN', () => {
      const fp1 = new Float32Array(32)
      const fp2 = new Float32Array(32)

      for (let i = 0; i < fp1.length; i++) {
        fp1[i] = Math.random() * 100
        fp2[i] = Math.random() * 100
      }

      const similarity = AudioUtils.compareFingerprints(fp1, fp2)

      expect(Number.isNaN(similarity)).toBe(false)
      expect(Number.isFinite(similarity)).toBe(true)
    })
  })

  // 集成测试
  describe('Integration', () => {
    it('完整音频匹配流程应该返回有效分数', () => {
      // 创建测试音频
      const sampleRate = 44100
      const duration = 1 // 秒
      const audioData = new Float32Array(sampleRate * duration)

      // 生成 440Hz 正弦波
      for (let i = 0; i < audioData.length; i++) {
        audioData[i] = Math.sin(2 * Math.PI * 440 * i / sampleRate) * 0.5
      }

      // 生成参考数据
      const refFFT = AudioUtils.computeAverageFFT(audioData, 4096, 2048)
      const refFingerprint = AudioUtils.getAudioFingerprint(audioData, 32)

      // 创建相同的测试音频
      const testAudio = new Float32Array(sampleRate * duration)
      for (let i = 0; i < testAudio.length; i++) {
        testAudio[i] = Math.sin(2 * Math.PI * 440 * i / sampleRate) * 0.5
      }

      const testFFT = AudioUtils.computeAverageFFT(testAudio, 4096, 2048)
      const testFingerprint = AudioUtils.getAudioFingerprint(testAudio, 32)

      // 计算匹配分数
      const fingerprintScore = AudioUtils.compareFingerprints(refFingerprint, testFingerprint)
      const spectralCorrelation = AudioUtils.computeSpectralCorrelation(refFFT, testFFT)
      const combinedScore = fingerprintScore * 0.7 + spectralCorrelation * 0.3

      // 相同音频应该高度匹配
      expect(combinedScore).toBeGreaterThan(0.8)
      expect(Number.isNaN(combinedScore)).toBe(false)
    })

    it('不同音频应该返回较低分数', () => {
      const sampleRate = 44100
      const duration = 1

      // 音频 1:440Hz
      const audio1 = new Float32Array(sampleRate * duration)
      for (let i = 0; i < audio1.length; i++) {
        audio1[i] = Math.sin(2 * Math.PI * 440 * i / sampleRate) * 0.5
      }

      // 音频 2:880Hz（不同频率）
      const audio2 = new Float32Array(sampleRate * duration)
      for (let i = 0; i < audio2.length; i++) {
        audio2[i] = Math.sin(2 * Math.PI * 880 * i / sampleRate) * 0.5
      }

      const fp1 = AudioUtils.getAudioFingerprint(audio1, 32)
      const fp2 = AudioUtils.getAudioFingerprint(audio2, 32)
      const fft1 = AudioUtils.computeAverageFFT(audio1, 4096, 2048)
      const fft2 = AudioUtils.computeAverageFFT(audio2, 4096, 2048)

      const fingerprintScore = AudioUtils.compareFingerprints(fp1, fp2)
      const spectralCorrelation = AudioUtils.computeSpectralCorrelation(fft1, fft2)
      const combinedScore = fingerprintScore * 0.7 + spectralCorrelation * 0.3

      // 不同音频应该分数较低
      expect(combinedScore).toBeLessThan(0.8)
      expect(Number.isNaN(combinedScore)).toBe(false)
    })
  })
})
