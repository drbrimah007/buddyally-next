/**
 * ═══════════════════════════════════════════════════════════════════
 * BUDDYALLY PRINT STICKER SYSTEM — COMPLETE BACKUP
 * Saved: 2026-04-22
 * DO NOT DELETE — This is the working print system.
 * ═══════════════════════════════════════════════════════════════════
 *
 * Dependencies:
 *   - qrcode-generator@1.4.4 (loaded via CDN script tag)
 *   - /caution-sign.png (in public/)
 *   - /mascot-boy.png, /mascot-dog.png, /mascot-goat.png,
 *     /mascot-sheep.png, /mascot-moose.png (in public/)
 *
 * Also requires these constants (defined elsewhere in codes/page.tsx):
 *   HEADER_TEXT — maps code_type to { title, sub }
 *   PRINT_STYLES — maps basic style names to { bg, text, accent }
 *   toast() — toast notification function
 */

// ── HEADER TEXT (per code type) ──────────────────────────────────
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

// ── BASIC COLOR STYLES ───────────────────────────────────────────
const PRINT_STYLES: Record<string, { bg: string; text: string; accent: string }> = {
  blue: { bg: 'linear-gradient(135deg, #0284C7, #5d92f6)', text: '#fff', accent: '#fff' },
  dark: { bg: '#0F172A', text: '#fff', accent: '#3293CB' },
  white: { bg: '#ffffff', text: '#0F172A', accent: '#0284C7' },
  yellow: { bg: 'linear-gradient(135deg, #fff8dc, #ffe58a)', text: '#3a2c08', accent: '#92400E' },
  green: { bg: '#065F46', text: '#fff', accent: '#34D399' },
}

// ── MASCOT SIZING CONFIG ─────────────────────────────────────────
// Per-style mascot sizing for the printed sticker.
//   qrSize   — QR width/height in px (ignored when onBoard is true)
//   mascotW/mascotH — mascot container box in px; image is object-fit:contain inside
//   side     — 'left' | 'right' — which side of the QR the mascot sits on
//   overlap  — negative-margin pull toward the QR in px (tightens the gap)
//   onBoard  — render QR *inside* the mascot's board, instead of beside the mascot
//   boardRect — where on the mascot image the QR sits when onBoard=true
//               Values are percentages of mascotW/mascotH
const MASCOT_SIZING: Record<string, {
  qrSize: number; mascotW: number; mascotH: number; side: string;
  overlap?: number;
  onBoard?: boolean;
  boardRect?: { x: number; y: number; w: number; h: number };
}> = {
  'contact-owner': { qrSize: 180, mascotW: 0, mascotH: 0, side: 'right' },
  'boy-mascot':    { qrSize: 150, mascotW: 130, mascotH: 170, side: 'left',  overlap: 14 },
  'dog-mascot':    { qrSize: 150, mascotW: 140, mascotH: 160, side: 'left',  overlap: 14 },
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

// ── QR DATA URL GENERATOR ────────────────────────────────────────
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

// ── IMAGE TO DATA URL LOADER ─────────────────────────────────────
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

// ── STICKER HTML BUILDER ─────────────────────────────────────────
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

// ── PRINT SHEET RENDERER ─────────────────────────────────────────
// Paginate N stickers onto US Letter using an invisible grid.
// Each sticker is rendered at its NATURAL intrinsic size, then uniformly
// scaled via CSS transform to occupy most of its cell without any
// aspect-ratio change.
function renderPrintSheet(stickerContent: string, perSheet: number) {
  const printWin = window.open('', '_blank')
  if (!printWin) return
  const bodyMatch = stickerContent.match(/<body[^>]*>([\s\S]*?)<\/body>/i)
  const stickerBody = bodyMatch ? bodyMatch[1] : stickerContent
  const styleMatch = stickerContent.match(/<style[^>]*>([\s\S]*?)<\/style>/i)
  const styles = styleMatch ? styleMatch[1] : ''

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
.print-cell .sticker{flex-shrink:0;transform-origin:center center;margin:0!important;}
@media screen{body{background:#e5e7eb;padding:20px 0;}.print-sheet{box-shadow:0 4px 20px rgba(0,0,0,0.15);margin-bottom:20px;}}
</style></head><body><div class="print-sheet">${cellsHtml}</div>
<script>
(function(){
  var FILL = 0.96;
  function fit(){
    var cells = document.querySelectorAll('.print-cell');
    cells.forEach(function(cell){
      var s = cell.querySelector('.sticker');
      if(!s) return;
      s.style.transform = 'none';
      var cr = cell.getBoundingClientRect();
      var sr = s.getBoundingClientRect();
      if(sr.width < 1 || sr.height < 1) return;
      var k = Math.min((cr.width * FILL) / sr.width, (cr.height * FILL) / sr.height);
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
    setTimeout(cb, 2000);
  }
  window.addEventListener('load', function(){
    whenImagesReady(function(){
      setTimeout(function(){
        fit();
        setTimeout(function(){ window.print(); }, 150);
      }, 80);
    });
  });
  window.addEventListener('resize', fit);
})();
</script>
</body></html>`)
  printWin.document.close()
  printWin.focus()
}

// ── MAIN PRINT ORCHESTRATOR ──────────────────────────────────────
async function doPrintSticker(code: string, codeType: string, styleName: string, perSheet: number) {
  const qrDataUrl = makeQrDataUrl(code)
  if (!qrDataUrl) { alert('QR generator not loaded yet. Try again.'); return }
  const hdr = HEADER_TEXT[codeType] || HEADER_TEXT.other
  const cautionUrl = await loadImageAsDataUrl('/caution-sign.png')

  if (styleName in MASCOT_SIZING) {
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
    const s = PRINT_STYLES[styleName] || PRINT_STYLES.blue
    const stickerContent = `<!DOCTYPE html><html><head>
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700;800;900&display=swap" rel="stylesheet">
<style>*{box-sizing:border-box;margin:0;padding:0;-webkit-print-color-adjust:exact!important;print-color-adjust:exact!important;}
body{font-family:Inter,sans-serif;display:flex;justify-content:center;padding:20px;background:#fff;}@page{size:auto;margin:8mm;}
.sticker{width:280px;background:#fff;border-radius:16px;border:1.5px solid #ddd;overflow:hidden;}
.header{background:${s.bg};color:${s.text};padding:14px 16px;text-align:center;}
.body{padding:16px;text-align:center;background:#fff;}
.scan{font-size:12px;color:#555;margin-top:8px;}.url{font-size:20px;font-weight:900;color:#0652b7;margin-top:2px;}
</style></head><body><div class="sticker">
<div class="header"><div style="font-size:18px;font-weight:900;">${hdr.title}</div><div style="font-size:11px;opacity:0.85;margin-top:2px;">${hdr.sub}</div></div>
<div class="body"><img src="${qrDataUrl}" style="width:160px;height:160px;">
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

// ── STYLE PREVIEW CARDS (for print modal picker) ─────────────────
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
  // Mascot previews
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
