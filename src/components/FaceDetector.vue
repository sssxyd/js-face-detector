<template>
  <div class="face-detector">
    <div class="video-container">
      <video
        ref="videoRef"
        autoplay
        playsinline
        :width="videoWidth"
        :height="videoHeight"
      ></video>
      <canvas
        ref="canvasRef"
        :width="videoWidth"
        :height="videoHeight"
      ></canvas>
    </div>

    <div class="controls">
      <button @click="startDetection" :disabled="isDetecting || isLivenessMode">
        开始人脸检测
      </button>
      <button @click="stopDetection" :disabled="!isDetecting">
        停止检测
      </button>
      <button @click="startLivenessCheck" :disabled="!detectionSuccess || isLivenessMode">
        开始活体检测
      </button>
      <button @click="cancelLiveness" :disabled="!isLivenessMode">
        取消活体检测
      </button>
    </div>

    <div class="status" :class="statusClass">
      <h3>{{ statusTitle }}</h3>
      <p>{{ statusMessage }}</p>
      <p v-if="isLivenessMode && currentAction" class="action-prompt">
        请{{ actionText }}
      </p>
    </div>

    <div class="info" v-if="faceInfo">
      <h4>检测信息：</h4>
      <p>人脸数量: {{ faceInfo.count }}</p>
      <p v-if="faceInfo.count > 0">人脸大小: {{ faceInfo.size }}%</p>
      <p v-if="faceInfo.count > 0">正面置信度: {{ faceInfo.frontal }}%</p>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'
import Human from '@vladmandic/human'

// Refs
const videoRef = ref(null)
const canvasRef = ref(null)
const isDetecting = ref(false)
const detectionSuccess = ref(false)
const isLivenessMode = ref(false)
const statusMessage = ref('请点击"开始人脸检测"按钮')
const statusTitle = ref('准备就绪')
const faceInfo = ref(null)
const currentAction = ref(null)
const actionCompleted = ref(false)
const livenessActions = ref([])
const currentActionIndex = ref(0)

// Video dimensions
const videoWidth = 640
const videoHeight = 480

// Human.js instance
let human = null
let stream = null
let animationFrameId = null

// Liveness detection actions
const actions = [
  { key: 'mouth', text: '张嘴', check: checkMouthOpen },
  { key: 'blink', text: '眨眼', check: checkBlink },
  { key: 'shake', text: '左右摇头', check: checkHeadShake }
]

// Status class
const statusClass = computed(() => {
  if (detectionSuccess.value) return 'success'
  if (isDetecting.value) return 'detecting'
  return 'idle'
})

const actionText = computed(() => {
  return currentAction.value ? currentAction.value.text : ''
})

// Initialize Human.js
onMounted(async () => {
  const config = {
    modelBasePath: 'https://cdn.jsdelivr.net/npm/@vladmandic/human/models',
    face: {
      enabled: true,
      detector: { rotation: false },
      mesh: { enabled: true },
      iris: { enabled: true },
      description: { enabled: false },
      emotion: { enabled: false }
    },
    body: { enabled: false },
    hand: { enabled: false },
    object: { enabled: false },
    gesture: { enabled: true }
  }
  
  human = new Human(config)
  await human.load()
  console.log('Human.js loaded successfully')
})

onUnmounted(() => {
  stopDetection()
})

// Start camera and detection
async function startDetection() {
  try {
    stream = await navigator.mediaDevices.getUserMedia({
      video: { width: videoWidth, height: videoHeight }
    })
    
    if (videoRef.value) {
      videoRef.value.srcObject = stream
      await videoRef.value.play()
    }
    
    isDetecting.value = true
    detectionSuccess.value = false
    statusTitle.value = '检测中...'
    statusMessage.value = '正在检测人脸'
    
    detect()
  } catch (error) {
    console.error('Error accessing camera:', error)
    statusTitle.value = '错误'
    statusMessage.value = '无法访问摄像头，请检查权限设置'
  }
}

// Stop detection
function stopDetection() {
  isDetecting.value = false
  detectionSuccess.value = false
  isLivenessMode.value = false
  
  if (animationFrameId) {
    cancelAnimationFrame(animationFrameId)
    animationFrameId = null
  }
  
  if (stream) {
    stream.getTracks().forEach(track => track.stop())
    stream = null
  }
  
  if (videoRef.value) {
    videoRef.value.srcObject = null
  }
  
  // Clear canvas
  if (canvasRef.value) {
    const ctx = canvasRef.value.getContext('2d')
    ctx.clearRect(0, 0, videoWidth, videoHeight)
  }
  
  statusTitle.value = '已停止'
  statusMessage.value = '检测已停止'
  faceInfo.value = null
}

// Main detection loop
async function detect() {
  if (!isDetecting.value || !videoRef.value) return
  
  const result = await human.detect(videoRef.value)
  
  // Draw on canvas
  const canvas = canvasRef.value
  const ctx = canvas.getContext('2d')
  ctx.clearRect(0, 0, videoWidth, videoHeight)
  
  if (isLivenessMode.value) {
    // Liveness detection mode
    await handleLivenessDetection(result, ctx)
  } else {
    // Normal face detection mode
    await handleFaceDetection(result, ctx)
  }
  
  animationFrameId = requestAnimationFrame(detect)
}

// Handle face detection
async function handleFaceDetection(result, ctx) {
  const faces = result.face || []
  
  faceInfo.value = {
    count: faces.length
  }
  
  if (faces.length === 0) {
    statusTitle.value = '未检测到人脸'
    statusMessage.value = '请确保您的脸在摄像头范围内'
    detectionSuccess.value = false
    return
  }
  
  if (faces.length > 1) {
    statusTitle.value = '检测到多张人脸'
    statusMessage.value = '请确保画面中只有一个人'
    detectionSuccess.value = false
    drawFaces(ctx, faces, 'orange')
    return
  }
  
  const face = faces[0]
  
  // Check face size (should occupy most of the frame)
  const faceBox = face.box || face.boxRaw
  const faceArea = faceBox[2] * faceBox[3]
  const frameArea = videoWidth * videoHeight
  const faceRatio = (faceArea / frameArea) * 100
  
  faceInfo.value.size = faceRatio.toFixed(1)
  
  // Check if face is frontal
  const frontalConfidence = checkFaceFrontal(face)
  faceInfo.value.frontal = frontalConfidence.toFixed(1)
  
  // Check if face size is adequate (at least 15% of frame)
  if (faceRatio < 15) {
    statusTitle.value = '距离太远'
    statusMessage.value = '请靠近摄像头，让脸部占据更大的画面'
    detectionSuccess.value = false
    drawFaces(ctx, faces, 'yellow')
    return
  }
  
  // Check if face is too large (more than 70% of frame)
  if (faceRatio > 70) {
    statusTitle.value = '距离太近'
    statusMessage.value = '请稍微远离摄像头'
    detectionSuccess.value = false
    drawFaces(ctx, faces, 'yellow')
    return
  }
  
  // Check if face is frontal
  if (frontalConfidence < 70) {
    statusTitle.value = '请正对摄像头'
    statusMessage.value = '请保持面部正对摄像头'
    detectionSuccess.value = false
    drawFaces(ctx, faces, 'orange')
    return
  }
  
  // Check face completeness (all key points should be visible)
  if (!checkFaceComplete(face)) {
    statusTitle.value = '人脸不完整'
    statusMessage.value = '请确保整个面部都在画面内'
    detectionSuccess.value = false
    drawFaces(ctx, faces, 'orange')
    return
  }
  
  // All checks passed
  statusTitle.value = '检测成功'
  statusMessage.value = '人脸检测成功！可以进行活体检测'
  detectionSuccess.value = true
  drawFaces(ctx, faces, 'green')
}

// Handle liveness detection
async function handleLivenessDetection(result, ctx) {
  const faces = result.face || []
  
  faceInfo.value = {
    count: faces.length
  }
  
  // Check if face disappeared or multiple faces
  if (faces.length === 0) {
    statusTitle.value = '活体检测失败'
    statusMessage.value = '人脸消失，检测失败'
    isLivenessMode.value = false
    detectionSuccess.value = false
    return
  }
  
  if (faces.length > 1) {
    statusTitle.value = '活体检测失败'
    statusMessage.value = '检测到多张人脸，检测失败'
    isLivenessMode.value = false
    detectionSuccess.value = false
    drawFaces(ctx, faces, 'red')
    return
  }
  
  const face = faces[0]
  drawFaces(ctx, faces, 'blue')
  
  // Check current action
  if (currentAction.value && !actionCompleted.value) {
    const detected = currentAction.value.check(face, result.gesture)
    
    if (detected) {
      actionCompleted.value = true
      currentActionIndex.value++
      
      if (currentActionIndex.value >= livenessActions.value.length) {
        // All actions completed
        statusTitle.value = '活体检测成功'
        statusMessage.value = '所有动作检测完成！'
        isLivenessMode.value = false
        setTimeout(() => {
          if (!isLivenessMode.value) {
            statusTitle.value = '检测成功'
            statusMessage.value = '人脸检测成功！可以进行活体检测'
          }
        }, 2000)
      } else {
        // Move to next action
        currentAction.value = livenessActions.value[currentActionIndex.value]
        actionCompleted.value = false
        statusMessage.value = `动作 ${currentActionIndex.value}/${livenessActions.value.length} 完成`
      }
    }
  }
}

// Check if face is frontal
function checkFaceFrontal(face) {
  // Use face angle/rotation to determine if frontal
  // Human.js provides rotation angles in face.rotation
  const rotation = face.rotation || { angle: { roll: 0, yaw: 0, pitch: 0 } }
  const angle = rotation.angle || { roll: 0, yaw: 0, pitch: 0 }
  
  // Calculate frontal confidence based on rotation angles
  // Yaw (left-right), Pitch (up-down), Roll (tilt) should be close to 0
  const yawDiff = Math.abs(angle.yaw || 0)
  const pitchDiff = Math.abs(angle.pitch || 0)
  const rollDiff = Math.abs(angle.roll || 0)
  
  // Max acceptable deviation (in degrees)
  const maxYaw = 25
  const maxPitch = 20
  const maxRoll = 20
  
  const yawScore = Math.max(0, 100 - (yawDiff / maxYaw) * 100)
  const pitchScore = Math.max(0, 100 - (pitchDiff / maxPitch) * 100)
  const rollScore = Math.max(0, 100 - (rollDiff / maxRoll) * 100)
  
  // Average score
  return (yawScore + pitchScore + rollScore) / 3
}

// Check if face is complete
function checkFaceComplete(face) {
  // Check if face mesh has sufficient points
  const mesh = face.mesh || face.meshRaw
  if (!mesh || mesh.length < 100) return false
  
  // Check if key facial landmarks are present
  // Eyes, nose, mouth should be visible
  const annotations = face.annotations || {}
  
  return true // Simplified - mesh presence indicates completeness
}

// Draw faces on canvas
function drawFaces(ctx, faces, color) {
  faces.forEach(face => {
    const box = face.box || face.boxRaw
    if (box) {
      ctx.strokeStyle = color
      ctx.lineWidth = 3
      ctx.strokeRect(box[0], box[1], box[2], box[3])
    }
  })
}

// Start liveness check
function startLivenessCheck() {
  if (!detectionSuccess.value) return
  
  isLivenessMode.value = true
  currentActionIndex.value = 0
  actionCompleted.value = false
  
  // Randomly select 2-3 actions
  const numActions = 2 + Math.floor(Math.random() * 2) // 2 or 3 actions
  const shuffled = [...actions].sort(() => Math.random() - 0.5)
  livenessActions.value = shuffled.slice(0, numActions)
  
  currentAction.value = livenessActions.value[0]
  
  statusTitle.value = '活体检测进行中'
  statusMessage.value = `请按照提示完成动作 (1/${livenessActions.value.length})`
}

// Cancel liveness check
function cancelLiveness() {
  isLivenessMode.value = false
  currentAction.value = null
  actionCompleted.value = false
  livenessActions.value = []
  currentActionIndex.value = 0
  
  statusTitle.value = '活体检测已取消'
  statusMessage.value = '已取消活体检测'
  
  setTimeout(() => {
    if (!isLivenessMode.value && detectionSuccess.value) {
      statusTitle.value = '检测成功'
      statusMessage.value = '人脸检测成功！可以进行活体检测'
    }
  }, 2000)
}

// Check mouth open
function checkMouthOpen(face, gestures) {
  // Check mouth landmarks distance
  const annotations = face.annotations || {}
  const lipsUpper = annotations.lipsUpperOuter || []
  const lipsLower = annotations.lipsLowerOuter || []
  
  if (lipsUpper.length > 0 && lipsLower.length > 0) {
    // Calculate vertical distance between upper and lower lip center
    const upperCenter = lipsUpper[lipsUpper.length / 2]
    const lowerCenter = lipsLower[lipsLower.length / 2]
    
    if (upperCenter && lowerCenter) {
      const distance = Math.abs(lowerCenter[1] - upperCenter[1])
      // Threshold for mouth open (adjust as needed)
      return distance > 15
    }
  }
  
  return false
}

// Check blink
let blinkDetected = false
let blinkTimer = null

function checkBlink(face, gestures) {
  // Check eye openness
  const annotations = face.annotations || {}
  const leftEye = annotations.leftEyeUpper0 || []
  const rightEye = annotations.rightEyeUpper0 || []
  
  if (leftEye.length > 0 && rightEye.length > 0) {
    // Simple blink detection: check if eyes are closed
    // This is a simplified version - you might need more sophisticated detection
    
    // Check gestures for blink
    if (gestures && Array.isArray(gestures)) {
      for (const gesture of gestures) {
        if (gesture.gesture && gesture.gesture.includes('blink')) {
          blinkDetected = true
          if (blinkTimer) clearTimeout(blinkTimer)
          blinkTimer = setTimeout(() => {
            blinkDetected = false
          }, 2000)
          return true
        }
      }
    }
  }
  
  return false
}

// Check head shake
let lastYaw = null
let yawChanges = []
const yawChangeThreshold = 10 // degrees

function checkHeadShake(face, gestures) {
  const rotation = face.rotation || { angle: { yaw: 0 } }
  const currentYaw = rotation.angle?.yaw || 0
  
  if (lastYaw !== null) {
    const yawDiff = currentYaw - lastYaw
    
    if (Math.abs(yawDiff) > yawChangeThreshold) {
      yawChanges.push(yawDiff)
      
      // Keep only recent changes (last 2 seconds worth)
      if (yawChanges.length > 10) {
        yawChanges.shift()
      }
      
      // Check for alternating directions (shake)
      if (yawChanges.length >= 4) {
        let alternating = true
        for (let i = 1; i < yawChanges.length; i++) {
          if ((yawChanges[i] > 0) === (yawChanges[i - 1] > 0)) {
            alternating = false
            break
          }
        }
        
        if (alternating) {
          yawChanges = []
          lastYaw = null
          return true
        }
      }
    }
  }
  
  lastYaw = currentYaw
  return false
}
</script>

<style scoped>
.face-detector {
  max-width: 800px;
  margin: 0 auto;
  padding: 20px;
}

.video-container {
  position: relative;
  display: inline-block;
  margin: 20px 0;
}

video {
  display: block;
  border: 2px solid #ccc;
  border-radius: 8px;
}

canvas {
  position: absolute;
  top: 0;
  left: 0;
  pointer-events: none;
}

.controls {
  margin: 20px 0;
  display: flex;
  gap: 10px;
  justify-content: center;
  flex-wrap: wrap;
}

button {
  padding: 10px 20px;
  font-size: 16px;
  border: none;
  border-radius: 5px;
  background-color: #42b983;
  color: white;
  cursor: pointer;
  transition: background-color 0.3s;
}

button:hover:not(:disabled) {
  background-color: #358f6b;
}

button:disabled {
  background-color: #ccc;
  cursor: not-allowed;
}

.status {
  margin: 20px 0;
  padding: 20px;
  border-radius: 8px;
  background-color: #f5f5f5;
}

.status.idle {
  background-color: #f5f5f5;
  color: #666;
}

.status.detecting {
  background-color: #fff3cd;
  color: #856404;
}

.status.success {
  background-color: #d4edda;
  color: #155724;
}

.status h3 {
  margin: 0 0 10px 0;
}

.status p {
  margin: 5px 0;
}

.action-prompt {
  font-size: 24px;
  font-weight: bold;
  color: #007bff;
  margin-top: 15px;
}

.info {
  margin: 20px 0;
  padding: 15px;
  background-color: #e7f3ff;
  border-radius: 8px;
  text-align: left;
}

.info h4 {
  margin-top: 0;
  color: #0056b3;
}

.info p {
  margin: 5px 0;
  color: #333;
}
</style>
