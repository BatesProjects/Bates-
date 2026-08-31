import { useEffect, useRef } from 'react'
import { Image as KonvaImage, Layer as KonvaLayer, Stage } from 'react-konva'
import type Konva from 'konva'
import { IDENTITY_VIEW, screenToSheet, zoomAroundScreenPoint } from '../lib/coords'
import type { Measurement, Point, Sheet } from '../lib/types'
import { useProjectStore } from '../store/useProjectStore'
import { DraftPreview } from './DraftPreview'
import { MeasurementShapes } from './MeasurementShapes'
import { useElementSize } from './useElementSize'
import { useSheetImage } from './useSheetImage'
import { VertexHandles } from './VertexHandles'

const MIN_SCALE = 0.05
const MAX_SCALE = 20
const WHEEL_SCALE_STEP = 1.08
// Konva's own dblclick synthesis (Konva.dblClickWindow) is a global 400ms
// timer with no distance check at all, so it misfires a "finish shape" event
// whenever two ordinary clicks anywhere on the canvas land within 400ms of
// each other. We detect double-clicks ourselves instead, requiring the two
// clicks to also be near the same screen position.
const DOUBLE_CLICK_MS = 350
const DOUBLE_CLICK_DIST_PX = 6

function clamp(v: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, v))
}

function screenPointFromEvent(evt: MouseEvent | WheelEvent, container: HTMLElement): Point {
  const rect = container.getBoundingClientRect()
  return { x: evt.clientX - rect.left, y: evt.clientY - rect.top }
}

function buildCountIndex(measurements: Measurement[]): Map<string, number> {
  const byLayer = new Map<string, Measurement[]>()
  for (const m of measurements) {
    if (m.type !== 'count') continue
    const arr = byLayer.get(m.layerId) ?? []
    arr.push(m)
    byLayer.set(m.layerId, arr)
  }
  const index = new Map<string, number>()
  for (const arr of byLayer.values()) {
    arr.sort((a, b) => a.createdAt.localeCompare(b.createdAt))
    arr.forEach((m, i) => index.set(m.id, i + 1))
  }
  return index
}

export function SheetCanvas({ sheet }: { sheet: Sheet }) {
  const { ref: containerRef, size } = useElementSize<HTMLDivElement>()
  const image = useSheetImage(sheet.imageBlobKey)

  const project = useProjectStore((s) => s.project)
  const rawView = useProjectStore((s) => s.views[sheet.id])
  const setView = useProjectStore((s) => s.setView)
  const activeTool = useProjectStore((s) => s.activeTool)
  const spaceHeld = useProjectStore((s) => s.spaceHeld)
  const draft = useProjectStore((s) => s.draft)
  const beginDraft = useProjectStore((s) => s.beginDraft)
  const addDraftPoint = useProjectStore((s) => s.addDraftPoint)
  const setDraftCursor = useProjectStore((s) => s.setDraftCursor)
  const commitDraft = useProjectStore((s) => s.commitDraft)
  const cancelDraft = useProjectStore((s) => s.cancelDraft)
  const addCountMarker = useProjectStore((s) => s.addCountMarker)
  const startCalibrationPoints = useProjectStore((s) => s.startCalibrationPoints)
  const setHoverPoint = useProjectStore((s) => s.setHoverPoint)
  const selectedMeasurementId = useProjectStore((s) => s.selectedMeasurementId)
  const selectMeasurement = useProjectStore((s) => s.selectMeasurement)
  const pendingCalibration = useProjectStore((s) => s.pendingCalibration)

  const view = rawView ?? IDENTITY_VIEW
  const panMode = activeTool === 'pan' || spaceHeld
  const isMiddlePanningRef = useRef(false)
  const lastScreenRef = useRef<Point | null>(null)
  const lastClickRef = useRef<{ time: number; screenPoint: Point } | null>(null)

  // Fit the sheet to the viewport the first time it's opened.
  useEffect(() => {
    if (rawView || size.width === 0 || size.height === 0) return
    const scale = clamp(Math.min(size.width / sheet.width, size.height / sheet.height) * 0.95, MIN_SCALE, 1)
    const offsetX = (size.width - sheet.width * scale) / 2
    const offsetY = (size.height - sheet.height * scale) / 2
    setView(sheet.id, { scale, offsetX, offsetY })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rawView, size.width, size.height, sheet.id])

  if (!project) return null

  function handleWheel(e: Konva.KonvaEventObject<WheelEvent>) {
    e.evt.preventDefault()
    const container = containerRef.current
    if (!container) return
    const screenPoint = screenPointFromEvent(e.evt, container)
    const direction = e.evt.deltaY > 0 ? -1 : 1
    const newScale = clamp(view.scale * (direction > 0 ? WHEEL_SCALE_STEP : 1 / WHEEL_SCALE_STEP), MIN_SCALE, MAX_SCALE)
    setView(sheet.id, zoomAroundScreenPoint(view, screenPoint, newScale))
  }

  function handleMouseDown(e: Konva.KonvaEventObject<MouseEvent>) {
    if (e.evt.button === 1) {
      e.evt.preventDefault()
      const container = containerRef.current
      if (!container) return
      isMiddlePanningRef.current = true
      lastScreenRef.current = screenPointFromEvent(e.evt, container)
    }
  }

  function handleMouseMove(e: Konva.KonvaEventObject<MouseEvent>) {
    const container = containerRef.current
    if (!container) return
    const screenPoint = screenPointFromEvent(e.evt, container)

    if (isMiddlePanningRef.current && lastScreenRef.current) {
      const dx = screenPoint.x - lastScreenRef.current.x
      const dy = screenPoint.y - lastScreenRef.current.y
      setView(sheet.id, { scale: view.scale, offsetX: view.offsetX + dx, offsetY: view.offsetY + dy })
      lastScreenRef.current = screenPoint
      return
    }

    const sheetPoint = screenToSheet(screenPoint, view)
    setHoverPoint(sheetPoint)
    if (draft.tool) setDraftCursor(sheetPoint)
  }

  function handleMouseUp(e: Konva.KonvaEventObject<MouseEvent>) {
    if (e.evt.button === 1) {
      isMiddlePanningRef.current = false
      lastScreenRef.current = null
    }
  }

  function handleMouseLeave() {
    setHoverPoint(null)
    isMiddlePanningRef.current = false
    lastScreenRef.current = null
  }

  function handleDragMove(e: Konva.KonvaEventObject<DragEvent>) {
    const stage = e.target.getStage()
    if (!stage || e.target !== stage) return
    setView(sheet.id, { scale: view.scale, offsetX: stage.x(), offsetY: stage.y() })
  }

  function handleStageClick(e: Konva.KonvaEventObject<MouseEvent>) {
    if (panMode || pendingCalibration) return
    if (e.evt.button !== 0) return
    const container = containerRef.current
    if (!container) return
    const screenPoint = screenPointFromEvent(e.evt, container)
    const sheetPoint = screenToSheet(screenPoint, view)
    const stage = e.target.getStage()
    const clickedEmpty = e.target === stage

    const now = performance.now()
    const prevClick = lastClickRef.current
    const isDoubleClick =
      !!prevClick &&
      now - prevClick.time < DOUBLE_CLICK_MS &&
      Math.hypot(screenPoint.x - prevClick.screenPoint.x, screenPoint.y - prevClick.screenPoint.y) < DOUBLE_CLICK_DIST_PX
    lastClickRef.current = { time: now, screenPoint }

    if (activeTool === 'select') {
      if (clickedEmpty) selectMeasurement(null)
      return
    }
    if (activeTool === 'calibrate') {
      if (draft.points.length === 0) {
        beginDraft('calibrate', sheet.id, sheetPoint)
      } else {
        startCalibrationPoints(sheet.id, draft.points[0], sheetPoint)
        cancelDraft()
      }
      return
    }
    if (activeTool === 'count') {
      addCountMarker(sheet.id, sheetPoint)
      return
    }
    if (activeTool === 'area') {
      if (draft.points.length === 0) {
        beginDraft('area', sheet.id, sheetPoint)
      } else if (draft.points.length >= 3 && (nearFirstPoint(sheetPoint) || isDoubleClick)) {
        commitDraft()
      } else {
        addDraftPoint(sheetPoint)
      }
      return
    }
    if (activeTool === 'length') {
      if (draft.points.length === 0) {
        beginDraft('length', sheet.id, sheetPoint)
      } else if (draft.points.length >= 2 && isDoubleClick) {
        commitDraft()
      } else {
        addDraftPoint(sheetPoint)
      }
      return
    }
    if (activeTool === 'radius') {
      if (draft.points.length === 0) {
        beginDraft('radius', sheet.id, sheetPoint)
      } else {
        addDraftPoint(sheetPoint)
        commitDraft()
      }
    }
  }

  function nearFirstPoint(sheetPoint: Point): boolean {
    if (draft.points.length === 0) return false
    const first = draft.points[0]
    const screenDist = Math.hypot(first.x - sheetPoint.x, first.y - sheetPoint.y) * view.scale
    return screenDist < 10
  }

  const sheetMeasurements = project.measurements.filter((m) => m.sheetId === sheet.id)
  const countIndex = buildCountIndex(sheetMeasurements)
  const invScale = 1 / view.scale
  const sortedLayers = [...project.layers].sort((a, b) => a.order - b.order)
  const selectedMeasurement = sheetMeasurements.find((m) => m.id === selectedMeasurementId)
  const selectedLayer = selectedMeasurement ? project.layers.find((l) => l.id === selectedMeasurement.layerId) : undefined

  const cursorStyle = panMode ? 'grab' : activeTool === 'select' ? 'default' : 'crosshair'

  return (
    <div ref={containerRef} className="relative flex-1 overflow-hidden bg-[#0e0f13]" style={{ cursor: cursorStyle }}>
      {size.width > 0 && size.height > 0 && (
        <Stage
          width={size.width}
          height={size.height}
          scaleX={view.scale}
          scaleY={view.scale}
          x={view.offsetX}
          y={view.offsetY}
          draggable={panMode}
          onDragMove={handleDragMove}
          onWheel={handleWheel}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseLeave}
          onClick={handleStageClick}
        >
          <KonvaLayer>
            {image && <KonvaImage image={image} width={sheet.width} height={sheet.height} listening={false} />}
          </KonvaLayer>
          <KonvaLayer>
            {sortedLayers
              .filter((layer) => layer.visible)
              .map((layer) => (
                <MeasurementShapes
                  key={layer.id}
                  sheet={sheet}
                  layer={layer}
                  measurements={sheetMeasurements.filter((m) => m.layerId === layer.id)}
                  invScale={invScale}
                  countIndex={countIndex}
                />
              ))}
            {selectedMeasurement &&
              activeTool === 'select' &&
              selectedLayer &&
              !selectedLayer.locked &&
              selectedLayer.visible && (
                <VertexHandles measurement={selectedMeasurement} invScale={invScale} color={selectedLayer.color} />
              )}
            <DraftPreview
              tool={draft.tool ?? 'select'}
              points={draft.points}
              cursor={draft.cursor}
              color="#5b8def"
              invScale={invScale}
            />
          </KonvaLayer>
        </Stage>
      )}
    </div>
  )
}
