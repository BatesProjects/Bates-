import { Circle, Group, Line, Text } from 'react-konva'
import { computeResult } from '../lib/measure'
import type { Layer, Measurement, Sheet } from '../lib/types'
import { useProjectStore } from '../store/useProjectStore'

function hexToRgba(hex: string, alpha: number): string {
  const r = Number.parseInt(hex.slice(1, 3), 16)
  const g = Number.parseInt(hex.slice(3, 5), 16)
  const b = Number.parseInt(hex.slice(5, 7), 16)
  return `rgba(${r}, ${g}, ${b}, ${alpha})`
}

function flatten(points: { x: number; y: number }[]): number[] {
  return points.flatMap((p) => [p.x, p.y])
}

function fmt(n: number | undefined, digits = 2): string {
  if (n === undefined) return ''
  return n.toFixed(digits)
}

export function MeasurementShapes({
  sheet,
  measurements,
  layer,
  invScale,
  countIndex,
}: {
  sheet: Sheet
  measurements: Measurement[]
  layer: Layer
  invScale: number
  countIndex: Map<string, number>
}) {
  const selectedId = useProjectStore((s) => s.selectedMeasurementId)
  const selectMeasurement = useProjectStore((s) => s.selectMeasurement)
  const activeTool = useProjectStore((s) => s.activeTool)

  const selectable = activeTool === 'select' && !layer.locked

  return (
    <>
      {measurements.map((m) => {
        const selected = m.id === selectedId
        const result = computeResult(m, sheet)
        const onClick = selectable
          ? (e: { cancelBubble: boolean }) => {
              e.cancelBubble = true
              selectMeasurement(m.id)
            }
          : undefined

        if (m.type === 'area') {
          const centroid = m.points.reduce((a, p) => ({ x: a.x + p.x / m.points.length, y: a.y + p.y / m.points.length }), { x: 0, y: 0 })
          return (
            <Group key={m.id}>
              <Line
                points={flatten(m.points)}
                closed
                fill={hexToRgba(layer.color, selected ? 0.28 : 0.16)}
                stroke={layer.color}
                strokeWidth={(selected ? 2.5 : 1.5) * invScale}
                onClick={onClick}
                onTap={onClick}
                listening={selectable}
              />
              <Text
                x={centroid.x}
                y={centroid.y}
                text={`${m.label}\n${fmt(result.areaM2)} m²`}
                fontSize={12 * invScale}
                fill="#e4e7ec"
                align="center"
                offsetX={30 * invScale}
                offsetY={12 * invScale}
                listening={false}
              />
            </Group>
          )
        }

        if (m.type === 'length') {
          const mid = m.points[Math.floor((m.points.length - 1) / 2)]
          return (
            <Group key={m.id}>
              <Line
                points={flatten(m.points)}
                stroke={layer.color}
                strokeWidth={(selected ? 3.5 : 2.5) * invScale}
                lineCap="round"
                lineJoin="round"
                onClick={onClick}
                onTap={onClick}
                hitStrokeWidth={12 * invScale}
                listening={selectable}
              />
              {mid && (
                <Text
                  x={mid.x}
                  y={mid.y}
                  text={`${m.label}: ${fmt(result.lengthM)} m`}
                  fontSize={12 * invScale}
                  fill="#e4e7ec"
                  offsetY={18 * invScale}
                  listening={false}
                />
              )}
            </Group>
          )
        }

        if (m.type === 'radius') {
          return (
            <Group key={m.id}>
              <Circle
                x={m.center.x}
                y={m.center.y}
                radius={m.radiusPx}
                stroke={layer.color}
                strokeWidth={(selected ? 2.5 : 1.5) * invScale}
                fill={hexToRgba(layer.color, selected ? 0.24 : 0.12)}
                onClick={onClick}
                onTap={onClick}
                listening={selectable}
              />
              <Text
                x={m.center.x}
                y={m.center.y + m.radiusPx}
                text={`${m.label}: r=${fmt(result.lengthM)}m`}
                fontSize={12 * invScale}
                fill="#e4e7ec"
                offsetX={30 * invScale}
                listening={false}
              />
            </Group>
          )
        }

        // count
        const idx = countIndex.get(m.id) ?? 0
        return (
          <Group key={m.id}>
            <Circle
              x={m.point.x}
              y={m.point.y}
              radius={9 * invScale}
              fill={layer.color}
              stroke={selected ? '#ffffff' : 'rgba(0,0,0,0.4)'}
              strokeWidth={(selected ? 2 : 1) * invScale}
              onClick={onClick}
              onTap={onClick}
              listening={selectable}
            />
            <Text
              x={m.point.x}
              y={m.point.y}
              text={String(idx)}
              fontSize={10 * invScale}
              fill="#0b1220"
              fontStyle="bold"
              align="center"
              verticalAlign="middle"
              offsetX={5 * invScale}
              offsetY={5 * invScale}
              listening={false}
            />
          </Group>
        )
      })}
    </>
  )
}
