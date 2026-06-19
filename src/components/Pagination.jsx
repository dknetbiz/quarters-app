import React from 'react'
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from 'lucide-react'

export const PER_PAGE = 20

/** Paginate an array — call inside useMemo */
export function paginate(arr, page) {
  return arr.slice((page - 1) * PER_PAGE, page * PER_PAGE)
}

export default function Pagination({ page, total, onChange }) {
  const totalPages = Math.max(1, Math.ceil(total / PER_PAGE))
  if (total <= PER_PAGE) return null

  const start = (page - 1) * PER_PAGE + 1
  const end   = Math.min(page * PER_PAGE, total)

  // Page window: show up to 5 page buttons around current
  const delta = 2
  const pages = []
  for (let p = Math.max(1, page - delta); p <= Math.min(totalPages, page + delta); p++) pages.push(p)

  return (
    <div className="flex items-center justify-between px-3 py-2.5 border-t border-slate-100 bg-slate-50/60">
      <p className="text-xs text-slate-400 hidden sm:block">
        <span className="font-semibold text-slate-600">{start}–{end}</span> of <span className="font-semibold text-slate-600">{total}</span>
      </p>
      <div className="flex items-center gap-0.5 mx-auto sm:mx-0">
        <PgBtn icon={ChevronsLeft}  onClick={() => onChange(1)}           disabled={page === 1}          title="First" />
        <PgBtn icon={ChevronLeft}   onClick={() => onChange(page - 1)}    disabled={page === 1}          title="Prev" />

        {pages[0] > 1 && <><span className="text-xs text-slate-400 px-1">…</span></>}
        {pages.map(p => (
          <button key={p} onClick={() => onChange(p)}
            className={`w-7 h-7 rounded-lg text-xs font-semibold transition-colors ${p === page ? 'bg-brand-700 text-white' : 'text-slate-600 hover:bg-slate-200'}`}>
            {p}
          </button>
        ))}
        {pages[pages.length - 1] < totalPages && <span className="text-xs text-slate-400 px-1">…</span>}

        <PgBtn icon={ChevronRight}  onClick={() => onChange(page + 1)}    disabled={page === totalPages} title="Next" />
        <PgBtn icon={ChevronsRight} onClick={() => onChange(totalPages)}  disabled={page === totalPages} title="Last" />
      </div>
      <p className="text-xs text-slate-400 hidden sm:block">Page {page} / {totalPages}</p>
    </div>
  )
}

function PgBtn({ icon: Icon, onClick, disabled, title }) {
  return (
    <button onClick={onClick} disabled={disabled} title={title}
      className={`w-7 h-7 flex items-center justify-center rounded-lg transition-colors ${disabled ? 'text-slate-300 cursor-not-allowed' : 'text-slate-600 hover:bg-slate-200'}`}>
      <Icon className="w-3.5 h-3.5" />
    </button>
  )
}
