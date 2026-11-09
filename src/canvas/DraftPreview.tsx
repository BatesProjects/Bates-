import { Circle, Label, Line, Tag, Text } from 'react-konva'
import { distance, findSnapTarget, polylineLengthPx, pxToM } from '../lib/coords'
import type { Point } from '../lib/types'

function flatten(points: Point[]): number[] {
  return points.flatMap((p) => [p.x, p.y])
}

function fmtDist(px: number, pixelsPerMetre: number): string {
  if (pixelsPerMetre <= 0) return `${px.toFixed(0)}px`
  return `${pxToM(px, pixelsPerMetre).toFixed(2)}m`
}

function LiveLabel({ at, text, invScale }: { at: Point; text: string; invScale: number }) {
  return (
    <Label x={at.x} y={at.y} listening={false}>
      <Tag fill="rgba(14,15,19,0.88)" cornerRadius={3 * invScale} />
      <Text text={text} fontSize={11 * invScale} padding={4 * invScale} fill="#e4e7ec" />
    </Label>
  )
}

export function DraftPreview({
  tool,
  points,
  cursor,
  color,
  invScale,
  pixelsPerMetre = 0,
  snapCandidates = [],
  snapRadiusSheetPx = 0,
}: {
  tool: 'area' | 'length' | 'radius' | 'calibrate' | 'verify' | 'count' | 'select' | 'pan'
  points: Point[]
  cursor: Point | null
  color: string
  invScale: number
  /** Sheet calibration, so live labels can show metres instead of raw pixels. 0 = uncalibrated. */
  pixelsPerMetre?: number
  snapCandidates?: Point[]
  snapRadiusSheetPx?: number
}) {
  if (points.length === 0) return null

  const snapTarget = cursor && snapRadiusSheetPx > 0 ? findSnapTarget(cursor, snapCandidates, snapRadiusSheetPx) : null
  const isSnapped = !!snapTarget && !!cursor && distance(snapTarget, cursor) < 0.01
  const snapRing = isSnapped && cursor && (
    <Circle x={cursor.x} y={cursor.y} radius={9 * invScale} stroke="#4ade80" strokeWidth={1.5 * invScale} listening={false} />
  )

  if (tool === 'area' || tool === 'length') {
    const previewPoints = cursor ? [...points, cursor] : points
    const lastPoint = points[points.length - 1]
    const currentSegmentPx = cursor ? distance(lastPoint, cursor) : 0
    const runningTotalPx = polylineLengthPx(points) + currentSegmentPx
    const labelAnchor = cursor ? { x: (lastPoint.x + cursor.x) / 2, y: (lastPoint.y + cursor.y) / 2 } : null

    return (
      <>
        <Line
          points={flatten(previewPoints)}
          closed={tool === 'area' && points.length >= 2}
          stroke={color}
          strokeWidth={(tool === 'area' ? 2 : 2.5) * invScale}
          dash={[6 * invScale, 4 * invScale]}
          fill={tool === 'area' ? 'rgba(91, 141, 239, 0.12)' : undefined}
          lineCap="round"
          listening={false}
        />
        {points.map((p, i) => (
          <Circle key={i} x={p.x} y={p.y} radius={4 * invScale} fill={color} listening={false} />
        ))}
        {cursor && labelAnchor && currentSegmentPx > 0 && (
          <LiveLabel
            at={{ x: labelAnchor.x + 10 * invScale, y: labelAnchor.y - 20 * invScale }}
            text={
              points.length > 1
                ? `${fmtDist(currentSegmentPx, pixelsPerMetre)}  ·  total ${fmtDist(runningTotalPx, pixelsPerMetre)}`
                : fmtDist(currentSegmentPx, pixelsPerMetre)
            }
            invScale={invScale}
          />
        )}
        {snapRing}
      </>
    )
  }

  if (tool === 'radius') {
    const center = points[0]
    const edge = cursor ?? center
    const r = distance(center, edge)
    return (
      <>
        <Circle x={center.x} y={center.y} radius={r} stroke={color} strokeWidth={2 * invScale} dash={[6 * invScale, 4 * invScale]} listening={false} />
        <Circle x={center.x} y={center.y} radius={4 * invScale} fill={color} listening={false} />
        {cursor && r > 0 && (
          <LiveLabel
            at={{ x: edge.x + 10 * invScale, y: edge.y - 20 * invScale }}
            text={`r = ${fmtDist(r, pixelsPerMetre)}`}
            invScale={invScale}
          />
        )}
        {snapRing}
      </>
    )
  }

  if (tool === 'calibrate' || tool === 'verify') {
    const a = points[0]
    const b = cursor ?? a
    const lineColor = tool === 'calibrate' ? '#e8a53d' : '#2dd4bf'
    return (
      <>
        <Line points={[a.x, a.y, b.x, b.y]} stroke={lineColor} strokeWidth={2 * invScale} dash={[6 * invScale, 4 * invScale]} listening={false} />
        <Circle x={a.x} y={a.y} radius={4 * invScale} fill={lineColor} listening={false} />
        {cursor && (
          <LiveLabel
            at={{ x: (a.x + b.x) / 2 + 10 * invScale, y: (a.y + b.y) / 2 - 20 * invScale }}
            text={`${distance(a, b).toFixed(0)}px`}
            invScale={invScale}
          />
        )}
        {snapRing}
      </>
    )
  }

  return null
}
