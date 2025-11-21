/**
 * 人脸检测相关的类型定义
 */
export const CONFIG = Object.freeze({
  // 检测相关配置
  DETECTION: {
    // 视频加载超时时间（毫秒）- 等待视频元素可播放的最长时间
    VIDEO_LOAD_TIMEOUT: 5000,
    // 检测循环帧延迟（毫秒）- 两次检测之间的间隔，越小检测越频繁
    DETECTION_FRAME_DELAY: 100,
    // 错误重试延迟（毫秒）- 检测出错时的重试间隔
    ERROR_RETRY_DELAY: 200,
    // 默认视频宽度（像素）- 桌面设备使用的固定宽度 (1:1 比例)
    DEFAULT_VIDEO_WIDTH: 640,
    // 默认视频高度（像素）- 桌面设备使用的固定高度 (1:1 比例)
    DEFAULT_VIDEO_HEIGHT: 640,
    // 提示文本显示时长（毫秒）- 状态提示文本自动清空的时间间隔
    PROMPT_TEXT_DURATION: 3000
  },
  // 移动设备适配配置
  MOBILE: {
    // 视频宽度偏移（像素）- 移动设备视频宽度减少的像素数，用于留出边距
    VIDEO_WIDTH_OFFSET: 40,
    // 视频高度偏移（像素）- 移动设备视频高度减少的像素数，用于留出边距（包括顶部栏、底部操作栏等）
    VIDEO_HEIGHT_OFFSET: 200,
    // 移动设备最大视频尺寸（像素）- 移动设备边长上限 (1:1 比例)
    MAX_WIDTH: 640,
    // 移动设备判断阈值（像素）- 屏幕宽度小于此值则判定为移动设备
    WIDTH_THRESHOLD: 768
  },
  // 活体检测相关配置
  LIVENESS: {
    // 张嘴判定阈值（百分比）- 嘴巴打开度超过此百分比才算张嘴
    MIN_MOUTH_OPEN_PERCENT: 20,
    // 反欺骗（anti-spoofing）阈值 - 如果 real 分数低于此值，判定为欺诈
    ANTI_SPOOFING_THRESHOLD: 0.5
  },
  // 人脸正对度检测相关配置
  FACE_FRONTAL: {
    // Yaw 角度阈值（度）- 左右摇晃不能超过此角度，超出则扣分
    YAW_THRESHOLD: 3,
    // Pitch 角度阈值（度）- 上下俯仰不能超过此角度，超出则扣分
    PITCH_THRESHOLD: 4,
    // Roll 角度阈值（度）- 旋转不能超过此角度，超出则扣分
    ROLL_THRESHOLD: 2
  },
  // 图像质量相关配置
  IMAGE_QUALITY: {
    // 是否要求人脸完全在图片内（不超出边界）
    REQUIRE_FULL_FACE_IN_BOUNDS: true,
    // 最小人脸检测框分数（0-1）- 检测框置信度低于此值表示检测不清晰
    MIN_BOX_SCORE: 0.8,
    // 最小人脸网格分数（0-1）- 网格置信度低于此值表示图像模糊或质量差
    MIN_FACE_SCORE: 0.8,
    // 最小综合分数（0-1）- 综合评分低于此值表示图像质量不足
    MIN_OVERALL_SCORE: 0.8,
    // 连续采集次数 - 连续采集N次合格图片，从中选取质量最好的一张
    COLLECTION_COUNT: 3
  },
  // 检测超时相关配置
  TIMEOUT: {
    // 检测总超时时长（毫秒）- 如果60秒内没有检测到合格人脸，则主动退出
    DETECTION_TIMEOUT: 60000
  }
})

