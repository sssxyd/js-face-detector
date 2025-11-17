<!-- 人脸检测组件模板 -->
<template>
  <!-- 主容器，根据移动设备状态动态添加样式类 -->
  <div class="face-detector" :class="{ 'is-mobile': isMobileDevice }">
    <!-- 设备信息展示：显示设备类型和屏幕方向 -->
    <div class="device-info">
      设备: {{ deviceInfo }} | 方向: {{ orientationLabel }}
    </div>
    <!-- 视频容器：包含视频元素和绘制检测结果的画布 -->
    <div class="video-container">
      <!-- 视频元素：用于捕获摄像头实时视频流 -->
      <video ref="videoRef" autoplay playsinline muted :width="videoWidth" :height="videoHeight"></video>
      <!-- 画布元素：用于绘制人脸检测框和相关标记 -->
      <canvas ref="canvasRef" :width="videoWidth" :height="videoHeight"></canvas>
    </div>
  </div>
</template>

<script setup>
// 导入 Vue 3 Composition API 相关方法
import { ref, computed, onMounted, onUnmounted } from 'vue'
// 导入人脸检测库
import Human from '@vladmandic/human'

// 定义组件 props
const props = defineProps({
  // 工作模式：'collection'(采集模式) 或 'liveness'(活体检测模式)
  mode: { type: String, default: 'collection' },
  // 活体检测项目数组：可包含 'blink'(眨眼) 和 'shake'(摇头)
  livenessChecks: { type: Array, default: () => ['blink', 'shake'] },
  // 人脸占画面比例的最小值（百分比）
  minFaceRatio: { type: Number, default: 50 },
  // 人脸占画面比例的最大值（百分比）
  maxFaceRatio: { type: Number, default: 80 },
  // 正脸置信度的最小值（百分比）
  minFrontal: { type: Number, default: 90 }
})

// 定义组件事件
const emit = defineEmits([
  'face-detected',      // 检测到人脸时触发
  'face-collected',     // 采集到人脸时触发
  'liveness-action',    // 活体检测动作完成时触发
  'liveness-completed', // 所有活体检测完成时触发
  'error'               // 发生错误时触发
])

// 视频元素引用
const videoRef = ref(null)
// 画布元素引用，用于绘制检测结果
const canvasRef = ref(null)
// 是否为移动设备
const isMobileDevice = ref(false)
// 是否为竖屏方向
const isPortrait = ref(true)
// 是否正在进行检测
const isDetecting = ref(false)

// 视频宽度
let videoWidth = ref(640)
// 视频高度
let videoHeight = ref(480)
// Human 检测库实例
let human = null
// 摄像头流对象
let stream = null
// 检测循环的定时器 ID
let detectionTimeoutId = null

// ===== 活体检测相关变量 =====
// 上一帧的头部 yaw 角度(左右摇晃)
let lastYaw = null
// 摇头时的最大偏差
let maxYawDeviation = 0
// 摇头时的中心 yaw 角度
let centerYaw = null
// 是否检测到眨眼
let blinkDetected = false
// 眨眼检测的计时器
let blinkTimer = null
// 当前活体检测项的索引
let currentLivenessIndex = 0
// 已完成的活体检测项集合
let livenessCompleted = new Set()

// 是否正在初始化检测库
const isInitializing = ref(false)

// ===== 生命周期钩子 =====
// 组件挂载时初始化
onMounted(async () => {
  detectDevice()
  // 监听设备方向改变事件
  window.addEventListener('orientationchange', handleOrientationChange)
  
  // 配置 Human 检测库
  isInitializing.value = true
  const config = {
    // 模型文件 CDN 路径
    modelBasePath: 'https://cdn.jsdelivr.net/npm/@vladmandic/human/models',
    // 人脸检测配置
    face: {
      enabled: true,
      detector: { rotation: false, return: true },
      mesh: { enabled: true },      // 面部网格点
      iris: { enabled: true }       // 虹膜检测
    },
    body: { enabled: false },      // 禁用身体检测
    hand: { enabled: false },      // 禁用手部检测
    object: { enabled: false },    // 禁用物体检测
    gesture: { enabled: true }     // 启用手势检测(包含眨眼)
  }
  human = new Human(config)
  try {
    await human.load()
    console.log('Human library loaded successfully')
  } catch (e) {
    console.error('Failed to load Human library:', e)
  }
  isInitializing.value = false
})

// 组件卸载时清理资源
onUnmounted(() => {
  stopDetection()
  window.removeEventListener('orientationchange', handleOrientationChange)
})

// ===== 设备检测与方向处理 =====
/**
 * 检测设备类型和屏幕方向，并调整视频尺寸
 */
function detectDevice() {
  // 判断是否为移动设备
  isMobileDevice.value = navigator.userAgent.toLowerCase().match(/android|iphone/) !== null || window.innerWidth < 768
  // 判断是否为竖屏
  isPortrait.value = window.innerHeight >= window.innerWidth
  
  if (isMobileDevice.value) {
    // 移动设备：尽量适配屏幕尺寸
    videoWidth.value = Math.min(window.innerWidth - 40, 480)
    videoHeight.value = Math.min(window.innerHeight - 200, 640)
  } else {
    // 桌面设备：使用固定尺寸
    videoWidth.value = 640
    videoHeight.value = 480
  }
}

/**
 * 处理设备方向改变事件
 */
function handleOrientationChange() {
  isPortrait.value = window.innerHeight >= window.innerWidth
  
  // 如果正在检测，则重启检测以适配新的方向
  if (isDetecting.value) {
    if (stream) stream.getTracks().forEach(t => t.stop())
    detectDevice()
    // 延迟重启，确保 DOM 更新完成
    setTimeout(() => startDetection(), 500)
  }
}

// ===== 计算属性 =====
// 设备信息文本
const deviceInfo = computed(() => isMobileDevice.value ? '移动设备' : '桌面设备')
// 屏幕方向文本
const orientationLabel = computed(() => isPortrait.value ? '竖屏' : '横屏')

// ===== 检测控制方法 =====
/**
 * 启动人脸检测
 */
async function startDetection() {
  try {
    // 检查 Human 库是否已初始化
    if (!human) {
      emit('error', { message: '检测库未初始化' })
      return
    }
    
    console.log('[FaceDetector] Starting detection...')
    
    // 获取用户摄像头权限和视频流
    console.log('[FaceDetector] Requesting camera access...')
    stream = await navigator.mediaDevices.getUserMedia({
      video: { facingMode: 'user', width: { ideal: videoWidth.value }, height: { ideal: videoHeight.value } },
      audio: false
    })
    
    console.log('[FaceDetector] Camera stream obtained')
    videoRef.value.srcObject = stream
    
    // 等待视频元素加载元数据和可播放
    console.log('[FaceDetector] Waiting for video to be ready...')
    await new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error('Video loading timeout'))
      }, 5000)
      
      const onCanPlay = () => {
        clearTimeout(timeout)
        videoRef.value.removeEventListener('canplay', onCanPlay)
        resolve()
      }
      
      videoRef.value.addEventListener('canplay', onCanPlay)
      videoRef.value.play().catch(reject)
    })
    
    console.log('[FaceDetector] Video is ready, starting detection loop...')
    
    // 标记为正在检测
    isDetecting.value = true
    currentLivenessIndex = 0
    livenessCompleted.clear()
    
    // 立即启动检测循环
    detect()
  } catch (e) {
    // 若获取摄像头失败，触发错误事件
    console.error('[FaceDetector] Error:', e)
    isDetecting.value = false
    emit('error', { message: e.message })
  }
}

/**
 * 停止人脸检测
 */
function stopDetection() {
  isDetecting.value = false
  
  if (detectionTimeoutId) clearTimeout(detectionTimeoutId)
  if (stream) stream.getTracks().forEach(t => t.stop())
  if (videoRef.value) videoRef.value.srcObject = null
}

// ===== 人脸检测与活体验证核心逻辑 =====
/**
 * 检测循环：不断获取视频帧进行人脸检测
 */
async function detect() {
  if (!isDetecting.value) return
  
  try {
    // 快速检查必需的对象
    if (!videoRef.value || !canvasRef.value || !human) {
      console.warn('[FaceDetector] Missing required objects, retrying...')
      setTimeout(detect, 100)
      return
    }
    
    // 对当前视频帧进行人脸检测
    console.log('[FaceDetector] Running detection...')
    const result = await human.detect(videoRef.value)
    console.log('[FaceDetector] Detection result:', result.face?.length || 0, 'faces')
    
    // 获取画布上下文并清空
    const ctx = canvasRef.value.getContext('2d')
    if (!ctx) {
      console.error('[FaceDetector] Failed to get canvas context')
      setTimeout(detect, 100)
      return
    }
    ctx.clearRect(0, 0, videoWidth.value, videoHeight.value)
    
    // 获取检测到的所有人脸
    const faces = result.face || []
    
    if (faces.length === 1) {
      const face = faces[0]
      const faceBox = face.box || face.boxRaw
      
      if (!faceBox) {
        // 继续检测
        setTimeout(detect, 100)
        return
      }
      
      // 计算人脸占视频画面的比例 (%)
      const faceRatio = (faceBox[2] * faceBox[3]) / (videoWidth.value * videoHeight.value) * 100
      
      // 检查人脸是否正对摄像头 (0-100 分数)
      const frontal = checkFaceFrontal(face)
      
      // 人脸信息
      const faceInfo = { 
        count: 1,
        size: faceRatio.toFixed(1), 
        frontal: frontal.toFixed(1)
      }
      
      // 触发 face-detected 事件
      emit('face-detected', { faceInfo })
      
      // 判断人脸是否符合条件：大小在范围内，且正对度符合要求
      if (faceRatio > props.minFaceRatio && faceRatio < props.maxFaceRatio && frontal >= props.minFrontal) {
        console.log('[FaceDetector] Valid face detected, drawing green')
        drawFaces(ctx, faces, 'green')
        
        if (props.mode === 'collection') {
          // 采集模式：检测到合格人脸后裁切、停止并返回图片
          const croppedImageData = captureFaceFrame(faceBox)
          stopDetection()
          emit('face-collected', { imageData: croppedImageData, faceBox })
        } else {
          // 活体检测模式：进行活体验证，第一次会自动 emit face-collected 作为基准图
          verifyLiveness(face, result.gesture, faceBox)
        }
      } else {
        // 人脸不符合条件，继续检测
        console.log('[FaceDetector] Face not valid, ratio:', faceRatio, 'frontal:', frontal)
        drawFaces(ctx, faces, 'orange')
        setTimeout(detect, 100)
      }
    } else {
      // 未检测到人脸或检测到多个人脸，继续检测
      console.log('[FaceDetector] Face count:', faces.length)
      const faceInfo = { 
        count: faces.length,
        size: '0',
        frontal: '0'
      }
      emit('face-detected', { faceInfo })
      setTimeout(detect, 100)
    }
  } catch (error) {
    console.error('[FaceDetector] Detection error:', error)
    // 发生错误时继续检测
    setTimeout(detect, 200)
  }
}

/**
 * 检查人脸是否正对摄像头
 * @param {Object} face - 人脸检测结果
 * @returns {number} 正对度评分 (0-100)
 */
function checkFaceFrontal(face) {
  // 获取人脸的 yaw (左右摇晃)、pitch (上下俯仰)、roll (旋转) 角度
  const ang = face.rotation?.angle || { yaw: 0, pitch: 0, roll: 0 }
  
  // 各角度的正对度评分
  let y = 100, p = 100, r = 100
  
  // 如果 yaw 角度超过 8°，按指数衰减评分
  if (Math.abs(ang.yaw) > 8) y = Math.max(0, 100 * Math.pow(0.92, Math.abs(ang.yaw) - 8))
  // 如果 pitch 角度超过 8°
  if (Math.abs(ang.pitch) > 8) p = Math.max(0, 100 * Math.pow(0.92, Math.abs(ang.pitch) - 8))
  // 如果 roll 角度超过 5°
  if (Math.abs(ang.roll) > 5) r = Math.max(0, 100 * Math.pow(0.90, Math.abs(ang.roll) - 5))
  
  // 加权平均：yaw 占 60%，pitch 占 25%，roll 占 15%
  return y * 0.6 + p * 0.25 + r * 0.15
}

/**
 * 活体检测验证：检测用户是否执行指定的活体动作
 * @param {Object} face - 人脸检测结果
 * @param {Array} gestures - 检测到的手势/表情
 * @param {Array} faceBox - 人脸边界框
 */
function verifyLiveness(face, gestures, faceBox) {
  // 如果是第一次检测到符合条件的人脸，先 emit face-collected（基准图）
  if (currentLivenessIndex === 0 && livenessCompleted.size === 0) {
    console.log('[FaceDetector] First valid face detected in liveness mode, emitting face-collected')
    const croppedImageData = captureFaceFrame(faceBox)
    emit('face-collected', { imageData: croppedImageData, faceBox })
  }
  
  // 如果所有活体检测项都已完成
  if (currentLivenessIndex >= props.livenessChecks.length) {
    console.log('[FaceDetector] All liveness checks completed')
    stopDetection()
    emit('liveness-completed', { imageData: captureFrame(), faceBox: face.box })
    return
  }
  
  // 获取当前需要检测的活体动作
  const action = props.livenessChecks[currentLivenessIndex]
  let detected = false
  
  // 根据动作类型进行检测
  if (action === 'blink' && gestures) {
    // 眨眼检测：检查 gesture 中是否包含 'blink'
    detected = gestures.some(g => g.gesture?.includes('blink'))
  } else if (action === 'shake') {
    // 摇头检测：通过头部 yaw 角度的变化来判断
    const ang = face.rotation?.angle?.yaw || 0
    
    // 初始化摇头的中心位置
    if (centerYaw === null) centerYaw = ang
    
    if (lastYaw !== null) {
      // 计算相对于中心位置的偏差
      const dev = Math.abs(ang - centerYaw)
      
      // 记录最大偏差
      if (dev > maxYawDeviation) maxYawDeviation = dev
      
      // 判断是否完成摇头：最大偏差 >= 8°，当前偏差 < 5°，且速度较慢 (<= 3°/帧)
      if (maxYawDeviation >= 8 && dev < 5 && Math.abs(ang - lastYaw) <= 3) {
        detected = true
      }
    }
    lastYaw = ang
  }
  
  // 如果检测到活体动作
  if (detected) {
    console.log('[FaceDetector] Liveness action detected:', action)
    emit('liveness-action', { action, status: 'completed' })
    livenessCompleted.add(action)
    currentLivenessIndex++
    
    // 重置摇头检测的相关变量
    lastYaw = null
    maxYawDeviation = 0
    centerYaw = null
  }
  
  // 继续检测下一帧
  setTimeout(detect, 100)
}

// ===== 工具方法 =====
/**
 * 捕获当前视频帧并转换为 JPEG 图片
 * @returns {string} Base64 格式的 JPEG 图片数据
 */
function captureFrame() {
  try {
    const c = document.createElement('canvas')
    c.width = videoRef.value.videoWidth || videoWidth.value
    c.height = videoRef.value.videoHeight || videoHeight.value
    
    const ctx = c.getContext('2d')
    ctx.drawImage(videoRef.value, 0, 0, c.width, c.height)
    
    const imageData = c.toDataURL('image/jpeg', 0.9)
    console.log('[FaceDetector] Frame captured, size:', imageData.length)
    return imageData
  } catch (e) {
    console.error('[FaceDetector] Failed to capture frame:', e)
    return null
  }
}

/**
 * 根据人脸区域裁切当前视频帧并转换为 JPEG 图片
 * @param {Array} faceBox - 人脸边界框 [x, y, width, height]
 * @returns {string} Base64 格式的 JPEG 图片数据（只包含人脸区域）
 */
function captureFaceFrame(faceBox) {
  try {
    if (!faceBox) {
      console.warn('[FaceDetector] Invalid faceBox, using full frame')
      return captureFrame()
    }

    const [x, y, width, height] = faceBox
    
    // 创建裁切后的 canvas
    const c = document.createElement('canvas')
    c.width = width
    c.height = height
    
    const ctx = c.getContext('2d')
    
    // 从视频中裁切人脸区域
    ctx.drawImage(
      videoRef.value,
      x, y, width, height,      // 源区域（视频中的人脸位置）
      0, 0, width, height        // 目标区域（canvas）
    )
    
    const croppedImageData = c.toDataURL('image/jpeg', 0.9)
    console.log('[FaceDetector] Face frame captured and cropped, size:', croppedImageData.length, 'box:', faceBox)
    return croppedImageData
  } catch (e) {
    console.error('[FaceDetector] Failed to capture face frame:', e)
    // 降级：返回完整帧
    return captureFrame()
  }
}

/**
 * 在画布上绘制人脸检测框（正方形）
 * @param {CanvasRenderingContext2D} ctx - 画布上下文
 * @param {Array} faces - 人脸数组
 * @param {string} color - 检测框颜色
 */
function drawFaces(ctx, faces, color) {
  faces.forEach(f => {
    const box = f.box || f.boxRaw
    if (box) {
      // box 格式：[x, y, width, height]
      const x = box[0]
      const y = box[1]
      const width = box[2]
      const height = box[3]
      
      // 绘制矩形框
      ctx.strokeStyle = color
      ctx.lineWidth = 3
      ctx.strokeRect(x, y, width, height)
    }
  })
}

// 暴露方法供父组件调用
defineExpose({ startDetection, stopDetection })
</script>

<style scoped>
/* 人脸检测主容器样式 */
.face-detector {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 15px;
}

/* 设备信息展示样式 */
.device-info {
  font-size: 12px;
  color: #999;
  margin-bottom: 10px;
}

/* 视频容器样式 */
.video-container {
  position: relative;
  width: 100%;
  max-width: 640px;
  aspect-ratio: 1; /* 保持 1:1 的正方形比例 */
  display: flex;
  align-items: center;
  justify-content: center;
  background: #f0f0f0;
  border-radius: 8px;
  overflow: hidden;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
}

/* 视频和画布共同样式 */
video, canvas {
  width: 100%;
  height: 100%;
  aspect-ratio: 1;
  border-radius: 50%;  /* 圆形显示 - 内切圆 */
  border: 2px solid #ddd;
  box-sizing: border-box;
}

/* 视频元素样式 */
video {
  background: #000;       /* 黑色背景 */
  object-fit: cover;      /* 填充覆盖模式 */
  display: block;
}

/* 画布元素样式 */
canvas {
  position: absolute;     /* 绝对定位，覆盖在视频上方 */
  top: 0;
  left: 0;
  background: transparent;
}
</style>
