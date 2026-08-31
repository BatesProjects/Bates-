import { useState } from 'react'
import { LAYER_PALETTE } from '../lib/project'
import { useProjectStore } from '../store/useProjectStore'

export function LayersPanel() {
  const project = useProjectStore((s) => s.project)
  const addLayer = useProjectStore((s) => s.addLayer)
  const renameLayer = useProjectStore((s) => s.renameLayer)
  const setLayerColor = useProjectStore((s) => s.setLayerColor)
  const toggleLayerVisible = useProjectStore((s) => s.toggleLayerVisible)
  const toggleLayerLocked = useProjectStore((s) => s.toggleLayerLocked)
  const removeLayer = useProjectStore((s) => s.removeLayer)
  const setActiveLayer = useProjectStore((s) => s.setActiveLayer)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [colorPickerId, setColorPickerId] = useState<string | null>(null)
  const [draftName, setDraftName] = useState('')

  if (!project) return null

  return (
    <div className="flex flex-col border-b border-[#2a2d35]">
      <div className="flex items-center justify-between px-3 py-2">
        <span className="text-[11px] font-semibold uppercase tracking-wide text-[#6d7686]">Layers</span>
        <button
          className="rounded px-1.5 py-0.5 text-[15px] leading-none text-[#8b93a3] hover:bg-[#20232b] hover:text-[#d7dae0]"
          onClick={() => addLayer()}
          title="Add layer"
        >
          +
        </button>
      </div>
      <div className="max-h-48 overflow-y-auto px-2 pb-2">
        {[...project.layers]
          .sort((a, b) => a.order - b.order)
          .map((layer) => (
            <div
              key={layer.id}
              onClick={() => setActiveLayer(layer.id)}
              className={`group mb-1 flex items-center gap-2 rounded px-1.5 py-1 ${
                layer.id === project.activeLayerId ? 'bg-[#20232b]' : 'hover:bg-[#1c1f27]'
              }`}
            >
              <button
                className="h-3 w-3 shrink-0 rounded-full ring-1 ring-black/30"
                style={{ backgroundColor: layer.color }}
                title="Change colour"
                onClick={(e) => {
                  e.stopPropagation()
                  setColorPickerId(colorPickerId === layer.id ? null : layer.id)
                }}
              />
              {editingId === layer.id ? (
                <input
                  autoFocus
                  className="min-w-0 flex-1 rounded bg-[#14161b] px-1 text-xs text-[#e4e7ec] outline-none ring-1 ring-[#5b8def]"
                  value={draftName}
                  onChange={(e) => setDraftName(e.target.value)}
                  onClick={(e) => e.stopPropagation()}
                  onBlur={() => {
                    if (draftName.trim()) renameLayer(layer.id, draftName.trim())
                    setEditingId(null)
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') e.currentTarget.blur()
                    if (e.key === 'Escape') setEditingId(null)
                  }}
                />
              ) : (
                <span
                  className="min-w-0 flex-1 truncate text-xs text-[#c7cbd4]"
                  onDoubleClick={(e) => {
                    e.stopPropagation()
                    setDraftName(layer.name)
                    setEditingId(layer.id)
                  }}
                  title={layer.name}
                >
                  {layer.name}
                </span>
              )}

              <button
                title={layer.visible ? 'Hide layer' : 'Show layer'}
                onClick={(e) => {
                  e.stopPropagation()
                  toggleLayerVisible(layer.id)
                }}
                className="shrink-0 text-[#8b93a3] hover:text-[#d7dae0]"
              >
                {layer.visible ? (
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none">
                    <path
                      d="M1 12s4-7 11-7 11 7 11 7-4 7-11 7-11-7-11-7z"
                      stroke="currentColor"
                      strokeWidth="1.8"
                    />
                    <circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="1.8" />
                  </svg>
                ) : (
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none">
                    <path d="M3 3l18 18M10.6 10.6a3 3 0 004 4M9.5 5.4A11 11 0 0112 5c7 0 11 7 11 7a13.7 13.7 0 01-3.4 4.1M6.1 6.1A13.6 13.6 0 001 12s4 7 11 7a10.7 10.7 0 004.9-1.1" stroke="currentColor" strokeWidth="1.8" />
                  </svg>
                )}
              </button>
              <button
                title={layer.locked ? 'Unlock layer' : 'Lock layer'}
                onClick={(e) => {
                  e.stopPropagation()
                  toggleLayerLocked(layer.id)
                }}
                className="shrink-0 text-[#8b93a3] hover:text-[#d7dae0]"
              >
                {layer.locked ? (
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none">
                    <rect x="4" y="11" width="16" height="9" rx="1.5" stroke="currentColor" strokeWidth="1.8" />
                    <path d="M7 11V7a5 5 0 0110 0v4" stroke="currentColor" strokeWidth="1.8" />
                  </svg>
                ) : (
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none">
                    <rect x="4" y="11" width="16" height="9" rx="1.5" stroke="currentColor" strokeWidth="1.8" />
                    <path d="M7 11V7a5 5 0 019.5-2.2" stroke="currentColor" strokeWidth="1.8" />
                  </svg>
                )}
              </button>
              <button
                title="Delete layer"
                onClick={(e) => {
                  e.stopPropagation()
                  if (confirm(`Delete layer "${layer.name}" and its measurements?`)) removeLayer(layer.id)
                }}
                className="hidden shrink-0 text-[#8b93a3] hover:text-[#c0392b] group-hover:inline"
              >
                ×
              </button>

              {colorPickerId === layer.id && (
                <div
                  className="absolute z-10 mt-8 flex flex-wrap gap-1 rounded border border-[#2a2d35] bg-[#1c1f27] p-1.5 shadow-lg"
                  onClick={(e) => e.stopPropagation()}
                >
                  {LAYER_PALETTE.map((c) => (
                    <button
                      key={c}
                      className="h-4 w-4 rounded-full ring-1 ring-black/30"
                      style={{ backgroundColor: c }}
                      onClick={() => {
                        setLayerColor(layer.id, c)
                        setColorPickerId(null)
                      }}
                    />
                  ))}
                </div>
              )}
            </div>
          ))}
      </div>
    </div>
  )
}
