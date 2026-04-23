// Small, stateless pagination control used across dashboard lists.
// Keeps state in the parent (so the parent owns "reset to page 0" semantics
// when the underlying list/filter/tab changes). Hides itself when a single
// page is sufficient — so it's safe to drop into any list unconditionally.

'use client'

type Props = {
  page: number
  totalPages: number
  onChange: (next: number) => void
  // Optional label override, eg. "showing X of Y"
  label?: string
  // Compact style for use inside tight UI (modals, sidebars)
  compact?: boolean
}

export default function Paginator({ page, totalPages, onChange, label, compact }: Props) {
  if (totalPages <= 1) return null
  const canPrev = page > 0
  const canNext = page < totalPages - 1
  const btnPad = compact ? '6px 10px' : '8px 14px'
  const fontSize = compact ? 12 : 13

  const btnStyle = (enabled: boolean): React.CSSProperties => ({
    padding: btnPad,
    borderRadius: 10,
    border: '1px solid #E5E7EB',
    background: enabled ? '#fff' : '#F3F4F6',
    color: enabled ? '#111827' : '#9CA3AF',
    fontSize,
    fontWeight: 600,
    cursor: enabled ? 'pointer' : 'not-allowed',
  })

  return (
    <div
      style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        gap: compact ? 8 : 12,
        marginTop: compact ? 10 : 16,
      }}
    >
      <button
        type="button"
        aria-label="Previous page"
        onClick={() => canPrev && onChange(page - 1)}
        disabled={!canPrev}
        style={btnStyle(canPrev)}
      >
        ← Previous
      </button>
      <span style={{ fontSize, color: '#6B7280', fontWeight: 600 }}>
        {label || `Page ${page + 1} of ${totalPages}`}
      </span>
      <button
        type="button"
        aria-label="Next page"
        onClick={() => canNext && onChange(page + 1)}
        disabled={!canNext}
        style={btnStyle(canNext)}
      >
        Next →
      </button>
    </div>
  )
}
