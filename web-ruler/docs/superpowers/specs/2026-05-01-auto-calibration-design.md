# 自动校准设计文档

## 概述

将当前的纯手动校准升级为分层自动校准系统，优先尝试自动获取屏幕 DPI，失败时降级到手动校准并给出明显提示。

## 需求

- 优先使用浏览器 API 自动获取屏幕 DPI
- 自动失败时使用设备数据库匹配
- 手动校准作为兜底方案
- 手动校准时显示明显提示，告知用户浏览器不支持自动校准
- 保留现有的银行卡、身份证等参考物选项

## 架构

### 分层校准策略

```
┌─────────────────────────────────────────┐
│  Layer 1: Screen Details API            │ → 自动 (Chrome/Edge)
│  - navigator.getScreenDetails()         │   精度：±1%
│  - window.screen.deviceXDPI             │
├─────────────────────────────────────────┤
│  Layer 2: Device Database Match         │ → 自动 (移动设备)
│  - userAgent → device → screenSize      │   精度：±3-5%
│  - 内置常见设备尺寸数据库               │
├─────────────────────────────────────────┤
│  Layer 3: Manual Calibration (Fallback) │ → 手动 (兜底)
│  - 银行卡/身份证/硬币等参考物           │   精度：±5-10%
│  - 保留现有校准弹窗                     │
└─────────────────────────────────────────┘
```

### 校准流程图

```
应用启动
    │
    ▼
┌─────────────────────┐
│ 尝试 Layer 1        │
│ Screen Details API  │
└─────────┬───────────┘
          │
    ┌─────┴─────┐
    │  成功？   │
    └──────────┘
     Yes  │  No
    ┌─────┴─────┐
    ▼           ▼
┌────────  ┌─────────────────────┐
│ 保存   │  │ 尝试 Layer 2        │
│ DPI    │  │ 设备数据库匹配      │
│ 显示   │  └────────────────────┘
│ 成功   │            │
│ 提示   │      ┌─────┴─────┐
└────────      │  成功？   │
                └──────────┘
                 Yes  │  No
                ┌─────┴─────┐
                ▼           ▼
           ┌────────┐  ┌─────────────────────┐
           │ 保存   │  │ 显示 Layer 3        │
           │ DPI    │  │ 手动校准弹窗        │
           │ 显示   │  │ + 明显提示          │
           │ 成功   │  └─────────────────────┘
           │ 提示   │
           └────────┘
```

## 技术实现

### Layer 1: Screen Details API

```js
async function autoCalibrate() {
  // 方法 1: Screen Details API (Chrome 114+)
  if (navigator.getScreenDetails) {
    try {
      const details = await navigator.getScreenDetails();
      // details.screen 包含物理尺寸信息
      const dpi = calculateDpiFromDetails(details);
      if (dpi) {
        saveDpi(dpi);
        showCalibrationSuccess(dpi);
        return true;
      }
    } catch (e) {
      // API 不可用，降级
    }
  }

  // 方法 2: 非标准但广泛支持的属性 (IE/旧版 Chrome)
  if (window.screen.deviceXDPI) {
    const dpi = window.screen.deviceXDPI;
    saveDpi(dpi);
    showCalibrationSuccess(dpi);
    return true;
  }

  if (window.screen.logicalXDPI) {
    const dpi = window.screen.logicalXDPI;
    saveDpi(dpi);
    showCalibrationSuccess(dpi);
    return true;
  }

  return false; // Layer 1 失败，降级到 Layer 2
}
```

### Layer 2: 设备数据库匹配

```js
const DEVICE_DB = {
  // iPhone
  'iPhone 15 Pro': { width: 393, height: 852, ppi: 460 },
  'iPhone 15': { width: 393, height: 852, ppi: 460 },
  'iPhone 14 Pro': { width: 393, height: 852, ppi: 460 },
  'iPhone 14': { width: 393, height: 852, ppi: 460 },
  'iPhone 13 Pro': { width: 393, height: 844, ppi: 460 },
  'iPhone 13': { width: 393, height: 844, ppi: 460 },
  'iPhone SE': { width: 375, height: 667, ppi: 326 },
  
  // iPad
  'iPad Pro 12.9': { width: 2048, height: 2732, ppi: 264 },
  'iPad Pro 11': { width: 1668, height: 2388, ppi: 264 },
  'iPad Air': { width: 1640, height: 2360, ppi: 264 },
  'iPad Mini': { width: 1620, height: 2160, ppi: 326 },
  
  // Android (常见旗舰)
  'Samsung Galaxy S24': { width: 1440, height: 3120, ppi: 493 },
  'Samsung Galaxy S23': { width: 1440, height: 3088, ppi: 493 },
  'Pixel 8 Pro': { width: 1344, height: 2992, ppi: 489 },
  'Pixel 8': { width: 1080, height: 2400, ppi: 428 },
  
  // Common Desktop Monitors
  '24inch 1080p': { width: 1920, height: 1080, ppi: 92 },
  '24inch 2K': { width: 2560, height: 1440, ppi: 123 },
  '27inch 1080p': { width: 1920, height: 1080, ppi: 82 },
  '27inch 2K': { width: 2560, height: 1440, ppi: 109 },
  '27inch 4K': { width: 3840, height: 2160, ppi: 163 },
  '32inch 4K': { width: 3840, height: 2160, ppi: 140 },
};

function detectDevice() {
  const ua = navigator.userAgent;
  
  // 匹配 iPhone
  const iphoneMatch = ua.match(/iPhone\s*([0-9]+)\s*(Pro\s*Max|Pro|Plus)?/i);
  if (iphoneMatch) {
    const model = `iPhone ${iphoneMatch[1]}${iphoneMatch[2] ? ' ' + iphoneMatch[2].trim() : ''}`;
    return findClosestDevice(model);
  }
  
  // 匹配 iPad
  if (ua.includes('iPad')) {
    const ipadMatch = ua.match(/iPad\s*(Pro\s*([0-9.]+)?|Air|Mini)/i);
    if (ipadMatch) {
      return findClosestDevice(`iPad ${ipadMatch[1]}`);
    }
  }
  
  // 匹配 Android
  const androidMatch = ua.match(/Android.*?([A-Za-z\s]+)\s*Build/i);
  if (androidMatch) {
    return findClosestDevice(androidMatch[1].trim());
  }
  
  return null;
}

function findClosestDevice(model) {
  // 模糊匹配设备名称
  const modelName = model.toUpperCase();
  for (const [name, specs] of Object.entries(DEVICE_DB)) {
    if (modelName.includes(name.toUpperCase()) || name.toUpperCase().includes(modelName)) {
      return { name, specs };
    }
  }
  return null;
}

async function deviceDatabaseCalibrate() {
  const device = detectDevice();
  if (device) {
    // 使用设备的 PPI 作为 DPI
    saveDpi(device.specs.ppi);
    showCalibrationSuccess(device.specs.ppi, device.name);
    return true;
  }
  return false; // Layer 2 失败，降级到 Layer 3
}
```

### Layer 3: 手动校准（兜底）

```js
async function initCalibration() {
  // 显示"正在自动检测"状态
  showAutoDetecting();
  
  // Layer 1
  const layer1Success = await autoCalibrate();
  if (layer1Success) return;
  
  // Layer 2
  const layer2Success = await deviceDatabaseCalibrate();
  if (layer2Success) return;
  
  // Layer 3: 显示手动校准弹窗 + 明显提示
  showManualCalibrationWithWarning();
}

function showManualCalibrationWithWarning() {
  // 显示校准弹窗，带有明显的警告提示
  // 提示文案:
  // "⚠️ 无法自动获取屏幕尺寸"
  // "当前浏览器不支持自动校准 API"
  // "请手动完成校准以保证测量准确"
  // "建议使用 Chrome/Edge 浏览器以获得自动校准功能"
}
```

## UI 状态

### 状态 1: 自动检测中
```
┌─────────────────────────────────────┐
│   🔄 正在自动检测屏幕尺寸...        │
│      尝试获取物理 DPI 信息           │
│                                     │
│         [跳过 →]                    │
└─────────────────────────────────────┘
```

### 状态 2: 自动校准成功
```
┌─────────────────────────────────────┐
│   ✓ 已自动校准                      │
│   检测到屏幕：24" 1920×1080         │
│   DPI: 96                           │
└─────────────────────────────────────┘
```
显示 2 秒后自动消失。

### 状态 3: 需要手动校准
```
┌─────────────────────────────────────┐
│ ⚠️ 无法自动获取屏幕尺寸             │
│                                     │
│ 当前浏览器不支持自动校准 API。      │
│ 请手动完成校准以保证测量准确。      │
│                                     │
│ 建议使用 Chrome/Edge 浏览器以获得   │
│ 自动校准功能。                      │
│                                     │
│ ─────────────────────────────────   │
│                                     │
│ 快速校准                            │
│ ┌─────────────────────────────────┐ │
│ │ 🪪 银行卡/信用卡 (8.56cm)       │ │
│ │ 🪪 身份证 (8.56cm)              │ │
│ │ 📱 SIM 卡 (2.5cm)               │ │
│ │ 🪙 一元硬币 (2.5cm)             │ │
│ └─────────────────────────────────┘ │
│                                     │
│ 自定义校准                          │
│ 实际宽度 (cm): [____]               │
│ 测量像素：   [____]                 │
│           [计算并保存]              │
│                                     │
│              [取消]                 │
└─────────────────────────────────────┘
```

## 修改的文件

### 新增文件
- `src/utils/autoCalibrate.js` - 自动校准逻辑
- `src/data/deviceDb.js` - 设备尺寸数据库

### 修改文件
- `src/App.jsx` - 集成自动校准流程
- `src/components/CalibrationModal.jsx` - 增加警告提示 UI
- `src/components/CalibrationModal.css` - 警告提示样式

## 测试要点

1. **Layer 1 测试**
   - Chrome/Edge: 应成功获取 DPI
   - Firefox/Safari: 应降级到 Layer 2

2. **Layer 2 测试**
   - iPhone/iPad: 应匹配到对应设备
   - Android 旗舰: 应匹配到对应设备
   - 未知设备: 应降级到 Layer 3

3. **Layer 3 测试**
   - 显示明显提示
   - 保留现有校准功能
   - 提示信息清晰可读

4. **UI 状态测试**
   - 自动检测中状态显示正确
   - 成功提示 2 秒后消失
   - 手动校准弹窗样式正确

## 注意事项

1. **隐私考虑**: Screen Details API 可能需要用户授权
2. **降级提示**: 明确告知用户为什么需要手动校准
3. **浏览器推荐**: 建议用户使用支持自动校准的浏览器
4. **数据库更新**: 设备数据库应定期更新
