import { useEffect } from 'react'
import { useProjectStore } from '../store/useProjectStore'

/**
 * Renders in-app replacements for window.confirm()/alert(). Mounted once at
 * the app root so it works on both the Dashboard and the takeoff screen.
 */
export function GlobalDialogs() {
  const confirmRequest = useProjectStore((s) => s.confirmRequest)
  const resolveConfirm = useProjectStore((s) => s.resolveConfirm)
  const toast = useProjectStore((s) => s.toast)
  const dismissToast = useProjectStore((s) => s.dismissToast)

  useEffect(() => {
    if (!toast) return
    const t = setTimeout(() => dismissToast(), 6000)
    return () => clearTimeout(t)
  }, [toast, dismissToast])

  return (
    <>
      {confirmRequest && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="w-80 rounded-lg border border-[#2a2d35] bg-[#1c1f27] p-4 shadow-xl">
            <p className="mb-4 text-sm leading-relaxed text-[#e4e7ec]">{confirmRequest.message}</p>
            <div className="flex justify-end gap-2">
              <button
                autoFocus
                className="rounded px-3 py-1.5 text-xs text-[#8b93a3] hover:bg-[#20232b]"
                onClick={() => resolveConfirm(false)}
              >
                Cancel
              </button>
              <button
                className="rounded bg-[#c0392b] px-3 py-1.5 text-xs font-semibold text-white hover:bg-[#d8483a]"
                onClick={() => resolveConfirm(true)}
              >
                {confirmRequest.confirmLabel}
              </button>
            </div>
          </div>
        </div>
      )}
      {toast && (
        <div className="fixed bottom-4 left-1/2 z-50 flex max-w-md -translate-x-1/2 items-start gap-3 rounded-lg border border-[#2a2d35] bg-[#1c1f27] px-4 py-2.5 text-xs leading-relaxed text-[#e4e7ec] shadow-xl">
          <span>{toast.message}</span>
          <button className="shrink-0 text-[#8b93a3] hover:text-[#d7dae0]" onClick={dismissToast} title="Dismiss">
            ×
          </button>
        </div>
      )}
    </>
  )
}
