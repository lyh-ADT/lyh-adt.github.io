/**
 * 随机延迟 Hook - 可复用的随机延迟功能
 */

import { useState, useCallback, useRef, useEffect } from 'react'

/**
 * 使用随机延迟
 * @param {Object} options - 配置选项
 * @param {number} options.minDelay - 最小延迟（毫秒），默认 1000
 * @param {number} options.maxDelay - 最大延迟（毫秒），默认 5000
 * @param {Function} options.onComplete - 延迟完成后的回调
 * @returns {Object} 随机延迟的状态和控制函数
 */
export function useRandomDelay(options = {}) {
  const {
    minDelay = 1000,
    maxDelay = 5000,
    onComplete = null
  } = options

  const [isWaiting, setIsWaiting] = useState(false)
  const [countdown, setCountdown] = useState(0)
  const [delayMs, setDelayMs] = useState(0)
  const timerRef = useRef(null)
  const intervalRef = useRef(null)

  // 生成随机延迟
  const generateRandomDelay = useCallback(() => {
    return Math.floor(Math.random() * (maxDelay - minDelay + 1)) + minDelay
  }, [minDelay, maxDelay])

  // 开始随机延迟
  const startDelay = useCallback(() => {
    const delay = generateRandomDelay()
    const delayInSeconds = delay / 1000

    setDelayMs(delay)
    setIsWaiting(true)
    setCountdown(delayInSeconds)

    // 倒计时更新
    const startTime = Date.now()
    intervalRef.current = setInterval(() => {
      const elapsed = (Date.now() - startTime) / 1000
      const remaining = delayInSeconds - elapsed
      if (remaining <= 0) {
        clearInterval(intervalRef.current)
        intervalRef.current = null
        setCountdown(0)
      } else {
        setCountdown(parseFloat(remaining.toFixed(1)))
      }
    }, 100)

    // 延迟完成后执行回调
    timerRef.current = setTimeout(() => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
        intervalRef.current = null
      }
      setIsWaiting(false)
      setCountdown(0)
      if (onComplete) {
        onComplete()
      }
    }, delay)
  }, [generateRandomDelay, onComplete])

  // 取消延迟
  const cancelDelay = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current)
      timerRef.current = null
    }
    if (intervalRef.current) {
      clearInterval(intervalRef.current)
      intervalRef.current = null
    }
    setIsWaiting(false)
    setCountdown(0)
    setDelayMs(0)
  }, [])

  // 清理
  useEffect(() => {
    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current)
      }
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
      }
    }
  }, [])

  return {
    isWaiting,
    countdown,
    delayMs,
    startDelay,
    cancelDelay
  }
}

/**
 * 使用随机延迟并自动执行动作
 * @param {Function} action - 延迟完成后要执行的动作
 * @param {Object} options - 配置选项
 * @returns {Object} 随机延迟的状态和控制函数
 */
export function useRandomDelayAction(action, options = {}) {
  const {
    minDelay = 1000,
    maxDelay = 5000,
    onBeforeAction = null
  } = options

  const [isWaiting, setIsWaiting] = useState(false)
  const [countdown, setCountdown] = useState(0)
  const timerRef = useRef(null)
  const intervalRef = useRef(null)

  // 生成随机延迟
  const generateRandomDelay = useCallback(() => {
    return Math.floor(Math.random() * (maxDelay - minDelay + 1)) + minDelay
  }, [minDelay, maxDelay])

  // 开始随机延迟
  const startDelay = useCallback(() => {
    const delay = generateRandomDelay()
    const delayInSeconds = delay / 1000

    setIsWaiting(true)
    setCountdown(delayInSeconds)

    // 倒计时更新
    const startTime = Date.now()
    intervalRef.current = setInterval(() => {
      const elapsed = (Date.now() - startTime) / 1000
      const remaining = delayInSeconds - elapsed
      if (remaining <= 0) {
        clearInterval(intervalRef.current)
        intervalRef.current = null
        setCountdown(0)
      } else {
        setCountdown(parseFloat(remaining.toFixed(1)))
      }
    }, 100)

    // 延迟完成后执行动作
    timerRef.current = setTimeout(() => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
        intervalRef.current = null
      }
      setIsWaiting(false)
      setCountdown(0)
      if (onBeforeAction) {
        onBeforeAction()
      }
      if (action) {
        action()
      }
    }, delay)
  }, [generateRandomDelay, action, onBeforeAction])

  // 取消延迟
  const cancelDelay = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current)
      timerRef.current = null
    }
    if (intervalRef.current) {
      clearInterval(intervalRef.current)
      intervalRef.current = null
    }
    setIsWaiting(false)
    setCountdown(0)
  }, [])

  // 清理
  useEffect(() => {
    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current)
      }
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
      }
    }
  }, [])

  return {
    isWaiting,
    countdown,
    startDelay,
    cancelDelay
  }
}

export default useRandomDelay
