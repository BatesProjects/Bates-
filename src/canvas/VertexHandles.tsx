import { useState } from 'react'
import { Circle, Line } from 'react-konva'
import type { Measurement, Point } from '../lib/types'
import { useProjectStore } from '../store/useProjectStore'

const HANDLE_RADIUS = 5

function flatten(points: Point[]): number[] {
  return points.flatMap((p) => [p.x, p.y])
}

function extractPoints(m: Measurement): Point[] {
  if (m.type === 'area' || m.type === 'length') return m.points
  if (m.type === 'radius') return [m.center, { x: m.center.x + m.radiusPx, y: m.center.y }]
  if (m.type === 'count') return [m.point]
  return []
}

export function VertexHandles({ measurement, invScale, color }: { measurement: Measurement; invScale: number; color: string }) {
  const updateMeasurement = useProjectStore((s) => s.updateMeasurement)
  const [renderedMeasurement, setRenderedMeasurement] = useState(measurement)
  const [points, setPoints] = useState<Point[]>(() => extractPoints(measurement))

  if (measurement !== renderedMeasurement) {
    setRenderedMeasurement(measurement)
    setPoints(extractPoints(measurement))
  }

  function commit(nextPoints: Point[]) {
    if (measurement.type === 'area' || measurement.type === 'length') {
      updateMeasurement(measurement.id, { points: nextPoints } as Partial<Measurement>)
    } else if (measurement.type === 'radius') {
      const [center, edge] = nextPoints
      updateMeasurement(measurement.id, {
        center,
        radiusPx: Math.hypot(edge.x - center.x, edge.y - center.y),
      } as Partial<Measurement>)
    } else if (measurement.type === 'count') {
      updateMeasurement(measurement.id, { point: nextPoints[0] } as Partial<Measurement>)
    }
  }

  function handleDragMove(index: number, e: { target: { x: () => number; y: () => number } }) {
    const next = [...points]
    if (measurement.type === 'radius' && index === 0) {
      // Dragging the center also drags the edge handle by the same delta.
      const dx = e.target.x() - points[0].x
      const dy = e.target.y() - points[0].y
      next[0] = { x: e.target.x(), y: e.target.y() }
      next[1] = { x: points[1].x + dx, y: points[1].y + dy }
    } else {
      next[index] = { x: e.target.x(), y: e.target.y() }
    }
    setPoints(next)
  }

  function handleDragEnd() {
    commit(points)
  }

  const showOutline = measurement.type === 'area' || measurement.type === 'length'

  return (
    <>
      {showOutline && (
        <Line
          points={flatten(points)}
          closed={measurement.type === 'area'}
          stroke="#ffffff"
          strokeWidth={1 * invScale}
          dash={[4 * invScale, 4 * invScale]}
          listening={false}
        />
      )}
      {measurement.type === 'radius' && (
        <Line points={flatten(points)} stroke="#ffffff" strokeWidth={1 * invScale} dash={[3 * invScale, 3 * invScale]} listening={false} />
      )}
      {points.map((p, i) => (
        <Circle
          key={i}
          x={p.x}
          y={p.y}
          radius={HANDLE_RADIUS * invScale}
          fill="#ffffff"
          stroke={color}
          strokeWidth={1.5 * invScale}
          draggable
          onDragMove={(e) => handleDragMove(i, e)}
          onDragEnd={handleDragEnd}
          onMouseEnter={(e) => {
            const stage = e.target.getStage()
            if (stage) stage.container().style.cursor = 'pointer'
          }}
          onMouseLeave={(e) => {
            const stage = e.target.getStage()
            if (stage) stage.container().style.cursor = 'default'
          }}
        />
      ))}
    </>
  )
}
