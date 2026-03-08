/**
 * 音频工具类 - 核心音频处理算法
 * 使用 fft.js 进行高性能 FFT 计算
 */

import FFT from 'fft.js'

// 创建 FFT 实例（单例）
const fftInstance = new FFT(4096)
const fftInstanceSmall = new FFT(2048)

class AudioUtils {
  // 计算 FFT（使用 fft.js，O(N log N) 复杂度）
  static computeFFT(audioData, N = 2048) {
    // 准备输入数据
    const copyLength = Math.min(audioData.length, N)

    // 创建 FFT 实例或重用
    const fft = N === 4096 ? fftInstance : (N === 2048 ? fftInstanceSmall : new FFT(N))

    // 准备输入数据（纯实数数组）
    const realData = new Float32Array(N)
    for (let i = 0; i < copyLength; i++) {
      realData[i] = audioData[i]
    }

    // 创建输出数组（交错实部/虚部格式，长度为 N）
    const spectrum = fft.createComplexArray()

    // 执行 FFT
    fft.realTransform(spectrum, realData)

    // 计算幅度谱（只取前 N/2 个频率点）
    // spectrum 是交错格式 [real0, imag0, real1, imag1, ...]
    const magnitudes = new Float32Array(N / 2)
    for (let i = 0; i < N / 2; i++) {
      const real = spectrum[i * 2]
      const imag = spectrum[i * 2 + 1]
      magnitudes[i] = Math.sqrt(real * real + imag * imag) / N
    }

    return magnitudes
  }

  // 对长音频计算平均频谱（多帧平均）
  static computeAverageFFT(audioData, frameSize = 2048, hopSize = 1024) {
    const numFrames = Math.floor((audioData.length - frameSize) / hopSize) + 1
    const spectrum = new Float32Array(frameSize / 2)

    if (numFrames <= 0) {
      // 音频太短，直接计算 FFT
      return this.computeFFT(audioData, frameSize)
    }

    // 为每一帧计算 FFT 并累加
    for (let frame = 0; frame < numFrames; frame++) {
      const start = frame * hopSize
      const end = start + frameSize

      // 使用 fft.js 直接计算
      const frameData = audioData.slice(start, end)
      const frameFFT = this.computeFFT(frameData, frameSize)

      for (let i = 0; i < spectrum.length; i++) {
        spectrum[i] += frameFFT[i]
      }
    }

    // 取平均
    for (let i = 0; i < spectrum.length; i++) {
      spectrum[i] /= numFrames
    }

    return spectrum
  }

  // 计算频谱相关性
  static computeSpectralCorrelation(ref, curr) {
    let sumRef = 0
    let sumCurr = 0
    let sumProduct = 0
    let sumRefSq = 0
    let sumCurrSq = 0

    const N = Math.min(ref.length, curr.length)
    if (N === 0) return 0.5

    for (let i = 0; i < N; i++) {
      sumRef += ref[i]
      sumCurr += curr[i]
      sumProduct += ref[i] * curr[i]
      sumRefSq += ref[i] * ref[i]
      sumCurrSq += curr[i] * curr[i]
    }

    const numerator = sumProduct - (sumRef * sumCurr) / N
    const denominator = Math.sqrt(
      (sumRefSq - sumRef * sumRef / N) *
      (sumCurrSq - sumCurr * sumCurr / N)
    )

    if (denominator === 0 || !isFinite(denominator)) return 0.5

    const correlation = numerator / denominator
    // 处理 NaN 和 Infinity
    if (!isFinite(correlation)) return 0.5
    return Math.max(0, Math.min(1, (correlation + 1) / 2))
  }

  // 计算时域相关性
  static computeTimeDomainCorrelation(ref, curr) {
    const N = Math.min(ref.length, curr.length, 4096)
    let sum = 0
    let refEnergy = 0
    let currEnergy = 0

    for (let i = 0; i < N; i++) {
      sum += ref[i] * curr[i]
      refEnergy += ref[i] * ref[i]
      currEnergy += curr[i] * curr[i]
    }

    const denominator = Math.sqrt(refEnergy * currEnergy)
    if (denominator === 0) return 0

    return Math.max(0, Math.min(1, (sum / denominator + 1) / 2))
  }

  // 提取音频指纹（使用能量谱，对数频率分段）
  static getAudioFingerprint(audioData, bins = 32) {
    const avgFFT = this.computeAverageFFT(audioData, 4096, 2048)
    const fingerprint = new Float32Array(bins)
    const fftLength = avgFFT.length

    // 按对数频率分段
    for (let i = 0; i < bins; i++) {
      const startBin = Math.floor((Math.pow(2, i / bins) - 1) / (Math.pow(2, 1 / bins) - 1))
      const endBin = Math.floor((Math.pow(2, (i + 1) / bins) - 1) / (Math.pow(2, 1 / bins) - 1))

      let sum = 0
      let count = 0
      for (let j = Math.min(startBin, fftLength - 1); j < Math.min(endBin, fftLength); j++) {
        sum += avgFFT[j]
        count++
      }
      fingerprint[i] = count > 0 ? sum / count : 0
    }

    // 归一化
    let max = 0
    for (let i = 0; i < fingerprint.length; i++) {
      if (fingerprint[i] > max) max = fingerprint[i]
    }
    if (max > 0) {
      for (let i = 0; i < fingerprint.length; i++) {
        fingerprint[i] /= max
      }
    }

    return fingerprint
  }

  // 比较指纹相似度
  static compareFingerprints(fp1, fp2) {
    const N = Math.min(fp1.length, fp2.length)
    if (N === 0) return 0.5

    let sum = 0
    for (let i = 0; i < N; i++) {
      const diff = Math.abs(fp1[i] - fp2[i])
      // 处理 NaN
      if (!isFinite(diff)) {
        sum += 0
      } else {
        sum += 1 - Math.min(1, diff)
      }
    }
    const result = sum / N
    return isFinite(result) ? result : 0.5
  }

  // 计算频谱距离
  static computeSpectralDistance(ref, curr) {
    let sum = 0
    const N = Math.min(ref.length, curr.length)
    for (let i = 0; i < N; i++) {
      const diff = ref[i] - curr[i]
      sum += diff * diff
    }
    return Math.sqrt(sum / N)
  }
}

export default AudioUtils
