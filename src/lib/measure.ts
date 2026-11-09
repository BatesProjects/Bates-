import {
  applyPitch,
  distance,
  polygonAreaPx2,
  polygonPerimeterPx,
  polygonWithHolesAreaPx2,
  polylineLengthPx,
  px2ToM2,
  pxToM,
} from './coords'
import type { Layer, Measurement, MeasurementResult, Sheet } from './types'

function effectiveWastePercent(measurement: Measurement, layer: Layer | undefined): number {
  return measurement.wasteOverridePercent ?? layer?.wastePercent ?? 0
}

export function computeResult(measurement: Measurement, sheet: Sheet | undefined, layer?: Layer): MeasurementResult {
  const ppm = sheet?.calibration?.pixelsPerMetre ?? 0
  const uncalibrated = !ppm
  const waste = effectiveWastePercent(measurement, layer)
  const wastePercent = waste > 0 ? waste : undefined

  switch (measurement.type) {
    case 'area': {
      const cutouts = measurement.cutouts ?? []
      const planAreaPx2 = polygonWithHolesAreaPx2(measurement.points, cutouts.map((c) => c.points))
      const flatAreaM2 = px2ToM2(planAreaPx2, ppm)
      const areaM2 = measurement.pitchDeg ? applyPitch(flatAreaM2, measurement.pitchDeg) : flatAreaM2
      const perimeterM = pxToM(polygonPerimeterPx(measurement.points), ppm)
      const volumeM3 = measurement.depth ? areaM2 * measurement.depth : undefined
      const cutoutAreaM2 = cutouts.length > 0 ? px2ToM2(polygonAreaPx2(measurement.points), ppm) - flatAreaM2 : undefined
      const planAreaM2 = measurement.pitchDeg ? flatAreaM2 : undefined
      return {
        measurement,
        uncalibrated,
        areaM2,
        perimeterM,
        volumeM3,
        cutoutAreaM2,
        planAreaM2,
        wastePercent,
        areaM2WithWaste: wastePercent ? areaM2 * (1 + wastePercent / 100) : undefined,
      }
    }
    case 'length': {
      const lengthM = pxToM(polylineLengthPx(measurement.points), ppm)
      const areaM2 = measurement.width ? lengthM * measurement.width : undefined
      return {
        measurement,
        uncalibrated,
        lengthM,
        areaM2,
        wastePercent,
        lengthMWithWaste: wastePercent ? lengthM * (1 + wastePercent / 100) : undefined,
      }
    }
    case 'count': {
      return { measurement, uncalibrated, count: 1 }
    }
    case 'radius': {
      const radiusM = pxToM(measurement.radiusPx, ppm)
      const areaM2 = Math.PI * radiusM * radiusM
      const perimeterM = 2 * Math.PI * radiusM
      return {
        measurement,
        uncalibrated,
        lengthM: radiusM,
        areaM2,
        perimeterM,
        wastePercent,
        areaM2WithWaste: wastePercent ? areaM2 * (1 + wastePercent / 100) : undefined,
      }
    }
    case 'wall': {
      const runLengthM = pxToM(polylineLengthPx(measurement.points), ppm)
      const grossAreaM2 = runLengthM * measurement.heightM
      const openingsAreaM2 = measurement.openings.reduce((sum, o) => sum + o.width * o.height, 0)
      const areaM2 = Math.max(0, grossAreaM2 - openingsAreaM2)
      return {
        measurement,
        uncalibrated,
        lengthM: runLengthM,
        grossAreaM2,
        openingsAreaM2,
        areaM2,
        wastePercent,
        areaM2WithWaste: wastePercent ? areaM2 * (1 + wastePercent / 100) : undefined,
      }
    }
    default:
      return { measurement, uncalibrated }
  }
}

export function measurementCentroid(measurement: Measurement): { x: number; y: number } {
  switch (measurement.type) {
    case 'area':
    case 'length':
    case 'wall': {
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
    case 'length':
    case 'wall': {
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
