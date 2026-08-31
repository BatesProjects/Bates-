import { useRef, useState } from 'react'
import { ingestFile, isSupportedUpload } from '../lib/sheets'
import { useProjectStore } from '../store/useProjectStore'
import { SheetThumbnail } from './SheetThumbnail'

export function ThumbnailSidebar() {
  const project = useProjectStore((s) => s.project)
  const addSheet = useProjectStore((s) => s.addSheet)
  const removeSheet = useProjectStore((s) => s.removeSheet)
  const setActiveSheet = useProjectStore((s) => s.setActiveSheet)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [uploading, setUploading] = useState(false)
  const [dragOver, setDragOver] = useState(false)

  if (!project) return null

  async function handleFiles(files: FileList | File[]) {
    const list = Array.from(files).filter(isSupportedUpload)
    if (list.length === 0) return
    setUploading(true)
    try {
      let order = project!.sheets.length
      for (const file of list) {
        const sheets = await ingestFile(file, project!.id, order)
        order += sheets.length
        for (const sheet of sheets) addSheet(sheet)
      }
    } catch (err) {
      console.error(err)
      alert('Failed to process one or more files. See console for details.')
    } finally {
      setUploading(false)
    }
  }

  const sortedSheets = [...project.sheets].sort((a, b) => a.order - b.order)

  return (
    <div
      className={`flex w-40 shrink-0 flex-col border-r border-[#2a2d35] bg-[#16181e] ${dragOver ? 'ring-2 ring-inset ring-[#5b8def]' : ''}`}
      onDragOver={(e) => {
        e.preventDefault()
        setDragOver(true)
      }}
      onDragLeave={() => setDragOver(false)}
      onDrop={(e) => {
        e.preventDefault()
        setDragOver(false)
        handleFiles(e.dataTransfer.files)
      }}
    >
      <div className="flex items-center justify-between border-b border-[#2a2d35] px-2 py-2">
        <span className="text-[11px] font-semibold uppercase tracking-wide text-[#6d7686]">Sheets</span>
        <button
          className="rounded px-1.5 py-0.5 text-[15px] leading-none text-[#8b93a3] hover:bg-[#20232b] hover:text-[#d7dae0]"
          title="Upload PDF or image"
          onClick={() => fileInputRef.current?.click()}
        >
          +
        </button>
        <input
          ref={fileInputRef}
          type="file"
          accept="application/pdf,image/*"
          multiple
          hidden
          onChange={(e) => {
            if (e.target.files) handleFiles(e.target.files)
            e.target.value = ''
          }}
        />
      </div>

      <div className="flex-1 overflow-y-auto p-2">
        {sortedSheets.length === 0 && !uploading && (
          <div className="mt-4 px-1 text-center text-[11px] leading-relaxed text-[#5b6270]">
            Drop a PDF or image here, or click + to upload plan sheets.
          </div>
        )}
        <div className="flex flex-col gap-2">
          {sortedSheets.map((sheet) => (
            <SheetThumbnail
              key={sheet.id}
              sheet={sheet}
              active={sheet.id === project.activeSheetId}
              onClick={() => setActiveSheet(sheet.id)}
              onDelete={() => {
                if (confirm(`Remove "${sheet.name}" and its measurements?`)) removeSheet(sheet.id)
              }}
            />
          ))}
        </div>
        {uploading && (
          <div className="mt-2 px-1 text-center text-[11px] text-[#8b93a3]">Processing…</div>
        )}
      </div>
    </div>
  )
}
