'use client'

// Reusable image uploader for the business module.
//
// Supabase Storage path convention: business/<user_id>/<purpose>/<timestamp>.<ext>
// e.g.  business/2faeca54.../cover/1746...123.jpg
//
// Why namespace by user_id: lets us add a storage policy later that
// restricts deletes to the owning user without coupling to a specific
// row id. The bucket is public so reads are unauthenticated.
//
// Compresses client-side before upload (max 1600px long edge, JPEG q=0.85)
// to keep storage spend bounded — most ware photos come from phones at
// 12+ MP and we only need ~800px at retina density.

import { useRef, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/hooks/useAuth'
import { useToast } from '@/components/ToastProvider'

const MAX_DIM = 1600
const QUALITY = 0.85
const BUCKET = 'images'

type Purpose = 'cover' | 'logo' | 'ware'

async function compress(file: File): Promise<Blob> {
  // No compression for already-small files (< 400 KB) or non-image types
  if (!file.type.startsWith('image/') || file.size < 400_000) return file
  const bitmap = await createImageBitmap(file)
  const ratio = Math.min(MAX_DIM / bitmap.width, MAX_DIM / bitmap.height, 1)
  const w = Math.round(bitmap.width * ratio)
  const h = Math.round(bitmap.height * ratio)
  const canvas = document.createElement('canvas')
  canvas.width = w; canvas.height = h
  const ctx = canvas.getContext('2d')!
  ctx.drawImage(bitmap, 0, 0, w, h)
  return await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob((b) => b ? resolve(b) : reject(new Error('canvas.toBlob returned null')), 'image/jpeg', QUALITY)
  })
}

export default function ImageUploader({
  value,
  onChange,
  purpose,
  label,
  aspect = '16/9',
  maxHeight = 180,
}: {
  value: string
  onChange: (url: string) => void
  purpose: Purpose
  label?: string
  aspect?: string
  maxHeight?: number
}) {
  const { user } = useAuth()
  const { error: toastError, success } = useToast()
  const [uploading, setUploading] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  async function handleFile(file: File) {
    if (!user) { toastError('Not signed in'); return }
    setUploading(true)
    try {
      const blob = await compress(file)
      const ext = blob.type === 'image/jpeg' ? 'jpg' : (file.name.split('.').pop() || 'jpg').toLowerCase()
      const path = `business/${user.id}/${purpose}/${Date.now()}.${ext}`
      const { error } = await supabase.storage.from(BUCKET).upload(path, blob, {
        cacheControl: '3600',
        upsert: false,
        contentType: blob.type,
      })
      if (error) throw error
      const { data } = supabase.storage.from(BUCKET).getPublicUrl(path)
      onChange(data.publicUrl)
      success('Uploaded.')
    } catch (e: any) {
      toastError('Upload failed: ' + (e?.message || 'unknown'))
    } finally {
      setUploading(false)
      if (fileRef.current) fileRef.current.value = ''
    }
  }

  return (
    <div>
      {label && <label style={lbl}>{label}</label>}
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
        {/* Preview */}
        <div style={{
          flex: 1,
          aspectRatio: aspect,
          maxHeight,
          background: '#f3f4f6',
          border: '1.5px dashed #e5e7eb',
          borderRadius: 12,
          overflow: 'hidden',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          color: '#9ca3af', fontSize: 12,
        }}>
          {value
            ? <img src={value} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            : 'No image yet'}
        </div>

        {/* Buttons */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            disabled={uploading}
            style={btn}
          >
            {uploading ? 'Uploading…' : value ? 'Replace' : 'Upload'}
          </button>
          {value && (
            <button type="button" onClick={() => onChange('')} style={btnSecondary}>
              Remove
            </button>
          )}
        </div>
      </div>
      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        style={{ display: 'none' }}
        onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f) }}
      />
    </div>
  )
}

const lbl: React.CSSProperties = { fontSize: 13, fontWeight: 700, color: '#111827', display: 'block', marginBottom: 6 }
const btn: React.CSSProperties = { padding: '8px 14px', borderRadius: 10, border: 'none', background: '#3293cb', color: '#fff', fontSize: 13, fontWeight: 700, cursor: 'pointer', whiteSpace: 'nowrap' }
const btnSecondary: React.CSSProperties = { padding: '8px 14px', borderRadius: 10, border: '1px solid #e5e7eb', background: '#fff', color: '#6b7280', fontSize: 12, fontWeight: 700, cursor: 'pointer', whiteSpace: 'nowrap' }
