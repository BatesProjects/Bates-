// Single source of truth for coordinate math.
//
// There are exactly two coordinate spaces in this app:
//
// 1. "Sheet space" — pixel coordinates within a sheet's rendered bitmap at its
//    native resolution. Every stored measurement point, every calibration
//    point, and pixelsPerMetre are all defined in this space. It never
//    changes as the user zooms or pans.
//
// 2. "Screen space" — pixel coordinates of the pointer/mouse within the
//    Konva stage's container element. This changes constantly as the user
//    zooms and pans.
//
// A ViewTransform describes the current mapping between the two (equivalent
// to a Konva Stage's scale + position, assuming no rotation). All drawing
// tools must convert incoming pointer events from screen space to sheet
// space via screenToSheet before storing or measuring anything. Rendering
// does the reverse via sheetToScreen (in practice this is just handed to
// Konva as the Layer/Stage scale+position, but the helper exists for
// anywhere we need it explicitly, e.g. hit-testing math done outside Konva).
import type { LengthUnit, Point } from './types'

export interface ViewTransform {
  /** Screen pixels per one sheet pixel. */
  scale: number
  /** Screen-space x of sheet point (0, 0). */
  offsetX: number
  /** Screen-space y of sheet point (0, 0). */
  offsetY: number
}

export const IDENTITY_VIEW: ViewTransform = { scale: 1, offsetX: 0, offsetY: 0 }

export function screenToSheet(screenPoint: Point, view: ViewTransform): Point {
  return {
    x: (screenPoint.x - view.offsetX) / view.scale,
    y: (screenPoint.y - view.offsetY) / view.scale,
  }
}

export function sheetToScreen(sheetPoint: Point, view: ViewTransform): Point {
  return {
    x: sheetPoint.x * view.scale + view.offsetX,
    y: sheetPoint.y * view.scale + view.offsetY,
  }
}

/**
 * Zoom the view so that `sheetPointUnderCursor` stays under the same screen
 * position after the scale changes — i.e. standard "zoom to cursor" anchoring.
 */
export function zoomAroundScreenPoint(
  view: ViewTransform,
  screenPoint: Point,
  newScale: number,
): ViewTransform {
  const sheetPoint = screenToSheet(screenPoint, view)
  return {
    scale: newScale,
    offsetX: screenPoint.x - sheetPoint.x * newScale,
    offsetY: screenPoint.y - sheetPoint.y * newScale,
  }
}

// ---------------------------------------------------------------------------
// Pure geometry over sheet-space points. None of this knows about zoom.
// ---------------------------------------------------------------------------

export function distance(a: Point, b: Point): number {
  return Math.hypot(b.x - a.x, b.y - a.y)
}

/** Sum of segment lengths along an open polyline, in sheet pixels. */
export function polylineLengthPx(points: Point[]): number {
  let total = 0
  for (let i = 1; i < points.length; i++) {
    total += distance(points[i - 1], points[i])
  }
  return total
}

/** Perimeter of a closed polygon (wraps last -> first), in sheet pixels. */
export function polygonPerimeterPx(points: Point[]): number {
  if (points.length < 2) return 0
  return polylineLengthPx(points) + distance(points[points.length - 1], points[0])
}

/** Unsigned polygon area via the shoelace formula, in sheet pixels squared. */
export function polygonAreaPx2(points: Point[]): number {
  if (points.length < 3) return 0
  let sum = 0
  for (let i = 0; i < points.length; i++) {
    const a = points[i]
    const b = points[(i + 1) % points.length]
    sum += a.x * b.y - b.x * a.y
  }
  return Math.abs(sum) / 2
}

// ---------------------------------------------------------------------------
// Real-world unit conversion. pixelsPerMetre is always defined in sheet space.
// ---------------------------------------------------------------------------

export function toMetres(value: number, unit: LengthUnit): number {
  return unit === 'mm' ? value / 1000 : value
}

export function computePixelsPerMetre(
  pointA: Point,
  pointB: Point,
  realDistance: number,
  unit: LengthUnit,
): number {
  const pixelDistance = distance(pointA, pointB)
  const metres = toMetres(realDistance, unit)
  if (metres <= 0) return 0
  return pixelDistance / metres
}

export function pxToM(px: number, pixelsPerMetre: number): number {
  if (pixelsPerMetre <= 0) return 0
  return px / pixelsPerMetre
}

export function px2ToM2(px2: number, pixelsPerMetre: number): number {
  if (pixelsPerMetre <= 0) return 0
  return px2 / (pixelsPerMetre * pixelsPerMetre)
}

/** Human-readable scale readout, e.g. "1px ≈ 4.2mm" or "1:100"-style ratio text. */
export function formatScaleReadout(pixelsPerMetre: number): string {
  if (pixelsPerMetre <= 0) return 'Not calibrated'
  const mmPerPixel = 1000 / pixelsPerMetre
  return `1px ≈ ${mmPerPixel.toFixed(2)}mm`
}
