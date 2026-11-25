import { create } from 'zustand'
import { IDENTITY_VIEW, type ViewTransform } from '../lib/coords'
import { makeId } from '../lib/id'
import { LAYER_PALETTE, createDefaultLayer, createProject, migrateProject, nextLayerColor } from '../lib/project'
import type {
  Calibration,
  CountMeasurement,
  ItemPreset,
  Layer,
  Measurement,
  MeasurementType,
  Point,
  Project,
  Sheet,
  Viewport,
} from '../lib/types'

export type ToolId =
  | 'select'
  | 'pan'
  | 'calibrate'
  | 'verify'
  | 'area'
  | 'length'
  | 'count'
  | 'radius'
  | 'wall'
  | 'room'
  | 'viewport'
export type Screen = 'dashboard' | 'takeoff'

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
  screen: Screen
  goToDashboard: () => void

  project: Project | null
  past: Project[]
  future: Project[]

  activeTool: ToolId
  selectedMeasurementId: string | null
  /** The viewport currently shown/edited in the sidebar, mutually exclusive with selectedMeasurementId. */
  selectedViewportId: string | null
  selectViewport: (id: string | null) => void
  draft: DraftState
  /** Per-sheet zoom/pan. Ephemeral UI state, not persisted in the project file. */
  views: Record<string, ViewTransform>
  /** Set while the calibration dialog is open, holding the two clicked points. When viewportId is set, the resulting calibration is written to that viewport instead of the sheet. */
  pendingCalibration: { sheetId: string; pointA: Point; pointB: Point; viewportId?: string } | null
  /** True when the calibration tool should show its "pick a method" chooser rather than wait for two clicks. */
  calibrationChooserOpen: boolean
  /** Set when the chooser/dialog was opened to calibrate a specific viewport rather than the sheet itself. */
  calibratingViewportId: string | null
  openCalibrationChooser: (viewportId?: string) => void
  closeCalibrationChooser: () => void
  /** Switches to the calibrate tool targeting one viewport instead of the sheet, in one atomic step (setActiveTool alone would reset calibratingViewportId). */
  startViewportCalibration: (viewportId: string) => void
  /** Set after two clicks with the Verify Scale tool, holding the points to check against the known distance the user enters. */
  pendingVerify: { sheetId: string; pointA: Point; pointB: Point } | null
  startVerifyPoints: (sheetId: string, pointA: Point, pointB: Point) => void
  clearPendingVerify: () => void
  /** Live cursor position in sheet space, for the status bar readout. */
  hoverPoint: Point | null
  setHoverPoint: (point: Point | null) => void
  spaceHeld: boolean
  setSpaceHeld: (held: boolean) => void
  /** Set while drawing a cut-out polygon for this area measurement, instead of a new top-level measurement. */
  cutoutTargetId: string | null
  startCutout: (measurementId: string) => void
  cancelCutout: () => void

  // --- item presets (saved across every project, not part of `project`) --
  itemPresets: ItemPreset[]
  loadItemPresets: (presets: ItemPreset[]) => void
  addItemPreset: (preset?: Partial<Omit<ItemPreset, 'id'>>) => string
  updateItemPreset: (id: string, patch: Partial<Omit<ItemPreset, 'id'>>) => void
  deleteItemPreset: (id: string) => void
  /** Deletes the preset AND every count marker tagged with it, in the current project (mirrors removeLayer deleting its measurements). */
  deleteItemPresetAndMarkers: (id: string) => void
  /** The item preset new count-tool clicks are grouped under. Null = plain, ungrouped tally marks (legacy behaviour). */
  activeItemPresetId: string | null
  setActiveItemPresetId: (id: string | null) => void
  itemPresetsDialogOpen: boolean
  openItemPresetsDialog: () => void
  closeItemPresetsDialog: () => void

  // --- project lifecycle -----------------------------------------------
  loadProject: (project: Project) => void
  newProject: (name: string) => void
  renameProject: (name: string) => void

  // --- sheets -------------------------------------------------------------
  addSheet: (sheet: Sheet) => void
  removeSheet: (sheetId: string) => void
  renameSheet: (sheetId: string, name: string) => void
  setActiveSheet: (sheetId: string) => void
  reorderSheets: (orderedIds: string[]) => void
  setCalibration: (sheetId: string, calibration: Calibration) => void

  // --- viewports (independently-scaled regions on a sheet) ---------------
  addViewport: (sheetId: string, pointA: Point, pointB: Point) => void
  renameViewport: (sheetId: string, viewportId: string, name: string) => void
  removeViewport: (sheetId: string, viewportId: string) => void
  setViewportCalibration: (sheetId: string, viewportId: string, calibration: Calibration) => void

  // --- layers ---------------------------------------------------------
  addLayer: (name?: string) => string
  renameLayer: (layerId: string, name: string) => void
  setLayerColor: (layerId: string, color: string) => void
  toggleLayerVisible: (layerId: string) => void
  toggleLayerLocked: (layerId: string) => void
  toggleLayerCollapsed: (layerId: string) => void
  setAllLayersCollapsed: (collapsed: boolean) => void
  setLayerWastePercent: (layerId: string, percent: number | undefined) => void
  removeLayer: (layerId: string) => void
  setActiveLayer: (layerId: string) => void

  // --- "By item" summary rows -----------------------------------------
  toggleItemPresetVisible: (presetId: string) => void
  toggleItemPresetCollapsed: (presetId: string) => void

  // --- measurements -----------------------------------------------------
  addMeasurement: (measurement: Measurement) => void
  addCountMarker: (sheetId: string, point: Point) => void
  removeCountMarker: (measurementId: string, index: number) => void
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

  startCalibrationPoints: (sheetId: string, pointA: Point, pointB: Point, viewportId?: string) => void
  clearPendingCalibration: () => void

  // --- view (zoom/pan) ------------------------------------------------
  setView: (sheetId: string, view: ViewTransform) => void
  getView: (sheetId: string) => ViewTransform
  /** Set to re-centre the canvas on a sheet-space point (e.g. "jump to this measurement" from the summary panel); consumed once by SheetCanvas. */
  pendingFocusPoint: { sheetId: string; point: Point } | null
  focusOnPoint: (sheetId: string, point: Point) => void
  clearPendingFocusPoint: () => void

  // --- in-app replacements for window.confirm/alert --------------------
  // Claude's artifact viewer (and any other sandboxed iframe host) makes
  // window.confirm()/alert() silent no-ops — confirm() returns false and
  // alert() does nothing — so every delete/error path that relied on them
  // looked like it did nothing at all. These render an actual dialog/toast
  // instead, via GlobalDialogs, and work identically in a normal browser tab.
  confirmRequest: { message: string; confirmLabel: string; resolve: (ok: boolean) => void } | null
  requestConfirm: (message: string, confirmLabel?: string) => Promise<boolean>
  resolveConfirm: (ok: boolean) => void
  toast: { message: string; id: number } | null
  showToast: (message: string) => void
  dismissToast: () => void

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
    wall: 'Wall',
    room: 'Room',
  }
  return `${names[type]} ${index}`
}

export function nextMeasurementLabel(project: Project, layerId: string, type: MeasurementType): string {
  const count = project.measurements.filter((m) => m.layerId === layerId && m.type === type).length
  return defaultLabel(type, count + 1)
}

export const useProjectStore = create<ProjectStoreState>((set, get) => ({
  screen: 'dashboard',
  goToDashboard: () => set({ screen: 'dashboard' }),

  project: null,
  past: [],
  future: [],

  activeTool: 'select',
  selectedMeasurementId: null,
  selectedViewportId: null,
  selectViewport: (id) => set({ selectedViewportId: id, selectedMeasurementId: id ? null : get().selectedMeasurementId }),
  draft: EMPTY_DRAFT,
  views: {},
  pendingCalibration: null,
  calibrationChooserOpen: false,
  calibratingViewportId: null,
  openCalibrationChooser: (viewportId) => set({ calibrationChooserOpen: true, calibratingViewportId: viewportId ?? null }),
  closeCalibrationChooser: () => set({ calibrationChooserOpen: false }),
  startViewportCalibration: (viewportId) =>
    set({
      activeTool: 'calibrate',
      draft: EMPTY_DRAFT,
      selectedMeasurementId: null,
      selectedViewportId: null,
      calibrationChooserOpen: true,
      calibratingViewportId: viewportId,
      pendingCalibration: null,
      pendingVerify: null,
      cutoutTargetId: null,
    }),
  pendingVerify: null,
  startVerifyPoints: (sheetId, pointA, pointB) => set({ pendingVerify: { sheetId, pointA, pointB } }),
  clearPendingVerify: () => set({ pendingVerify: null }),
  hoverPoint: null,
  setHoverPoint: (point) => set({ hoverPoint: point }),
  spaceHeld: false,
  setSpaceHeld: (held) => set({ spaceHeld: held }),
  cutoutTargetId: null,
  startCutout: (measurementId) =>
    set({
      activeTool: 'area',
      draft: EMPTY_DRAFT,
      selectedMeasurementId: null,
      cutoutTargetId: measurementId,
      calibrationChooserOpen: false,
      pendingCalibration: null,
      pendingVerify: null,
    }),
  cancelCutout: () => set({ cutoutTargetId: null }),

  itemPresets: [],
  loadItemPresets: (presets) => set({ itemPresets: presets }),
  addItemPreset: (preset) => {
    const id = makeId()
    set((s) => ({
      itemPresets: [
        ...s.itemPresets,
        {
          id,
          name: preset?.name ?? `Item ${s.itemPresets.length + 1}`,
          color: preset?.color ?? LAYER_PALETTE[s.itemPresets.length % LAYER_PALETTE.length],
          markerShape: preset?.markerShape ?? 'circle',
          defaultHeightM: preset?.defaultHeightM,
          defaultWastePercent: preset?.defaultWastePercent,
          costCode: preset?.costCode,
        },
      ],
    }))
    return id
  },
  updateItemPreset: (id, patch) =>
    set((s) => ({ itemPresets: s.itemPresets.map((p) => (p.id === id ? { ...p, ...patch } : p)) })),
  deleteItemPreset: (id) =>
    set((s) => ({
      itemPresets: s.itemPresets.filter((p) => p.id !== id),
      activeItemPresetId: s.activeItemPresetId === id ? null : s.activeItemPresetId,
    })),
  deleteItemPresetAndMarkers: (id) => {
    commit(set, get, (p) => ({
      ...p,
      measurements: p.measurements.filter((m) => !(m.type === 'count' && m.itemPresetId === id)),
      hiddenItemPresetIds: (p.hiddenItemPresetIds ?? []).filter((pid) => pid !== id),
      collapsedItemPresetIds: (p.collapsedItemPresetIds ?? []).filter((pid) => pid !== id),
    }))
    get().deleteItemPreset(id)
  },
  activeItemPresetId: null,
  setActiveItemPresetId: (id) => set({ activeItemPresetId: id }),
  itemPresetsDialogOpen: false,
  openItemPresetsDialog: () => set({ itemPresetsDialogOpen: true }),
  closeItemPresetsDialog: () => set({ itemPresetsDialogOpen: false }),

  loadProject: (project) =>
    set({
      project: migrateProject(project),
      past: [],
      future: [],
      selectedMeasurementId: null,
      draft: EMPTY_DRAFT,
      views: {},
      pendingCalibration: null,
      calibrationChooserOpen: false,
      pendingVerify: null,
      activeTool: 'select',
      activeItemPresetId: null,
      pendingFocusPoint: null,
      screen: 'takeoff',
    }),

  newProject: (name) =>
    set({
      project: createProject(name),
      past: [],
      future: [],
      selectedMeasurementId: null,
      draft: EMPTY_DRAFT,
      views: {},
      pendingCalibration: null,
      calibrationChooserOpen: false,
      pendingVerify: null,
      activeTool: 'select',
      activeItemPresetId: null,
      pendingFocusPoint: null,
      screen: 'takeoff',
    }),

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

  renameSheet: (sheetId, name) =>
    commit(set, get, (p) => ({
      ...p,
      sheets: p.sheets.map((s) => (s.id === sheetId ? { ...s, name } : s)),
    })),

  addViewport: (sheetId, pointA, pointB) =>
    commit(set, get, (p) => {
      const x = Math.min(pointA.x, pointB.x)
      const y = Math.min(pointA.y, pointB.y)
      const width = Math.abs(pointB.x - pointA.x)
      const height = Math.abs(pointB.y - pointA.y)
      if (width < 4 || height < 4) return p
      return {
        ...p,
        sheets: p.sheets.map((s) => {
          if (s.id !== sheetId) return s
          const viewports = s.viewports ?? []
          const viewport: Viewport = {
            id: makeId(),
            name: `Viewport ${viewports.length + 1}`,
            bounds: { x, y, width, height },
            calibration: null,
          }
          return { ...s, viewports: [...viewports, viewport] }
        }),
      }
    }),

  renameViewport: (sheetId, viewportId, name) =>
    commit(set, get, (p) => ({
      ...p,
      sheets: p.sheets.map((s) =>
        s.id === sheetId ? { ...s, viewports: (s.viewports ?? []).map((v) => (v.id === viewportId ? { ...v, name } : v)) } : s,
      ),
    })),

  removeViewport: (sheetId, viewportId) => {
    commit(set, get, (p) => ({
      ...p,
      sheets: p.sheets.map((s) =>
        s.id === sheetId ? { ...s, viewports: (s.viewports ?? []).filter((v) => v.id !== viewportId) } : s,
      ),
    }))
    if (get().selectedViewportId === viewportId) set({ selectedViewportId: null })
  },

  setViewportCalibration: (sheetId, viewportId, calibration) =>
    commit(set, get, (p) => ({
      ...p,
      sheets: p.sheets.map((s) =>
        s.id === sheetId
          ? { ...s, viewports: (s.viewports ?? []).map((v) => (v.id === viewportId ? { ...v, calibration } : v)) }
          : s,
      ),
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

  // Collapse state is purely a takeoff-summary display preference, not a
  // measurement edit — kept off the undo stack so Ctrl+Z never un-collapses
  // a layer the user tidied away, but still saved with the project.
  toggleLayerCollapsed: (layerId) =>
    set((s) =>
      s.project
        ? {
            project: touch({
              ...s.project,
              layers: s.project.layers.map((l) => (l.id === layerId ? { ...l, collapsed: !l.collapsed } : l)),
            }),
          }
        : s,
    ),

  setAllLayersCollapsed: (collapsed) =>
    set((s) =>
      s.project
        ? {
            project: touch({
              ...s.project,
              layers: s.project.layers.map((l) => ({ ...l, collapsed })),
            }),
          }
        : s,
    ),

  setLayerWastePercent: (layerId, percent) =>
    commit(set, get, (p) => ({
      ...p,
      layers: p.layers.map((l) => (l.id === layerId ? { ...l, wastePercent: percent } : l)),
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

  toggleItemPresetVisible: (presetId) =>
    commit(set, get, (p) => {
      const hidden = new Set(p.hiddenItemPresetIds ?? [])
      if (hidden.has(presetId)) hidden.delete(presetId)
      else hidden.add(presetId)
      return { ...p, hiddenItemPresetIds: [...hidden] }
    }),

  // Collapse state is purely a takeoff-summary display preference, like
  // toggleLayerCollapsed — kept off the undo stack but still saved with the project.
  toggleItemPresetCollapsed: (presetId) =>
    set((s) => {
      if (!s.project) return s
      const collapsed = new Set(s.project.collapsedItemPresetIds ?? [])
      if (collapsed.has(presetId)) collapsed.delete(presetId)
      else collapsed.add(presetId)
      return { project: touch({ ...s.project, collapsedItemPresetIds: [...collapsed] }) }
    }),

  addMeasurement: (measurement) =>
    commit(set, get, (p) => ({ ...p, measurements: [...p.measurements, measurement] })),

  addCountMarker: (sheetId, point) =>
    commit(set, get, (p) => {
      const layerId = p.activeLayerId
      if (!layerId) return p
      const now = new Date().toISOString()
      const activeItemPresetId = get().activeItemPresetId

      // No active item: a plain, ungrouped tally mark (legacy behaviour).
      if (!activeItemPresetId) {
        const measurement: Measurement = {
          id: makeId(),
          projectId: p.id,
          sheetId,
          layerId,
          type: 'count',
          label: nextMeasurementLabel(p, layerId, 'count'),
          points: [point],
          createdAt: now,
          updatedAt: now,
        }
        return { ...p, measurements: [...p.measurements, measurement] }
      }

      // An active item: clicks on the same sheet+layer+item accumulate onto one group.
      const existing = p.measurements.find(
        (m): m is CountMeasurement =>
          m.type === 'count' && m.sheetId === sheetId && m.layerId === layerId && m.itemPresetId === activeItemPresetId,
      )
      if (existing) {
        return {
          ...p,
          measurements: p.measurements.map((m) =>
            m.id === existing.id ? { ...existing, points: [...existing.points, point], updatedAt: now } : m,
          ),
        }
      }
      const preset = get().itemPresets.find((ip) => ip.id === activeItemPresetId)
      const measurement: Measurement = {
        id: makeId(),
        projectId: p.id,
        sheetId,
        layerId,
        type: 'count',
        label: preset?.name ?? nextMeasurementLabel(p, layerId, 'count'),
        points: [point],
        itemPresetId: activeItemPresetId,
        heightM: preset?.defaultHeightM,
        wasteOverridePercent: preset?.defaultWastePercent,
        createdAt: now,
        updatedAt: now,
      }
      return { ...p, measurements: [...p.measurements, measurement] }
    }),

  removeCountMarker: (measurementId, index) =>
    commit(set, get, (p) => {
      const m = p.measurements.find((mm) => mm.id === measurementId)
      if (!m || m.type !== 'count') return p
      const points = m.points.filter((_, i) => i !== index)
      if (points.length === 0) {
        return { ...p, measurements: p.measurements.filter((mm) => mm.id !== measurementId) }
      }
      return {
        ...p,
        measurements: p.measurements.map((mm) =>
          mm.id === measurementId ? { ...mm, points, updatedAt: new Date().toISOString() } : mm,
        ),
      }
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

  selectMeasurement: (id) => set({ selectedMeasurementId: id, selectedViewportId: id ? null : get().selectedViewportId }),

  // ------------------------------------------------------------------
  // Tool / draft state — deliberately outside the undo stack. Only the
  // final commitDraft() call produces a history entry.
  // ------------------------------------------------------------------
  setActiveTool: (tool) =>
    set({
      activeTool: tool,
      draft: EMPTY_DRAFT,
      selectedMeasurementId: null,
      selectedViewportId: null,
      calibrationChooserOpen: tool === 'calibrate',
      calibratingViewportId: null,
      pendingCalibration: null,
      pendingVerify: null,
      cutoutTargetId: null,
    }),

  beginDraft: (tool, sheetId, firstPoint) =>
    set({ draft: { tool, sheetId, points: [firstPoint], cursor: firstPoint } }),

  addDraftPoint: (point) =>
    set((s) => ({ draft: { ...s.draft, points: [...s.draft.points, point] } })),

  setDraftCursor: (point) => set((s) => ({ draft: { ...s.draft, cursor: point } })),

  removeLastDraftPoint: () =>
    set((s) => ({ draft: { ...s.draft, points: s.draft.points.slice(0, -1) } })),

  cancelDraft: () => set({ draft: EMPTY_DRAFT }),

  commitDraft: () => {
    const { draft, project, cutoutTargetId } = get()
    if (!project || !draft.tool || !draft.sheetId) return

    // Drawing a cut-out for an existing area measurement, not a new one.
    if (cutoutTargetId && draft.tool === 'area' && draft.points.length >= 3) {
      const targetId = cutoutTargetId
      const points = draft.points
      set({ draft: EMPTY_DRAFT, cutoutTargetId: null, activeTool: 'select', selectedMeasurementId: targetId })
      commit(set, get, (p) => ({
        ...p,
        measurements: p.measurements.map((m) =>
          m.id === targetId && m.type === 'area'
            ? { ...m, cutouts: [...(m.cutouts ?? []), { id: makeId(), points }], updatedAt: new Date().toISOString() }
            : m,
        ),
      }))
      return
    }

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
    } else if (draft.tool === 'wall' && draft.points.length >= 2) {
      measurement = {
        ...base,
        type: 'wall',
        label: nextMeasurementLabel(project, layerId, 'wall'),
        points: draft.points,
        heightM: 2.4,
        openings: [],
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
    } else if (draft.tool === 'room' && draft.points.length >= 3) {
      measurement = {
        ...base,
        type: 'room',
        label: nextMeasurementLabel(project, layerId, 'room'),
        points: draft.points,
        heightM: 2.4,
      }
    }

    set({ draft: EMPTY_DRAFT })
    if (measurement) {
      get().addMeasurement(measurement)
    }
  },

  startCalibrationPoints: (sheetId, pointA, pointB, viewportId) =>
    set({ pendingCalibration: { sheetId, pointA, pointB, viewportId } }),
  clearPendingCalibration: () => set({ pendingCalibration: null, calibratingViewportId: null }),

  setView: (sheetId, view) => set((s) => ({ views: { ...s.views, [sheetId]: view } })),
  getView: (sheetId) => get().views[sheetId] ?? IDENTITY_VIEW,
  pendingFocusPoint: null,
  focusOnPoint: (sheetId, point) => set({ pendingFocusPoint: { sheetId, point } }),
  clearPendingFocusPoint: () => set({ pendingFocusPoint: null }),

  confirmRequest: null,
  requestConfirm: (message, confirmLabel = 'Delete') =>
    new Promise<boolean>((resolve) => {
      set({ confirmRequest: { message, confirmLabel, resolve } })
    }),
  resolveConfirm: (ok) => {
    get().confirmRequest?.resolve(ok)
    set({ confirmRequest: null })
  },
  toast: null,
  showToast: (message) => set({ toast: { message, id: Date.now() } }),
  dismissToast: () => set({ toast: null }),

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
