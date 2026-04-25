'use client'

import { useEffect, useState, useRef, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/hooks/useAuth'
import { toast } from '@/components/ToastProvider'
import Paginator from '@/components/Paginator'
import { notifyBadgesChanged } from '@/lib/badges-bus'

const CODE_TYPES: Record<string, { label: string; emoji: string }> = {
  contact_me: { label: 'Contact me', emoji: '💬' },
  car_sale: { label: 'Car for sale', emoji: '💰' },
  parked_car: { label: 'Parked car', emoji: '🚗' },
  lost_item: { label: 'Lost item', emoji: '🔍' },
  bike: { label: 'Bike / e-mobility', emoji: '🚲' },
  pet: { label: 'Pet tag', emoji: '🐾' },
  package: { label: 'Package', emoji: '📦' },
  property: { label: 'Property', emoji: '🏠' },
  other: { label: 'Other', emoji: '🔗' },
}

const HEADER_TEXT: Record<string, { title: string; sub: string }> = {
  contact_me: { title: 'CONTACT ME', sub: 'Send me a message' },
  car_sale: { title: 'FOR SALE', sub: 'Contact owner for details' },
  parked_car: { title: 'CONTACT OWNER', sub: 'Parking issue? Contact me' },
  lost_item: { title: 'FOUND THIS?', sub: 'Help return to owner' },
  bike: { title: 'CONTACT OWNER', sub: 'Issue with this bike? Let me know' },
  pet: { title: "I'M LOST", sub: 'Please contact my owner' },
  package: { title: 'DELIVERY ISSUE?', sub: 'Contact me about this package' },
  property: { title: 'CONTACT OWNER', sub: 'Access or issue? Let me know' },
  other: { title: 'CONTACT OWNER', sub: 'Send a message' },
}

const PRINT_STYLES: Record<string, { bg: string; text: string; accent: string }> = {
  blue: { bg: 'linear-gradient(135deg, #0284C7, #5d92f6)', text: '#fff', accent: '#fff' },
  dark: { bg: '#0F172A', text: '#fff', accent: '#3293CB' },
  white: { bg: '#ffffff', text: '#0F172A', accent: '#0284C7' },
  yellow: { bg: 'linear-gradient(135deg, #fff8dc, #ffe58a)', text: '#3a2c08', accent: '#92400E' },
  green: { bg: '#065F46', text: '#fff', accent: '#34D399' },
}

function QRCode({ code, size }: { code: string; size?: number }) {
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => {
    const render = () => {
      if (ref.current && (window as any).qrcode) {
        const qr = (window as any).qrcode(0, 'M')
        qr.addData('https://buddyally.com/' + code)
        qr.make()
        ref.current.innerHTML = qr.createSvgTag({ cellSize: size || 4, margin: 2 })
      }
    }
    if ((window as any).qrcode) render()
    else {
      const s = document.createElement('script')
      s.src = 'https://cdn.jsdelivr.net/npm/qrcode-generator@1.4.4/qrcode.min.js'
      s.onload = render
      document.head.appendChild(s)
    }
  }, [code, size])
  return <div ref={ref} />
}

function downloadQR(code: string) {
  if (!(window as any).qrcode) return
  const qr = (window as any).qrcode(0, 'M')
  qr.addData('https://buddyally.com/' + code)
  qr.make()
  const sz = 400, mods = qr.getModuleCount()
  const cell = Math.floor(sz / (mods + 8))
  const margin = Math.floor((sz - cell * mods) / 2)
  const canvas = document.createElement('canvas')
  canvas.width = sz; canvas.height = sz
  const ctx = canvas.getContext('2d')!
  ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, sz, sz)
  ctx.fillStyle = '#000'
  for (let r = 0; r < mods; r++)
    for (let c = 0; c < mods; c++)
      if (qr.isDark(r, c)) ctx.fillRect(margin + c * cell, margin + r * cell, cell, cell)
  canvas.toBlob(b => {
    if (!b) return
    const a = document.createElement('a'); a.href = URL.createObjectURL(b)
    a.download = 'buddyally-' + code + '.png'; a.click()
  }, 'image/png')
}

// Per-style mascot sizing for the printed sticker.
//   qrSize   — QR width/height in px (ignored when onBoard is true; QR is sized by board rect)
//   mascotW/mascotH — mascot container box in px; image is object-fit:contain inside
//   side     — 'left' | 'right' — which side of the QR the mascot sits on
//   overlap  — negative-margin pull toward the QR in px (tightens the gap beyond
//              the PNG's own transparent margin). Only used when onBoard=false.
//   onBoard  — render QR *inside* the mascot's board, instead of beside the mascot.
//              Used for the goat-with-whiteboard mascot (user asks for tall mascot
//              under the headers with the code shown on the sign it's holding).
//   boardRect — where on the mascot image the QR sits when onBoard=true.
//               Values are percentages of mascotW/mascotH. The QR is centered
//               inside this rectangle with a small inset so the board frame shows.
const MASCOT_SIZING: Record<string, {
  qrSize: number; mascotW: number; mascotH: number; side: string;
  overlap?: number;
  onBoard?: boolean;
  boardRect?: { x: number; y: number; w: number; h: number };
}> = {
  'contact-owner': { qrSize: 180, mascotW: 0, mascotH: 0, side: 'right' },
  'boy-mascot':    { qrSize: 150, mascotW: 130, mascotH: 170, side: 'left',  overlap: 14 },
  'dog-mascot':    { qrSize: 150, mascotW: 140, mascotH: 160, side: 'left',  overlap: 14 },
  // Goat-with-whiteboard: QR renders on the board, mascot stands tall beside it.
  // Board occupies roughly left-lower 2/3 of the image; we nest the QR a little
  // inside the edges so the board's rounded frame still reads as a frame.
  'goat-mascot':   { qrSize: 150, mascotW: 260, mascotH: 270, side: 'right',
                     onBoard: true,
                     boardRect: { x: 4, y: 34, w: 42, h: 52 } },
  'sheep-mascot':  { qrSize: 150, mascotW: 150, mascotH: 150, side: 'left',  overlap: 12 },
  'moose-mascot':  { qrSize: 160, mascotW: 160, mascotH: 210, side: 'right', overlap: 12 },
}
const MASCOT_IMG: Record<string, string> = {
  'boy-mascot': '/mascot-boy.png',
  'dog-mascot': '/mascot-dog.png',
  'goat-mascot': '/mascot-goat.png',
  'sheep-mascot': '/mascot-sheep.png',
  'moose-mascot': '/mascot-moose.png',
}

function makeQrDataUrl(code: string): string {
  if (!(window as any).qrcode) return ''
  const qr = (window as any).qrcode(0, 'M')
  qr.addData('https://buddyally.com/' + code)
  qr.make()
  const sz = 400, mods = qr.getModuleCount()
  const cell = Math.floor(sz / (mods + 8))
  const margin = Math.floor((sz - cell * mods) / 2)
  const c = document.createElement('canvas')
  c.width = sz; c.height = sz
  const ctx = c.getContext('2d')!
  ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, sz, sz)
  ctx.fillStyle = '#000'
  for (let r = 0; r < mods; r++)
    for (let col = 0; col < mods; col++)
      if (qr.isDark(r, col)) ctx.fillRect(margin + col * cell, margin + r * cell, cell, cell)
  return c.toDataURL('image/png')
}

async function loadImageAsDataUrl(src: string): Promise<string> {
  return new Promise(resolve => {
    const img = new Image()
    img.crossOrigin = 'anonymous'
    img.onload = () => {
      const c = document.createElement('canvas')
      c.width = img.width; c.height = img.height
      c.getContext('2d')!.drawImage(img, 0, 0)
      resolve(c.toDataURL('image/png'))
    }
    img.onerror = () => resolve('')
    img.src = src
  })
}

function buildStickerHTML(opts: {
  cautionUrl: string
  qrDataUrl: string
  code: string
  hdr: { title: string; sub: string }
  mascotUrl?: string
  qrSize: number
  mascotW: number
  mascotH: number
  mascotSide: string
  overlap?: number
  onBoard?: boolean
  boardRect?: { x: number; y: number; w: number; h: number }
}) {
  const { cautionUrl, qrDataUrl, code, hdr, mascotUrl, qrSize, mascotW, mascotH, mascotSide, overlap, onBoard, boardRect } = opts
  const qS = qrSize || 200
  const mW = mascotW || 130
  const mH = mascotH || 200
  const hasMascot = !!mascotUrl
  const titleParts = hdr.title.split(' ')
  const side = mascotSide || 'right'

  // Build the inner visual — either (a) QR sits beside the mascot (default), or
  // (b) QR is overlaid on the mascot's board (onBoard).
  let contentInner: string
  let sW: number
  if (hasMascot && onBoard && boardRect) {
    // QR-on-board: mascot alone defines the visual width, QR absolutely positioned on its sign.
    const bX = Math.round((mW * boardRect.x) / 100)
    const bY = Math.round((mH * boardRect.y) / 100)
    const bW = Math.round((mW * boardRect.w) / 100)
    const bH = Math.round((mH * boardRect.h) / 100)
    contentInner = `
      <div style="position:relative;width:${mW}px;height:${mH}px;">
        <img src="${mascotUrl}" style="width:100%;height:100%;object-fit:contain;display:block;">
        <img src="${qrDataUrl}" style="position:absolute;left:${bX}px;top:${bY}px;width:${bW}px;height:${bH}px;object-fit:contain;display:block;background:#fff;padding:2px;border-radius:3px;box-shadow:0 0 0 1px rgba(0,0,0,0.06);">
      </div>`
    sW = mW + 28
  } else {
    const qrHtml = `<img src="${qrDataUrl}" style="width:${qS}px;height:${qS}px;display:block;">`
    // Pull the mascot toward the QR with a negative margin on the abutting side so
    // the two visuals read as one unit instead of floating apart with the PNG's
    // built-in transparent margin. 0 if no overlap specified.
    const pull = overlap && overlap > 0 ? overlap : 0
    const mascotStyle = hasMascot
      ? `width:${mW}px;height:${mH}px;object-fit:contain;display:block;` +
        (pull ? (side === 'left' ? `margin-right:-${pull}px;` : `margin-left:-${pull}px;`) : '')
      : ''
    const mascotHtml = hasMascot ? `<img src="${mascotUrl}" style="${mascotStyle}">` : ''
    contentInner = side === 'left' ? mascotHtml + qrHtml : qrHtml + mascotHtml
    sW = hasMascot ? qS + mW + 28 - (pull || 0) : qS + 28
  }

  return `<!DOCTYPE html><html><head>
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700;800;900&display=swap" rel="stylesheet">
<style>
*{box-sizing:border-box;margin:0;padding:0;-webkit-print-color-adjust:exact!important;print-color-adjust:exact!important;}
body{font-family:Inter,sans-serif;display:flex;justify-content:center;align-items:flex-start;padding:20px;background:#fff;}
@page{size:auto;margin:8mm;}
.sticker{width:${sW}px;background:#fff;border-radius:16px;border:1.5px solid #ddd;padding:14px;}
.top{background:#0652b7!important;color:#fff!important;border-radius:10px;padding:10px 12px;display:flex;align-items:center;justify-content:center;gap:8px;font-weight:900;font-size:20px;}
.warn img{height:20px;width:auto;display:block;}.owner{color:#ffd22e!important;}
.sub{text-align:center;font-size:21px;color:#555;margin-top:6px;font-weight:600;}
.content{display:flex;align-items:center;justify-content:center;gap:0;margin-top:6px;}
.scan{text-align:center;margin-top:8px;font-size:12px;color:#555;}
.url{text-align:center;margin-top:2px;font-size:20px;font-weight:900;color:#0652b7;letter-spacing:-0.02em;}
</style></head><body><div class="sticker">
<div class="top"><span class="warn"><img src="${cautionUrl}"></span><span>${titleParts[0]} <span class="owner">${titleParts.slice(1).join(' ')}</span></span></div>
<div class="sub">${hdr.sub}</div>
<div class="content">${contentInner}</div>
<div class="scan">Scan or type:</div><div class="url">buddyally.com/${code}</div>
</div></body></html>`
}

// Paginate N stickers onto US Letter using an invisible grid.
// Each sticker is rendered at its NATURAL intrinsic size (as composed by
// buildStickerHTML), then uniformly scaled via CSS transform to occupy most
// of its cell without any aspect-ratio change. No stretching, no reflow —
// only a shrink factor applied to the whole sticker so every proportion is
// preserved end-to-end.
function renderPrintSheet(stickerContent: string, perSheet: number) {
  const printWin = window.open('', '_blank')
  if (!printWin) return
  const bodyMatch = stickerContent.match(/<body[^>]*>([\s\S]*?)<\/body>/i)
  const stickerBody = bodyMatch ? bodyMatch[1] : stickerContent
  const styleMatch = stickerContent.match(/<style[^>]*>([\s\S]*?)<\/style>/i)
  const styles = styleMatch ? styleMatch[1] : ''

  // [cols, rows, gap, page-padding]. Smaller pads/gaps = bigger cells, which
  // lets the intrinsic sticker scale up closer to 1:1.
  const layouts: Record<number, [number, number, string, string]> = {
    1:  [1, 1, '0',      '2in 0.75in'],
    2:  [1, 2, '0.15in', '0.3in 0.4in'],
    4:  [2, 2, '0.2in',  '0.3in'],
    6:  [2, 3, '0.15in', '0.25in'],
    9:  [3, 3, '0.12in', '0.2in'],
    12: [3, 4, '0.1in',  '0.2in'],
    16: [4, 4, '0.08in', '0.15in'],
    20: [4, 5, '0.07in', '0.12in'],
  }
  const [cols, rows, gap, pad] = layouts[perSheet] || [1, 1, '0', '2in 0.75in']
  const cellsHtml = Array.from({ length: perSheet }, () =>
    `<div class="print-cell"><div class="sticker">${stickerBody}</div></div>`).join('')

  // The sticker keeps its natural width (set inline by buildStickerHTML as
  // `width:${sW}px`). We DO NOT override it here — that's how proportions
  // survive. The cell just clips + centers, and the inline script scales.
  printWin.document.write(
    `<!doctype html><html><head><meta charset="utf-8"><title>Print ${perSheet} per sheet</title>
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700;800;900&display=swap" rel="stylesheet">
<style>${styles}
*{box-sizing:border-box;-webkit-print-color-adjust:exact!important;print-color-adjust:exact!important;}
@page{size:letter;margin:0;}
html,body{margin:0;padding:0;background:#fff;font-family:Inter,sans-serif;}
.print-sheet{width:8.5in;height:11in;padding:${pad};margin:0 auto;display:grid;grid-template:repeat(${rows},1fr)/repeat(${cols},1fr);gap:${gap};page-break-after:always;overflow:hidden;}
.print-sheet:last-child{page-break-after:auto;}
.print-cell{display:flex;align-items:center;justify-content:center;overflow:hidden;min-width:0;min-height:0;}
/* CRITICAL: do NOT set width on .sticker here — keep its intrinsic pixel width
   so the JS below can compute an honest uniform scale factor. */
.print-cell .sticker{flex-shrink:0;transform-origin:center center;margin:0!important;}
@media screen{body{background:#e5e7eb;padding:20px 0;}.print-sheet{box-shadow:0 4px 20px rgba(0,0,0,0.15);margin-bottom:20px;}}
</style></head><body><div class="print-sheet">${cellsHtml}</div>
<script>
(function(){
  // Occupy ~96% of each cell's width/height; leave a small breathing margin
  // so adjacent stickers never visually touch across the invisible grid lines.
  var FILL = 0.96;
  function fit(){
    var cells = document.querySelectorAll('.print-cell');
    cells.forEach(function(cell){
      var s = cell.querySelector('.sticker');
      if(!s) return;
      // Reset any prior transform so we measure natural size.
      s.style.transform = 'none';
      var cr = cell.getBoundingClientRect();
      var sr = s.getBoundingClientRect();
      if(sr.width < 1 || sr.height < 1) return;
      var k = Math.min((cr.width * FILL) / sr.width, (cr.height * FILL) / sr.height);
      // Never scale UP past 1:1 — preserve crispness at small counts.
      if(k > 1) k = 1;
      s.style.transform = 'scale(' + k + ')';
    });
  }
  function whenImagesReady(cb){
    var imgs = Array.prototype.slice.call(document.images);
    var pending = imgs.filter(function(i){ return !i.complete; });
    if(pending.length === 0){ cb(); return; }
    var left = pending.length;
    pending.forEach(function(i){
      function done(){ left--; if(left === 0) cb(); }
      i.addEventListener('load', done);
      i.addEventListener('error', done);
    });
    // Safety: fire anyway after 2s so a missing image never blocks print.
    setTimeout(cb, 2000);
  }
  window.addEventListener('load', function(){
    whenImagesReady(function(){
      // Let fonts settle a tick, then scale + print.
      setTimeout(function(){
        fit();
        setTimeout(function(){ window.print(); }, 150);
      }, 80);
    });
  });
  // Re-fit on resize so the on-screen preview also looks right.
  window.addEventListener('resize', fit);
})();
</script>
</body></html>`)
  printWin.document.close()
  printWin.focus()
}

async function doPrintSticker(code: string, codeType: string, styleName: string, perSheet: number) {
  const qrDataUrl = makeQrDataUrl(code)
  if (!qrDataUrl) { toast('QR generator not loaded yet. Try again.', 'warn'); return }
  const hdr = HEADER_TEXT[codeType] || HEADER_TEXT.other
  const cautionUrl = await loadImageAsDataUrl('/caution-sign.png')

  if (styleName in MASCOT_SIZING) {
    // Mascot/contact-owner style
    const sizing = MASCOT_SIZING[styleName]
    const mascotPath = MASCOT_IMG[styleName] || null
    const mascotUrl = mascotPath ? await loadImageAsDataUrl(mascotPath) : undefined
    const stickerContent = buildStickerHTML({
      cautionUrl, qrDataUrl, code, hdr, mascotUrl,
      qrSize: sizing.qrSize,
      mascotW: sizing.mascotW,
      mascotH: sizing.mascotH,
      mascotSide: sizing.side,
      overlap: sizing.overlap,
      onBoard: sizing.onBoard,
      boardRect: sizing.boardRect,
    })
    if (perSheet <= 1) {
      const pw = window.open('', '_blank')
      if (pw) { pw.document.write(stickerContent); pw.document.close(); setTimeout(() => pw.print(), 600) }
    } else {
      renderPrintSheet(stickerContent, perSheet)
    }
  } else {
    // Basic color style (blue/dark/white/yellow/green).
    // Intrinsic dimensions are sized to match the mascot stickers so that
    // renderPrintSheet's uniform scale-to-fit lands at the same visual size
    // for both families on the same N-up sheet. (Mascot widths range
    // ~294–336px; we pick 320px here, mid-range, with a 200px QR so the
    // overall height also matches.)
    const s = PRINT_STYLES[styleName] || PRINT_STYLES.blue
    const stickerContent = `<!DOCTYPE html><html><head>
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700;800;900&display=swap" rel="stylesheet">
<style>*{box-sizing:border-box;margin:0;padding:0;-webkit-print-color-adjust:exact!important;print-color-adjust:exact!important;}
body{font-family:Inter,sans-serif;display:flex;justify-content:center;padding:20px;background:#fff;}@page{size:auto;margin:8mm;}
.sticker{width:320px;background:#fff;border-radius:16px;border:1.5px solid #ddd;overflow:hidden;}
.header{background:${s.bg};color:${s.text};padding:16px 18px;text-align:center;}
.body{padding:18px;text-align:center;background:#fff;}
.scan{font-size:13px;color:#555;margin-top:10px;}.url{font-size:22px;font-weight:900;color:#0652b7;margin-top:2px;letter-spacing:-0.02em;}
</style></head><body><div class="sticker">
<div class="header"><div style="font-size:20px;font-weight:900;">${hdr.title}</div><div style="font-size:12px;opacity:0.85;margin-top:3px;">${hdr.sub}</div></div>
<div class="body"><img src="${qrDataUrl}" style="width:200px;height:200px;">
<div class="scan">Scan or type:</div><div class="url">buddyally.com/${code}</div></div>
</div></body></html>`
    if (perSheet <= 1) {
      const pw = window.open('', '_blank')
      if (pw) { pw.document.write(stickerContent); pw.document.close(); setTimeout(() => pw.print(), 600) }
    } else {
      renderPrintSheet(stickerContent, perSheet)
    }
  }
}

// v1-parity mini-preview cards for each print style — rendered in the Print Sticker modal.
function StylePreviewCard({ kind, selected, onClick }: { kind: string; selected: boolean; onClick: () => void }) {
  const borderColor = selected ? '#3293CB' : '#E5E7EB'
  const base: React.CSSProperties = {
    border: `2px solid ${borderColor}`, borderRadius: 12, overflow: 'hidden', height: 86,
    display: 'flex', flexDirection: 'column', cursor: 'pointer', background: '#fff',
    padding: 0, width: '100%', textAlign: 'center' as const,
  }

  if (kind === 'contact-owner') {
    return (
      <button onClick={onClick} style={base}>
        <div style={{ background: '#1a4b8c', color: '#fff', fontSize: 8, fontWeight: 800, padding: 4, letterSpacing: '0.05em' }}>⚠ CONTACT OWNER</div>
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 4 }}>
          <div style={{ width: 30, height: 30, background: '#f0f0f0', borderRadius: 4 }} />
        </div>
        <div style={{ fontSize: 8, padding: 2, color: '#64748B', fontWeight: 600 }}>Contact Owner</div>
      </button>
    )
  }
  if (kind === 'blue') {
    return (
      <button onClick={onClick} style={{ ...base, background: 'linear-gradient(135deg,#0284C7,#5d92f6)', alignItems: 'center', justifyContent: 'center', gap: 2 }}>
        <div style={{ fontSize: 8, color: 'rgba(255,255,255,0.85)', fontWeight: 700, letterSpacing: '0.1em' }}>BUDDYALLY</div>
        <div style={{ width: 26, height: 26, background: 'rgba(255,255,255,0.3)', borderRadius: 4 }} />
        <div style={{ fontSize: 8, color: '#fff', fontWeight: 600 }}>Blue</div>
      </button>
    )
  }
  if (kind === 'dark') {
    return (
      <button onClick={onClick} style={{ ...base, background: '#0F172A', alignItems: 'center', justifyContent: 'center', gap: 2 }}>
        <div style={{ width: 22, height: 22, background: 'linear-gradient(135deg,#0284C7,#5d92f6)', borderRadius: 6 }} />
        <div style={{ fontSize: 8, color: 'rgba(255,255,255,0.75)', fontWeight: 600 }}>Dark Premium</div>
      </button>
    )
  }
  if (kind === 'white') {
    return (
      <button onClick={onClick} style={{ ...base, alignItems: 'center', justifyContent: 'center', gap: 2 }}>
        <div style={{ width: 26, height: 26, background: '#f0f0f0', borderRadius: 4 }} />
        <div style={{ fontSize: 8, color: '#64748B', fontWeight: 600 }}>White Minimal</div>
      </button>
    )
  }
  if (kind === 'yellow') {
    return (
      <button onClick={onClick} style={{ ...base, background: 'linear-gradient(135deg,#fff8dc,#ffe58a)', borderStyle: 'dashed', alignItems: 'center', justifyContent: 'center', gap: 2 }}>
        <div style={{ fontSize: 9, fontWeight: 800, color: '#3a2c08' }}>⚠ URGENT</div>
        <div style={{ width: 26, height: 26, background: 'rgba(0,0,0,0.1)', borderRadius: 4 }} />
        <div style={{ fontSize: 8, color: '#5a4a1a', fontWeight: 600 }}>Yellow Alert</div>
      </button>
    )
  }
  if (kind === 'green') {
    return (
      <button onClick={onClick} style={{ ...base, background: '#065F46', alignItems: 'center', justifyContent: 'center', gap: 2 }}>
        <div style={{ fontSize: 8, color: 'rgba(255,255,255,0.85)', fontWeight: 700 }}>SCAN ME</div>
        <div style={{ width: 26, height: 26, background: 'rgba(255,255,255,0.25)', borderRadius: 4 }} />
        <div style={{ fontSize: 8, color: 'rgba(255,255,255,0.65)', fontWeight: 600 }}>Green</div>
      </button>
    )
  }
  // Mascot previews — use the real PNG thumbnails so the picker matches
  // the printed sticker exactly (WYSIWYG).
  const mascotMap: Record<string, { src: string; label: string }> = {
    'boy-mascot':   { src: '/mascot-boy.png',   label: 'Boy Mascot' },
    'dog-mascot':   { src: '/mascot-dog.png',   label: 'Dog Mascot' },
    'goat-mascot':  { src: '/mascot-goat.png',  label: 'Goat + QR' },
    'sheep-mascot': { src: '/mascot-sheep.png', label: 'Sheep' },
    'moose-mascot': { src: '/mascot-moose.png', label: 'Moose' },
  }
  const m = mascotMap[kind]
  return (
    <button onClick={onClick} style={{ ...base, alignItems: 'center', justifyContent: 'center', gap: 2, padding: 4 }}>
      <img src={m?.src} alt="" style={{ height: 46, width: 'auto', objectFit: 'contain', display: 'block' }} />
      <div style={{ fontSize: 8, color: '#64748B', fontWeight: 600 }}>{m?.label}</div>
    </button>
  )
}

export default function CodesPage() {
  const { user } = useAuth()
  const [codes, setCodes] = useState<any[]>([])
  const [messages, setMessages] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [showCreate, setShowCreate] = useState(false)
  const [viewingCode, setViewingCode] = useState<any>(null)
  const [editingCode, setEditingCode] = useState<any>(null)
  const [showPrint, setShowPrint] = useState<any>(null)
  const [printStyle, setPrintStyle] = useState('blue')
  const [printContent, setPrintContent] = useState('both')
  const [printCount, setPrintCount] = useState(4)

  // Create/Edit form state (shared)
  const [newTitle, setNewTitle] = useState('')
  const [newDesc, setNewDesc] = useState('')
  const [newType, setNewType] = useState('contact_me')
  const [newImage, setNewImage] = useState<string | null>(null)
  const [newLinks, setNewLinks] = useState<{ label: string; url: string }[]>([])
  const [linkLabel, setLinkLabel] = useState('')
  const [linkUrl, setLinkUrl] = useState('')
  const [socials, setSocials] = useState({ instagram: '', twitter: '', facebook: '', linkedin: '', tiktok: '', website: '' })
  const [pushEnabled, setPushEnabled] = useState(true)
  const [emailEnabled, setEmailEnabled] = useState(true)
  const imageRef = useRef<HTMLInputElement>(null)

  // Message detail + inbox/archived tabs + pagination
  const [viewingMessage, setViewingMessage] = useState<any>(null)
  const [msgTab, setMsgTab] = useState<'inbox' | 'archived'>('inbox')
  const [msgPage, setMsgPage] = useState(0)
  const MSG_PAGE_SIZE = 20
  // Reset pagination whenever tab changes or you switch to a different code
  useEffect(() => { setMsgPage(0) }, [msgTab, viewingCode?.id])

  // Codes list pagination (client-side — we already load all codes for this user)
  const [codePage, setCodePage] = useState(0)
  const CODE_PAGE_SIZE = 10

  // Auto mark-as-read when viewing a code (must be top-level, not inside conditional).
  // IMPORTANT: Supabase PostgREST queries are lazy — they only execute when awaited
  // (or `.then()`-chained). Before this fix the update was created but never sent,
  // so messages stayed unread and badges never cleared.
  useEffect(() => {
    if (!viewingCode) return
    const cMsgs = messages.filter(m => m.code_id === viewingCode.id)
    const unreadIds = cMsgs.filter(m => !m.read).map(m => m.id)
    if (unreadIds.length === 0) return
    const readAt = new Date().toISOString()
    ;(async () => {
      const { error } = await supabase
        .from('connect_messages')
        .update({ read: true, read_at: readAt })
        .in('id', unreadIds)
      if (error) { console.error('[codes] mark-as-read failed', error); return }
      // Reflect locally so the badge clears immediately without a full reload.
      setMessages(prev => prev.map(m => unreadIds.includes(m.id) ? { ...m, read: true, read_at: readAt } : m))
      // Tell the bottom-nav Codes badge to re-poll. Without this, the red
      // dot persists until the layout's 30s background poll fires.
      notifyBadgesChanged()
    })()
  }, [viewingCode, messages])

  const loadCodes = useCallback(async () => {
    if (!user) return; setLoading(true)
    const { data: c } = await supabase.from('connect_codes').select('*').eq('user_id', user.id).order('created_at', { ascending: false })
    setCodes(c || [])
    if (c && c.length > 0) {
      const ids = c.map((x: any) => x.id)
      const { data: m } = await supabase.from('connect_messages').select('*').in('code_id', ids).order('created_at', { ascending: false })
      setMessages(m || [])
    }
    setLoading(false)
  }, [user])

  useEffect(() => { if (user) loadCodes() }, [user, loadCodes])

  function addLink() {
    if (!linkLabel.trim() || !linkUrl.trim()) return
    const url = linkUrl.trim().startsWith('http') ? linkUrl.trim() : 'https://' + linkUrl.trim()
    setNewLinks(prev => [...prev, { label: linkLabel.trim(), url }])
    setLinkLabel(''); setLinkUrl('')
  }

  function handleImageSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = ev => setNewImage(ev.target?.result as string)
    reader.readAsDataURL(file)
  }

  function resetForm() {
    setNewTitle(''); setNewDesc(''); setNewType('contact_me'); setNewImage(null); setNewLinks([])
    setSocials({ instagram: '', twitter: '', facebook: '', linkedin: '', tiktok: '', website: '' })
    setPushEnabled(true); setEmailEnabled(true)
  }

  function openEdit(c: any) {
    setEditingCode(c)
    setNewTitle(c.title || '')
    setNewDesc(c.description || '')
    setNewType(c.code_type || 'contact_me')
    setNewImage(c.image_url || null)
    setNewLinks(Array.isArray(c.links) ? c.links : [])
    const sp = c.social_profiles || {}
    setSocials({
      instagram: sp.instagram || '',
      twitter: sp.twitter || '',
      facebook: sp.facebook || '',
      linkedin: sp.linkedin || '',
      tiktok: sp.tiktok || '',
      website: sp.website || '',
    })
    setPushEnabled(c.push_enabled !== false)
    setEmailEnabled(c.email_enabled !== false)
    setViewingCode(null)
    setShowCreate(true)
  }

  async function createCode() {
    if (!newTitle.trim() || !user) return

    // Collect socials (shared by insert + update)
    const socialObj: Record<string, string> = {}
    if (socials.instagram) socialObj.instagram = socials.instagram.replace('@', '')
    if (socials.twitter) socialObj.twitter = socials.twitter.replace('@', '')
    if (socials.tiktok) socialObj.tiktok = socials.tiktok.replace('@', '')
    if (socials.facebook) socialObj.facebook = socials.facebook.startsWith('http') ? socials.facebook : 'https://facebook.com/' + socials.facebook
    if (socials.linkedin) socialObj.linkedin = socials.linkedin.startsWith('http') ? socials.linkedin : 'https://linkedin.com/in/' + socials.linkedin
    if (socials.website) socialObj.website = socials.website.startsWith('http') ? socials.website : 'https://' + socials.website

    // ── EDIT MODE ───────────────────────────────────────────
    if (editingCode) {
      let imageUrl = editingCode.image_url || ''
      // If the image is a new data URL (not an existing http URL), upload it
      if (newImage && newImage.startsWith('data:')) {
        try {
          const blob = await fetch(newImage).then(r => r.blob())
          const fname = (editingCode.code || 'img').toLowerCase() + '-' + Date.now() + '.jpg'
          const { error: ue } = await supabase.storage.from('connect-images').upload(fname, blob, { contentType: blob.type })
          if (!ue) {
            const { data: ud } = supabase.storage.from('connect-images').getPublicUrl(fname)
            imageUrl = ud?.publicUrl || imageUrl
          }
        } catch {}
      } else if (newImage === null) {
        imageUrl = ''
      }

      const { error } = await supabase.from('connect_codes').update({
        title: newTitle.trim(),
        description: newDesc.trim(),
        code_type: newType,
        push_enabled: pushEnabled,
        email_enabled: emailEnabled,
        image_url: imageUrl,
        links: newLinks,
        social_profiles: socialObj,
      }).eq('id', editingCode.id)

      if (error) {
        toast('Failed to save changes', 'warn')
        return
      }
      toast('Changes saved', 'info')
      resetForm()
      setEditingCode(null)
      setShowCreate(false)
      await loadCodes()
      return
    }

    // ── CREATE MODE ─────────────────────────────────────────
    const code = Array.from({ length: 6 }, () => 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'[Math.floor(Math.random() * 31)]).join('')

    // Upload image
    let imageUrl = ''
    if (newImage) {
      try {
        const blob = await fetch(newImage).then(r => r.blob())
        const fname = code.toLowerCase() + '-' + Date.now() + '.jpg'
        const { error: ue } = await supabase.storage.from('connect-images').upload(fname, blob, { contentType: blob.type })
        if (!ue) {
          const { data: ud } = supabase.storage.from('connect-images').getPublicUrl(fname)
          imageUrl = ud?.publicUrl || ''
        }
      } catch {}
    }

    const { data } = await supabase.from('connect_codes').insert({
      user_id: user.id, code, title: newTitle.trim(), description: newDesc.trim(),
      code_type: newType, status: 'active',
      push_enabled: pushEnabled, email_enabled: emailEnabled,
      image_url: imageUrl, links: newLinks, social_profiles: socialObj,
    }).select().single()

    resetForm()
    setShowCreate(false)
    await loadCodes()
    if (data) setViewingCode(data)
  }

  async function toggleStatus(codeId: string, currentStatus: string) {
    const next = currentStatus === 'active' ? 'paused' : 'active'
    const { error } = await supabase.from('connect_codes').update({ status: next }).eq('id', codeId)
    if (error) { toast(error.message || 'Could not update code status.', 'error'); return }
    toast(next === 'active' ? 'Code activated' : 'Code paused', 'success')
    loadCodes()
  }

  async function deleteCode(codeId: string) {
    if (!confirm('Delete this code? Messages will also be removed.')) return
    const { error: mErr } = await supabase.from('connect_messages').delete().eq('code_id', codeId)
    if (mErr) { toast(mErr.message || 'Could not delete messages.', 'error'); return }
    const { error: cErr } = await supabase.from('connect_codes').delete().eq('id', codeId)
    if (cErr) { toast(cErr.message || 'Could not delete code.', 'error'); return }
    toast('Code deleted', 'success')
    setViewingCode(null); loadCodes()
  }

  async function markRead(msgId: string) {
    const { error } = await supabase.from('connect_messages').update({ read: true, read_at: new Date().toISOString() }).eq('id', msgId)
    if (error) { toast(error.message || 'Could not mark message as read.', 'error'); return }
    setMessages(prev => prev.map(m => m.id === msgId ? { ...m, read: true } : m))
  }

  async function deleteMessage(msgId: string) {
    if (!confirm('Delete this message?')) return
    const { error } = await supabase.from('connect_messages').delete().eq('id', msgId)
    if (error) { toast(error.message || 'Could not delete message.', 'error'); return }
    setMessages(prev => prev.filter(m => m.id !== msgId))
    setViewingMessage((v: any) => v?.id === msgId ? null : v)
    toast('Message deleted', 'success')
  }

  async function archiveMessage(msgId: string, archive: boolean) {
    const archived_at = archive ? new Date().toISOString() : null
    const { error } = await supabase.from('connect_messages').update({ archived_at }).eq('id', msgId)
    if (error) { toast(error.message || 'Could not update message.', 'error'); return }
    setMessages(prev => prev.map(m => m.id === msgId ? { ...m, archived_at } : m))
    setViewingMessage((v: any) => v?.id === msgId ? { ...v, archived_at } : v)
    toast(archive ? 'Message archived' : 'Message unarchived', 'success')
  }

  function copyLink(code: string) {
    navigator.clipboard.writeText(`https://buddyally.com/${code}`)
    toast('Link copied', 'info')
  }

  // ─── PRINT MODAL ─────────────────────────────────────────
  if (showPrint) {
    const c = showPrint
    return (
      <div>
        <button onClick={() => setShowPrint(null)} style={{ background: 'none', border: 'none', color: '#3293CB', fontWeight: 600, fontSize: 14, cursor: 'pointer', marginBottom: 16 }}>&larr; Back</button>
        <h2 style={{ fontSize: 20, fontWeight: 700, marginBottom: 16 }}>Print Sticker — {c.title}</h2>

        <div style={{ background: '#fff', border: '1px solid #E5E7EB', borderRadius: 20, padding: 24, marginBottom: 16 }}>
          <h3 style={{ fontSize: 14, fontWeight: 700, marginBottom: 12 }}>Choose a style</h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 6, marginBottom: 20 }}>
            <StylePreviewCard kind="contact-owner" selected={printStyle === 'contact-owner'} onClick={() => setPrintStyle('contact-owner')} />
            <StylePreviewCard kind="blue" selected={printStyle === 'blue'} onClick={() => setPrintStyle('blue')} />
            <StylePreviewCard kind="dark" selected={printStyle === 'dark'} onClick={() => setPrintStyle('dark')} />
            <StylePreviewCard kind="white" selected={printStyle === 'white'} onClick={() => setPrintStyle('white')} />
            <StylePreviewCard kind="yellow" selected={printStyle === 'yellow'} onClick={() => setPrintStyle('yellow')} />
            <StylePreviewCard kind="green" selected={printStyle === 'green'} onClick={() => setPrintStyle('green')} />
            <StylePreviewCard kind="boy-mascot" selected={printStyle === 'boy-mascot'} onClick={() => setPrintStyle('boy-mascot')} />
            <StylePreviewCard kind="dog-mascot" selected={printStyle === 'dog-mascot'} onClick={() => setPrintStyle('dog-mascot')} />
            <StylePreviewCard kind="goat-mascot" selected={printStyle === 'goat-mascot'} onClick={() => setPrintStyle('goat-mascot')} />
            <StylePreviewCard kind="sheep-mascot" selected={printStyle === 'sheep-mascot'} onClick={() => setPrintStyle('sheep-mascot')} />
            <StylePreviewCard kind="moose-mascot" selected={printStyle === 'moose-mascot'} onClick={() => setPrintStyle('moose-mascot')} />
          </div>

          <h3 style={{ fontSize: 14, fontWeight: 700, marginBottom: 12 }}>Content</h3>
          <div style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
            {[{ v: 'both', l: 'QR + Link' }, { v: 'qr', l: 'QR only' }, { v: 'link', l: 'Link only' }].map(o => (
              <button key={o.v} onClick={() => setPrintContent(o.v)} style={{ padding: '8px 16px', borderRadius: 10, border: printContent === o.v ? '2px solid #3293CB' : '1px solid #E5E7EB', background: printContent === o.v ? '#E0F2FE' : '#fff', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>{o.l}</button>
            ))}
          </div>

          <h3 style={{ fontSize: 14, fontWeight: 700, marginBottom: 12 }}>Per Sheet</h3>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 20 }}>
            {[1, 2, 4, 6, 9, 12, 16, 20].map(n => (
              <button key={n} onClick={() => setPrintCount(n)} style={{ width: 40, height: 40, borderRadius: 10, border: printCount === n ? '2px solid #3293CB' : '1px solid #E5E7EB', background: printCount === n ? '#E0F2FE' : '#fff', fontSize: 14, fontWeight: 700, cursor: 'pointer' }}>{n}</button>
            ))}
          </div>

          <button onClick={() => doPrintSticker(c.code, c.code_type, printStyle, printCount)} style={{ padding: '14px 32px', borderRadius: 14, border: 'none', background: '#3293CB', color: '#fff', fontWeight: 700, fontSize: 15, cursor: 'pointer', boxShadow: '0 4px 12px rgba(50,147,203,0.25)' }}>Print Now</button>
        </div>
      </div>
    )
  }

  // ─── CODE DETAIL VIEW ─────────────────────────────────────
  if (viewingCode) {
    const c = viewingCode
    const cMsgs = messages.filter(m => m.code_id === c.id)
    const unread = cMsgs.filter((m: any) => !m.read).length
    const tp = CODE_TYPES[c.code_type] || CODE_TYPES.other

    return (
      <div>
        <button onClick={() => { setViewingCode(null); loadCodes() }} style={{ background: 'none', border: 'none', color: '#3293CB', fontWeight: 600, fontSize: 14, cursor: 'pointer', marginBottom: 16 }}>&larr; Back to codes</button>

        <div style={{ background: '#fff', border: '1px solid #E5E7EB', borderRadius: 20, padding: 24, marginBottom: 16 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 4 }}>
            <h2 style={{ fontSize: 24, fontWeight: 700 }}>{c.title}</h2>
            <span style={{ padding: '5px 12px', borderRadius: 999, fontSize: 12, fontWeight: 700, ...(c.status === 'active' ? { background: '#F0FDF4', color: '#059669' } : { background: '#FEF3C7', color: '#D97706' }) }}>{c.status}</span>
          </div>
          <div style={{ fontFamily: "'SF Mono', Menlo, Consolas, monospace", fontWeight: 800, color: '#3293CB', letterSpacing: '0.12em', fontSize: 20, marginBottom: 4 }}>{c.code}</div>
          <div style={{ fontSize: 14, color: '#6B7280', marginBottom: 14 }}>{tp.emoji} {tp.label} &bull; buddyally.com/{c.code}</div>

          {c.image_url && <img src={c.image_url} alt="" style={{ width: '100%', maxHeight: 200, objectFit: 'cover', borderRadius: 12, marginBottom: 14 }} />}
          {c.description && <p style={{ fontSize: 14, color: '#4B5563', lineHeight: 1.6, marginBottom: 14 }}>{c.description}</p>}

          {/* Links */}
          {c.links && c.links.length > 0 && (
            <div style={{ marginBottom: 14 }}>
              <p style={{ fontSize: 12, fontWeight: 700, color: '#6B7280', marginBottom: 6 }}>Links</p>
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                {c.links.map((l: any, i: number) => (
                  <a key={i} href={l.url} target="_blank" rel="noopener noreferrer" style={{ padding: '4px 12px', borderRadius: 20, background: '#E0F2FE', color: '#0284C7', fontSize: 12, fontWeight: 600, textDecoration: 'none' }}>{l.label} &rarr;</a>
                ))}
              </div>
            </div>
          )}

          {/* Social profiles */}
          {c.social_profiles && Object.keys(c.social_profiles).length > 0 && (
            <div style={{ marginBottom: 14 }}>
              <p style={{ fontSize: 12, fontWeight: 700, color: '#6B7280', marginBottom: 6 }}>Socials</p>
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                {Object.entries(c.social_profiles).map(([k, v]) => (
                  <span key={k} style={{ padding: '4px 12px', borderRadius: 20, background: '#F3F4F6', color: '#4B5563', fontSize: 12, fontWeight: 600 }}>{k}: {v as string}</span>
                ))}
              </div>
            </div>
          )}

          <div style={{ display: 'flex', gap: 16, alignItems: 'flex-start', flexWrap: 'wrap', marginBottom: 14 }}>
            <div style={{ flexShrink: 0 }}><QRCode code={c.code} /></div>
            <div style={{ flex: 1 }}>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 10 }}>
                <span style={{ background: '#E0F2FE', color: '#0284C7', fontSize: 12, fontWeight: 700, padding: '5px 12px', borderRadius: 999 }}>{c.scan_count || 0} scans</span>
                <button
                  onClick={() => document.getElementById('code-messages')?.scrollIntoView({ behavior: 'smooth', block: 'start' })}
                  aria-label="Jump to messages"
                  style={{
                    border: 'none', cursor: 'pointer', fontSize: 12, fontWeight: 700,
                    padding: '5px 12px', borderRadius: 999,
                    display: 'inline-flex', alignItems: 'center', gap: 6,
                    ...(unread > 0
                      ? { background: '#FEF3C7', color: '#D97706', boxShadow: '0 0 0 2px rgba(217,119,6,0.25)' }
                      : { background: '#F3F4F6', color: '#4B5563' }),
                  }}
                >
                  💬 {cMsgs.length} {cMsgs.length === 1 ? 'message' : 'messages'}
                  {unread > 0 && <span style={{ background: '#DC2626', color: '#fff', fontSize: 10, fontWeight: 800, padding: '1px 6px', borderRadius: 999 }}>{unread} new</span>}
                </button>
                <span style={{ background: '#F0FDF4', color: '#059669', fontSize: 12, fontWeight: 700, padding: '5px 12px', borderRadius: 999 }}>Active</span>
                <span style={{ fontSize: 12, fontWeight: 700, padding: '5px 12px', borderRadius: 999, ...(c.push_enabled !== false ? { background: '#F0FDF4', color: '#065F46' } : { background: '#FEF2F2', color: '#991B1B' }) }}>Push: {c.push_enabled !== false ? 'On' : 'Off'}</span>
                <span style={{ fontSize: 12, fontWeight: 700, padding: '5px 12px', borderRadius: 999, ...(c.email_enabled !== false ? { background: '#F0FDF4', color: '#065F46' } : { background: '#FEF2F2', color: '#991B1B' }) }}>Email: {c.email_enabled !== false ? 'On' : 'Off'}</span>
              </div>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                <button onClick={() => setShowPrint(c)} style={{ padding: '6px 14px', borderRadius: 10, border: 'none', background: '#3293CB', color: '#fff', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>Print Sticker</button>
                <button onClick={() => copyLink(c.code)} style={{ padding: '6px 14px', borderRadius: 10, border: '1px solid #E5E7EB', background: '#fff', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>Copy Link</button>
                <button onClick={() => downloadQR(c.code)} style={{ padding: '6px 14px', borderRadius: 10, border: '1px solid #E5E7EB', background: '#fff', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>Download QR</button>
                <a href={`/c/${c.code}`} target="_blank" rel="noopener noreferrer" style={{ padding: '6px 14px', borderRadius: 10, border: '1px solid #E5E7EB', background: '#fff', fontSize: 13, fontWeight: 600, cursor: 'pointer', textDecoration: 'none', color: '#111827' }}>Preview</a>
                <button onClick={() => openEdit(c)} style={{ padding: '6px 14px', borderRadius: 10, border: '1px solid #E5E7EB', background: '#fff', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>Edit</button>
                <button onClick={() => toggleStatus(c.id, c.status)} style={{ padding: '6px 14px', borderRadius: 10, border: '1px solid #E5E7EB', background: '#fff', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>{c.status === 'active' ? 'Pause' : 'Activate'}</button>
                <button onClick={() => deleteCode(c.id)} style={{ padding: '6px 14px', borderRadius: 10, border: 'none', background: '#FEE2E2', color: '#DC2626', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>Delete</button>
              </div>
            </div>
          </div>
          <p style={{ fontSize: 12, color: '#9CA3AF' }}>Created {new Date(c.created_at).toLocaleDateString()}</p>
        </div>

        {/* ── Messages: Inbox / Archived tabs, paginated, clickable cards ── */}
        {(() => {
          const inboxMsgs = cMsgs.filter(m => !m.archived_at)
          const archivedMsgs = cMsgs.filter(m => m.archived_at)
          const active = msgTab === 'inbox' ? inboxMsgs : archivedMsgs
          const totalPages = Math.max(1, Math.ceil(active.length / MSG_PAGE_SIZE))
          const page = Math.min(msgPage, totalPages - 1)
          const pageMsgs = active.slice(page * MSG_PAGE_SIZE, (page + 1) * MSG_PAGE_SIZE)
          return (
            <>
              <div id="code-messages" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12, scrollMarginTop: 80 }}>
                <h3 style={{ fontSize: 16, fontWeight: 700, margin: 0 }}>Messages</h3>
                <div style={{ display: 'flex', gap: 6 }}>
                  <button
                    onClick={() => setMsgTab('inbox')}
                    style={{ padding: '6px 14px', borderRadius: 999, border: 'none', cursor: 'pointer', fontSize: 13, fontWeight: 700, ...(msgTab === 'inbox' ? { background: '#3293CB', color: '#fff' } : { background: '#F3F4F6', color: '#4B5563' }) }}
                  >
                    Inbox ({inboxMsgs.length})
                  </button>
                  <button
                    onClick={() => setMsgTab('archived')}
                    style={{ padding: '6px 14px', borderRadius: 999, border: 'none', cursor: 'pointer', fontSize: 13, fontWeight: 700, ...(msgTab === 'archived' ? { background: '#3293CB', color: '#fff' } : { background: '#F3F4F6', color: '#4B5563' }) }}
                  >
                    Archived ({archivedMsgs.length})
                  </button>
                </div>
              </div>

              {active.length === 0 ? (
                <div style={{ background: '#fff', border: '1px solid #E5E7EB', borderRadius: 16, padding: 32, textAlign: 'center' }}>
                  <p style={{ color: '#6B7280', fontSize: 14 }}>
                    {msgTab === 'inbox'
                      ? 'No messages yet. Share your code to start receiving messages.'
                      : 'No archived messages.'}
                  </p>
                </div>
              ) : pageMsgs.map(m => {
                const urgent = m.message?.startsWith('[URGENT]')
                const body = (m.message || m.content || '').replace('[URGENT] ', '')
                const preview = body.length > 140 ? body.slice(0, 137) + '...' : body
                return (
                  <button
                    key={m.id}
                    onClick={() => setViewingMessage(m)}
                    style={{
                      display: 'block', textAlign: 'left', width: '100%',
                      background: '#fff', border: '1px solid #E5E7EB', borderRadius: 16,
                      padding: 16, marginBottom: 10, cursor: 'pointer',
                      ...(!m.read && !m.archived_at ? { borderLeft: '3px solid #3293CB' } : {}),
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0 }}>
                        <div style={{ width: 32, height: 32, borderRadius: '50%', background: 'linear-gradient(135deg, #3293CB, #5d92f6)', color: '#fff', display: 'grid', placeItems: 'center', fontSize: 13, fontWeight: 700, flexShrink: 0 }}>{(m.sender_name || 'A')[0].toUpperCase()}</div>
                        <span style={{ fontWeight: 600, fontSize: 14, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{m.sender_name || 'Anonymous'}</span>
                        {urgent && <span style={{ background: '#DC2626', color: '#fff', fontSize: 10, fontWeight: 700, padding: '2px 6px', borderRadius: 4, flexShrink: 0 }}>URGENT</span>}
                        {!m.read && !m.archived_at && <span style={{ background: '#3293CB', color: '#fff', fontSize: 10, fontWeight: 700, padding: '2px 6px', borderRadius: 4, flexShrink: 0 }}>NEW</span>}
                      </div>
                      <span style={{ fontSize: 12, color: '#6B7280', flexShrink: 0, marginLeft: 8 }}>{new Date(m.created_at).toLocaleDateString()}</span>
                    </div>
                    <p style={{ fontSize: 14, color: '#111827', lineHeight: 1.5, margin: 0 }}>{preview}</p>
                    {(m.sender_email || m.sender_phone) && (
                      <p style={{ fontSize: 12, color: '#6B7280', marginTop: 6 }}>
                        {m.sender_email && <span>{m.sender_email}</span>}
                        {m.sender_email && m.sender_phone && <span> · </span>}
                        {m.sender_phone && <span>{m.sender_phone}</span>}
                      </p>
                    )}
                  </button>
                )
              })}

              {/* Pagination (shared Paginator — hides itself if totalPages ≤ 1) */}
              <Paginator page={page} totalPages={totalPages} onChange={setMsgPage} compact />
            </>
          )
        })()}

        {/* Message detail modal */}
        {viewingMessage && (() => {
          const m = viewingMessage
          const urgent = m.message?.startsWith('[URGENT]')
          const body = (m.message || m.content || '').replace('[URGENT] ', '')
          const isArchived = !!m.archived_at
          return (
            <div
              onClick={() => setViewingMessage(null)}
              style={{ position: 'fixed', inset: 0, zIndex: 250, background: 'rgba(0,0,0,0.4)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20, overflowY: 'auto' }}
            >
              <div
                onClick={e => e.stopPropagation()}
                style={{ background: '#fff', borderRadius: 20, width: '100%', maxWidth: 520, maxHeight: '90vh', overflowY: 'auto', boxShadow: '0 20px 60px rgba(0,0,0,0.18)' }}
              >
                <div style={{ padding: '20px 24px', borderBottom: '1px solid #E5E7EB', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0 }}>
                    <div style={{ width: 40, height: 40, borderRadius: '50%', background: 'linear-gradient(135deg, #3293CB, #5d92f6)', color: '#fff', display: 'grid', placeItems: 'center', fontSize: 15, fontWeight: 700, flexShrink: 0 }}>{(m.sender_name || 'A')[0].toUpperCase()}</div>
                    <div style={{ minWidth: 0 }}>
                      <p style={{ fontWeight: 700, fontSize: 15, margin: 0, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{m.sender_name || 'Anonymous'}</p>
                      <p style={{ fontSize: 12, color: '#6B7280', margin: 0 }}>{new Date(m.created_at).toLocaleString()}</p>
                    </div>
                  </div>
                  <button onClick={() => setViewingMessage(null)} aria-label="Close" style={{ background: 'none', border: 'none', fontSize: 24, cursor: 'pointer', color: '#6B7280', lineHeight: 1 }}>&times;</button>
                </div>
                <div style={{ padding: 24 }}>
                  <div style={{ display: 'flex', gap: 8, marginBottom: 14, flexWrap: 'wrap' }}>
                    {urgent && <span style={{ background: '#DC2626', color: '#fff', fontSize: 11, fontWeight: 700, padding: '3px 10px', borderRadius: 999 }}>🚨 URGENT</span>}
                    {isArchived && <span style={{ background: '#F3F4F6', color: '#4B5563', fontSize: 11, fontWeight: 700, padding: '3px 10px', borderRadius: 999 }}>ARCHIVED</span>}
                    {!m.read && !isArchived && <span style={{ background: '#3293CB', color: '#fff', fontSize: 11, fontWeight: 700, padding: '3px 10px', borderRadius: 999 }}>NEW</span>}
                  </div>
                  <p style={{ fontSize: 15, color: '#111827', lineHeight: 1.6, whiteSpace: 'pre-wrap', background: '#F9FAFB', padding: 16, borderRadius: 12, marginBottom: 16 }}>{body}</p>
                  {(m.sender_email || m.sender_phone) && (
                    <div style={{ marginBottom: 16 }}>
                      <p style={{ fontSize: 12, fontWeight: 700, color: '#6B7280', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 8 }}>Reply to</p>
                      {m.sender_email && <p style={{ fontSize: 14, marginBottom: 4 }}>✉️ <a href={`mailto:${m.sender_email}?subject=Re:%20your%20message%20on%20${encodeURIComponent(c.title)}`} style={{ color: '#3293CB', fontWeight: 600 }}>{m.sender_email}</a></p>}
                      {m.sender_phone && <p style={{ fontSize: 14 }}>📞 <a href={`tel:${m.sender_phone}`} style={{ color: '#3293CB', fontWeight: 600 }}>{m.sender_phone}</a></p>}
                    </div>
                  )}
                  <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                    {m.sender_email && (
                      <a
                        href={`mailto:${m.sender_email}?subject=Re:%20your%20message%20on%20${encodeURIComponent(c.title)}`}
                        style={{ padding: '10px 18px', borderRadius: 10, border: 'none', background: '#3293CB', color: '#fff', fontSize: 13, fontWeight: 700, cursor: 'pointer', textDecoration: 'none' }}
                      >
                        Reply by email
                      </a>
                    )}
                    {m.sender_phone && (
                      <a
                        href={`tel:${m.sender_phone}`}
                        style={{ padding: '10px 18px', borderRadius: 10, border: '1px solid #E5E7EB', background: '#fff', color: '#111827', fontSize: 13, fontWeight: 600, cursor: 'pointer', textDecoration: 'none' }}
                      >
                        Call
                      </a>
                    )}
                    <button
                      onClick={() => archiveMessage(m.id, !isArchived)}
                      style={{ padding: '10px 18px', borderRadius: 10, border: '1px solid #E5E7EB', background: '#fff', color: '#111827', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}
                    >
                      {isArchived ? 'Unarchive' : 'Archive'}
                    </button>
                    <button
                      onClick={() => deleteMessage(m.id)}
                      style={{ padding: '10px 18px', borderRadius: 10, border: 'none', background: '#FEE2E2', color: '#DC2626', fontSize: 13, fontWeight: 600, cursor: 'pointer', marginLeft: 'auto' }}
                    >
                      Delete
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )
        })()}
      </div>
    )
  }

  // ─── CREATE / EDIT CODE MODAL ─────────────────────────────
  if (showCreate) {
    const isEdit = !!editingCode
    return (
      <div>
        <button onClick={() => { setShowCreate(false); setEditingCode(null); resetForm() }} style={{ background: 'none', border: 'none', color: '#3293CB', fontWeight: 600, fontSize: 14, cursor: 'pointer', marginBottom: 16 }}>&larr; Back</button>
        <h2 style={{ fontSize: 22, fontWeight: 700, marginBottom: 20 }}>{isEdit ? 'Edit Contact Code' : 'Create a Contact Code'}</h2>

        <div style={{ background: '#E0F2FE', borderRadius: 16, padding: 20, textAlign: 'center', marginBottom: 20 }}>
          <div style={{ fontSize: 12, color: '#3293CB', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 8 }}>Your BuddyAlly Code</div>
          <div style={{ fontFamily: 'monospace', fontSize: 32, fontWeight: 800, letterSpacing: '0.15em', color: '#111827' }}>{isEdit ? editingCode.code : 'Auto-generated'}</div>
          <div style={{ fontSize: 13, color: '#4B5563', marginTop: 6 }}>buddyally.com/{isEdit ? editingCode.code : 'XXXXXX'}</div>
        </div>

        <div style={{ display: 'grid', gap: 14 }}>
          <div>
            <label style={{ fontSize: 13, fontWeight: 600, color: '#4B5563', display: 'block', marginBottom: 6 }}>What is this code for?</label>
            <select value={newType} onChange={e => setNewType(e.target.value)} style={{ width: '100%', padding: '12px 14px', border: '1.5px solid #E5E7EB', borderRadius: 14, fontSize: 14, color: '#111827', background: '#fff' }}>
              {Object.entries(CODE_TYPES).map(([v, t]) => <option key={v} value={v}>{t.emoji} {t.label}</option>)}
            </select>
          </div>
          <div>
            <label style={{ fontSize: 13, fontWeight: 600, color: '#4B5563', display: 'block', marginBottom: 6 }}>Title (what people see) *</label>
            <input value={newTitle} onChange={e => setNewTitle(e.target.value)} style={{ width: '100%', padding: '12px 14px', border: '1.5px solid #E5E7EB', borderRadius: 14, fontSize: 14, color: '#111827' }} placeholder="e.g. Black Honda Civic on W 83rd St" />
          </div>
          <div>
            <label style={{ fontSize: 13, fontWeight: 600, color: '#4B5563', display: 'block', marginBottom: 6 }}>Description (optional)</label>
            <textarea value={newDesc} onChange={e => setNewDesc(e.target.value)} rows={3} style={{ width: '100%', padding: '12px 14px', border: '1.5px solid #E5E7EB', borderRadius: 14, fontSize: 14, color: '#111827', resize: 'none' }} placeholder="Any details to help the person contacting you" />
          </div>
          <div>
            <label style={{ fontSize: 13, fontWeight: 600, color: '#4B5563', display: 'block', marginBottom: 6 }}>Image (optional)</label>
            {newImage && <img src={newImage} alt="" style={{ width: '100%', maxHeight: 150, objectFit: 'cover', borderRadius: 12, marginBottom: 8 }} />}
            <input ref={imageRef} type="file" accept="image/*" onChange={handleImageSelect} style={{ width: '100%', padding: 10, border: '1.5px dashed #E5E7EB', borderRadius: 14, fontSize: 14, color: '#6B7280', cursor: 'pointer' }} />
          </div>
          <div>
            <label style={{ fontSize: 13, fontWeight: 600, color: '#4B5563', display: 'block', marginBottom: 6 }}>Links (open in new tab for visitors)</label>
            {newLinks.map((l, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 10px', background: '#F9FAFB', borderRadius: 8, marginBottom: 6, fontSize: 13 }}>
                <span style={{ flex: 1 }}>{l.label} &rarr; {l.url}</span>
                <button onClick={() => setNewLinks(prev => prev.filter((_, j) => j !== i))} style={{ background: 'none', border: 'none', color: '#DC2626', cursor: 'pointer', fontSize: 16 }}>&times;</button>
              </div>
            ))}
            <div style={{ display: 'flex', gap: 8 }}>
              <input value={linkLabel} onChange={e => setLinkLabel(e.target.value)} placeholder="Label" style={{ flex: 1, padding: '10px 12px', border: '1.5px solid #E5E7EB', borderRadius: 10, fontSize: 13, color: '#111827' }} />
              <input value={linkUrl} onChange={e => setLinkUrl(e.target.value)} placeholder="https://..." style={{ flex: 1, padding: '10px 12px', border: '1.5px solid #E5E7EB', borderRadius: 10, fontSize: 13, color: '#111827' }} />
              <button onClick={addLink} style={{ background: '#E0F2FE', color: '#3293CB', border: 'none', borderRadius: 10, padding: '10px 14px', fontWeight: 700, cursor: 'pointer' }}>+</button>
            </div>
          </div>
          <div>
            <label style={{ fontSize: 13, fontWeight: 600, color: '#4B5563', display: 'block', marginBottom: 6 }}>Social Profiles (optional)</label>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
              <input value={socials.instagram} onChange={e => setSocials(p => ({ ...p, instagram: e.target.value }))} placeholder="Instagram @handle" style={{ padding: '10px 12px', border: '1.5px solid #E5E7EB', borderRadius: 10, fontSize: 13, color: '#111827' }} />
              <input value={socials.twitter} onChange={e => setSocials(p => ({ ...p, twitter: e.target.value }))} placeholder="X / Twitter @handle" style={{ padding: '10px 12px', border: '1.5px solid #E5E7EB', borderRadius: 10, fontSize: 13, color: '#111827' }} />
              <input value={socials.facebook} onChange={e => setSocials(p => ({ ...p, facebook: e.target.value }))} placeholder="Facebook URL" style={{ padding: '10px 12px', border: '1.5px solid #E5E7EB', borderRadius: 10, fontSize: 13, color: '#111827' }} />
              <input value={socials.linkedin} onChange={e => setSocials(p => ({ ...p, linkedin: e.target.value }))} placeholder="LinkedIn URL" style={{ padding: '10px 12px', border: '1.5px solid #E5E7EB', borderRadius: 10, fontSize: 13, color: '#111827' }} />
              <input value={socials.tiktok} onChange={e => setSocials(p => ({ ...p, tiktok: e.target.value }))} placeholder="TikTok @handle" style={{ padding: '10px 12px', border: '1.5px solid #E5E7EB', borderRadius: 10, fontSize: 13, color: '#111827' }} />
              <input value={socials.website} onChange={e => setSocials(p => ({ ...p, website: e.target.value }))} placeholder="Website URL" style={{ padding: '10px 12px', border: '1.5px solid #E5E7EB', borderRadius: 10, fontSize: 13, color: '#111827' }} />
            </div>
          </div>
          <div style={{ background: '#F9FAFB', borderRadius: 14, padding: 14, border: '1px solid #E5E7EB' }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: '#111827', marginBottom: 8 }}>Notification preferences</div>
            <label style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8, cursor: 'pointer' }}>
              <input type="checkbox" checked={pushEnabled} onChange={e => setPushEnabled(e.target.checked)} style={{ width: 18, height: 18, accentColor: '#3293CB' }} />
              <span style={{ fontSize: 13, color: '#374151' }}>Push notifications when someone contacts you</span>
            </label>
            <label style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer' }}>
              <input type="checkbox" checked={emailEnabled} onChange={e => setEmailEnabled(e.target.checked)} style={{ width: 18, height: 18, accentColor: '#3293CB' }} />
              <span style={{ fontSize: 13, color: '#374151' }}>Email me when someone contacts this code</span>
            </label>
          </div>
          <button onClick={createCode} style={{ width: '100%', padding: 14, borderRadius: 14, border: 'none', background: '#3293CB', color: '#fff', fontWeight: 600, fontSize: 16, cursor: 'pointer', boxShadow: '0 4px 12px rgba(50,147,203,0.25)' }}>{isEdit ? 'Save Changes' : 'Create Code'}</button>
        </div>
      </div>
    )
  }

  // ─── CODES LIST ───────────────────────────────────────────
  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <h2 style={{ fontSize: '1.5rem', fontWeight: 800, margin: 0 }}>My Contact Codes</h2>
        <button onClick={() => setShowCreate(true)} style={{ height: 40, padding: '0 16px', borderRadius: 10, border: 'none', background: '#3293CB', color: '#fff', fontWeight: 700, fontSize: 13, cursor: 'pointer' }}>+ New Code</button>
      </div>

      {loading ? (
        <div>{[1, 2].map(i => <div key={i} style={{ background: '#fff', border: '1px solid #E5E7EB', borderRadius: 20, padding: 24, marginBottom: 16 }}><div style={{ height: 20, background: '#f3f4f6', borderRadius: 8, width: '50%', marginBottom: 12 }} /><div style={{ height: 16, background: '#f9fafb', borderRadius: 8, width: '30%' }} /></div>)}</div>
      ) : codes.length === 0 ? (
        <div style={{ background: '#fff', border: '1px solid #E5E7EB', borderRadius: 20, padding: 40, textAlign: 'center' }}>
          <p style={{ fontSize: 32, marginBottom: 12 }}>🔗</p>
          <p style={{ fontWeight: 600, marginBottom: 8 }}>No codes yet</p>
          <p style={{ fontSize: 14, color: '#6B7280', marginBottom: 16 }}>Create your first BuddyAlly Contact Code.</p>
          <button onClick={() => setShowCreate(true)} style={{ padding: '12px 24px', borderRadius: 14, border: 'none', background: '#3293CB', color: '#fff', fontWeight: 600, fontSize: 15, cursor: 'pointer' }}>Create My Code</button>
        </div>
      ) : (
        <div>
          {(() => {
            // Clamp the current page in case codes got deleted below the cursor
            const totalPages = Math.max(1, Math.ceil(codes.length / CODE_PAGE_SIZE))
            const page = Math.min(codePage, totalPages - 1)
            const pageCodes = codes.slice(page * CODE_PAGE_SIZE, (page + 1) * CODE_PAGE_SIZE)
            return (
              <>
          {pageCodes.map(c => {
            const cMsgs = messages.filter(m => m.code_id === c.id)
            const unread = cMsgs.filter((m: any) => !m.read).length
            const tp = CODE_TYPES[c.code_type] || CODE_TYPES.other
            const isPaused = c.status !== 'active'
            return (
              <div key={c.id} style={{ background: '#fff', border: '1px solid #E5E7EB', borderRadius: 20, padding: 24, marginBottom: 16, boxShadow: '0 1px 2px rgba(0,0,0,0.05)', opacity: isPaused ? 0.82 : 1 }}>
                {/* Header: clickable title/code opens the detail view */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 4, gap: 12 }}>
                  <button
                    onClick={() => setViewingCode(c)}
                    style={{ textAlign: 'left', background: 'none', border: 'none', padding: 0, cursor: 'pointer', minWidth: 0, flex: 1 }}
                    aria-label={`Open ${c.title}`}
                  >
                    <h3 style={{ fontSize: 20, fontWeight: 700, marginBottom: 4, color: '#111827' }}>{c.title}</h3>
                    <div style={{ fontFamily: "'SF Mono', Menlo, Consolas, monospace", fontWeight: 800, color: '#3293CB', letterSpacing: '0.12em', fontSize: 16 }}>{c.code}</div>
                  </button>
                  <span style={{ padding: '5px 12px', borderRadius: 999, fontSize: 12, fontWeight: 700, whiteSpace: 'nowrap', ...(c.status === 'active' ? { background: '#F0FDF4', color: '#059669' } : { background: '#FEF3C7', color: '#D97706' }) }}>{c.status}</span>
                </div>
                <div style={{ fontSize: 14, color: '#6B7280', marginBottom: 14 }}>{tp.emoji} {tp.label} &bull; buddyally.com/{c.code}</div>

                <div style={{ display: 'flex', gap: 16, alignItems: 'flex-start', flexWrap: 'wrap', marginBottom: 14 }}>
                  <div style={{ flexShrink: 0 }}><QRCode code={c.code} size={3} /></div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    {/* Stats row — messages badge is clickable */}
                    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 12 }}>
                      <span style={{ background: '#E0F2FE', color: '#0284C7', fontSize: 12, fontWeight: 700, padding: '5px 12px', borderRadius: 999 }}>{c.scan_count || 0} scans</span>
                      <button
                        onClick={() => setViewingCode(c)}
                        aria-label={`View messages for ${c.title}`}
                        style={{
                          border: 'none', cursor: 'pointer', fontSize: 12, fontWeight: 700,
                          padding: '5px 12px', borderRadius: 999,
                          display: 'inline-flex', alignItems: 'center', gap: 6,
                          ...(unread > 0
                            ? { background: '#FEF3C7', color: '#D97706', boxShadow: '0 0 0 2px rgba(217,119,6,0.25)' }
                            : { background: '#F3F4F6', color: '#4B5563' }),
                        }}
                      >
                        💬 {cMsgs.length} {cMsgs.length === 1 ? 'message' : 'messages'}
                        {unread > 0 && <span style={{ background: '#DC2626', color: '#fff', fontSize: 10, fontWeight: 800, padding: '1px 6px', borderRadius: 999 }}>{unread} new</span>}
                      </button>
                    </div>
                    {/* Primary action: Open — plus quick utilities */}
                    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                      <button
                        onClick={() => setViewingCode(c)}
                        style={{ padding: '8px 18px', borderRadius: 10, border: 'none', background: '#3293CB', color: '#fff', fontSize: 13, fontWeight: 700, cursor: 'pointer', boxShadow: '0 2px 6px rgba(50,147,203,0.25)' }}
                      >
                        Open{unread > 0 ? ` · ${unread}` : ''}
                      </button>
                      <button onClick={() => openEdit(c)} style={{ padding: '8px 14px', borderRadius: 10, border: '1px solid #E5E7EB', background: '#fff', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>Edit</button>
                      <button onClick={() => setShowPrint(c)} style={{ padding: '8px 14px', borderRadius: 10, border: '1px solid #E5E7EB', background: '#fff', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>Print</button>
                      <button onClick={() => copyLink(c.code)} style={{ padding: '8px 14px', borderRadius: 10, border: '1px solid #E5E7EB', background: '#fff', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>Copy Link</button>
                    </div>
                  </div>
                </div>
              </div>
            )
          })}
          <Paginator page={page} totalPages={totalPages} onChange={setCodePage} />
              </>
            )
          })()}
        </div>
      )}
    </div>
  )
}
