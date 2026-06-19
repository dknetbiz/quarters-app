import React, { useState } from 'react'
import { SlidersHorizontal } from 'lucide-react'
import Modal from './Modal'

/**
 * Two-column layout: sticky filter sidebar on desktop, modal on mobile.
 *
 * Props:
 *   sidebar          — JSX for the filter/sort panel
 *   filterCount      — number of active filters (shows badge on mobile button)
 *   toolbar          — optional JSX above the table (search + action buttons)
 *   children         — main content (table + pagination)
 */
export default function SidebarPage({ sidebar, filterCount = 0, toolbar, children }) {
  const [mobileOpen, setMobileOpen] = useState(false)

  return (
    <div className="flex min-h-screen">

      {/* ── Desktop Sidebar ── */}
      <aside className="hidden md:block w-56 lg:w-60 flex-shrink-0">
        <div className="sticky top-0 p-3 pr-0 max-h-screen overflow-y-auto">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="bg-slate-800 px-4 py-3 flex items-center gap-2">
              <SlidersHorizontal className="w-3.5 h-3.5 text-white/70" />
              <span className="text-[10px] font-black uppercase tracking-widest text-white/80">Filters</span>
              {filterCount > 0 && (
                <span className="ml-auto w-5 h-5 bg-brand-500 text-white text-[10px] rounded-full flex items-center justify-center font-bold">{filterCount}</span>
              )}
            </div>
            <div className="p-3 space-y-5">
              {sidebar}
            </div>
          </div>
        </div>
      </aside>

      {/* ── Main Column ── */}
      <main className="flex-1 min-w-0 p-3 md:pl-2 space-y-2.5">

        {/* Toolbar row (search + buttons) */}
        {toolbar && <div>{toolbar}</div>}

        {/* Mobile: filter button */}
        <div className="md:hidden">
          <button onClick={() => setMobileOpen(true)}
            className={`flex items-center gap-2 px-3 py-2 rounded-xl border text-sm font-semibold w-full transition-colors ${filterCount > 0 ? 'border-brand-400 bg-brand-50 text-brand-700' : 'border-slate-200 bg-white text-slate-600'}`}>
            <SlidersHorizontal className="w-4 h-4" />
            <span>Filters &amp; Sort</span>
            {filterCount > 0 && <span className="ml-auto w-5 h-5 bg-brand-600 text-white text-[10px] rounded-full flex items-center justify-center">{filterCount}</span>}
          </button>
        </div>

        {children}
      </main>

      {/* Mobile filter modal */}
      <Modal
        open={mobileOpen} onClose={() => setMobileOpen(false)}
        title="Filters" icon={SlidersHorizontal} variant="default" size="md"
        footer={<button className="btn-primary w-full" onClick={() => setMobileOpen(false)}>Apply</button>}
      >
        <div className="space-y-5">{sidebar}</div>
      </Modal>
    </div>
  )
}
