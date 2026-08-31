import { Circle, Line } from 'react-konva'
import { distance } from '../lib/coords'
import type { Point } from '../lib/types'

function flatten(points: Point[]): number[] {
  return points.flatMap((p) => [p.x, p.y])
}

export function DraftPreview({
  tool,
  points,
  cursor,
  color,
  invScale,
}: {
  tool: 'area' | 'length' | 'radius' | 'calibrate' | 'count' | 'select' | 'pan'
  points: Point[]
  cursor: Point | null
  color: string
  invScale: number
}) {
  if (points.length === 0) return null

  if (tool === 'area') {
    const previewPoints = cursor ? [...points, cursor] : points
    return (
      <>
        <Line
          points={flatten(previewPoints)}
          closed={points.length >= 2}
          stroke={color}
          strokeWidth={2 * invScale}
          dash={[6 * invScale, 4 * invScale]}
          fill="rgba(91, 141, 239, 0.12)"
          listening={false}
        />
        {points.map((p, i) => (
          <Circle key={i} x={p.x} y={p.y} radius={4 * invScale} fill={color} listening={false} />
        ))}
      </>
    )
  }

  if (tool === 'length') {
    const previewPoints = cursor ? [...points, cursor] : points
    return (
      <>
        <Line points={flatten(previewPoints)} stroke={color} strokeWidth={2.5 * invScale} dash={[6 * invScale, 4 * invScale]} lineCap="round" listening={false} />
        {points.map((p, i) => (
          <Circle key={i} x={p.x} y={p.y} radius={4 * invScale} fill={color} listening={false} />
        ))}
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
      </>
    )
  }

  if (tool === 'calibrate') {
    const a = points[0]
    const b = cursor ?? a
    return (
      <>
        <Line points={[a.x, a.y, b.x, b.y]} stroke="#e8a53d" strokeWidth={2 * invScale} dash={[6 * invScale, 4 * invScale]} listening={false} />
        <Circle x={a.x} y={a.y} radius={4 * invScale} fill="#e8a53d" listening={false} />
      </>
    )
  }

  return null
}
