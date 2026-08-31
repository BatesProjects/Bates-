# Bates Takeoff

A local, single-user construction takeoff tool for measuring quantities (area, length, count, radius) directly off uploaded plan drawings (PDF or image). Built for pulling material quantities off residential drawings — renovations, extensions, decks, bathrooms — without a subscription takeoff product.

No accounts, no cloud sync, no server. Everything lives in the browser's IndexedDB; projects export to a single portable JSON file (sheets included) or an XLSX workbook.

## Stack

- React + TypeScript + Vite
- Konva / react-konva for the interactive canvas
- pdf.js for rendering PDF sheets to bitmaps
- Zustand for app state (sheets, layers, measurements, undo/redo)
- IndexedDB (via `idb`) for local persistence
- SheetJS (`xlsx`) for workbook export
- Tailwind for styling

## Getting started

```bash
npm install
npm run dev       # start the dev server
npm run build     # typecheck + production build
npm run test      # run the coordinate-math unit tests
npm run lint      # oxlint
```

## How it works

1. **Upload a sheet** — drop a PDF (each page becomes its own sheet) or an image into the Sheets panel.
2. **Calibrate** — pick the Calibrate tool, click the two ends of a known dimension on the drawing, and enter the real-world distance. The scale (pixels-per-metre) is stored per sheet and shown in the status bar.
3. **Measure** — Area (polygon), Length (polyline, with an optional width to derive m²), Count (numbered tally markers), and Radius/circle tools. Click to place points; press Enter or double-click to finish a polygon/polyline, or click back near the first point to close an area. Esc cancels a draft, Backspace removes the last point.
4. **Organise by layer** — every measurement belongs to a coloured, nameable layer that can be hidden or locked, mirroring how trades/scopes are organised in Bluebeam-style tools.
5. **Edit** — switch to Select, click a shape, and drag its vertices to adjust it after the fact.
6. **Export** — an XLSX workbook (summary tab grouped by layer + a raw one-row-per-measurement tab), or a full project JSON (sheets, calibration, layers, measurements, with images embedded) that can be imported on another machine.

## Coordinate math

`src/lib/coords.ts` is the single source of truth for the mapping between screen pixels, the pan/zoom view transform, and sheet-space pixels — every stored measurement point and every calibration lives in sheet space, which never changes with zoom. `src/lib/coords.test.ts` checks this directly, including that the same real-world line reads identically at several different zoom levels.

## What's not in v1

Markup/annotation tools, custom stamps, snapping, sheet comparison, assemblies (layer → material recipes), and a flattened/marked-up PDF export are deliberately left for later — see the project brief for the full v2 list.
