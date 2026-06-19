import React from 'react'
import { X } from 'lucide-react'

/** Labeled filter group with title divider */
export function FilterSection({ title, children }) {
  return (
    <div>
      <p className="text-[9px] font-black uppercase tracking-[0.12em] text-slate-400 mb-2">{title}</p>
      {children}
    </div>
  )
}

/** Pill chip grid for single-select options ('' = All) */
export function FilterChips({ options, value, onChange, allLabel = 'All', colorMap }) {
  return (
    <div className="flex flex-wrap gap-1.5">
      <Chip active={!value} onClick={() => onChange('')}>{allLabel}</Chip>
      {options.map(opt => {
        const v = typeof opt === 'string' ? opt : opt.value
        const l = typeof opt === 'string' ? opt : opt.label
        const extra = colorMap?.[v] || ''
        return (
          <Chip key={v} active={value === v} onClick={() => onChange(value === v ? '' : v)} extra={extra}>{l}</Chip>
        )
      })}
    </div>
  )
}

function Chip({ active, onClick, children, extra = '' }) {
  return (
    <button onClick={onClick}
      className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-colors ${active ? `bg-brand-700 text-white ${extra}` : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}>
      {children}
    </button>
  )
}

/** Compact select dropdown for sidebar */
export function FilterSelect({ value, onChange, options, placeholder = 'All' }) {
  return (
    <select
      className="w-full border border-slate-200 rounded-xl px-2.5 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-brand-500 bg-white text-slate-700"
      value={value} onChange={e => onChange(e.target.value)}>
      <option value="">{placeholder}</option>
      {options.map(o => <option key={o}>{o}</option>)}
    </select>
  )
}

/** Toggle switch with label */
export function FilterToggle({ label, value, onChange }) {
  return (
    <button onClick={() => onChange(!value)}
      className={`w-full flex items-center justify-between px-3 py-2 rounded-xl border text-xs font-semibold transition-colors ${value ? 'bg-brand-50 border-brand-300 text-brand-700' : 'bg-white border-slate-200 text-slate-500 hover:border-slate-300'}`}>
      <span>{label}</span>
      <div className={`w-8 h-4 rounded-full transition-colors relative flex-shrink-0 ${value ? 'bg-brand-600' : 'bg-slate-300'}`}>
        <div className={`absolute top-0.5 w-3 h-3 rounded-full bg-white shadow-sm transition-transform ${value ? 'translate-x-4' : 'translate-x-0.5'}`} />
      </div>
    </button>
  )
}

/** Compact date-range pair */
export function FilterDateRange({ fromValue, toValue, onFromChange, onToChange }) {
  return (
    <div className="space-y-1.5">
      <div className="relative">
        <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[9px] text-slate-400 font-bold uppercase">From</span>
        <input type="date" className="w-full border border-slate-200 rounded-xl pl-10 pr-2 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-brand-500 bg-white"
          value={fromValue} onChange={e => onFromChange(e.target.value)} />
      </div>
      <div className="relative">
        <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[9px] text-slate-400 font-bold uppercase">To</span>
        <input type="date" className="w-full border border-slate-200 rounded-xl pl-8 pr-2 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-brand-500 bg-white"
          value={toValue} onChange={e => onToChange(e.target.value)} />
      </div>
    </div>
  )
}

/** "Clear N filters" button — renders nothing when count = 0 */
export function ClearFilters({ onClick, count }) {
  if (!count) return null
  return (
    <button onClick={onClick}
      className="w-full flex items-center justify-center gap-1.5 py-1.5 text-[11px] font-semibold text-rose-600 hover:bg-rose-50 rounded-xl transition-colors border border-rose-200">
      <X className="w-3 h-3" /> Clear {count} filter{count !== 1 ? 's' : ''}
    </button>
  )
}

/** Small text summary line e.g. "42 records" */
export function ResultCount({ count, total, label = 'record' }) {
  return (
    <p className="text-xs text-slate-400 font-medium">
      {total !== undefined && count !== total
        ? <><span className="text-slate-600 font-semibold">{count}</span> of {total} {label}{total !== 1 ? 's' : ''}</>
        : <><span className="text-slate-600 font-semibold">{count}</span> {label}{count !== 1 ? 's' : ''}</>
      }
    </p>
  )
}
