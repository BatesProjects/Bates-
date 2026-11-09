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

/** Outer polygon area minus every hole's area, clamped to zero (holes can't exceed the outer area). */
export function polygonWithHolesAreaPx2(outer: Point[], holes: Point[][]): number {
  const outerArea = polygonAreaPx2(outer)
  const holesArea = holes.reduce((sum, hole) => sum + polygonAreaPx2(hole), 0)
  return Math.max(0, outerArea - holesArea)
}

/** True (sloped) area from a plan-view (flat, top-down) area, given a pitch in degrees. */
export function applyPitch(planAreaPx2: number, pitchDeg: number): number {
  if (!pitchDeg) return planAreaPx2
  const cos = Math.cos((pitchDeg * Math.PI) / 180)
  if (cos <= 0) return planAreaPx2
  return planAreaPx2 / cos
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

// ---------------------------------------------------------------------------
// Drawing aids: angle-lock and point-snap. Both operate purely on sheet-space
// points so the same resolved point is used for the live preview and the
// point actually committed when the user clicks.
// ---------------------------------------------------------------------------

const ANGLE_STEP_RAD = Math.PI / 4 // 45°

/** Snaps the direction from `from` to `to` onto the nearest 45° increment, keeping the distance. */
export function snapToAngle(from: Point, to: Point): Point {
  const dx = to.x - from.x
  const dy = to.y - from.y
  const dist = Math.hypot(dx, dy)
  if (dist === 0) return to
  const angle = Math.atan2(dy, dx)
  const snappedAngle = Math.round(angle / ANGLE_STEP_RAD) * ANGLE_STEP_RAD
  return {
    x: from.x + dist * Math.cos(snappedAngle),
    y: from.y + dist * Math.sin(snappedAngle),
  }
}

/**
 * Finds the closest candidate point within `radiusSheetPx` of `point`, or
 * null if none qualifies. Candidates and the search radius are both in
 * sheet-space pixels — convert a screen-pixel threshold via the view scale
 * before calling.
 */
export function findSnapTarget(point: Point, candidates: Point[], radiusSheetPx: number): Point | null {
  let best: Point | null = null
  let bestDist = radiusSheetPx
  for (const candidate of candidates) {
    const d = distance(point, candidate)
    if (d <= bestDist) {
      best = candidate
      bestDist = d
    }
  }
  return best
}
