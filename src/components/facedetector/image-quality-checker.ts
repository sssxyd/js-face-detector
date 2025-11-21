/**
 * 图像质量检测模块
 * 
 * 综合检测图像质量的多个维度：
 * 1. 人脸检测框置信度 (boxScore)
 * 2. 人脸关键点网格置信度 (faceScore)
 */

import { CONFIG } from './config'

/**
 * 图像质量检测配置接口
 */
export interface ImageQualityCheckConfig {
  // 最小人脸检测框分数（0-1）
  minBoxScore?: number
  // 最小人脸网格分数（0-1）
  minFaceScore?: number
  // 最小综合分数（0-1）
  minOverallScore?: number
}

/**
 * 单个质量指标的检测结果
 */
export interface QualityMetricResult {
  name: string           // 指标名称
  value: number         // 实际值
  threshold: number     // 阈值
  passed: boolean       // 是否通过
  description: string   // 描述
}

/**
 * 图像质量检测的详细结果
 */
export interface ImageQualityResult {
  // 总体是否通过
  passed: boolean
  // 综合评分 (0-1)
  score: number
  // 不通过的原因列表
  reasons: string[]
  // 各个维度的详细指标
  metrics: {
    boxScore: QualityMetricResult
    faceScore: QualityMetricResult
    completenessScore: QualityMetricResult
    overallScore: QualityMetricResult
  }
  // 建议
  suggestions?: string[]
}

/**
 * 检查图像质量（仅图像质量维度）
 * 
 * 仅检测图像的基本质量维度：
 * 1. 人脸检测框置信度 (boxScore)
 * 2. 人脸关键点网格置信度 (faceScore)
 * 
 * 不包含人脸完整性检测（完整性检测由调用方负责）
 * 直接使用 CONFIG 中定义的常量，不支持运行时参数覆盖
 * 
 * @param {any} face - 人脸检测结果
 * @returns {object} 包含质量检测结果和各项指标
 * 
 * @example
 * const result = checkImageQualityOnly(face)
 * if (result.passed) {
 *   console.log('图像质量满足要求')
 * }
 */
export function checkImageQuality(
  face: any,
  imageWidth: number,
  imageHeight: number  
): {
  passed: boolean
  score: number
  reasons: string[]
  metrics: {
    boxScore: QualityMetricResult
    faceScore: QualityMetricResult
  }
} {
  // 初始化结果
  const reasons: string[] = []
  const metrics: Record<string, QualityMetricResult> = {}

  // 检查人脸框是否在图片范围内
  let faceInBounds = 1
  if (CONFIG.IMAGE_QUALITY.REQUIRE_FULL_FACE_IN_BOUNDS) {
    const faceBox = face.box || face.boxRaw
    if (faceBox && faceBox.length >= 4) {
      const [x, y, width, height] = faceBox
      if (x < 0 || y < 0 || x + width > imageWidth || y + height > imageHeight) {
        faceInBounds = 0
        reasons.push('人脸超出边界')
      }
    }
 }
  
  // ===== 检查检测框质量 =====
  const boxScoreResult = checkBoxScore(face)
  metrics.boxScore = boxScoreResult
  if (!boxScoreResult.passed) {
    reasons.push(boxScoreResult.description)
  }
  
  // ===== 检查人脸网格质量 =====
  const faceScoreResult = checkFaceScore(face)
  metrics.faceScore = faceScoreResult
  if (!faceScoreResult.passed) {
    reasons.push(faceScoreResult.description)
  }
  
  let imageQualityScore = 1
  // 人脸超出边界时，直接评分为0，否则正常评分
  if (faceInBounds === 0) {
    imageQualityScore = 0
  } else {
    // 加权平均：检测框(40%) + 人脸网格(40%) + 边界完整(20%)
    imageQualityScore = 0.4 * boxScoreResult.value + 0.4 * faceScoreResult.value + 0.2 * 1.0  // faceInBounds 已确认为 1
  }

  const passed = reasons.length === 0 && imageQualityScore >= CONFIG.IMAGE_QUALITY.MIN_OVERALL_SCORE
  
  return {
    passed,
    score: imageQualityScore,
    reasons,
    metrics: metrics as any
  }
}

/**
 * 检查人脸检测框质量
 * 
 * 检测框的置信度反映了 Human.js 对人脸位置的确定性
 */
function checkBoxScore(face: any): QualityMetricResult {
  const boxScore = face?.boxScore ?? 0
  const minBoxScore = CONFIG.IMAGE_QUALITY.MIN_BOX_SCORE
  const passed = boxScore >= minBoxScore
  
  return {
    name: '检测框质量',
    value: boxScore,
    threshold: minBoxScore,
    passed,
    description: `检测框置信度 ${(boxScore * 100).toFixed(0)}% ${passed ? '✓' : '✗ 需 ≥' + (minBoxScore * 100).toFixed(0) + '%'}`
  }
}

/**
 * 检查人脸网格质量（关键点置信度）
 * 
 * 人脸网格的置信度反映了 468 个关键点检测的可靠性
 * 高置信度通常意味着图像清晰，人脸可见度好
 */
function checkFaceScore(face: any): QualityMetricResult {
  const faceScore = face?.faceScore ?? face?.score ?? 0
  const minFaceScore = CONFIG.IMAGE_QUALITY.MIN_FACE_SCORE
  const passed = faceScore >= minFaceScore
  
  return {
    name: '人脸网格质量',
    value: faceScore,
    threshold: minFaceScore,
    passed,
    description: `人脸网格置信度 ${(faceScore * 100).toFixed(0)}% ${passed ? '✓' : '✗ 需 ≥' + (minFaceScore * 100).toFixed(0) + '%'}`
  }
}