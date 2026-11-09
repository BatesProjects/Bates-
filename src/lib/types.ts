// Core domain types for the takeoff app.
// A "project" is the single unit of persistence and import/export.

export type LengthUnit = 'mm' | 'm'

export interface Point {
  x: number
  y: number
}

/** Two calibrated points on a sheet plus the real-world distance they represent. */
export interface Calibration {
  pointA: Point
  pointB: Point
  realDistance: number
  unit: LengthUnit
  /** Derived: pixels per metre, at the sheet's native (unscaled) pixel resolution. */
  pixelsPerMetre: number
  calibratedAt: string
  /** Set when calibrated from a preset architectural scale (e.g. 100 for "1:100") rather than two clicked points. */
  scaleRatio?: number
}

export interface Sheet {
  id: string
  projectId: string
  name: string
  /** Order in the thumbnail sidebar / original upload order. */
  order: number
  /** Native pixel size of the rendered sheet image (the coordinate space all measurements are stored in). */
  width: number
  height: number
  /** Key into the IndexedDB blob store for the rendered bitmap (PNG). */
  imageBlobKey: string
  calibration: Calibration | null
  createdAt: string
  /**
   * Pixels-per-inch this sheet was rendered at, when known precisely (PDF
   * pages, via their fixed 72pt/inch convention and our render scale).
   * Lets the calibration dialog offer "this sheet is plotted at 1:100"
   * presets without any clicking. Undefined for uploaded images, whose
   * real-world print scale we have no reliable way to know.
   */
  sourceDpi?: number
}

export interface Layer {
  id: string
  projectId: string
  name: string
  color: string
  visible: boolean
  locked: boolean
  order: number
  /** Whether this layer's measurement rows are collapsed in the takeoff summary panel. Undefined = expanded. */
  collapsed?: boolean
  /** Waste percentage applied to every measurement on this layer, e.g. 10 for +10%. A measurement can override it. */
  wastePercent?: number
}

export type MeasurementType = 'area' | 'length' | 'count' | 'radius' | 'wall'

interface MeasurementBase {
  id: string
  projectId: string
  sheetId: string
  layerId: string
  label: string
  type: MeasurementType
  createdAt: string
  updatedAt: string
  /** Overrides the layer's wastePercent for this one measurement, when set. */
  wasteOverridePercent?: number
}

/** A cut-out subtracted from an area's quantity (a stair void, a shower base, ...). */
export interface Cutout {
  id: string
  /** Polygon vertices in sheet-native pixel coordinates, inside the parent area. */
  points: Point[]
}

export interface AreaMeasurement extends MeasurementBase {
  type: 'area'
  /** Polygon vertices in sheet-native pixel coordinates. */
  points: Point[]
  /** Optional depth in metres, to derive a volume. */
  depth?: number
  /** Areas subtracted from the plan area (stair voids, shower bases, ...). */
  cutouts?: Cutout[]
  /** Roof/surface pitch in degrees. True area = plan area / cos(pitch), since plans are drawn in a flat top-down view. */
  pitchDeg?: number
}

export interface LengthMeasurement extends MeasurementBase {
  type: 'length'
  /** Polyline vertices in sheet-native pixel coordinates. */
  points: Point[]
  /** Optional width in metres, to derive an area from a centreline run. */
  width?: number
}

export interface CountMeasurement extends MeasurementBase {
  type: 'count'
  /** A single tally mark. Each click of the count tool creates its own numbered marker/measurement. */
  point: Point
}

export interface RadiusMeasurement extends MeasurementBase {
  type: 'radius'
  center: Point
  /** Radius in sheet-native pixels. */
  radiusPx: number
}

/** A door or window opening cut into a wall run, reducing its net area. */
export interface WallOpening {
  id: string
  label: string
  /** Metres. */
  width: number
  /** Metres. */
  height: number
}

export interface WallMeasurement extends MeasurementBase {
  type: 'wall'
  /** Polyline vertices in sheet-native pixel coordinates — the wall's run in plan view. */
  points: Point[]
  /** Wall height in metres. */
  heightM: number
  openings: WallOpening[]
}

export type Measurement =
  | AreaMeasurement
  | LengthMeasurement
  | CountMeasurement
  | RadiusMeasurement
  | WallMeasurement

export interface Project {
  id: string
  name: string
  createdAt: string
  updatedAt: string
  sheets: Sheet[]
  layers: Layer[]
  measurements: Measurement[]
  activeSheetId: string | null
  activeLayerId: string | null
}

/** Computed, display-ready results derived from a measurement + its sheet's calibration. */
export interface MeasurementResult {
  measurement: Measurement
  /** True when the sheet has no calibration yet, so results are in raw pixels only. */
  uncalibrated: boolean
  lengthM?: number
  perimeterM?: number
  /** Net area: after cut-outs and pitch adjustment, before waste. */
  areaM2?: number
  volumeM3?: number
  count?: number
  /** Area as drawn in plan view, before the pitch adjustment (area type, pitchDeg set). */
  planAreaM2?: number
  /** Total area removed by cut-outs (area type). */
  cutoutAreaM2?: number
  /** Wall run x height, before openings are subtracted (wall type). */
  grossAreaM2?: number
  /** Total door/window opening area subtracted from a wall's gross area (wall type). */
  openingsAreaM2?: number
  /** The effective waste % applied (measurement override, else the layer's), when > 0. */
  wastePercent?: number
  /** areaM2 inflated by wastePercent, when a waste % applies. */
  areaM2WithWaste?: number
  /** lengthM inflated by wastePercent, when a waste % applies. */
  lengthMWithWaste?: number
}
