/**
 * 自定义模式类型定义
 */

// 节点类型枚举
export const NodeType = {
  RandomDelay: 'randomDelay',    // 随机延迟
  WaitForShot: 'waitForShot',    // 等待枪声
  ParTime: 'parTime',           // Par Time 计时
  AutoRestart: 'autoRestart',   // 自动重启
  Beep: 'beep',                 // 蜂鸣器
  FixedDelay: 'fixedDelay'      // 固定延迟
}

// 节点配置默认值
export const defaultNodeConfigs = {
  [NodeType.RandomDelay]: {
    minDelay: 1000,  // 最小延迟（毫秒）
    maxDelay: 5000   // 最大延迟（毫秒）
  },
  [NodeType.WaitForShot]: {
    threshold: 0.7,      // 检测阈值
    beepEnabled: true,   // 检测到枪声后是否播放提示音
    beepFrequency: 1000, // 提示音频率
    beepDuration: 100    // 提示音时长
  },
  [NodeType.ParTime]: {
    parTime: 1000,       // Par Time（毫秒）
    beepOnTimeout: true, // 到期后是否播放提示音
    stopOnTimeout: false // 到期后是否停止整个流程
  },
  [NodeType.AutoRestart]: {
    delayBeforeRestart: 1000 // 重启前延迟（毫秒）
  },
  [NodeType.Beep]: {
    duration: 100,       // 蜂鸣时长（毫秒）
    frequency: 1000,     // 频率（Hz）
    volume: 0.5          // 音量
  },
  [NodeType.FixedDelay]: {
    delay: 1000          // 固定延迟（毫秒）
  }
}

// 创建新节点的辅助函数
export function createNode(type) {
  const config = defaultNodeConfigs[type]
  return {
    id: `node_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    type,
    config: { ...config }
  }
}

// 获取节点显示名称
export function getNodeDisplayName(type) {
  const names = {
    [NodeType.RandomDelay]: '随机延迟',
    [NodeType.WaitForShot]: '等待枪声',
    [NodeType.ParTime]: 'Par Time',
    [NodeType.AutoRestart]: '自动重启',
    [NodeType.Beep]: '蜂鸣器',
    [NodeType.FixedDelay]: '固定延迟'
  }
  return names[type] || type
}

// 获取节点图标
export function getNodeIcon(type) {
  const icons = {
    [NodeType.RandomDelay]: '🎲',
    [NodeType.WaitForShot]: '🔫',
    [NodeType.ParTime]: '⏱️',
    [NodeType.AutoRestart]: '🔄',
    [NodeType.Beep]: '🔔',
    [NodeType.FixedDelay]: '⏳'
  }
  return icons[type] || '⚙️'
}

// 获取节点描述
export function getNodeDescription(type, config) {
  switch (type) {
    case NodeType.RandomDelay:
      return `${(config.minDelay / 1000).toFixed(1)}s - ${(config.maxDelay / 1000).toFixed(1)}s 随机延迟`
    case NodeType.WaitForShot:
      return `阈值：${config.threshold}, 提示音：${config.beepEnabled ? '开' : '关'}`
    case NodeType.ParTime:
      return `${config.parTime}ms${config.stopOnTimeout ? ' (到期停止)' : ''}`
    case NodeType.AutoRestart:
      return `延迟${config.delayBeforeRestart}ms 后重启`
    case NodeType.Beep:
      return `${config.frequency}Hz, ${config.duration}ms`
    case NodeType.FixedDelay:
      return `${(config.delay / 1000).toFixed(1)}s 固定延迟`
    default:
      return ''
  }
}
