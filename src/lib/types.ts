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
}

export interface Layer {
  id: string
  projectId: string
  name: string
  color: string
  visible: boolean
  locked: boolean
  order: number
}

export type MeasurementType = 'area' | 'length' | 'count' | 'radius'

interface MeasurementBase {
  id: string
  projectId: string
  sheetId: string
  layerId: string
  label: string
  type: MeasurementType
  createdAt: string
  updatedAt: string
}

export interface AreaMeasurement extends MeasurementBase {
  type: 'area'
  /** Polygon vertices in sheet-native pixel coordinates. */
  points: Point[]
  /** Optional depth in metres, to derive a volume. */
  depth?: number
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

export type Measurement =
  | AreaMeasurement
  | LengthMeasurement
  | CountMeasurement
  | RadiusMeasurement

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
  areaM2?: number
  volumeM3?: number
  count?: number
}
