# js-face-detector

Vue 3 人脸检测组件库，基于 [Human.js](https://github.com/vladmandic/human) 实现，提供三种完整的人脸检测模式.

> 📖 **想了解更多？** 查看详细的[项目宣传介绍文章](./PROMOTION_ARTICLE.md)与[Human.js 技术详解](./HUMAN_JS_TECHNICAL_DETAILS.md)

## 🚀 快速体验

扫描下方二维码即可体验完整的人脸检测功能：

<div align="center">
  <img src="./doc/扫码刷脸.png" alt="扫码体验人脸检测" width="250" />
  <p><strong>👆 扫码体验</strong></p>
</div>

---

## 功能概览

- ✅ **三种检测模式**：人脸采集、动作活体验证、静默活体检测
- ✅ **实时人脸检测**：从摄像头捕获人脸并进行实时验证
- ✅ **精确的人脸位置检验**：验证有且仅有一张正脸，并检查人脸占比和正对度
- ✅ **多种活体检测方式**：支持眨眼、张嘴、点头等多种动作识别
- ✅ **图像质量检测与自动重采**：智能检测图像清晰度，模糊图片自动重采集直到满足质量要求
- ✅ **防止换人算法**：检测过程中实时监控人脸数量变化，防止检测中途换人
- ✅ **详细的调试信息**：提供完整的检测过程日志便于问题诊断
- ✅ **移动设备适配**：完全支持移动设备，自适应屏幕方向变化

## 技术栈

- Vue 3 + TypeScript
- Vite 构建工具
- @vladmandic/human (AI 检测引擎)

## 快速开始

### 安装依赖
```bash
npm install
```

### 开发模式
```bash
npm run dev
```

在浏览器中访问 `http://localhost:5173`

### 构建生产版本
```bash
npm run build
```

## 核心组件：FaceDetector

### 三种检测模式

#### 1. **采集模式（COLLECTION）**
检测到符合条件的正脸后自动采集图片。

**模式属性：**
```typescript
interface CollectionModeProps {
  mode: 'collection'
  minFaceRatio?: number        // 最小人脸占比 (0-1)，默认 0.5
  maxFaceRatio?: number        // 最大人脸占比 (0-1)，默认 0.9
  minFrontal?: number          // 最小正脸置信度 (0-1)，默认 0.9
  showStatusPrompt?: boolean   // 是否显示状态提示文本，默认 true
}
```

**模式事件：**
```typescript
// 人脸被检测到
@face-detected="(data: FaceDetectedData) => {
  count: number              // 检测到的人脸数量
  size: number               // 人脸占画面比例 (0-1)
  frontal: number            // 人脸正对度 (0-1)
}"

// 人脸成功采集
@face-collected="(data: FaceCollectedData) => {
  imageData: string | null   // 采集的 Base64 图片数据
}"

// 检测过程出错
@error="(data: ErrorData) => {
  code: ErrorCode            // 错误代码
  message: string            // 错误信息
}"
```

**使用示例：**
```vue
<FaceDetector
  mode="collection"
  :min-face-ratio="0.5"
  :max-face-ratio="0.9"
  :min-frontal="0.9"
  @face-detected="handleFaceDetected"
  @face-collected="handleFaceCollected"
  @error="handleError"
/>
```

---

#### 2. **动作活体检测模式（LIVENESS）**
要求用户执行指定的活体动作（眨眼、张嘴、点头）来验证真人身份。

**模式属性：**
```typescript
interface LivenessModeProps {
  mode: 'liveness'
  liveness-checks?: LivenessAction[]     // 支持的动作数组
  liveness-action-count?: number         // 需要完成的动作数量，默认 1
  liveness-action-timeout?: number       // 每个动作的超时时间（秒），默认 60
  show-action-prompt?: boolean           // 是否显示动作提示文本，默认 true
  show-status-prompt?: boolean           // 是否显示状态提示文本，默认 true
  minFaceRatio?: number
  maxFaceRatio?: number
  minFrontal?: number
}
```

**模式事件：**
```typescript
// 动作检测状态变化
@liveness-action="(data: LivenessActionData) => {
  action: LivenessAction                 // 当前动作
  description: string                    // 动作描述
  status: LivenessActionStatus           // 动作状态: started|completed|timeout
}"

// 活体检测完成
@liveness-completed="(data: LivenessCompletedData) => {
  imageData: string | null               // 采集的 Base64 图片数据
  liveness: number                       // 活体置信度 (0-1)
}"

@face-detected    // 同采集模式
@error            // 同采集模式
```

**使用示例：**
```vue
<FaceDetector
  mode="liveness"
  :liveness-checks="[
    LivenessAction.BLINK,
    LivenessAction.MOUTH_OPEN,
    LivenessAction.NOD
  ]"
  :liveness-action-count="2"
  :liveness-action-timeout="60"
  :show-action-prompt="true"
  :show-status-prompt="true"
  @liveness-action="handleLivenessAction"
  @liveness-completed="handleLivenessCompleted"
  @error="handleError"
/>
```

---

#### 3. **静默活体检测模式（SILENT_LIVENESS）**
自动采集图片后进行活体检测，无需用户执行任何动作，完全自动化。

**模式属性：**
```typescript
interface SilentLivenessModeProps {
  mode: 'silent_liveness'
  silent-liveness-threshold?: number     // 活体置信度阈值 (0-1)，默认 0.85
  minFaceRatio?: number
  maxFaceRatio?: number
  minFrontal?: number
  showActionPrompt?: boolean             // 是否显示动作提示文本，默认 true
  showStatusPrompt?: boolean             // 是否显示状态提示文本，默认 true
}
```

**模式事件：**
```typescript
// 活体检测数据（实时更新）
@liveness-detected="(data: LivenessDetectedData) => {
  real: number                           // 反欺骗得分 (0-1)
  live: number                           // 活体检测得分 (0-1)
}"

// 活体检测完成
@liveness-completed="(data: LivenessCompletedData) => {
  imageData: string | null               // 采集的 Base64 图片数据
  liveness: number                       // 最终活体置信度 (0-1)
}"

@face-detected    // 同采集模式
@error            // 同采集模式
```

**使用示例：**
```vue
<FaceDetector
  mode="silent_liveness"
  :silent-liveness-threshold="0.85"
  :show-action-prompt="true"
  :show-status-prompt="true"
  @liveness-detected="handleLivenessDetected"
  @liveness-completed="handleLivenessCompleted"
  @error="handleError"
/>
```

---

### 支持的活体动作

| 动作 | 枚举值 | 描述 | 实现原理 |
|-----|------|------|--------|
| **眨眼** | `BLINK` | 快速闭上眼睛 | 通过 Human.js 的手势识别检测眼睛的开闭状态变化 |
| **张嘴** | `MOUTH_OPEN` | 张开嘴巴 | 检测嘴巴打开百分比，超过 20% 则判定为张嘴状态 |
| **点头** | `NOD` | 上下摇头 | 识别头部的上下运动方向，包括抬头(up)和低头(down) |

**动作检测代码示例：**
```typescript
// 眨眼检测
function isBlinkDetected(gestures: any): boolean {
  return gestures?.some((g: any) => g.gesture?.includes('blink')) ?? false
}

// 张嘴检测（>20% 打开度）
function isMouthOpenDetected(gestures: any): boolean {
  return gestures.some((g: any) => {
    const percentMatch = g.gesture?.match(/mouth (\d+)% open/)?.[1]
    const percent = percentMatch ? parseInt(percentMatch) : 0
    return percent > 20
  })
}

// 点头检测（包括抬头和低头）
function isNodDetected(gestures: any): boolean {
  const currentHead = gestures.find((g: any) => g.gesture?.includes('head'))?.gesture
  return !!currentHead?.match(/(up|down)/)
}
```

---

### 图像质量检测与自动重采集

为了保证采集到的图片质量，组件内置了**自动图像质量检测机制**。当采集到的图片模糊或质量不足时，会自动提示用户并继续采集，直到获得满足质量要求的图片。

#### 质量检测原理

Human.js 在人脸检测时会返回三个关键的质量指标，通过这些指标可以有效判断图像是否清晰：

| 指标 | 含义 | 最佳阈值 | 对图像清晰度的反映度 |
|-----|------|---------|------------------|
| **boxScore** | 人脸检测框置信度 | ≥ 0.6 | 低 (粗略定位) |
| **faceScore** | 人脸网格置信度 ⭐ | ≥ 0.8 | 高 (精确定位 468 个点) |
| **score** | 综合评分 | ≥ 0.7 | 中等 |

**关键发现**：`faceScore` 最能反映图像是否清晰！
- 原理：Human.js 需要检测面部的 468 个网格点
- 清晰图像 → 网格点检测精确 → faceScore 高 ✓
- 模糊图像 → 网格点检测困难 → faceScore 低 ✗

#### 质量检测的工作流程

```
采集模式 (COLLECTION):
  检测到合格人脸
      ↓
  捕获图片
      ↓
  检查质量 ← 新增
      ├─ ✓ 通过 → 返回图片，采集完成
      └─ ✗ 失败 → 提示"图像质量不足，请调整角度再试"
                 继续采集新帧 ↑

静默活体检测 (SILENT_LIVENESS):
  检测到合格人脸
      ↓
  捕获图片
      ↓
  检查质量 ← 新增（第1次）
      ├─ ✗ 失败 → 继续采集新帧 ↑
      └─ ✓ 通过 → 进行活体检测
                 ├─ ✗ 失败 → 继续采集 ↑
                 └─ ✓ 通过 → 再检查质量 ← 新增（第2次）
                            ├─ ✗ 失败 → 重新采集 ↑
                            └─ ✓ 通过 → 返回结果 ✓
```

#### 配置质量阈值

```typescript
// src/components/face-detector.ts 中的配置

CONFIG.IMAGE_QUALITY = {
  // 检测框置信度阈值 (0-1)
  // 推荐: 0.5-0.7（越低越容易通过）
  MIN_BOX_SCORE: 0.6,
  
  // 网格置信度阈值 (0-1)
  // 推荐: 0.75-0.85（最关键指标）
  MIN_FACE_SCORE: 0.8,
  
  // 综合分数阈值 (0-1)
  // 推荐: 0.6-0.75
  MIN_OVERALL_SCORE: 0.7
}
```

#### 场景推荐配置

| 场景 | MIN_BOX_SCORE | MIN_FACE_SCORE | MIN_OVERALL_SCORE | 说明 |
|------|---|---|---|---|
| **严格采集** | 0.7 | 0.85 | 0.8 | 采集最清晰的图片，采集时间较长 |
| **标准采集** | 0.6 | **0.8** | **0.7** | **推荐** ← 推荐使用 |
| **快速采集** | 0.5 | 0.75 | 0.65 | 采集快速但质量一般 |
| **演示/测试** | 0.3 | 0.5 | 0.4 | 演示环境 |

#### 质量检测事件

通过 `@debug` 事件可以监听图像质量检测的详细信息：

```typescript
@debug="(debug) => {
  if (debug.stage === 'quality-check') {
    console.log('质量检测结果:', debug.details)
    // 输出例:
    // {
    //   passed: false,
    //   score: 0.75,
    //   boxScore: 0.65,
    //   faceScore: 0.75,
    //   overallScore: 0.75,
    //   reasons: ['图像模糊 (faceScore: 0.75 < 0.8)']
    // }
  }
}"
```

#### 实时质量评分示例

```vue
<template>
  <div>
    <FaceDetector
      mode="collection"
      @face-detected="(data) => {
        faceScore = data.quality?.faceScore || 0
      }"
      @debug="(debug) => {
        if (debug.stage === 'quality-check') {
          qualityPassed = debug.details.passed
          qualityScore = debug.details.score
          qualityReasons = debug.details.reasons
        }
      }"
    />
    
    <!-- 质量显示 -->
    <div class="quality-panel">
      <p>图像质量: {{ (qualityScore * 100).toFixed(0) }}%</p>
      <p :class="qualityPassed ? 'success' : 'warning'">
        {{ qualityPassed ? '✓ 质量符合' : '✗ 质量不足' }}
      </p>
      <ul v-if="qualityReasons.length">
        <li v-for="reason in qualityReasons" :key="reason">{{ reason }}</li>
      </ul>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import FaceDetector from './components/FaceDetector.vue'

const qualityScore = ref(0)
const qualityPassed = ref(false)
const qualityReasons = ref<string[]>([])
</script>

<style scoped>
.quality-panel {
  padding: 20px;
  border-radius: 8px;
  background: #f5f5f5;
}

.success {
  color: #42b983;
}

.warning {
  color: #f5a623;
}
</style>
```

#### 常见问题

**Q: 为什么采集时间很长？**  
A: 可能是光线不足或角度不对。建议：
- 增加环境光线照度
- 调整脸部角度，保持正脸
- 提高设备摄像头质量
- 可适当降低 `MIN_FACE_SCORE` 阈值

**Q: 采集到的图片还是模糊？**  
A: 可能的原因：
1. 光线太暗 → 增加光线
2. 距离太远 → 靠近摄像头（30-50cm）
3. 角度不对 → 保持正脸对向摄像头
4. 设备问题 → 更换设备或清洁镜头

**Q: faceScore 代表什么？**  
A: faceScore 是人脸网格的置信度。Human.js 需要检测 468 个面部网格点，清晰的图像才能精确定位这些点。因此 **faceScore 最能反映图像是否清晰**。

#### 性能影响

- **计算开销**: 0（使用已有的检测结果，无额外计算）
- **内存占用**: 0（无新数据结构）
- **采集延迟**: +500-2000ms（取决于光线和角度）
- **采集成功率**: ↑ 提升（采集到更清晰的图片）

---

### 防止换人算法

项目采用**实时人脸数量监控**机制来防止检测过程中换人：

#### 核心算法原理

1. **状态跟踪**
   - 在活体检测开始时，标记 `isLivenessStarted` 为 true
   - 记录初始采集的人脸基线图像

2. **每帧检验**
   - 每一帧检测结果都调用 `shouldStopLivenessOnFaceCountChange()` 进行验证
   - 检查当前帧中的人脸数量是否为 1

3. **异常检测**
   ```typescript
   function shouldStopLivenessOnFaceCountChange(faceCount: number): boolean {
     // 在 LIVENESS 模式下，已开始检测但人脸数量不为 1 时应中止
     if (props.mode === DetectionMode.LIVENESS && 
         detectionState.isLivenessStarted && 
         faceCount !== 1) {
       return true  // 触发停止
     }
     
     // 在 SILENT_LIVENESS 模式下，已开始检测但人脸数量不为 1 时应中止
     if (props.mode === DetectionMode.SILENT_LIVENESS && 
         detectionState.isSilentLivenessStarted && 
         faceCount !== 1) {
       return true  // 触发停止
     }
     
     return false
   }
   ```

4. **失败处理**
   - 检测到人脸数量变化时立即停止检测
   - 返回错误码 `FACE_COUNT_CHANGED`
   - 提示用户"检测到人脸数量变化，请保持正脸对着摄像头，重新开始检测"
   - 将视频容器边框颜色改为红色（错误状态）

#### 防护场景

- **防止换人**：A 人开始检测后，B 人试图接手会被立即检测到
- **防止遮挡**：人脸被遮挡导致检测失败也会被发现
- **防止舍弃**：用户在检测过程中转身离开摄像头会被检测到
- **防止多人欺诈**：两个人脸同时出现在画面中会立即失败

#### 检测流程图

```
初始状态 (isLivenessStarted = false)
    ↓
检测到符合条件的单张人脸
    ↓
设置 isLivenessStarted = true
采集基线图像
    ↓
------- 循环检测每一帧 -------
    ↓
检查人脸数量 === 1?
    ├─ 是 → 继续活体检测
    └─ 否 → 立即停止，返回错误
    ↓
执行相应的活体动作检测
    ↓
动作完成或超时?
    ├─ 完成 → 检查是否全部完成
    │         ├─ 是 → 活体检测成功
    │         └─ 否 → 选择下一个动作
    └─ 超时 → 返回错误
```

---

## 组件属性完整参考

```typescript
interface FaceDetectorProps {
  // 工作模式
  mode?: DetectionMode | string          // 'collection' | 'liveness' | 'silent_liveness'，默认 'collection'
  
  // 人脸位置检验
  minFaceRatio?: number                  // 最小人脸占比 (0-1)，默认 0.5
  maxFaceRatio?: number                  // 最大人脸占比 (0-1)，默认 0.9
  minFrontal?: number                    // 最小正脸置信度 (0-1)，默认 0.9
  
  // 活体检测（仅 LIVENESS 模式）
  livenessChecks?: LivenessAction[]      // 支持的动作列表，默认 [BLINK, MOUTH_OPEN, NOD]
  livenessActionCount?: number           // 需要完成的动作数，默认 1，上限为 livenessChecks.length
  livenessActionTimeout?: number         // 每个动作超时（秒），默认 60
  showActionPrompt?: boolean             // 是否显示动作提示文本，默认 true
  showStatusPrompt?: boolean             // 是否显示状态提示文本，默认 true
  
  // 静默活体检测（仅 SILENT_LIVENESS 模式）
  silentLivenessThreshold?: number       // 活体置信度阈值 (0-1)，默认 0.85
  
  // Human.js 配置
  humanConfig?: Record<string, any>      // 自定义 Human.js 配置，运行时配置优先级更高
}
```

---

## 事件详解

### 通用事件

```typescript
// 组件已就绪 - Human.js 加载完成
@ready="() => {
  console.log('✓ FaceDetector 组件已就绪')
}"

// 状态提示事件 - 包含详细的检测状态信息
@status-prompt="(data: StatusPromptData) => {
  code: PromptCode         // 提示码
  message: string          // 提示信息
  count?: number           // 人脸数量
  size?: number            // 人脸大小 (0-1)
  frontal?: number         // 正脸度 (0-1)
  quality?: number         // 图像质量 (0-1)
}"

// 人脸检测事件 - 每帧检测结果
@face-detected="(data: FaceDetectedData) => {
  count: number            // 检测到的人脸数量
  size: number             // 人脸占画面比例 (0-1)
  frontal: number          // 人脸正对度 (0-1)
}"

// 错误发生
@error="(data: ErrorData) => {
  code: ErrorCode          // 错误代码
  message: string          // 错误信息
}"

// 调试信息事件 - 用于诊断和调试
@debug="(data: DebugData) => {
  level: 'info' | 'warn' | 'error'  // 调试级别
  stage: string                      // 当前阶段
  message: string                    // 主要信息
  details?: Record<string, any>      // 详细信息
  timestamp: number                  // 时间戳
}"
```

### 采集模式事件

```typescript
// 人脸采集完成
@face-collected="(data: FaceCollectedData) => {
  imageData: string | null           // Base64 格式的图片数据
}"
```

### 活体检测模式事件（LIVENESS）

```typescript
// 活体动作检测状态变化
@liveness-action="(data: LivenessActionData) => {
  action: LivenessAction             // 动作类型
  description: string                // 动作描述（中文）
  status: LivenessActionStatus       // 动作状态
}"

// 活体检测完成
@liveness-completed="(data: LivenessCompletedData) => {
  imageData: string | null           // Base64 格式的图片数据
  liveness: number                   // 活体置信度 (0-1)
}"
```

### 静默活体检测模式事件（SILENT_LIVENESS）

```typescript
// 实时活体检测数据（每次检测都会触发）
@liveness-detected="(data: LivenessDetectedData) => {
  real: number                       // 反欺骗得分 (0-1)，越高越可能是真实人脸
  live: number                       // 活体检测得分 (0-1)，越高活体度越高
}"

// 活体检测完成
@liveness-completed="(data: LivenessCompletedData) => {
  imageData: string | null           // Base64 格式的图片数据
  liveness: number                   // 最终活体置信度 (0-1)
}"
```

---

## 组件初始化阶段后端选择

FaceDetector 组件在初始化时会**自动检测运行环境并选择最优的推理后端**（WebGL 或 WASM）。这个过程是透明的，用户无需手动配置。

### 后端自动选择策略

| 环境类型 | 设备类型 | WebGL 支持 | 选择的后端 | 性能 | 稳定性 |
|---------|---------|----------|----------|------|--------|
| **Safari 浏览器** | 桌面/移动 | - | **WASM** | 中等 | ⭐⭐⭐⭐⭐ |
| **WeChat 内置浏览器** | 移动 | - | **WASM** | 中等 | ⭐⭐⭐⭐⭐ |
| **支付宝 内置浏览器** | 移动 | - | **WASM** | 中等 | ⭐⭐⭐⭐⭐ |
| **QQ 内置浏览器** | 移动 | - | **WASM** | 中等 | ⭐⭐⭐⭐⭐ |
| **移动设备** | 移动 | ✓ 支持 | **WebGL** | ⭐⭐⭐⭐ | ⭐⭐⭐⭐ |
| **移动设备** | 移动 | ✗ 不支持 | **WASM** | 中等 | ⭐⭐⭐⭐ |
| **Chrome/Firefox/Edge** | 桌面 | ✓ 支持 | **WebGL** | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ |
| **其他桌面浏览器** | 桌面 | ✗ 不支持 | **WASM** | 中等 | ⭐⭐⭐ |

### 初始化流程

```
启动 FaceDetector 组件
    ↓
--- 自动后端检测开始 ---
    ↓
检测浏览器类型
├─ Safari / WeChat / 支付宝 / QQ / WebView?
│  └─ YES → 返回 'wasm' ✓
│  
├─ NO → 检测设备类型
│  ├─ 移动设备?
│  │  ├─ YES → 检测 WebGL 支持
│  │  │        ├─ 支持 → 返回 'webgl' ✓
│  │  │        └─ 不支持 → 返回 'wasm' ✓
│  │  │
│  │  └─ NO → 桌面设备
│  │         └─ 检测 WebGL 支持
│  │            ├─ 支持 → 返回 'webgl' ✓ (优先选择)
│  │            └─ 不支持 → 返回 'wasm' ✓
↓
--- 检测完成 ---
    ↓
加载 Human.js 库并使用选定的后端
    ↓
发送 ready 事件 (检测完成，可以开始检测)
```

### 后端选择的代码实现

```typescript
// 自动检测最优的推理后端
function detectOptimalBackend(): string {
  const userAgent = navigator.userAgent.toLowerCase()
  
  // 1. 特殊浏览器 → 强制使用 WASM (更稳定可靠)
  const isSafari = /safari/.test(userAgent) && !/chrome/.test(userAgent)
  const isWeChat = /micromessenger/i.test(userAgent)
  const isAlipay = /alipay/.test(userAgent)
  const isQQ = /qq/.test(userAgent)
  const isWebView = /(wechat|alipay|qq)webview/i.test(userAgent)
  
  if (isSafari || isWeChat || isAlipay || isQQ || isWebView) {
    return 'wasm'
  }
  
  // 2. 移动设备 → 检测 WebGL 可用性
  const isMobile = /android|iphone|ipad|ipod/.test(userAgent) || window.innerWidth < 768
  
  if (isMobile) {
    try {
      const canvas = document.createElement('canvas')
      const context = canvas.getContext('webgl') || canvas.getContext('webgl2')
      return context ? 'webgl' : 'wasm'
    } catch (e) {
      return 'wasm'
    }
  }
  
  // 3. 桌面设备 → 优先 WebGL (性能最优)
  try {
    const canvas = document.createElement('canvas')
    const context = canvas.getContext('webgl') || canvas.getContext('webgl2')
    return context ? 'webgl' : 'wasm'
  } catch (e) {
    return 'wasm'
  }
}
```

### 查看选择结果

通过 `@debug` 事件可以看到组件选择的后端和选择原因：

```vue
<template>
  <FaceDetector
    @debug="(debug) => {
      if (debug.stage === 'initialization') {
        console.log('后端选择:', debug.details?.backend)
        console.log('选择原因:', debug.details?.selectedReason)
      }
    }"
  />
</template>
```

**输出示例：**
```
[initialization] 开始初始化 Human.js 库 {
  backend: "webgl",
  selectedReason: "桌面设备 - webgl 后端"
}
```

### 手动覆盖后端选择

虽然自动选择通常是最优的，但你也可以通过 `humanConfig` prop 强制指定后端：

```vue
<template>
  <!-- 强制使用 WASM 后端 -->
  <FaceDetector
    :human-config="{
      backend: 'wasm'
    }"
  />
  
  <!-- 强制使用 WebGL 后端 -->
  <FaceDetector
    :human-config="{
      backend: 'webgl'
    }"
  />
</template>
```

### WASM 后端配置

当使用 WASM 后端时，需要配置 WASM 文件的位置。Human.js 提供两个关键参数：

| 参数 | 用途 | 示例 |
|-----|------|------|
| **`modelBasePath`** | AI 模型文件位置 | `/models` 或 不配置，自动使用CDN URL |
| **`wasmPath`** | WASM 运行时文件位置 | `/wasm/` 或 不配置，自动使用CDN URL |

**配置示例**:

```vue
<template>
  <FaceDetector
    :human-config="{
      backend: 'wasm',
      modelBasePath: '/models',  // 本地模型文件
      wasmPath: '/wasm/'         // 本地 WASM 文件 (或 CDN URL)
    }"
  />
</template>
```
```

详细信息请参考 [WASM 配置指南](./WASM_PATH_CONFIGURATION.md)。

### 性能参考

| 后端 | 桌面单帧 | 移动单帧 | 优势 | 劣势 |
|------|--------|--------|------|------|
| **WebGL** | 50-80ms | 80-120ms | GPU 加速，性能最好 | 不是所有环境都支持 |
| **WASM** | 120-180ms | 150-220ms | 兼容性强，通用 | 性能相对较低 |

---

### 提示文本控制

组件支持通过 `showActionPrompt` 和 `showStatusPrompt` 两个属性分别控制动作提示和状态提示的显示。

#### 提示文本类型

| 属性 | 显示内容 | 示例 | 默认值 |
|------|--------|------|--------|
| **showActionPrompt** | 动作提示文本 | "请眨眼" | `true` |
| **showStatusPrompt** | 状态提示文本 | "图像模糊请调整"、"未检测到人脸" | `true` |

#### 使用示例

**隐藏所有提示文本：**
```vue
<FaceDetector
  mode="liveness"
  :show-action-prompt="false"
  :show-status-prompt="false"
/>
```

**只显示动作提示，隐藏状态提示：**
```vue
<FaceDetector
  mode="collection"
  :show-action-prompt="true"
  :show-status-prompt="false"
/>
```

**动态控制提示文本显示：**
```vue
<template>
  <div>
    <div class="controls">
      <label>
        <input v-model="showAction" type="checkbox" />
        显示动作提示
      </label>
      <label>
        <input v-model="showStatus" type="checkbox" />
        显示状态提示
      </label>
    </div>
    
    <FaceDetector
      mode="collection"
      :show-action-prompt="showAction"
      :show-status-prompt="showStatus"
    />
  </div>
</template>

<script setup>
import { ref } from 'vue'
import FaceDetector from './components/FaceDetector.vue'

const showAction = ref(true)
const showStatus = ref(true)
</script>

<style scoped>
.controls {
  margin-bottom: 20px;
}

label {
  display: block;
  margin: 10px 0;
  cursor: pointer;
}
</style>
```

#### 状态提示文本类型

| 提示文本 | 触发条件 | 对应代码 |
|--------|--------|--------|
| **"检测正常"** | 人脸符合条件 | `NORMAL_STATE` |
| **"未检测到人脸"** | 画面中没有人脸 | `NO_FACE_DETECTED` |
| **"检测到多人"** | 画面中多个人脸 | `MULTIPLE_FACES_DETECTED` |
| **"请靠近摄像头"** | 人脸过小 | `FACE_TOO_SMALL` |
| **"请远离摄像头"** | 人脸过大 | `FACE_TOO_LARGE` |
| **"请正对摄像头"** | 人脸不正对 | `FACE_NOT_FRONTAL` |
| **"图像清晰"** | 图像质量符合要求 | `GOOD_IMAGE_QUALITY` |
| **"图像模糊请调整"** | 图像质量不足 | `POOR_IMAGE_QUALITY` |
| **"请完成指定动作"** | 等待用户执行动作 | `PLEASE_PERFORM_ACTION` |

#### 自定义提示文本 (通过 debug 事件)

如果需要自定义提示文本内容或位置，可以监听 `debug` 事件并在应用层显示：

```vue
<template>
  <div>
    <FaceDetector
      :show-action-prompt="false"
      :show-status-prompt="false"
      @debug="handleDebug"
    />
    
    <!-- 自定义提示区域 -->
    <div class="custom-prompt" v-if="promptMessage">
      {{ promptMessage }}
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'

const promptMessage = ref('')

const handleDebug = (debug) => {
  if (debug.stage === 'detection' && debug.details?.ratio < 0.5) {
    promptMessage.value = '🔍 请靠近摄像头'
  }
}
</script>

<style scoped>
.custom-prompt {
  position: fixed;
  top: 20px;
  left: 50%;
  transform: translateX(-50%);
  background: rgba(0, 0, 0, 0.8);
  color: white;
  padding: 15px 30px;
  border-radius: 8px;
  font-size: 16px;
  z-index: 1000;
  animation: slideDown 0.3s ease-in;
}

@keyframes slideDown {
  from {
    transform: translateX(-50%) translateY(-20px);
    opacity: 0;
  }
  to {
    transform: translateX(-50%) translateY(0);
    opacity: 1;
  }
}
</style>
```

---

FaceDetector 组件在 Human.js 库完全加载后会发送 `ready` 事件。建议在组件就绪后再启动检测，以确保最佳的用户体验。

### READY 事件

`ready` 事件在以下时机触发：
- Human.js 库加载完成
- 所有必要的模型已初始化
- 组件已完全就绪，可以安全启动检测

**事件使用：**
```typescript
// ready 事件：组件已初始化完成
@ready="() => {
  console.log('✓ FaceDetector 组件已就绪，可以开始检测')
  isComponentReady = true
}"
```

**推荐用法：**
```vue
<template>
  <div>
    <!-- 加载状态提示 -->
    <div v-if="!isComponentReady" class="loading">
      <p>🔄 正在初始化人脸检测系统...</p>
    </div>
    
    <!-- 就绪状态 -->
    <div v-else class="ready">
      <p>✓ 系统已就绪</p>
      <button @click="startDetection" class="btn-primary">
        开始检测
      </button>
    </div>

    <!-- 人脸检测器 -->
    <FaceDetector
      mode="collection"
      @ready="handleReady"
      @face-detected="handleFaceDetected"
      @face-collected="handleFaceCollected"
      @error="handleError"
    />
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import FaceDetector from './components/FaceDetector.vue'

const isComponentReady = ref(false)

const handleReady = () => {
  isComponentReady.value = true
  console.log('✓ FaceDetector 组件已就绪')
}

const startDetection = async () => {
  // 由于组件已就绪，可以安全地启动检测
  console.log('开始检测...')
}

const handleFaceDetected = (data) => {
  console.log('检测到人脸:', data)
}

const handleFaceCollected = (data) => {
  console.log('采集成功:', data.imageData?.length)
}

const handleError = (error) => {
  console.error('检测出错:', error.message)
}
</script>

<style scoped>
.loading {
  padding: 20px;
  background: #f0f8ff;
  border: 1px solid #87ceeb;
  border-radius: 8px;
  text-align: center;
  color: #0066cc;
}

.ready {
  padding: 20px;
  background: #f0fff0;
  border: 1px solid #90ee90;
  border-radius: 8px;
  text-align: center;
  color: #006600;
}

.btn-primary {
  padding: 10px 20px;
  background: #0066cc;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 16px;
}

.btn-primary:hover {
  background: #0052a3;
}
</style>
```

### 按钮禁用示例

在组件就绪前禁用开始按钮是最佳实践：

```vue
<template>
  <button @click="startDetection" :disabled="!isComponentReady">
    {{ isComponentReady ? '开始检测' : '加载中...' }}
  </button>
  <FaceDetector @ready="() => isComponentReady = true" />
</template>

<script setup>
import { ref } from 'vue'
const isComponentReady = ref(false)
</script>

<style scoped>
button:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}
</style>
```

### 监听初始化日志

通过 `debug` 事件可以看到完整的初始化过程：

```vue
<FaceDetector
  @ready="handleReady"
  @debug="(debug) => {
    if (debug.stage === 'initialization') {
      console.log(`[初始化] ${debug.message}`, debug.details)
    }
  }"
/>
```

### 完整的事件列表

| 事件 | 触发时机 | 用途 |
|------|--------|------|
| **ready** | Human.js 加载完成 | 标记组件初始化完成 |
| **status-prompt** | 检测状态变化 | 获取详细的状态提示信息 |
| **face-detected** | 检测到单个人脸 | 实时人脸信息反馈（每帧） |
| **face-collected** | 采集成功 | 获取采集的图片数据（采集模式） |
| **liveness-detected** | 进行一次活体检测 | 获取实时的活体检测得分（静默活体模式） |
| **liveness-action** | 动作检测状态变化 | 活体动作进度反馈（动作活体模式） |
| **liveness-completed** | 活体检测成功 | 获取活体检测结果和采集图片 |
| **debug** | 内部阶段变化 | 诊断和调试 |
| **error** | 出现错误 | 处理错误情况 |

### 常见问题

**Q: 为什么需要等待 ready 事件？**
A: Human.js 库需要加载多个 AI 模型（通常 2-5 秒）。等待 ready 事件可以确保系统完全就绪，避免在初始化过程中出现错误。

**Q: 如果在 ready 前调用 startDetection 会怎样？**
A: 组件会通过 debug 事件发送警告，并取消检测启动。这是安全的保护机制。

**Q: ready 事件会发送多次吗？**
A: 不会。ready 事件只在组件初始化完成时发送一次。

---

## 调试与日志

组件提供详细的调试信息事件：

```typescript
interface DebugData {
  level: 'info' | 'warn' | 'error'      // 日志级别
  stage: string                          // 当前阶段
  message: string                        // 主要信息
  details?: Record<string, any>          // 详细信息
  timestamp: number                      // 时间戳
}

@debug="(debugData: DebugData) => {
  console.log(`[${debugData.stage}] ${debugData.message}`, debugData.details)
}"
```

---

## 高级使用示例

### 监听状态提示事件

通过 `@status-prompt` 事件可以实时获取检测状态的详细信息：

```vue
<template>
  <div>
    <FaceDetector
      mode="collection"
      @status-prompt="handleStatusPrompt"
    />
    
    <!-- 自定义状态显示 -->
    <div v-if="statusInfo" class="status-info">
      <p>状态: {{ statusInfo.message }}</p>
      <p v-if="statusInfo.size">人脸大小: {{ (statusInfo.size * 100).toFixed(0) }}%</p>
      <p v-if="statusInfo.frontal">正脸度: {{ (statusInfo.frontal * 100).toFixed(0) }}%</p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import FaceDetector from './components/FaceDetector.vue'

const statusInfo = ref<any>(null)

const handleStatusPrompt = (data) => {
  statusInfo.value = data
  console.log(`[${data.code}] ${data.message}`)
}
</script>

<style scoped>
.status-info {
  margin-top: 20px;
  padding: 15px;
  background: #f5f5f5;
  border-radius: 8px;
}
</style>
```

### 监听调试信息

通过 `@debug` 事件可以获取详细的诊断信息：

```vue
<template>
  <FaceDetector
    mode="collection"
    @debug="handleDebug"
  />
</template>

<script setup lang="ts">
const handleDebug = (debug) => {
  // 只记录关键阶段的调试信息
  if (debug.stage === 'initialization') {
    console.log('🔧 [初始化]', debug.message, debug.details)
  } else if (debug.stage === 'quality' && debug.level === 'warn') {
    console.warn('⚠️  [质量检测]', debug.message, debug.details)
  } else if (debug.level === 'error') {
    console.error('❌ [错误]', debug.message, debug.details)
  }
}
</script>
```

### 实时质量评分反馈

在采集过程中实时显示图像质量评分：

```vue
<template>
  <div>
    <FaceDetector
      mode="collection"
      @status-prompt="handleStatusPrompt"
      @debug="handleDebug"
    />
    
    <!-- 实时质量显示 -->
    <div v-if="qualityScore" class="quality-display">
      <div class="quality-bar">
        <div class="quality-fill" :style="{ width: qualityScore * 100 + '%' }"></div>
      </div>
      <p class="quality-text">
        图像质量: {{ (qualityScore * 100).toFixed(0) }}%
        <span :class="{ 'text-success': qualityScore >= 0.8, 'text-warning': qualityScore < 0.8 }">
          {{ qualityScore >= 0.8 ? '✓ 符合要求' : '✗ 不符合要求' }}
        </span>
      </p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'

const qualityScore = ref(0)

const handleStatusPrompt = (data) => {
  if (data.quality !== undefined) {
    qualityScore.value = data.quality
  }
}

const handleDebug = (debug) => {
  if (debug.stage === 'quality' && debug.details?.overallScore) {
    qualityScore.value = debug.details.overallScore
  }
}
</script>

<style scoped>
.quality-display {
  margin-top: 20px;
  padding: 15px;
}

.quality-bar {
  width: 100%;
  height: 8px;
  background: #e0e0e0;
  border-radius: 4px;
  overflow: hidden;
}

.quality-fill {
  height: 100%;
  background: linear-gradient(to right, #ff6b6b, #ffc107, #42b983);
  transition: width 0.3s ease;
}

.quality-text {
  margin-top: 10px;
  font-size: 14px;
}

.text-success {
  color: #42b983;
}

.text-warning {
  color: #f5a623;
}
</style>
```

### 动作活体检测流程控制

完整的动作活体检测示例，带有进度反馈：

```vue
<template>
  <div>
    <FaceDetector
      ref="detectorRef"
      mode="liveness"
      :liveness-checks="[
        LivenessAction.BLINK,
        LivenessAction.MOUTH_OPEN,
        LivenessAction.NOD
      ]"
      :liveness-action-count="2"
      @status-prompt="handleStatusPrompt"
      @liveness-action="handleLivenessAction"
      @liveness-completed="handleLivenessCompleted"
      @error="handleError"
    />
    
    <!-- 进度显示 -->
    <div class="progress-display">
      <p>完成动作: {{ completedActions.join(', ') }}</p>
      <p>进度: {{ completedActions.length }}/{{ requiredActionCount }}</p>
      <div class="progress-bar">
        <div class="progress-fill" :style="{ width: (completedActions.length / requiredActionCount) * 100 + '%' }"></div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import FaceDetector from './components/FaceDetector.vue'
import { LivenessAction } from './components/facedetector/enums'

const detectorRef = ref()
const completedActions = ref<string[]>([])
const requiredActionCount = 2

const handleStatusPrompt = (data) => {
  console.log(`状态: ${data.message}`)
}

const handleLivenessAction = (data) => {
  console.log(`动作检测: ${data.description} - ${data.status}`)
  if (data.status === 'completed') {
    completedActions.value.push(data.description)
  }
}

const handleLivenessCompleted = (data) => {
  console.log('活体检测完成，置信度:', data.liveness)
  console.log('采集图片大小:', data.imageData?.length)
}

const handleError = (error) => {
  console.error('检测失败:', error.message)
}
</script>

<style scoped>
.progress-display {
  margin-top: 20px;
  padding: 15px;
  background: #f5f5f5;
  border-radius: 8px;
}

.progress-bar {
  width: 100%;
  height: 8px;
  background: #e0e0e0;
  border-radius: 4px;
  overflow: hidden;
  margin-top: 10px;
}

.progress-fill {
  height: 100%;
  background: #42b983;
  transition: width 0.3s ease;
}
</style>
```

---

## 错误处理与调试

### 错误码参考表

组件通过 `@error` 事件返回具体的错误码，便于针对性处理：

| 错误码 | 原因 | 处理建议 |
|------|------|--------|
| `DETECTOR_NOT_INITIALIZED` | 检测库未初始化 | 等待 ready 事件后再启动 |
| `CAMERA_ACCESS_DENIED` | 无摄像头权限 | 提示用户授予权限 |
| `STREAM_ACQUISITION_FAILED` | 获取摄像头流失败 | 检查摄像头是否被占用 |
| `FACE_COUNT_CHANGED` | 检测中人脸数量变化 | 要求用户保持单人正脸 |
| `ACTION_TIMEOUT` | 活体动作超时 | 提示用户重新执行该动作 |
| `CAPTURE_FAILED` | 图片捕获失败 | 重新启动检测 |
| `ENGINE_NOT_INITIALIZED` | AI 引擎未初始化 | 等待初始化完成 |
| `LIVENESS_ANALYSIS_FAILED` | 活体分析失败 | 采集更清晰的人脸图片 |
| `FRAUD_DETECTED` | 检测到欺诈（非真实人脸） | 用真实人脸重试 |
| `DETECTION_ERROR` | 检测异常 | 检查控制台日志，重新启动 |

### 完整的错误处理示例

```vue
<template>
  <div>
    <FaceDetector
      mode="collection"
      @ready="handleReady"
      @error="handleError"
      @debug="handleDebug"
    />
    
    <!-- 错误显示 -->
    <div v-if="error" class="error-panel">
      <p class="error-code">错误: {{ error.code }}</p>
      <p class="error-message">{{ error.message }}</p>
      <button @click="retry">重试</button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import FaceDetector from './components/FaceDetector.vue'
import { ErrorCode } from './components/facedetector/enums'

const error = ref<any>(null)
const detectorRef = ref()

const handleReady = () => {
  console.log('✓ 检测器就绪')
}

const handleError = (errorData) => {
  error.value = errorData
  
  // 根据错误类型采取不同的处理策略
  switch (errorData.code) {
    case ErrorCode.CAMERA_ACCESS_DENIED:
      console.error('❌ 摄像头权限被拒绝，请在浏览器设置中授予权限')
      break
    
    case ErrorCode.STREAM_ACQUISITION_FAILED:
      console.error('❌ 无法获取摄像头流，请检查摄像头是否被其他应用占用')
      break
    
    case ErrorCode.FACE_COUNT_CHANGED:
      console.warn('⚠️  检测中检测到多人或人脸消失，请保持单人正脸')
      break
    
    case ErrorCode.ACTION_TIMEOUT:
      console.warn('⚠️  动作检测超时，请重新执行该动作')
      break
    
    case ErrorCode.FRAUD_DETECTED:
      console.warn('⚠️  检测到可能的欺诈行为（非真实人脸），请用真实人脸重试')
      break
    
    default:
      console.error('❌ 检测失败:', errorData.message)
  }
}

const handleDebug = (debug) => {
  if (debug.level === 'error') {
    console.error(`[${debug.stage}] ${debug.message}`, debug.details)
  }
}

const retry = () => {
  error.value = null
  // 重新启动检测
  detectorRef.value?.startDetection()
}
</script>

<style scoped>
.error-panel {
  margin-top: 20px;
  padding: 20px;
  background: #fff5f5;
  border: 2px solid #f5222d;
  border-radius: 8px;
}

.error-code {
  font-weight: bold;
  color: #f5222d;
  margin: 0 0 10px 0;
}

.error-message {
  margin: 10px 0;
}

button {
  background: #f5222d;
  color: white;
  border: none;
  padding: 10px 20px;
  border-radius: 4px;
  cursor: pointer;
  font-size: 14px;
}

button:hover {
  background: #cf1322;
}
</style>
```

### 采集模式示例

```vue
<template>
  <FaceDetector
    mode="collection"
    :min-face-ratio="0.5"
    :max-face-ratio="0.9"
    :min-frontal="0.9"
    @face-detected="handleFaceDetected"
    @face-collected="handleFaceCollected"
    @error="handleError"
  />
</template>

<script setup lang="ts">
import FaceDetector from './components/FaceDetector.vue'

function handleFaceDetected(data) {
  console.log(`人脸数量: ${data.count}, 占比: ${data.size}, 正对度: ${data.frontal}`)
}

function handleFaceCollected(data) {
  console.log('图片采集成功，Base64 长度:', data.imageData?.length)
  // 将 data.imageData 上传到服务器或本地保存
}

function handleError(error) {
  console.error(`检测失败: ${error.message}`)
}
</script>
```

### 活体检测模式示例

```vue
<template>
  <FaceDetector
    ref="detectorRef"
    mode="liveness"
    :liveness-checks="[
      LivenessAction.BLINK,
      LivenessAction.MOUTH_OPEN,
      LivenessAction.NOD
    ]"
    :liveness-action-count="2"
    :show-action-prompt="true"
    @liveness-action="handleAction"
    @liveness-completed="handleCompleted"
    @error="handleError"
  />
</template>

<script setup lang="ts">
import FaceDetector from './components/FaceDetector.vue'
import { LivenessAction, LivenessActionStatus } from './components/face-detector'

function handleAction(data) {
  if (data.status === LivenessActionStatus.STARTED) {
    console.log(`请开始${data.description}`)
  } else if (data.status === LivenessActionStatus.COMPLETED) {
    console.log(`${data.description}检测完成`)
  }
}

function handleCompleted(data) {
  console.log('活体检测成功，置信度:', data.liveness)
}
</script>
```

---

## Human.js 配置与运行时覆盖

FaceDetector 组件支持两种配置方式：

### 初始化配置 vs 运行时配置

```typescript
// ❌ 不推荐：在初始化时配置（影响所有后续检测）
<FaceDetector
  :human-config="{
    backend: 'wasm',
    modelBasePath: '/custom-models'
  }"
/>

// ✅ 推荐：使用运行时配置（只影响当前检测）
<FaceDetector
  :human-config="{
    // 仅作为备选项，真实配置通过 detect() 方法的 runtimeConfig 参数传入
  }"
/>
```

### 后端自动选择

组件会根据浏览器环境**自动选择最优的推理后端**（无需手动配置）：

```typescript
// 自动选择逻辑：
// 1. Safari / WeChat / 支付宝 / QQ → WASM (稳定性优先)
// 2. 移动设备 + WebGL支持 → WebGL (性能优先)
// 3. 移动设备 + 无WebGL → WASM
// 4. 桌面设备 + WebGL支持 → WebGL (最佳性能)
// 5. 桌面设备 + 无WebGL → WASM (通用方案)

// 手动覆盖后端选择（不推荐）：
<FaceDetector
  :human-config="{
    backend: 'wasm'  // 或 'webgl'
  }"
/>
```

### 模型路径配置

```typescript
// 默认配置：使用本地 public 目录下的模型文件
<FaceDetector
  :human-config="{
    modelBasePath: '/models',  // 模型文件位置
    wasmPath: '/wasm'          // WASM 运行时文件位置
  }"
/>

// 使用 CDN 配置（生产环境）：
<FaceDetector
  :human-config="{
    modelBasePath: 'https://cdn.example.com/models',
    wasmPath: 'https://cdn.example.com/wasm'
  }"
/>
```

---

## 高级配置说明

FaceDetector 组件的所有内部配置都集中在 `src/components/facedetector/config.ts` 中的 `CONFIG` 对象中，这些配置可以在需要时进行调整。

### 检测配置

```typescript
CONFIG.DETECTION = {
  // 视频加载超时时间（毫秒）- 等待视频元素可播放的最长时间
  VIDEO_LOAD_TIMEOUT: 5000,
  
  // 检测循环帧延迟（毫秒）- 两次检测之间的间隔，越小检测越频繁，越大性能越好
  DETECTION_FRAME_DELAY: 100,  // 100ms = 10 fps
  
  // 错误重试延迟（毫秒）- 检测出错时的重试间隔
  ERROR_RETRY_DELAY: 200,
  
  // 默认视频尺寸（像素，1:1 正方形比例）
  DEFAULT_VIDEO_WIDTH: 640,
  DEFAULT_VIDEO_HEIGHT: 640,
  
  // 提示文本显示时长（毫秒）- 状态提示文本自动清空的时间间隔
  PROMPT_TEXT_DURATION: 3000
}
```

**调整建议：**
- 提高 `DETECTION_FRAME_DELAY` 可以降低 CPU 占用（推荐移动设备设为 150-200）
- 降低 `DETECTION_FRAME_DELAY` 可以提高检测灵敏度（推荐 50-100）

### 移动设备适配配置

```typescript
CONFIG.MOBILE = {
  // 视频宽度偏移（像素）- 移动设备视频宽度减少的像素数，用于留出边距
  VIDEO_WIDTH_OFFSET: 40,
  
  // 视频高度偏移（像素）- 移动设备视频高度减少的像素数
  VIDEO_HEIGHT_OFFSET: 200,
  
  // 移动设备最大视频尺寸（像素，1:1 正方形比例）
  MAX_WIDTH: 640,
  
  // 移动设备判断阈值（像素）- 屏幕宽度小于此值则判定为移动设备
  WIDTH_THRESHOLD: 768
}
```

### 活体检测配置

```typescript
CONFIG.LIVENESS = {
  // 张嘴判定阈值（百分比）- 嘴巴打开度超过此百分比才算张嘴
  // 推荐范围：15-25%
  MIN_MOUTH_OPEN_PERCENT: 20,
  
  // 反欺骗（anti-spoofing）阈值 - 如果 real 分数低于此值，判定为欺诈
  // 推荐范围：0.4-0.6
  ANTI_SPOOFING_THRESHOLD: 0.5
}
```

### 人脸正对度检测配置

```typescript
CONFIG.FACE_FRONTAL = {
  // Yaw 角度阈值（度）- 左右摇晃不能超过此角度
  YAW_THRESHOLD: 3,
  
  // Pitch 角度阈值（度）- 上下俯仰不能超过此角度
  PITCH_THRESHOLD: 4,
  
  // Roll 角度阈值（度）- 旋转不能超过此角度
  ROLL_THRESHOLD: 2
}
```

### 图像质量检测配置

```typescript
CONFIG.IMAGE_QUALITY = {
  // 最小人脸检测框分数 (0-1)
  // 检测框置信度低于此值表示检测不清晰
  // 推荐：0.6-0.8
  MIN_BOX_SCORE: 0.8,
  
  // 最小人脸网格分数 (0-1) ⭐ 最关键
  // 网格置信度低于此值表示图像模糊或质量差
  // 推荐：0.75-0.85
  MIN_FACE_SCORE: 0.8,
  
  // 最小综合分数 (0-1)
  // 综合评分低于此值表示图像质量不足
  // 推荐：0.6-0.8
  MIN_OVERALL_SCORE: 0.8
}
```

**快速配置预设：**

| 场景 | MIN_BOX_SCORE | MIN_FACE_SCORE | MIN_OVERALL_SCORE |
|------|---|---|---|
| 严格采集 | 0.7 | 0.85 | 0.8 |
| **标准采集（推荐）** | **0.6** | **0.8** | **0.7** |
| 快速采集 | 0.5 | 0.75 | 0.65 |
| 演示/测试 | 0.3 | 0.5 | 0.4 |

### 人脸完整性检测配置

```typescript
CONFIG.FACE_COMPLETENESS = {
  // 最小眼睛置信度 (0-1)
  MIN_EYE_CONFIDENCE: 0.3,
  
  // 最小鼻子置信度 (0-1)
  MIN_NOSE_CONFIDENCE: 0.3,
  
  // 最小嘴巴置信度 (0-1)
  MIN_MOUTH_CONFIDENCE: 0.3,
  
  // 最小耳朵置信度 (0-1)
  MIN_EAR_CONFIDENCE: 0.2,
  
  // 人脸是否需要完全在图片内（不超出边界）
  REQUIRE_FULL_FACE_IN_BOUNDS: true,
  
  // 是否严格模式（要求检测到所有五官）
  STRICT_MODE: false,
  
  // 完整度评分阈值 (0-1) - 评分达到此值认为人脸是完整的，0 表示禁用
  COMPLETENESS_THRESHOLD: 0,
  
  // 各项缺失的扣分值
  PENALTY_MISSING_EYES: 0.25,
  PENALTY_MISSING_NOSE: 0.15,
  PENALTY_MISSING_MOUTH: 0.2,
  PENALTY_MISSING_EARS: 0.15,
  PENALTY_OUT_OF_BOUNDS: 0.2,
  PENALTY_NO_LANDMARKS: 1.0
}
```

**说明：**
- 设置 `COMPLETENESS_THRESHOLD = 0` 禁用人脸完整性检测（默认）
- 设置 `COMPLETENESS_THRESHOLD > 0` 启用人脸完整性检测（严格模式）

### 检测超时配置

```typescript
CONFIG.TIMEOUT = {
  // 检测总超时时长（毫秒）- 如果规定时间内没有检测到合格人脸，则主动退出
  // 默认 60 秒
  DETECTION_TIMEOUT: 60000
}
```

---

## 性能优化建议

### 移动设备优化

```typescript
// 对于移动设备，减少 CPU 占用：

// 在 src/components/facedetector/config.ts 中调整：
CONFIG.DETECTION.DETECTION_FRAME_DELAY = 150  // 增加到 150ms（≈6.7 fps）
CONFIG.IMAGE_QUALITY.MIN_FACE_SCORE = 0.75    // 稍微降低质量要求
```

**效果：** 帧率降低但 CPU 占用下降 30-50%，适合低端移动设备

### 桌面设备优化

```typescript
// 对于桌面设备，提高检测灵敏度：

// 在 src/components/facedetector/config.ts 中调整：
CONFIG.DETECTION.DETECTION_FRAME_DELAY = 50   // 降低到 50ms（20 fps）
CONFIG.IMAGE_QUALITY.MIN_FACE_SCORE = 0.85    // 提高质量要求
```

**效果：** 检测灵敏度提升，采集成功率更高

### 后端选择优化

```typescript
// WebGL 后端（推荐 GPU 计算能力强的设备）
// - 性能：⭐⭐⭐⭐⭐
// - 兼容性：⭐⭐⭐⭐

// WASM 后端（推荐通用兼容性）
// - 性能：⭐⭐⭐
// - 兼容性：⭐⭐⭐⭐⭐

// 组件会根据环境自动选择，通常无需手动调整
```

### 常见性能问题

| 问题 | 原因 | 解决方案 |
|------|------|--------|
| CPU 占用过高 | 帧率太高 | 增加 `DETECTION_FRAME_DELAY` |
| 采集成功率低 | 质量要求过高 | 降低 `MIN_FACE_SCORE` |
| 内存持续上升 | 资源未释放 | 确保 `stopDetection()` 被调用 |
| 检测延迟大 | WebGL 不可用 | 使用 `debug` 事件确认后端类型 |

---

## 注意事项

1. **HTTPS 要求**：摄像头访问需要 HTTPS 环境或 localhost
2. **浏览器权限**：首次运行需要用户授予摄像头访问权限
3. **光线条件**：建议在光线充足的环境下使用
4. **浏览器兼容性**：支持 Chrome、Firefox、Safari、Edge 的最新版本
5. **移动适配**：自动适配移动设备，支持屏幕方向改变

---

## 常见问题与解答 (FAQ)

### 初始化与权限

**Q: 组件加载很慢？**  
A: Human.js 库需要加载多个 AI 模型（通常 2-5 秒）。可以：
- 使用 `@ready` 事件等待初始化完成
- 在 `@debug` 事件中监听加载进度
- 预加载库，提前初始化

**Q: 提示摄像头权限被拒绝？**  
A: 
1. 确保使用 HTTPS 或 localhost
2. 在浏览器设置中检查站点权限
3. 某些浏览器需要用户主动授予权限

**Q: 移动设备没有反应？**  
A: 检查：
- 浏览器支持情况（推荐最新版 Chrome、Safari）
- 是否授予了摄像头权限
- 在调试控制台中查看 `@debug` 事件

### 检测与采集

**Q: 采集成功率很低？**  
A: 尝试以下方案：
1. 增加光线照度（>200 lux 效果最佳）
2. 调整脸部距离（30-50cm 为最佳）
3. 保持正脸对向摄像头
4. 降低 `MIN_FACE_SCORE` 阈值（从 0.8 降到 0.75）
5. 升级摄像头或清洁镜头

**Q: 为什么总是提示"图像模糊"？**  
A: 这通常是 `MIN_FACE_SCORE` 过高。尝试：
- 改善光线条件
- 获得更清晰的摄像头图像
- 调整 `CONFIG.IMAGE_QUALITY.MIN_FACE_SCORE` 到 0.75

**Q: 多人检测中如何只检测指定位置的人脸？**  
A: 暂不支持，但可以：
- 引导用户拍照到指定区域
- 通过 `@face-detected` 事件检查人脸位置
- 提示用户调整位置

**Q: 采集后图片质量还是不好？**  
A: 虽然组件有质量检测，但最终效果还取决于：
- 摄像头硬件质量
- 光线条件
- 人脸正对度
- 系统算法的训练数据

### 活体检测

**Q: 动作活体检测总是超时？**  
A: 
1. 检查 `livenessActionTimeout` 是否设置过短（推荐 60 秒）
2. 确保手势识别正确（查看 `@debug` 事件）
3. 确保摄像头能清晰看到用户面部
4. 调整光线条件

**Q: 静默活体检测总是失败？**  
A: 
1. 采集的图片质量不足 → 改善光线
2. 反欺骗检测过于严格 → 降低 `ANTI_SPOOFING_THRESHOLD`
3. 使用了非真实人脸 → 使用真实人脸重试

**Q: 如何区分动作活体和静默活体的检测结果？**  
A:
- 动作活体：需要用户执行眨眼、张嘴、点头等动作
- 静默活体：自动检测，无需用户操作
- 前者更安全，后者更便利

### 配置与优化

**Q: 如何在开发和生产环境使用不同配置？**  
A:
```typescript
const getHumanConfig = () => {
  if (process.env.NODE_ENV === 'development') {
    return { backend: 'webgl', modelBasePath: '/models' }
  } else {
    return { backend: 'wasm', modelBasePath: 'https://cdn.example.com/models' }
  }
}

<FaceDetector :human-config="getHumanConfig()" />
```

**Q: 如何手动修改 CONFIG 中的配置？**  
A: 直接修改 `src/components/facedetector/config.ts` 中的 `CONFIG` 对象，但推荐：
- 通过代码注释记录原因
- 创建配置文件管理多个预设
- 通过环境变量动态配置

**Q: 性能瓶颈在哪里？**  
A: 通过 `@debug` 事件可以看到详细的阶段信息：
```typescript
@debug="(debug) => {
  if (debug.stage === 'detection') {
    console.log('检测耗时:', debug.details?.duration)
  }
}"
```

### 调试与支持

**Q: 如何查看详细的调试日志？**  
A: 
1. 监听 `@debug` 事件（所有阶段的详细信息）
2. 监听 `@status-prompt` 事件（用户可见的提示）
3. 打开浏览器开发者工具 → Console 标签
4. 设置环境变量 `DEBUG=*` 启用详细日志

**Q: 如何报告 Bug？**  
A: 请在 GitHub 上提交 Issue，并包含：
- 复现步骤
- 使用的浏览器和版本
- `@debug` 事件的完整日志
- 期望行为 vs 实际行为

**Q: 支持离线使用吗？**  
A: 是的，支持完全离线：
- 将模型文件放在 `public/models` 目录
- 将 WASM 文件放在 `public/wasm` 目录
- 确保 `humanConfig.modelBasePath` 和 `wasmPath` 正确指向本地路径

---

## License

MIT