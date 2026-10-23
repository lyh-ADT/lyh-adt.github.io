import { describe, it, expect } from 'vitest'
import { BEEP_CUES, getCue } from './audioCues'

describe('audioCues', () => {
  it('包含待机、启动、Par Time 和枪声四种提示音', () => {
    expect(Object.keys(BEEP_CUES).sort()).toEqual(['parTime', 'shot', 'standby', 'start'])
  })

  it('每种提示音都有有效的音调定义', () => {
    for (const cue of Object.values(BEEP_CUES)) {
      expect(cue.tones.length).toBeGreaterThan(0)
      for (const tone of cue.tones) {
        expect(tone.frequency).toBeGreaterThan(0)
        expect(tone.duration).toBeGreaterThan(0)
        expect(tone.volume).toBeGreaterThan(0)
      }
    }
  })

  it('待机音比启动音更低', () => {
    const standby = BEEP_CUES.standby.tones[0]
    const start = BEEP_CUES.start.tones[0]
    expect(standby.frequency).toBeLessThan(start.frequency)
    expect(standby.duration).toBeLessThan(start.duration)
  })

  it('Par Time 是双音，并且音高下降，和单音提示区分开', () => {
    const [first, second] = BEEP_CUES.parTime.tones
    expect(BEEP_CUES.parTime.tones).toHaveLength(2)
    expect(second.frequency).toBeLessThan(first.frequency)
  })

  it('枪声提示音是更高、更短的点击，和启动音区分开', () => {
    const shot = BEEP_CUES.shot.tones[0]
    const start = BEEP_CUES.start.tones[0]
    expect(shot.duration).toBeLessThan(start.duration)
    expect(shot.frequency).toBeGreaterThan(start.frequency)
  })

  it('四种提示音的主频率互不相同', () => {
    const frequencies = [
      BEEP_CUES.standby.tones[0].frequency,
      BEEP_CUES.start.tones[0].frequency,
      BEEP_CUES.parTime.tones[0].frequency,
      BEEP_CUES.parTime.tones[1].frequency,
      BEEP_CUES.shot.tones[0].frequency
    ]
    expect(new Set(frequencies).size).toBe(frequencies.length)
  })

  it('未知名称返回 null', () => {
    expect(getCue('unknown')).toBeNull()
  })
})
