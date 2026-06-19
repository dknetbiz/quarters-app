import React, { useEffect } from 'react'
import { X } from 'lucide-react'

const HEADER_BG = {
  default: 'bg-slate-800',
  danger:  'bg-rose-700',
  warning: 'bg-amber-600',
  success: 'bg-emerald-700',
  info:    'bg-blue-700',
}

const MAX_W = { sm: 'md:max-w-sm', md: 'md:max-w-md', lg: 'md:max-w-xl', xl: 'md:max-w-2xl' }

/**
 * Professional modal dialog.
 * Mobile: slides up from bottom. Desktop (md+): centered dialog.
 *
 * Props:
 *  open, onClose, title
 *  icon       — lucide component shown in header
 *  subtitle   — grey line under title
 *  badge      — { label, cls } e.g. { label:'Active', cls:'bg-emerald-400/30 text-emerald-100' }
 *  variant    — 'default'|'danger'|'warning'|'success'|'info'
 *  size       — 'sm'|'md'|'lg'|'xl'
 *  footer     — node rendered in a sticky footer below content
 */
export default function Modal({
  open, onClose, title, children,
  icon: Icon,
  subtitle,
  badge,
  variant = 'default',
  size    = 'md',
  footer,
}) {
  useEffect(() => {
    if (open) document.body.style.overflow = 'hidden'
    else      document.body.style.overflow = ''
    return () => { document.body.style.overflow = '' }
  }, [open])

  if (!open) return null

  const headerBg = HEADER_BG[variant] || HEADER_BG.default
  const maxW     = MAX_W[size] || MAX_W.md

  return (
    <div className="fixed inset-0 z-50 flex flex-col md:flex-row md:items-center md:justify-center">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/55 backdrop-blur-sm" onClick={onClose} />

      {/* Panel */}
      <div className={`
        relative bg-white w-full ${maxW} md:mx-4 md:rounded-2xl
        rounded-t-3xl max-h-[92vh] md:max-h-[88vh]
        flex flex-col shadow-2xl
        mt-auto md:mt-0
        animate-slide-up md:animate-none md:animate-modal-in
      `}>

        {/* Drag handle — mobile only */}
        <div className="md:hidden flex justify-center pt-2.5">
          <div className="w-10 h-1 rounded-full bg-slate-300/60" />
        </div>

        {/* ── Header ── */}
        <div className={`${headerBg} rounded-t-2xl flex items-start justify-between gap-3 px-5 py-4 flex-shrink-0`}>
          <div className="flex items-start gap-3 min-w-0 flex-1">
            {Icon && (
              <div className="w-9 h-9 rounded-xl bg-white/15 flex items-center justify-center flex-shrink-0">
                <Icon className="w-5 h-5 text-white" />
              </div>
            )}
            <div className="min-w-0 flex-1 pt-0.5">
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-sm font-bold text-white leading-snug">{title}</h2>
                {badge && (
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wide ${badge.cls || 'bg-white/20 text-white'}`}>
                    {badge.label}
                  </span>
                )}
              </div>
              {subtitle && <p className="text-xs text-white/60 mt-0.5 truncate">{subtitle}</p>}
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 flex-shrink-0 flex items-center justify-center rounded-xl bg-white/15 hover:bg-white/25 active:bg-white/30 transition-colors"
          >
            <X className="w-4 h-4 text-white" />
          </button>
        </div>

        {/* ── Scrollable body ── */}
        <div className="overflow-y-auto flex-1 px-5 py-4">
          {children}
        </div>

        {/* ── Sticky footer ── */}
        {footer && (
          <div className="px-5 py-3 border-t border-slate-100 bg-slate-50/60 rounded-b-2xl flex-shrink-0">
            {footer}
          </div>
        )}
      </div>
    </div>
  )
}

/** Section divider for use inside modal body */
export function ModalSection({ title, children, className = '' }) {
  return (
    <div className={`mb-4 ${className}`}>
      <div className="flex items-center gap-2 mb-2">
        <span className="text-[9px] font-black uppercase tracking-[0.12em] text-slate-400">{title}</span>
        <div className="flex-1 h-px bg-slate-100" />
      </div>
      <div className="bg-slate-50 rounded-xl overflow-hidden border border-slate-100">
        {children}
      </div>
    </div>
  )
}

/** Single field row inside a ModalSection */
export function FieldRow({ label, value, valueClass = '', last = false }) {
  return (
    <div className={`flex items-start justify-between gap-4 px-3 py-2.5 ${last ? '' : 'border-b border-slate-100'}`}>
      <span className="text-[11px] text-slate-400 font-medium flex-shrink-0 pt-0.5 min-w-[90px]">{label}</span>
      <span className={`text-[12px] font-semibold text-right leading-snug ${valueClass || 'text-slate-800'}`}>{value || '—'}</span>
    </div>
  )
}
