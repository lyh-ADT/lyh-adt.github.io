import { useState, useCallback } from 'react'
import { NodeType, createNode, getNodeDisplayName, getNodeIcon, getNodeDescription, defaultNodeConfigs } from '../../types/index.js'
import './CustomModeEditor.css'

/**
 * 自定义模式编辑器组件
 * 允许用户添加、删除、配置节点
 */
function CustomModeEditor({ nodes, onNodesChange, disabled = false }) {
  const [selectedNodeIndex, setSelectedNodeIndex] = useState(null)

  // 添加节点
  const handleAddNode = useCallback((type) => {
    const newNode = createNode(type)
    const newNodes = [...nodes, newNode]
    onNodesChange(newNodes)
    setSelectedNodeIndex(newNodes.length - 1)
  }, [nodes, onNodesChange])

  // 删除节点
  const handleDeleteNode = useCallback((index) => {
    const newNodes = nodes.filter((_, i) => i !== index)
    onNodesChange(newNodes)
    if (selectedNodeIndex === index) {
      setSelectedNodeIndex(null)
    } else if (selectedNodeIndex > index) {
      setSelectedNodeIndex(selectedNodeIndex - 1)
    }
  }, [nodes, onNodesChange, selectedNodeIndex])

  // 移动节点
  const handleMoveNode = useCallback((index, direction) => {
    const newIndex = index + direction
    if (newIndex < 0 || newIndex >= nodes.length) return

    const newNodes = [...nodes]
    const temp = newNodes[index]
    newNodes[index] = newNodes[newIndex]
    newNodes[newIndex] = temp
    onNodesChange(newNodes)
    setSelectedNodeIndex(newIndex)
  }, [nodes, onNodesChange])

  // 更新节点配置
  const handleUpdateConfig = useCallback((index, key, value) => {
    const newNodes = nodes.map((node, i) => {
      if (i === index) {
        return {
          ...node,
          config: {
            ...node.config,
            [key]: value
          }
        }
      }
      return node
    })
    onNodesChange(newNodes)
  }, [nodes, onNodesChange])

  // 清空所有节点
  const handleClearAll = useCallback(() => {
    if (window.confirm('确定要清空所有节点吗？')) {
      onNodesChange([])
      setSelectedNodeIndex(null)
    }
  }, [onNodesChange])

  // 加载预设模式
  const loadPreset = useCallback((preset) => {
    onNodesChange(preset)
    setSelectedNodeIndex(null)
  }, [onNodesChange])

  return (
    <div className="custom-mode-editor">
      <div className="editor-header">
        <h2>🎯 自定义模式</h2>
        <div className="header-actions">
          <button
            className="btn btn-secondary btn-sm"
            onClick={handleClearAll}
            disabled={disabled || nodes.length === 0}
          >
            🗑️ 清空
          </button>
        </div>
      </div>

      {/* 预设模式 */}
      <div className="preset-modes">
        <button
          className="preset-btn"
          onClick={() => loadPreset(getShotTimerPreset())}
          disabled={disabled}
        >
          🔫 Shot Timer
        </button>
        <button
          className="preset-btn"
          onClick={() => loadPreset(getRandomBeepPreset())}
          disabled={disabled}
        >
          🎲 随机 Beep
        </button>
        <button
          className="preset-btn"
          onClick={() => loadPreset(getAdvancedPreset())}
          disabled={disabled}
        >
          🔥 进阶模式
        </button>
      </div>

      {/* 添加节点按钮 */}
      <div className="add-node-section">
        <span className="section-label">添加节点</span>
        <div className="add-node-buttons">
          <AddNodeButton
            type={NodeType.RandomDelay}
            onClick={() => handleAddNode(NodeType.RandomDelay)}
            disabled={disabled}
          />
          <AddNodeButton
            type={NodeType.WaitForShot}
            onClick={() => handleAddNode(NodeType.WaitForShot)}
            disabled={disabled}
          />
          <AddNodeButton
            type={NodeType.ParTime}
            onClick={() => handleAddNode(NodeType.ParTime)}
            disabled={disabled}
          />
          <AddNodeButton
            type={NodeType.FixedDelay}
            onClick={() => handleAddNode(NodeType.FixedDelay)}
            disabled={disabled}
          />
          <AddNodeButton
            type={NodeType.Beep}
            onClick={() => handleAddNode(NodeType.Beep)}
            disabled={disabled}
          />
          <AddNodeButton
            type={NodeType.AutoRestart}
            onClick={() => handleAddNode(NodeType.AutoRestart)}
            disabled={disabled}
          />
        </div>
      </div>

      {/* 节点列表 */}
      {nodes.length > 0 && (
        <div className="node-list-section">
          <span className="section-label">执行顺序</span>
          <div className="node-list">
            {nodes.map((node, index) => (
              <NodeItem
                key={node.id}
                node={node}
                index={index}
                isSelected={selectedNodeIndex === index}
                onSelect={() => setSelectedNodeIndex(index)}
                onDelete={() => handleDeleteNode(index)}
                onMoveUp={() => handleMoveNode(index, -1)}
                onMoveDown={() => handleMoveNode(index, 1)}
                onUpdateConfig={(key, value) => handleUpdateConfig(index, key, value)}
                disabled={disabled}
              />
            ))}
          </div>
        </div>
      )}

      {/* 节点配置面板 */}
      {selectedNodeIndex !== null && nodes[selectedNodeIndex] && (
        <NodeConfigPanel
          node={nodes[selectedNodeIndex]}
          index={selectedNodeIndex}
          onUpdateConfig={(key, value) => handleUpdateConfig(selectedNodeIndex, key, value)}
          onDelete={() => handleDeleteNode(selectedNodeIndex)}
          disabled={disabled}
        />
      )}
    </div>
  )
}

// 添加节点按钮组件
function AddNodeButton({ type, onClick, disabled }) {
  return (
    <button
      className="add-node-btn"
      onClick={onClick}
      disabled={disabled}
    >
      <span className="node-icon">{getNodeIcon(type)}</span>
      <span className="node-name">{getNodeDisplayName(type)}</span>
    </button>
  )
}

// 节点列表项组件
function NodeItem({ node, index, isSelected, onSelect, onDelete, onMoveUp, onMoveDown, disabled }) {
  const { type, config } = node
  const icon = getNodeIcon(type)
  const name = getNodeDisplayName(type)
  const description = getNodeDescription(type, config)

  return (
    <div
      className={`node-item ${isSelected ? 'selected' : ''}`}
      onClick={onSelect}
    >
      <div className="node-item-left">
        <span className="node-number">{index + 1}</span>
      </div>
      <div className="node-item-content">
        <div className="node-item-header">
          <span className="node-icon">{icon}</span>
          <span className="node-name">{name}</span>
        </div>
        <div className="node-item-description">{description}</div>
      </div>
      <div className="node-item-actions">
        <button
          className="action-btn move-btn"
          onClick={(e) => { e.stopPropagation(); onMoveUp(); }}
          disabled={disabled || index === 0}
          title="上移"
        >
          ⬆️
        </button>
        <button
          className="action-btn move-btn"
          onClick={(e) => { e.stopPropagation(); onMoveDown(); }}
          disabled={disabled || index === 0}
          title="下移"
        >
          ⬇️
        </button>
        <button
          className="action-btn delete-btn"
          onClick={(e) => { e.stopPropagation(); onDelete(); }}
          disabled={disabled}
          title="删除"
        >
          🗑️
        </button>
      </div>
    </div>
  )
}

// 节点配置面板组件
function NodeConfigPanel({ node, index, onUpdateConfig, onDelete, disabled }) {
  const { type, config } = node
  const icon = getNodeIcon(type)
  const name = getNodeDisplayName(type)

  return (
    <div className="node-config-panel">
      <div className="config-header">
        <h3>
          <span className="node-icon">{icon}</span>
          {name} 配置
        </h3>
        <button
          className="btn btn-danger btn-sm"
          onClick={onDelete}
          disabled={disabled}
        >
          删除节点
        </button>
      </div>

      <div className="config-body">
        {type === NodeType.RandomDelay && (
          <>
            <ConfigInput
              label="最小延迟 (ms)"
              value={config.minDelay}
              onChange={(v) => onUpdateConfig('minDelay', Math.max(100, Math.floor(v)))}
              min={100}
              max={10000}
              step={100}
              disabled={disabled}
            />
            <ConfigInput
              label="最大延迟 (ms)"
              value={config.maxDelay}
              onChange={(v) => onUpdateConfig('maxDelay', Math.max(config.minDelay, Math.floor(v)))}
              min={100}
              max={10000}
              step={100}
              disabled={disabled}
            />
          </>
        )}

        {type === NodeType.FixedDelay && (
          <ConfigInput
            label="延迟 (ms)"
            value={config.delay}
            onChange={(v) => onUpdateConfig('delay', Math.max(100, Math.floor(v)))}
            min={100}
            max={60000}
            step={100}
            disabled={disabled}
          />
        )}

        {type === NodeType.WaitForShot && (
          <>
            <ConfigInput
              label="检测阈值"
              value={config.threshold}
              onChange={(v) => onUpdateConfig('threshold', Math.max(0.1, Math.min(1, parseFloat(v))))}
              min={0.1}
              max={1}
              step={0.05}
              disabled={disabled}
            />
            <ToggleInput
              label="检测到枪声后播放提示音"
              checked={config.beepEnabled}
              onChange={(v) => onUpdateConfig('beepEnabled', v)}
              disabled={disabled}
            />
          </>
        )}

        {type === NodeType.ParTime && (
          <>
            <ConfigInput
              label="Par Time (ms)"
              value={config.parTime}
              onChange={(v) => onUpdateConfig('parTime', Math.max(100, Math.floor(v)))}
              min={100}
              max={60000}
              step={100}
              disabled={disabled}
            />
            <ToggleInput
              label="到期后播放提示音"
              checked={config.beepOnTimeout}
              onChange={(v) => onUpdateConfig('beepOnTimeout', v)}
              disabled={disabled}
            />
            <ToggleInput
              label="到期后停止整个流程"
              checked={config.stopOnTimeout}
              onChange={(v) => onUpdateConfig('stopOnTimeout', v)}
              disabled={disabled}
            />
          </>
        )}

        {type === NodeType.Beep && (
          <>
            <ConfigInput
              label="频率 (Hz)"
              value={config.frequency}
              onChange={(v) => onUpdateConfig('frequency', Math.max(200, Math.floor(v)))}
              min={200}
              max={5000}
              step={100}
              disabled={disabled}
            />
            <ConfigInput
              label="时长 (ms)"
              value={config.duration}
              onChange={(v) => onUpdateConfig('duration', Math.max(50, Math.floor(v)))}
              min={50}
              max={2000}
              step={50}
              disabled={disabled}
            />
          </>
        )}

        {type === NodeType.AutoRestart && (
          <>
            <ConfigInput
              label="射击次数"
              value={config.shotCount}
              onChange={(v) => onUpdateConfig('shotCount', Math.max(1, Math.floor(v)))}
              min={1}
              max={20}
              step={1}
              disabled={disabled}
            />
            <ConfigInput
              label="重启前延迟 (ms)"
              value={config.delayBeforeRestart}
              onChange={(v) => onUpdateConfig('delayBeforeRestart', Math.max(0, Math.floor(v)))}
              min={0}
              max={5000}
              step={100}
              disabled={disabled}
            />
          </>
        )}
      </div>
    </div>
  )
}

// 配置输入组件
function ConfigInput({ label, value, onChange, min, max, step, disabled }) {
  return (
    <div className="config-input">
      <label>{label}</label>
      <input
        type="number"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        min={min}
        max={max}
        step={step}
        disabled={disabled}
      />
    </div>
  )
}

// 开关输入组件
function ToggleInput({ label, checked, onChange, disabled }) {
  return (
    <div className="toggle-input">
      <label>
        <input
          type="checkbox"
          checked={checked}
          onChange={(e) => onChange(e.target.checked)}
          disabled={disabled}
        />
        <span className="toggle-label">{label}</span>
      </label>
    </div>
  )
}

// 预设模式
function getShotTimerPreset() {
  return [
    createNode(NodeType.RandomDelay),
    createNode(NodeType.WaitForShot),
    createNode(NodeType.AutoRestart)
  ]
}

function getRandomBeepPreset() {
  const node = createNode(NodeType.RandomDelay)
  node.config.beepOnComplete = true
  return [node]
}

function getAdvancedPreset() {
  return [
    createNode(NodeType.RandomDelay),
    createNode(NodeType.Beep),
    createNode(NodeType.WaitForShot),
    createNode(NodeType.ParTime),
    createNode(NodeType.AutoRestart)
  ]
}

export default CustomModeEditor
