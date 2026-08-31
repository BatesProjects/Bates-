import {
  distance,
  polygonAreaPx2,
  polygonPerimeterPx,
  polylineLengthPx,
  px2ToM2,
  pxToM,
} from './coords'
import type { Measurement, MeasurementResult, Sheet } from './types'

export function computeResult(measurement: Measurement, sheet: Sheet | undefined): MeasurementResult {
  const ppm = sheet?.calibration?.pixelsPerMetre ?? 0
  const uncalibrated = !ppm

  switch (measurement.type) {
    case 'area': {
      const areaM2 = px2ToM2(polygonAreaPx2(measurement.points), ppm)
      const perimeterM = pxToM(polygonPerimeterPx(measurement.points), ppm)
      const volumeM3 = measurement.depth ? areaM2 * measurement.depth : undefined
      return { measurement, uncalibrated, areaM2, perimeterM, volumeM3 }
    }
    case 'length': {
      const lengthM = pxToM(polylineLengthPx(measurement.points), ppm)
      const areaM2 = measurement.width ? lengthM * measurement.width : undefined
      return { measurement, uncalibrated, lengthM, areaM2 }
    }
    case 'count': {
      return { measurement, uncalibrated, count: 1 }
    }
    case 'radius': {
      const radiusM = pxToM(measurement.radiusPx, ppm)
      const areaM2 = Math.PI * radiusM * radiusM
      const perimeterM = 2 * Math.PI * radiusM
      return { measurement, uncalibrated, lengthM: radiusM, areaM2, perimeterM }
    }
    default:
      return { measurement, uncalibrated }
  }
}

export function measurementCentroid(measurement: Measurement): { x: number; y: number } {
  switch (measurement.type) {
    case 'area':
    case 'length': {
      const pts = measurement.points
      const sum = pts.reduce((acc, p) => ({ x: acc.x + p.x, y: acc.y + p.y }), { x: 0, y: 0 })
      return { x: sum.x / pts.length, y: sum.y / pts.length }
    }
    case 'count':
      return measurement.point
    case 'radius':
      return measurement.center
    default:
      return { x: 0, y: 0 }
  }
}

export function measurementBoundsDiagonal(measurement: Measurement): number {
  switch (measurement.type) {
    case 'area':
    case 'length': {
      const pts = measurement.points
      if (pts.length < 2) return 0
      const xs = pts.map((p) => p.x)
      const ys = pts.map((p) => p.y)
      return distance(
        { x: Math.min(...xs), y: Math.min(...ys) },
        { x: Math.max(...xs), y: Math.max(...ys) },
      )
    }
    default:
      return 0
  }
}
