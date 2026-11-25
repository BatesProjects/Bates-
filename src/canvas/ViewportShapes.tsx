import { Group, Rect, Text } from 'react-konva'
import { formatScaleRatio } from '../lib/scales'
import type { Viewport } from '../lib/types'

export function ViewportShapes({
  viewports,
  invScale,
  selectedId,
  selectable,
  onSelect,
}: {
  viewports: Viewport[]
  invScale: number
  selectedId: string | null
  selectable: boolean
  onSelect: (id: string) => void
}) {
  return (
    <>
      {viewports.map((vp) => {
        const selected = vp.id === selectedId
        const scaleLabel = vp.calibration?.scaleRatio
          ? formatScaleRatio(vp.calibration.scaleRatio)
          : vp.calibration
            ? 'calibrated'
            : 'uncalibrated'
        const onClick = selectable
          ? (e: { cancelBubble: boolean }) => {
              e.cancelBubble = true
              onSelect(vp.id)
            }
          : undefined
        return (
          <Group key={vp.id}>
            <Rect
              x={vp.bounds.x}
              y={vp.bounds.y}
              width={vp.bounds.width}
              height={vp.bounds.height}
              stroke="#2dd4bf"
              strokeWidth={(selected ? 2.5 : 1.5) * invScale}
              dash={[8 * invScale, 5 * invScale]}
              fill={selected ? 'rgba(45, 212, 191, 0.1)' : 'rgba(45, 212, 191, 0.03)'}
              onClick={onClick}
              onTap={onClick}
              listening={selectable}
            />
            <Text
              x={vp.bounds.x}
              y={vp.bounds.y}
              text={`${vp.name} · ${scaleLabel}`}
              fontSize={11 * invScale}
              fill="#2dd4bf"
              padding={3 * invScale}
              offsetY={16 * invScale}
              listening={false}
            />
          </Group>
        )
      })}
    </>
  )
}
