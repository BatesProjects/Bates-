import { describe, expect, it } from 'vitest'
import {
  computePixelsPerMetre,
  distance,
  findSnapTarget,
  polygonAreaPx2,
  polygonPerimeterPx,
  polylineLengthPx,
  px2ToM2,
  pxToM,
  screenToSheet,
  sheetToScreen,
  snapToAngle,
  zoomAroundScreenPoint,
  type ViewTransform,
} from './coords'
import { pixelsPerMetreForScale } from './scales'

describe('screen <-> sheet round trip', () => {
  it('round-trips a point through an arbitrary view transform', () => {
    const view: ViewTransform = { scale: 1.734, offsetX: -312, offsetY: 87 }
    const sheetPoint = { x: 456.2, y: 913.7 }
    const screenPoint = sheetToScreen(sheetPoint, view)
    const back = screenToSheet(screenPoint, view)
    expect(back.x).toBeCloseTo(sheetPoint.x, 9)
    expect(back.y).toBeCloseTo(sheetPoint.y, 9)
  })

  it('zoomAroundScreenPoint keeps the anchor sheet point under the same screen point', () => {
    const view: ViewTransform = { scale: 1, offsetX: 0, offsetY: 0 }
    const anchorScreen = { x: 400, y: 250 }
    const anchorSheetBefore = screenToSheet(anchorScreen, view)

    const zoomed = zoomAroundScreenPoint(view, anchorScreen, 2.5)
    const anchorSheetAfter = screenToSheet(anchorScreen, zoomed)

    expect(anchorSheetAfter.x).toBeCloseTo(anchorSheetBefore.x, 9)
    expect(anchorSheetAfter.y).toBeCloseTo(anchorSheetBefore.y, 9)
  })
})

describe('calibration is zoom-invariant (the core sanity check from the brief)', () => {
  // Sheet is calibrated once, in sheet-space: 500px = 5m, so 100 px/m.
  const pixelsPerMetre = computePixelsPerMetre({ x: 0, y: 0 }, { x: 500, y: 0 }, 5, 'm')

  it('a 10m line read at 100% zoom measures 10.00m', () => {
    const view: ViewTransform = { scale: 1, offsetX: 0, offsetY: 0 }
    // User clicks two screen points; at 100% zoom, screen px == sheet px.
    const screenA = { x: 100, y: 100 }
    const screenB = { x: 1100, y: 100 } // 1000 screen px apart == 1000 sheet px == 10m
    const a = screenToSheet(screenA, view)
    const b = screenToSheet(screenB, view)
    const lengthM = pxToM(distance(a, b), pixelsPerMetre)
    expect(lengthM).toBeCloseTo(10, 2)
  })

  it('the same real-world line read at 200% zoom still measures 10.00m', () => {
    const view: ViewTransform = { scale: 2, offsetX: -50, offsetY: 30 }
    // The same sheet-space 1000px line, now clicked via its zoomed screen position.
    const sheetA = { x: 100, y: 100 }
    const sheetB = { x: 1100, y: 100 }
    const screenA = sheetToScreen(sheetA, view)
    const screenB = sheetToScreen(sheetB, view)

    // Simulate the user clicking those exact screen positions at 200% zoom.
    const a = screenToSheet(screenA, view)
    const b = screenToSheet(screenB, view)
    const lengthM = pxToM(distance(a, b), pixelsPerMetre)
    expect(lengthM).toBeCloseTo(10, 2)
  })

  it('measures identically across a range of zoom levels', () => {
    for (const scale of [0.25, 0.5, 1, 1.5, 2, 4, 8]) {
      const view: ViewTransform = { scale, offsetX: 17, offsetY: -42 }
      const sheetA = { x: 200, y: 400 }
      const sheetB = { x: 700, y: 400 } // 500 sheet px == 5m
      const screenA = sheetToScreen(sheetA, view)
      const screenB = sheetToScreen(sheetB, view)
      const a = screenToSheet(screenA, view)
      const b = screenToSheet(screenB, view)
      const lengthM = pxToM(distance(a, b), pixelsPerMetre)
      expect(lengthM).toBeCloseTo(5, 6)
    }
  })
})

describe('polygon/polyline geometry', () => {
  it('computes the area of a simple rectangle', () => {
    const points = [
      { x: 0, y: 0 },
      { x: 400, y: 0 },
      { x: 400, y: 200 },
      { x: 0, y: 200 },
    ]
    expect(polygonAreaPx2(points)).toBeCloseTo(400 * 200, 6)
  })

  it('is winding-order independent', () => {
    const cw = [
      { x: 0, y: 0 },
      { x: 400, y: 0 },
      { x: 400, y: 200 },
      { x: 0, y: 200 },
    ]
    const ccw = [...cw].reverse()
    expect(polygonAreaPx2(cw)).toBeCloseTo(polygonAreaPx2(ccw), 6)
  })

  it('computes perimeter of a rectangle including the closing edge', () => {
    const points = [
      { x: 0, y: 0 },
      { x: 400, y: 0 },
      { x: 400, y: 200 },
      { x: 0, y: 200 },
    ]
    expect(polygonPerimeterPx(points)).toBeCloseTo(2 * (400 + 200), 6)
  })

  it('computes polyline length as the sum of open segments (no closing edge)', () => {
    const points = [
      { x: 0, y: 0 },
      { x: 300, y: 0 },
      { x: 300, y: 400 },
    ]
    expect(polylineLengthPx(points)).toBeCloseTo(300 + 400, 6)
  })

  it('a calibrated 10x10m square reads as 100.00 m2', () => {
    const ppm = computePixelsPerMetre({ x: 0, y: 0 }, { x: 100, y: 0 }, 1, 'm') // 100 px/m
    const points = [
      { x: 0, y: 0 },
      { x: 1000, y: 0 },
      { x: 1000, y: 1000 },
      { x: 0, y: 1000 },
    ] // 10m x 10m square at 100 px/m
    const areaM2 = px2ToM2(polygonAreaPx2(points), ppm)
    expect(areaM2).toBeCloseTo(100, 6)
  })
})

describe('calibration unit handling', () => {
  it('treats mm and m inputs consistently', () => {
    const ppmFromMetres = computePixelsPerMetre({ x: 0, y: 0 }, { x: 200, y: 0 }, 2, 'm')
    const ppmFromMillimetres = computePixelsPerMetre(
      { x: 0, y: 0 },
      { x: 200, y: 0 },
      2000,
      'mm',
    )
    expect(ppmFromMetres).toBeCloseTo(ppmFromMillimetres, 9)
    expect(ppmFromMetres).toBeCloseTo(100, 9)
  })
})

describe('snapToAngle', () => {
  it('snaps a near-horizontal segment exactly onto 0°', () => {
    const from = { x: 100, y: 100 }
    const to = { x: 300, y: 104 } // almost horizontal, slight downward drift
    const snapped = snapToAngle(from, to)
    expect(snapped.y).toBeCloseTo(from.y, 6)
    expect(distance(from, snapped)).toBeCloseTo(distance(from, to), 6)
  })

  it('snaps a near-vertical segment exactly onto 90°', () => {
    const from = { x: 50, y: 50 }
    const to = { x: 53, y: 250 }
    const snapped = snapToAngle(from, to)
    expect(snapped.x).toBeCloseTo(from.x, 6)
  })

  it('snaps a roughly-diagonal segment onto 45°', () => {
    const from = { x: 0, y: 0 }
    const to = { x: 103, y: 97 } // close to a true 45° line
    const snapped = snapToAngle(from, to)
    expect(snapped.x).toBeCloseTo(snapped.y, 6)
  })

  it('preserves distance exactly regardless of angle', () => {
    const from = { x: 10, y: 10 }
    const to = { x: 37, y: 61 }
    const originalDist = distance(from, to)
    const snapped = snapToAngle(from, to)
    expect(distance(from, snapped)).toBeCloseTo(originalDist, 9)
  })
})

describe('findSnapTarget', () => {
  const candidates = [
    { x: 0, y: 0 },
    { x: 500, y: 500 },
    { x: 100, y: 100 },
  ]

  it('returns the nearest candidate within the radius', () => {
    const found = findSnapTarget({ x: 103, y: 98 }, candidates, 10)
    expect(found).toEqual({ x: 100, y: 100 })
  })

  it('returns null when nothing is within the radius', () => {
    const found = findSnapTarget({ x: 250, y: 250 }, candidates, 10)
    expect(found).toBeNull()
  })

  it('picks the closest of several candidates within range', () => {
    const found = findSnapTarget({ x: 2, y: 2 }, candidates, 200)
    expect(found).toEqual({ x: 0, y: 0 })
  })
})

describe('pixelsPerMetreForScale (preset architectural scales)', () => {
  it('matches the known PDF constant: 1:100 at 180dpi', () => {
    // 180 dpi comes from RENDER_SCALE(2.5) * 72 points/inch, per pdf.ts.
    const ppm = pixelsPerMetreForScale(100, 180)
    expect(ppm).toBeCloseTo(70.8661, 3)
  })

  it('halving the scale ratio halves pixelsPerMetre', () => {
    const ppm50 = pixelsPerMetreForScale(50, 180)
    const ppm100 = pixelsPerMetreForScale(100, 180)
    expect(ppm50).toBeCloseTo(ppm100 * 2, 6)
  })

  it('a 1:1 plot at 180dpi equals 180/0.0254 px per metre', () => {
    const ppm = pixelsPerMetreForScale(1, 180)
    expect(ppm).toBeCloseTo(180 / 0.0254, 6)
  })
})
