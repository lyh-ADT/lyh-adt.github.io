# 边缘刻度尺设计文档

## 概述

将 web-ruler 的尺条从当前 60px 宽的独立条带改为紧贴屏幕边缘的 1-2px 细线，四条边同时显示，所有刻度和数值从边缘向页面内侧延伸。

## 需求

- 刻度紧贴屏幕边缘，向内侧延伸
- 数值标签保持显示在刻度旁
- 尺条宽度仅 1-2px 的线
- 四条边（上下左右）同时显示，四角交汇
- 保留单位切换、透明度、DPI 校准功能
- 移除方向切换器

## 架构

### 当前架构

```
App
  └── 4x Ruler (top, bottom, left, right)
        └── div (60px strip) + SVG (ticks within strip)
```

每条边是一个独立的 60px 宽 div 容器，内部 SVG 绘制刻度。刻度在 60px 范围内向内侧绘制。

### 新架构

```
App
  └── 1x Ruler
        └── SVG (full viewport)
              ├── 4 edge lines
              └── all ticks + labels
```

一个全屏 SVG 覆盖整个视口，包含四条边缘线和所有刻度。SVG 的 `viewBox` 直接对应屏幕像素坐标。

### SVG 结构

```jsx
<svg viewBox={`0 0 ${screenWidth} ${screenHeight}`} style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', pointerEvents: 'none' }}>
  {/* Edge lines */}
  <line x1="0" y1="0" x2={screenWidth} y2="0" stroke="#000" strokeWidth="1.5" />
  <line x1="0" y1={screenHeight} x2={screenWidth} y2={screenHeight} stroke="#000" strokeWidth="1.5" />
  <line x1="0" y1="0" x2="0" y2={screenHeight} stroke="#000" strokeWidth="1.5" />
  <line x1={screenWidth} y1="0" x2={screenWidth} y2={screenHeight} stroke="#000" strokeWidth="1.5" />

  {/* Horizontal ticks (top) */}
  <line x1={px} y1="0" x2={px} y2={tickHeight} ... />

  {/* Horizontal ticks (bottom) */}
  <line x1={px} y1={screenHeight} x2={px} y2={screenHeight - tickHeight} ... />

  {/* Vertical ticks (left) */}
  <line x1="0" y1={px} x2={tickHeight} y2={px} ... />

  {/* Vertical ticks (right) */}
  <line x1={screenWidth} y1={px} x2={screenWidth - tickHeight} y2={px} ... />

  {/* Labels */}
  <text x={...} y={...} ...>{label}</text>
</svg>
```

## 刻度渲染

### 刻度等级

| 级别 | 间隔 | 长度 | 标签 |
|------|------|------|------|
| 主刻度 | 每 1cm | 30px | 显示（如 "1.0"） |
| 中刻度 | 每 5mm | 20px | 不显示 |
| 小刻度 | 每 1mm | 10px | 不显示 |

### 刻度坐标

| 边 | 基准坐标 | 延伸方向 | 起点偏移 |
|----|----------|----------|----------|
| 顶部 | y=0 | 向下（+y） | 从 x=1px 开始 |
| 底部 | y=screenHeight | 向上（-y） | 从 x=1px 开始 |
| 左侧 | x=0 | 向右（+x） | 从 y=1px 开始 |
| 右侧 | x=screenWidth | 向左（-x） | 从 y=1px 开始 |

### 标签位置

| 边 | x 位置 | y 位置 | 文本对齐 |
|----|--------|--------|----------|
| 顶部 | tickPx + 4 | tickHeight + 14 | start |
| 底部 | tickPx - 4 | screenHeight - tickHeight - 6 | end |
| 左侧 | tickHeight + 4 | px + 4 | start |
| 右侧 | screenWidth - tickHeight - 4 | px + 4 | end |

### 单位换算

保持现有逻辑不变：

- **cm**: `pxPerUnit = dpi / 2.54`，主刻度标签 `mm / 10`（如 "1.0", "2.0"）
- **inch**: `pxPerUnit = dpi`，主刻度标签 `mm / 25.4`（如 "0.39", "0.79"）
- **px**: 直接显示像素值 `Math.round(px)`

## 角落处理

四条线在角落交叉：
- 顶部和底部线条覆盖完整宽度（x: 0 → screenWidth）
- 左侧和右侧线条覆盖完整高度（y: 0 → screenHeight）
- 四条线在角落自然交汇，形成完整边框效果
- 刻度从边缘 1px 之后开始绘制，避免与交叉线重叠

## 控件

### 保留
- 单位切换（cm / inch / px）
- 透明度滑块（0.3 - 1.0）
- DPI 显示 + 校准按钮 + 校准弹窗

### 移除
- 方向切换器（横/竖）— 四条边始终同时显示

### 总长度显示
- 移除角落的总长度标签（如 "19.2 cm"）— 因为尺条紧贴边缘，无多余空间显示
- 用户仍可通过底部测量显示区域查看屏幕尺寸信息

## 组件改动

### Ruler.jsx
- 从 4 个独立实例 → 1 个全屏实例
- 新增四条边缘线的渲染
- 刻度渲染逻辑保持，但坐标改为全屏 SVG 坐标系
- 移除 `position` prop（不再需要）

### Ruler.css
- 移除 4 条边的定位样式（`.ruler-full.top/bottom/left/right`）
- 新增全屏 SVG 样式

### Controls.jsx
- 移除方向切换按钮

### App.jsx
- 移除 4 个 Ruler 实例 → 改为单个 Ruler
- 移除 `orientation` 状态
- 底部测量显示区域保持不变

## 样式

保持黑白极简风格不变：
- 边缘线：`stroke: #000`, `stroke-width: 1.5`
- 刻度线：`stroke: #000`, `stroke-width: 1.5`
- 标签：`fill: #000`, `font-size: 12px`, `font-weight: 600`
- 文字阴影：`text-shadow: 0 0 2px rgba(255,255,255,0.8)`
- 背景：无（不再需要白色背景）
- 透明度：通过 SVG 的 `opacity` 属性控制

## 测试要点

1. 不同屏幕尺寸下刻度是否正确对齐边缘
2. 窗口缩放时刻度实时更新
3. DPI 校准后刻度间距正确
4. 透明度调节生效
5. 单位切换后数值正确
6. 四角交汇处视觉效果
7. 不影响页面交互（pointer-events: none）
