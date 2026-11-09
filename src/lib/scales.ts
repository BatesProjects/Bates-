// Standard architectural drawing scales, as their ratio denominator (e.g. 100 for "1:100").
export const PRESET_SCALE_RATIOS = [1, 2, 5, 10, 20, 25, 50, 75, 100, 150, 200, 250, 500, 1000] as const

const METRES_PER_INCH = 0.0254

/**
 * pixelsPerMetre for a sheet plotted at 1:scaleRatio, given the sheet's
 * source resolution in pixels-per-inch (sourceDpi). At 1:1 (full size),
 * one metre of real-world distance occupies sourceDpi / METRES_PER_INCH
 * pixels; a drawing plotted smaller by `scaleRatio` packs that same metre
 * into proportionally fewer pixels.
 */
export function pixelsPerMetreForScale(scaleRatio: number, sourceDpi: number): number {
  if (scaleRatio <= 0 || sourceDpi <= 0) return 0
  return sourceDpi / METRES_PER_INCH / scaleRatio
}

export function formatScaleRatio(scaleRatio: number): string {
  return `1:${scaleRatio}`
}
