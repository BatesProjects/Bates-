import { useEffect, useState } from 'react'
import { getBlob } from '../lib/db'

const urlCache = new Map<string, string>()

/** Loads (and caches) the bitmap for a sheet's imageBlobKey as an HTMLImageElement. */
export function useSheetImage(imageBlobKey: string | null): HTMLImageElement | null {
  const [image, setImage] = useState<HTMLImageElement | null>(null)

  useEffect(() => {
    if (!imageBlobKey) {
      setImage(null)
      return
    }
    let cancelled = false
    setImage(null)

    async function load() {
      let url = urlCache.get(imageBlobKey!)
      if (!url) {
        const blob = await getBlob(imageBlobKey!)
        if (!blob) return
        url = URL.createObjectURL(blob)
        urlCache.set(imageBlobKey!, url)
      }
      const img = new window.Image()
      img.onload = () => {
        if (!cancelled) setImage(img)
      }
      img.src = url
    }

    load()
    return () => {
      cancelled = true
    }
  }, [imageBlobKey])

  return image
}
