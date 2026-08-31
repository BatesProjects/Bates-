import { create } from 'zustand'
import { IDENTITY_VIEW, type ViewTransform } from '../lib/coords'
import { makeId } from '../lib/id'
import { createDefaultLayer, createProject, nextLayerColor } from '../lib/project'
import type {
  Calibration,
  Layer,
  Measurement,
  MeasurementType,
  Point,
  Project,
  Sheet,
} from '../lib/types'

export type ToolId = 'select' | 'pan' | 'calibrate' | 'area' | 'length' | 'count' | 'radius'

const MAX_HISTORY = 200

interface DraftState {
  tool: ToolId | null
  sheetId: string | null
  points: Point[]
  /** For the radius tool, the live cursor point used to preview the circle. */
  cursor: Point | null
}

const EMPTY_DRAFT: DraftState = { tool: null, sheetId: null, points: [], cursor: null }

interface ProjectStoreState {
  project: Project | null
  past: Project[]
  future: Project[]

  activeTool: ToolId
  selectedMeasurementId: string | null
  draft: DraftState
  /** Per-sheet zoom/pan. Ephemeral UI state, not persisted in the project file. */
  views: Record<string, ViewTransform>
  /** Set while the calibration dialog is open, holding the two clicked points. */
  pendingCalibration: { sheetId: string; pointA: Point; pointB: Point } | null
  /** Live cursor position in sheet space, for the status bar readout. */
  hoverPoint: Point | null
  setHoverPoint: (point: Point | null) => void
  spaceHeld: boolean
  setSpaceHeld: (held: boolean) => void

  // --- project lifecycle -----------------------------------------------
  loadProject: (project: Project) => void
  newProject: (name: string) => void
  renameProject: (name: string) => void

  // --- sheets -------------------------------------------------------------
  addSheet: (sheet: Sheet) => void
  removeSheet: (sheetId: string) => void
  setActiveSheet: (sheetId: string) => void
  reorderSheets: (orderedIds: string[]) => void
  setCalibration: (sheetId: string, calibration: Calibration) => void

  // --- layers ---------------------------------------------------------
  addLayer: (name?: string) => string
  renameLayer: (layerId: string, name: string) => void
  setLayerColor: (layerId: string, color: string) => void
  toggleLayerVisible: (layerId: string) => void
  toggleLayerLocked: (layerId: string) => void
  removeLayer: (layerId: string) => void
  setActiveLayer: (layerId: string) => void

  // --- measurements -----------------------------------------------------
  addMeasurement: (measurement: Measurement) => void
  addCountMarker: (sheetId: string, point: Point) => void
  updateMeasurement: (id: string, patch: Partial<Measurement>) => void
  deleteMeasurement: (id: string) => void
  deleteMeasurements: (ids: string[]) => void
  renameMeasurement: (id: string, label: string) => void
  selectMeasurement: (id: string | null) => void

  // --- tool / draft state (not part of undo history) ---------------------
  setActiveTool: (tool: ToolId) => void
  beginDraft: (tool: ToolId, sheetId: string, firstPoint: Point) => void
  addDraftPoint: (point: Point) => void
  setDraftCursor: (point: Point | null) => void
  removeLastDraftPoint: () => void
  cancelDraft: () => void
  commitDraft: () => void

  startCalibrationPoints: (sheetId: string, pointA: Point, pointB: Point) => void
  clearPendingCalibration: () => void

  // --- view (zoom/pan) ------------------------------------------------
  setView: (sheetId: string, view: ViewTransform) => void
  getView: (sheetId: string) => ViewTransform

  // --- history ------------------------------------------------------
  undo: () => void
  redo: () => void
  canUndo: () => boolean
  canRedo: () => boolean
}

function touch(project: Project): Project {
  return { ...project, updatedAt: new Date().toISOString() }
}

function defaultLabel(type: MeasurementType, index: number): string {
  const names: Record<MeasurementType, string> = {
    area: 'Area',
    length: 'Length',
    count: 'Count',
    radius: 'Radius',
  }
  return `${names[type]} ${index}`
}

export function nextMeasurementLabel(project: Project, layerId: string, type: MeasurementType): string {
  const count = project.measurements.filter((m) => m.layerId === layerId && m.type === type).length
  return defaultLabel(type, count + 1)
}

export const useProjectStore = create<ProjectStoreState>((set, get) => ({
  project: null,
  past: [],
  future: [],

  activeTool: 'select',
  selectedMeasurementId: null,
  draft: EMPTY_DRAFT,
  views: {},
  pendingCalibration: null,
  hoverPoint: null,
  setHoverPoint: (point) => set({ hoverPoint: point }),
  spaceHeld: false,
  setSpaceHeld: (held) => set({ spaceHeld: held }),

  loadProject: (project) => set({ project, past: [], future: [], selectedMeasurementId: null, draft: EMPTY_DRAFT }),

  newProject: (name) => set({ project: createProject(name), past: [], future: [], selectedMeasurementId: null, draft: EMPTY_DRAFT }),

  renameProject: (name) =>
    set((s) => (s.project ? { project: touch({ ...s.project, name }) } : s)),

  // ------------------------------------------------------------------
  // Mutations that should land on the undo stack go through `commit`.
  // ------------------------------------------------------------------
  addSheet: (sheet) =>
    commit(set, get, (p) => ({
      ...p,
      sheets: [...p.sheets, sheet],
      activeSheetId: p.activeSheetId ?? sheet.id,
    })),

  removeSheet: (sheetId) =>
    commit(set, get, (p) => ({
      ...p,
      sheets: p.sheets.filter((s) => s.id !== sheetId),
      measurements: p.measurements.filter((m) => m.sheetId !== sheetId),
      activeSheetId: p.activeSheetId === sheetId ? (p.sheets.find((s) => s.id !== sheetId)?.id ?? null) : p.activeSheetId,
    })),

  setActiveSheet: (sheetId) =>
    set((s) => (s.project ? { project: { ...s.project, activeSheetId: sheetId }, selectedMeasurementId: null, draft: EMPTY_DRAFT } : s)),

  reorderSheets: (orderedIds) =>
    commit(set, get, (p) => ({
      ...p,
      sheets: orderedIds
        .map((id, i) => {
          const sheet = p.sheets.find((s) => s.id === id)
          return sheet ? { ...sheet, order: i } : null
        })
        .filter((s): s is Sheet => s !== null),
    })),

  setCalibration: (sheetId, calibration) =>
    commit(set, get, (p) => ({
      ...p,
      sheets: p.sheets.map((s) => (s.id === sheetId ? { ...s, calibration } : s)),
    })),

  addLayer: (name) => {
    const id = makeId()
    commit(set, get, (p) => {
      const layer: Layer = {
        ...createDefaultLayer(p.id, p.layers.length),
        id,
        name: name ?? `Layer ${p.layers.length + 1}`,
        color: nextLayerColor(p.layers),
      }
      return { ...p, layers: [...p.layers, layer], activeLayerId: layer.id }
    })
    return id
  },

  renameLayer: (layerId, name) =>
    commit(set, get, (p) => ({
      ...p,
      layers: p.layers.map((l) => (l.id === layerId ? { ...l, name } : l)),
    })),

  setLayerColor: (layerId, color) =>
    commit(set, get, (p) => ({
      ...p,
      layers: p.layers.map((l) => (l.id === layerId ? { ...l, color } : l)),
    })),

  toggleLayerVisible: (layerId) =>
    commit(set, get, (p) => ({
      ...p,
      layers: p.layers.map((l) => (l.id === layerId ? { ...l, visible: !l.visible } : l)),
    })),

  toggleLayerLocked: (layerId) =>
    commit(set, get, (p) => ({
      ...p,
      layers: p.layers.map((l) => (l.id === layerId ? { ...l, locked: !l.locked } : l)),
    })),

  removeLayer: (layerId) =>
    commit(set, get, (p) => {
      const remaining = p.layers.filter((l) => l.id !== layerId)
      const layers = remaining.length > 0 ? remaining : [createDefaultLayer(p.id, 0)]
      return {
        ...p,
        layers,
        measurements: p.measurements.filter((m) => m.layerId !== layerId),
        activeLayerId: p.activeLayerId === layerId ? layers[0].id : p.activeLayerId,
      }
    }),

  setActiveLayer: (layerId) =>
    set((s) => (s.project ? { project: { ...s.project, activeLayerId: layerId } } : s)),

  addMeasurement: (measurement) =>
    commit(set, get, (p) => ({ ...p, measurements: [...p.measurements, measurement] })),

  addCountMarker: (sheetId, point) =>
    commit(set, get, (p) => {
      const layerId = p.activeLayerId
      if (!layerId) return p
      const now = new Date().toISOString()
      const measurement: Measurement = {
        id: makeId(),
        projectId: p.id,
        sheetId,
        layerId,
        type: 'count',
        label: nextMeasurementLabel(p, layerId, 'count'),
        point,
        createdAt: now,
        updatedAt: now,
      }
      return { ...p, measurements: [...p.measurements, measurement] }
    }),

  updateMeasurement: (id, patch) =>
    commit(set, get, (p) => ({
      ...p,
      measurements: p.measurements.map((m) =>
        m.id === id ? ({ ...m, ...patch, updatedAt: new Date().toISOString() } as Measurement) : m,
      ),
    })),

  deleteMeasurement: (id) =>
    commit(set, get, (p) => ({ ...p, measurements: p.measurements.filter((m) => m.id !== id) })),

  deleteMeasurements: (ids) =>
    commit(set, get, (p) => ({ ...p, measurements: p.measurements.filter((m) => !ids.includes(m.id)) })),

  renameMeasurement: (id, label) =>
    commit(set, get, (p) => ({
      ...p,
      measurements: p.measurements.map((m) => (m.id === id ? { ...m, label, updatedAt: new Date().toISOString() } : m)),
    })),

  selectMeasurement: (id) => set({ selectedMeasurementId: id }),

  // ------------------------------------------------------------------
  // Tool / draft state — deliberately outside the undo stack. Only the
  // final commitDraft() call produces a history entry.
  // ------------------------------------------------------------------
  setActiveTool: (tool) => set({ activeTool: tool, draft: EMPTY_DRAFT, selectedMeasurementId: null }),

  beginDraft: (tool, sheetId, firstPoint) =>
    set({ draft: { tool, sheetId, points: [firstPoint], cursor: firstPoint } }),

  addDraftPoint: (point) =>
    set((s) => ({ draft: { ...s.draft, points: [...s.draft.points, point] } })),

  setDraftCursor: (point) => set((s) => ({ draft: { ...s.draft, cursor: point } })),

  removeLastDraftPoint: () =>
    set((s) => ({ draft: { ...s.draft, points: s.draft.points.slice(0, -1) } })),

  cancelDraft: () => set({ draft: EMPTY_DRAFT }),

  commitDraft: () => {
    const { draft, project } = get()
    if (!project || !draft.tool || !draft.sheetId) return
    const layerId = project.activeLayerId
    if (!layerId) return
    const now = new Date().toISOString()
    const base = {
      id: makeId(),
      projectId: project.id,
      sheetId: draft.sheetId,
      layerId,
      createdAt: now,
      updatedAt: now,
    }

    let measurement: Measurement | null = null
    if (draft.tool === 'area' && draft.points.length >= 3) {
      measurement = {
        ...base,
        type: 'area',
        label: nextMeasurementLabel(project, layerId, 'area'),
        points: draft.points,
      }
    } else if (draft.tool === 'length' && draft.points.length >= 2) {
      measurement = {
        ...base,
        type: 'length',
        label: nextMeasurementLabel(project, layerId, 'length'),
        points: draft.points,
      }
    } else if (draft.tool === 'radius' && draft.points.length >= 2) {
      const [center, edge] = draft.points
      measurement = {
        ...base,
        type: 'radius',
        label: nextMeasurementLabel(project, layerId, 'radius'),
        center,
        radiusPx: Math.hypot(edge.x - center.x, edge.y - center.y),
      }
    }

    set({ draft: EMPTY_DRAFT })
    if (measurement) {
      get().addMeasurement(measurement)
    }
  },

  startCalibrationPoints: (sheetId, pointA, pointB) => set({ pendingCalibration: { sheetId, pointA, pointB } }),
  clearPendingCalibration: () => set({ pendingCalibration: null }),

  setView: (sheetId, view) => set((s) => ({ views: { ...s.views, [sheetId]: view } })),
  getView: (sheetId) => get().views[sheetId] ?? IDENTITY_VIEW,

  undo: () =>
    set((s) => {
      if (s.past.length === 0 || !s.project) return s
      const previous = s.past[s.past.length - 1]
      return {
        project: previous,
        past: s.past.slice(0, -1),
        future: [s.project, ...s.future],
        selectedMeasurementId: null,
      }
    }),

  redo: () =>
    set((s) => {
      if (s.future.length === 0) return s
      const next = s.future[0]
      return {
        project: next,
        past: s.project ? [...s.past, s.project] : s.past,
        future: s.future.slice(1),
        selectedMeasurementId: null,
      }
    }),

  canUndo: () => get().past.length > 0,
  canRedo: () => get().future.length > 0,
}))

function commit(
  set: (partial: Partial<ProjectStoreState> | ((s: ProjectStoreState) => Partial<ProjectStoreState>)) => void,
  get: () => ProjectStoreState,
  mutator: (project: Project) => Project,
) {
  const { project, past } = get()
  if (!project) return
  const nextProject = touch(mutator(project))
  const nextPast = [...past, project].slice(-MAX_HISTORY)
  set({ project: nextProject, past: nextPast, future: [] })
}
