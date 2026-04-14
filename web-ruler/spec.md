# Web Ruler Tool - Product Specification

## 1. Overview
一个基于网页的直尺工具，允许用户在屏幕上测量物理尺寸或像素距离。支持桌面端和移动端浏览器。采用 React 技术栈，简洁黑白风格。

## 2. Core Features

### 2.1 测量功能
- **厘米/英寸切换**: 支持公制和英制单位
- **像素测量**: 显示像素距离
- **多角度测量**: 支持水平、垂直、对角线测量
- **自定义起点**: 用户可拖拽设置测量起点和终点
- **实时数值**: 拖拽时实时显示当前测量值

### 2.2 校准功能（可选）
- **屏幕校准**: 用户可用真实卡片（如信用卡）校准屏幕 DPI
- **保存校准**: localStorage 持久化存储
- **重置校准**: 一键恢复默认 96 DPI
- **多设备支持**: 不同设备独立保存校准数据

### 2.3 界面特性
- **半透明叠加**: 可置顶显示，透明度可调
- **多标尺**: 支持同时显示多个标尺
- **吸附功能**: 自动吸附到屏幕边缘或窗口边界
- **快捷键**: 快速显示/隐藏、重置、切换单位

## 3. Mobile Support

### 3.1 触屏适配
- **触摸拖拽**: 支持手指拖拽标尺，触摸区域最小 44px
- **双指缩放**: 支持 pinch-to-zoom 调整标尺精度
- **横屏模式**: 提示用户横屏获得更长测量范围
- **防止误触**: 测量时禁用页面滚动和缩放

### 3.2 移动端校准
- **常用参照物**: 预设常见物品尺寸（SIM 卡、银行卡、硬币等）
- **快速选择**: 一键选择参照物完成校准

### 3.3 响应式设计
- **自适应布局**: 标尺根据屏幕宽度自动调整
- **小屏优化**: 手机端简化 UI，突出核心测量功能
- **PWA 支持**: 可添加到主屏幕，离线使用

## 4. Technical Requirements

### 4.1 技术栈
- **框架**: React 18+
- **构建工具**: Vite
- **样式**: CSS Modules 或 Tailwind CSS
- **状态管理**: React Hooks (useState, useReducer, useContext)
- **存储**: localStorage 保存校准数据
- **语言**: TypeScript (可选)

### 4.2 项目结构
```
web-ruler/
├── public/
│   └── manifest.json
├── src/
│   ├── components/
│   │   ├── Ruler/
│   │   │   ├── Ruler.tsx
│   │   │   ├── RulerHorizontal.tsx
│   │   │   └── RulerVertical.tsx
│   │   ├── Calibration/
│   │   │   ├── CalibrationModal.tsx
│   │   │   └── ReferenceCard.tsx
│   │   ├── Controls/
│   │   │   ├── UnitToggle.tsx
│   │   │   ├── OpacitySlider.tsx
│   │   │   └── AddRulerButton.tsx
│   │   └── UI/
│   │       ├── Button.tsx
│   │       ├── Modal.tsx
│   │       └── Icon.tsx
│   ├── hooks/
│   │   ├── useRuler.ts
│   │   ├── useCalibration.ts
│   │   ├── useTouch.ts
│   │   └── useLocalStorage.ts
│   ├── context/
│   │   └── RulerContext.tsx
│   ├── styles/
│   │   ├── globals.css
│   │   └── variables.css
│   ├── utils/
│   │   ├── calibration.ts
│   │   ├── measurement.ts
│   │   └── constants.ts
│   ├── App.tsx
│   ├── main.tsx
│   └── vite-env.d.ts
├── index.html
├── package.json
├── tsconfig.json
├── vite.config.ts
└── README.md
```

### 4.3 兼容性
- **桌面端**: Chrome/Edge/Firefox 最新两个版本
- **移动端**: iOS Safari 15+、Android Chrome 100+
- **触屏设备**: 支持触摸事件

## 5. UI/UX Design

### 5.1 视觉风格 - 黑白极简
- **主色调**: 纯黑 (#000000)、纯白 (#FFFFFF)
- **辅助色**: 深灰 (#333333)、中灰 (#666666)、浅灰 (#CCCCCC)
- **刻度线**: 黑色，不同长度区分刻度层级
- **数字**: 黑色，系统字体，清晰易读
- **背景**: 半透明白色 (rgba(255,255,255,0.9))
- **边框**: 1px 黑色实线

### 5.2 设计原则
- **极简**: 无多余装饰，功能优先
- **高对比**: 黑白对比确保清晰可读
- **一致性**: 所有元素统一风格
- **克制**: 无动画或仅必要微交互

### 5.3 交互流程
1. 打开网页 → 自动加载上次校准 → 显示默认标尺
2. 点击"校准" → 选择参照物/输入尺寸 → 完成
3. 拖拽标尺 → 实时显示测量值
4. 点击"+" → 添加新标尺

## 6. Component Details

### 6.1 Ruler 组件
```tsx
interface RulerProps {
  id: string;
  orientation: 'horizontal' | 'vertical';
  position: { x: number; y: number };
  length: number;
  unit: 'cm' | 'inch' | 'px';
  calibration: number; // DPI
  onMove: (newPosition: Position) => void;
  onRemove: () => void;
}
```

### 6.2 CalibrationModal 组件
```tsx
interface CalibrationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (dpi: number) => void;
  currentDpi: number;
}
```

## 7. State Management

### 7.1 Global State (Context)
```tsx
interface RulerState {
  rulers: Ruler[];
  unit: 'cm' | 'inch' | 'px';
  calibration: { [deviceId: string]: number };
  opacity: number;
}

interface RulerContextType {
  state: RulerState;
  addRuler: () => void;
  removeRuler: (id: string) => void;
  moveRuler: (id: string, position: Position) => void;
  setUnit: (unit: 'cm' | 'inch' | 'px') => void;
  setCalibration: (dpi: number) => void;
  setOpacity: (opacity: number) => void;
}
```

## 8. Future Enhancements
- 角度测量器（量角器）
- 面积测量
- 截图标注导出
- 多语言支持
- 主题切换（保留黑白默认）

## 9. Development Guidelines

### 9.1 代码规范
- 函数组件 + Hooks
- TypeScript 类型安全
- ESLint + Prettier 代码格式化
- 组件单一职责

### 9.2 性能优化
- React.memo 缓存静态组件
- useMemo/useCallback 优化计算
- 懒加载非核心功能
- 触摸事件防抖

### 9.3 测试
- 单元测试：Jest + React Testing Library
- E2E 测试：Playwright
- 手动测试：多设备真机测试
