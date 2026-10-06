import { ImagePlus, LoaderCircle, Trash2 } from 'lucide-react'
import { useCallback, useRef, useState } from 'react'
import type { Photo } from '../lib/api'
import { admin, photoUrl } from '../lib/api'

/**
 * Drag & drop multi-photo uploader with previews and drag-to-reorder.
 * Existing photos live on the server; new ones upload immediately.
 */
export default function PhotoManager({ pageId, photos, onChange }: { pageId: number; photos: Photo[]; onChange: (photos: Photo[]) => void }) {
  const [dragOver, setDragOver] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [dragIndex, setDragIndex] = useState<number | null>(null)
  const [overIndex, setOverIndex] = useState<number | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const upload = useCallback(
    async (files: FileList | File[]) => {
      const list = Array.from(files).filter((f) => f.type.startsWith('image/'))
      if (!list.length) return
      setBusy(true)
      setError('')
      try {
        const { photos: updated, rejected } = await admin.uploadPhotos(pageId, list)
        onChange(updated)
        if (rejected.length) setError(`Skipped ${rejected.length} file(s): unsupported type or over 5MB.`)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Upload failed.')
      } finally {
        setBusy(false)
        if (inputRef.current) inputRef.current.value = ''
      }
    },
    [pageId, onChange],
  )

  async function remove(photo: Photo) {
    try {
      const { photos: updated } = await admin.deletePhoto(pageId, photo.id)
      onChange(updated)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not delete photo.')
    }
  }

  /** Local reorder, then persists the new order to the server. */
  async function reorder(from: number, to: number) {
    if (from === to) return
    const next = [...photos]
    const [moved] = next.splice(from, 1)
    next.splice(to, 0, moved)
    onChange(next)
    try {
      const { photos: updated } = await admin.reorderPhotos(pageId, next.map((p) => p.id))
      onChange(updated)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save order.')
      onChange(photos)
    }
  }

  return (
    <div>
      <div
        onDragOver={(e) => {
          e.preventDefault()
          setDragOver(true)
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => {
          e.preventDefault()
          setDragOver(false)
          void upload(e.dataTransfer.files)
        }}
        onClick={() => inputRef.current?.click()}
        className={`flex cursor-pointer flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed px-4 py-8 text-center transition ${
          dragOver ? 'border-indigo-400 bg-indigo-50' : 'border-gray-300 bg-gray-50 hover:border-indigo-300 hover:bg-indigo-50/50'
        }`}
      >
        {busy ? <LoaderCircle className="animate-spin text-indigo-500" size={22} /> : <ImagePlus className="text-indigo-500" size={22} />}
        <p className="text-sm font-medium text-gray-700">{busy ? 'Uploading…' : 'Drag photos here, or click to browse'}</p>
        <p className="text-xs text-gray-400">JPEG / PNG / WebP / GIF · max 5MB each · drag thumbnails to reorder</p>
        <input
          ref={inputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp,image/gif"
          multiple
          className="hidden"
          onChange={(e) => e.target.files && void upload(e.target.files)}
        />
      </div>

      {error && <p className="mt-2 text-sm text-rose-600">{error}</p>}

      {photos.length > 0 && (
        <div className="mt-3 grid grid-cols-3 gap-2 sm:grid-cols-4 md:grid-cols-5">
          {photos.map((photo, index) => (
            <div
              key={photo.id}
              draggable
              onDragStart={() => setDragIndex(index)}
              onDragOver={(e) => {
                e.preventDefault()
                setOverIndex(index)
              }}
              onDragEnd={() => {
                setDragIndex(null)
                setOverIndex(null)
              }}
              onDrop={(e) => {
                e.preventDefault()
                if (dragIndex !== null) void reorder(dragIndex, index)
                setDragIndex(null)
                setOverIndex(null)
              }}
              className={`group relative aspect-square cursor-grab overflow-hidden rounded-xl border-2 transition ${
                overIndex === index && dragIndex !== index ? 'border-indigo-400 scale-105' : 'border-transparent'
              }`}
            >
              <img src={photoUrl(photo.filename)} alt="" className="h-full w-full object-cover" draggable={false} />
              <div className="absolute inset-0 flex items-end justify-between bg-gradient-to-t from-black/55 via-transparent to-transparent p-1.5 opacity-0 transition group-hover:opacity-100">
                <span className="text-[10px] font-semibold text-white">#{index + 1}</span>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation()
                    void remove(photo)
                  }}
                  className="rounded-md bg-rose-600 p-1 text-white hover:bg-rose-700"
                  aria-label="Delete photo"
                >
                  <Trash2 size={13} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
