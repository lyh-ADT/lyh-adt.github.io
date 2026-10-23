# Shot Timer / 音频射击计时器

一个纯前端的射击训练计时器，包含三个模式：

- **Shot Timer**：随机延迟后提示开始，检测枪声并记录每枪间隔、总时间、Par Time 和自动重启。
- **随机 Beep 计时器**：随机延迟后播放提示音并开始计时，可选 Par Time。
- **自定义模式**：通过节点组合随机延迟、固定延迟、等待枪声、Par Time、蜂鸣器和自动重启。

## 技术栈

- React 18 + Vite 5
- Web Audio API / MediaDevices.getUserMedia
- Vitest

## 开发

```bash
pnpm install
pnpm dev
```

仓库内的 `pnpm-workspace.yaml` 已允许 esbuild 安装脚本，正常 `pnpm install` 即可。

麦克风只能在 `localhost` 或 HTTPS 页面使用。

## 测试与构建

```bash
pnpm test
pnpm build
```

构建产物输出到父仓库的 `docs/audio-pattern-detector`，用于 GitHub Pages 部署。Vite 的 `base` 为 `/audio-pattern-detector/`。

## 目录

```text
src/
  components/
    AudioDetector/       Shot Timer 页面
    RandomDelayBeep/     随机 Beep 页面
    CustomModePage/      自定义模式页面
    CustomModeEditor/    节点编辑器
  hooks/
    useAudioCore.js      麦克风、AudioContext、枪声检测核心
    useAudioDetection.js Shot Timer 状态与计时
    useCustomMode.js     自定义模式节点引擎
    useRandomDelay.js    随机延迟
    useBeep.js           共享 AudioContext 的提示音
  utils/
    audioDetection.js    RMS、阈值映射、时间格式化
  types/index.js         节点类型与默认配置
```

## 检测说明

当前枪声检测基于短窗口 RMS 能量：

- 默认窗口约 512 个采样点（44.1kHz 下约 11.6ms）。
- 界面阈值 0-1 映射到 RMS 0.01-0.30，默认 0.7 约等于 0.213。
- 使用 60ms refractory + 80ms 冷却，支持较快的连续射击。
- 环境噪声底会缓慢跟踪，持续噪声不会反复触发。
- 启动提示音后有 180ms 忽略窗口，提示音本身调短，降低外放时自触发的概率。

## 提示音

四种提示音使用不同音色，避免听混：

| 场景 | 音色 |
| --- | --- |
| 待机 / 随机延迟开始 | 600Hz，120ms，低频单音 |
| 启动 / 延迟结束 | 1400Hz，160ms，高频方波 |
| Par Time 到期 | 1000Hz → 720Hz 双音 |
| 检测到枪声 | 1800Hz，35ms 极短点击 |

Shot Timer 的设置里“计时提示音”控制待机、启动和 Par Time 三种提示音，“枪声提示音”单独控制枪声提示。随机 Beep 页面的“启用提示音”控制该页全部提示音；自定义模式在节点配置里单独开关。

如果使用外放扬声器，建议关闭“枪声提示音”或使用耳机；麦克风会拾取扬声器声音。
