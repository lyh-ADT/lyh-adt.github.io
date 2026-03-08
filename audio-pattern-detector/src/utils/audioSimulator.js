/**
 * 音频模拟器 - 用于测试模式
 * 生成模拟的音频波形数据，不与真实业务逻辑耦合
 */

// 生成正弦波
export function generateSineWave(frequency, duration, sampleRate = 44100) {
  const samples = Math.floor(duration * sampleRate)
  const wave = new Float32Array(samples)
  
  for (let i = 0; i < samples; i++) {
    wave[i] = Math.sin(2 * Math.PI * frequency * i / sampleRate)
  }
  
  return wave
}

// 生成方波
export function generateSquareWave(frequency, duration, sampleRate = 44100) {
  const samples = Math.floor(duration * sampleRate)
  const wave = new Float32Array(samples)
  
  for (let i = 0; i < samples; i++) {
    const value = Math.sin(2 * Math.PI * frequency * i / sampleRate)
    wave[i] = value > 0 ? 1 : -1
  }
  
  return wave
}

// 生成复合波（多个频率叠加）
export function generateComplexWave(frequencies, duration, sampleRate = 44100) {
  const samples = Math.floor(duration * sampleRate)
  const wave = new Float32Array(samples)
  
  for (let i = 0; i < samples; i++) {
    let value = 0
    for (const freq of frequencies) {
      value += Math.sin(2 * Math.PI * freq * i / sampleRate)
    }
    wave[i] = value / frequencies.length
  }
  
  return wave
}

// 添加噪声
export function addNoise(wave, noiseLevel = 0.1) {
  const noisyWave = new Float32Array(wave.length)
  
  for (let i = 0; i < wave.length; i++) {
    const noise = (Math.random() - 0.5) * 2 * noiseLevel
    noisyWave[i] = wave[i] + noise
  }
  
  return noisyWave
}

// 生成测试音频片段
export function generateTestAudio(options = {}) {
  const {
    type = 'sine',
    frequency = 440,
    frequencies = [440, 880, 1320],
    duration = 2,
    sampleRate = 44100,
    noiseLevel = 0.05
  } = options
  
  let wave
  
  switch (type) {
    case 'sine':
      wave = generateSineWave(frequency, duration, sampleRate)
      break
    case 'square':
      wave = generateSquareWave(frequency, duration, sampleRate)
      break
    case 'complex':
      wave = generateComplexWave(frequencies, duration, sampleRate)
      break
    default:
      wave = generateSineWave(frequency, duration, sampleRate)
  }
  
  return addNoise(wave, noiseLevel)
}

// 模拟实时音频流
export class AudioStreamSimulator {
  constructor(audioData, chunkSize = 1024) {
    this.audioData = audioData
    this.chunkSize = chunkSize
    this.position = 0
    this.isPlaying = false
  }
  
  start() {
    this.isPlaying = true
    this.position = 0
  }
  
  stop() {
    this.isPlaying = false
  }
  
  reset() {
    this.position = 0
    this.isPlaying = false
  }
  
  // 获取下一个音频块
  getNextChunk() {
    if (!this.isPlaying || this.position >= this.audioData.length) {
      return null
    }
    
    const end = Math.min(this.position + this.chunkSize, this.audioData.length)
    const chunk = this.audioData.slice(this.position, end)
    this.position = end
    
    // 如果到末尾了，循环播放
    if (this.position >= this.audioData.length) {
      this.position = 0
    }
    
    return chunk
  }
  
  // 获取当前进度 (0-1)
  getProgress() {
    return this.position / this.audioData.length
  }
}

// 预设的测试场景
export const testScenarios = {
  // 场景 1: 简单的 440Hz 正弦波
  simpleSine: {
    name: '简单正弦波 (440Hz)',
    reference: () => generateTestAudio({ type: 'sine', frequency: 440, duration: 2 }),
    input: () => generateTestAudio({ type: 'sine', frequency: 440, duration: 5, noiseLevel: 0.02 })
  },
  
  // 场景 2: 复合音（和弦）
  chord: {
    name: 'C 大三和弦',
    reference: () => generateTestAudio({ 
      type: 'complex', 
      frequencies: [261.63, 329.63, 392], // C4, E4, G4
      duration: 2 
    }),
    input: () => generateTestAudio({ 
      type: 'complex', 
      frequencies: [261.63, 329.63, 392],
      duration: 5,
      noiseLevel: 0.03
    })
  },
  
  // 场景 3: 带噪声的语音模拟
  noisySpeech: {
    name: '带噪声的语音模拟',
    reference: () => generateTestAudio({ 
      type: 'complex', 
      frequencies: [300, 600, 1200, 2400],
      duration: 2,
      noiseLevel: 0.1
    }),
    input: () => generateTestAudio({ 
      type: 'complex', 
      frequencies: [300, 600, 1200, 2400],
      duration: 5,
      noiseLevel: 0.15
    })
  },
  
  // 场景 4: 不同频率（应该不匹配）
  mismatch: {
    name: '频率不匹配测试',
    reference: () => generateTestAudio({ type: 'sine', frequency: 440, duration: 2 }),
    input: () => generateTestAudio({ type: 'sine', frequency: 880, duration: 5 })
  }
}

// 导出所有工具函数
export default {
  generateSineWave,
  generateSquareWave,
  generateComplexWave,
  addNoise,
  generateTestAudio,
  AudioStreamSimulator,
  testScenarios
}
