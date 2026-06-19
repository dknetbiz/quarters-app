import React, { useState, useMemo } from 'react'
import { Plus, Search, Users, Pencil, UserCheck, UserX, ChevronsUpDown, ChevronUp, ChevronDown } from 'lucide-react'
import { useData } from '../context/DataContext'
import { useAuth } from '../context/AuthContext'
import { addEmployee, updateEmployee } from '../lib/googleSheets'
import { CATEGORIES, DEPARTMENTS, EMPLOYEE_LEVELS, getEntitledGroup } from '../lib/constants'
import Modal from '../components/Modal'
import SidebarPage from '../components/SidebarPage'
import { FilterSection, FilterChips, FilterSelect, ClearFilters, ResultCount } from '../components/Filters'
import Pagination, { paginate, PER_PAGE } from '../components/Pagination'

export default function EmployeesPage() {
  const { employees, allotments, refreshEmployees } = useData()
  const { auditUser } = useAuth()

  const [search,       setSearch]       = useState('')
  const [filterDept,   setFilterDept]   = useState('')
  const [filterCat,    setFilterCat]    = useState('')
  const [filterGrade,  setFilterGrade]  = useState('')
  const [filterActive, setFilterActive] = useState('Active')
  const [showAdd,      setShowAdd]      = useState(false)
  const [selected,     setSelected]     = useState(null)
  const [saving,       setSaving]       = useState(false)
  const [sortKey,      setSortKey]      = useState('Name')
  const [sortDir,      setSortDir]      = useState('asc')
  const [page,         setPage]         = useState(1)

  const emptyForm = { name:'', designation:'', department:'NJHPS', category:'General', grade_level:'', seniority_date:'', active:'TRUE' }
  const [form, setForm] = useState(emptyForm)

  function toggleSort(key) {
    if (sortKey === key) setSortDir(d => d === 'asc' ? 'desc' : 'asc')
    else { setSortKey(key); setSortDir('asc') }
    setPage(1)
  }

  const activeAllotmentMap = useMemo(() => {
    const map = {}
    allotments.filter(a => a.Status === 'Active').forEach(a => {
      map[a.Emp_ID] = (map[a.Emp_ID] || 0) + 1
    })
    return map
  }, [allotments])

  const allotmentCountMap = useMemo(() => {
    const map = {}
    allotments.forEach(a => { map[a.Emp_ID] = (map[a.Emp_ID] || 0) + 1 })
    return map
  }, [allotments])

  const filtered = useMemo(() => employees.filter(e => {
    const s = search.toLowerCase()
    if (s && !(
      e.Name?.toLowerCase().includes(s) ||
      e.Designation?.toLowerCase().includes(s) ||
      e.Emp_ID?.toLowerCase().includes(s) ||
      e.Department?.toLowerCase().includes(s)
    )) return false
    if (filterDept   && e.Department  !== filterDept)   return false
    if (filterCat    && e.Category    !== filterCat)    return false
    if (filterGrade  && e.Grade_Level !== filterGrade)  return false
    if (filterActive === 'Active'   && e.Active !== 'TRUE') return false
    if (filterActive === 'Inactive' && e.Active === 'TRUE') return false
    return true
  }), [employees, search, filterDept, filterCat, filterGrade, filterActive])

  const sorted = useMemo(() => [...filtered].sort((a, b) => {
    const va = a[sortKey] || ''
    const vb = b[sortKey] || ''
    return (sortDir === 'asc' ? 1 : -1) * va.localeCompare(vb, undefined, { numeric: true })
  }), [filtered, sortKey, sortDir])

  const pageData = useMemo(() => paginate(sorted, page), [sorted, page])

  const activeCount   = employees.filter(e => e.Active === 'TRUE').length
  const inactiveCount = employees.filter(e => e.Active !== 'TRUE').length
  const activeFilters = [filterDept, filterCat, filterGrade].filter(Boolean).length + (filterActive ? 1 : 0)

  function clearFilters() { setFilterDept(''); setFilterCat(''); setFilterGrade(''); setFilterActive('Active'); setPage(1) }

  const f = k => e => setForm(p => ({ ...p, [k]: e.target.value }))

  async function handleSaveNew() {
    if (!form.name || !form.designation) return
    setSaving(true)
    try {
      await addEmployee(form, auditUser)
      await refreshEmployees()
      setShowAdd(false); setForm(emptyForm)
    } catch(e) { alert('Error: ' + e.message) } finally { setSaving(false) }
  }

  async function handleUpdate() {
    if (!selected) return
    setSaving(true)
    try {
      const updated = {
        ...selected,
        Name:           form.name,
        Designation:    form.designation,
        Department:     form.department,
        Category:       form.category,
        Grade_Level:    form.grade_level,
        Seniority_Date: form.seniority_date,
        Active:         form.active,
      }
      await updateEmployee(selected._rowIndex, updated, selected, auditUser)
      await refreshEmployees()
      setSelected(null)
    } catch(e) { alert('Error: ' + e.message) } finally { setSaving(false) }
  }

  async function handleToggleActive(emp) {
    const next = emp.Active === 'TRUE' ? 'FALSE' : 'TRUE'
    try {
      await updateEmployee(emp._rowIndex, { ...emp, Active: next }, emp, auditUser)
      await refreshEmployees()
    } catch(e) { alert('Error: ' + e.message) }
  }

  function openEdit(emp) {
    setSelected(emp)
    setForm({
      name:           emp.Name,
      designation:    emp.Designation,
      department:     emp.Department || 'NJHPS',
      category:       emp.Category   || 'General',
      grade_level:    emp.Grade_Level    || '',
      seniority_date: emp.Seniority_Date || '',
      active:         emp.Active,
    })
  }

  const sidebar = (
    <>
      <FilterSection title="Status">
        <FilterChips
          options={[`Active (${activeCount})`, `Inactive (${inactiveCount})`]}
          value={filterActive === 'Active' ? `Active (${activeCount})` : filterActive === 'Inactive' ? `Inactive (${inactiveCount})` : ''}
          onChange={v => { setFilterActive(v.startsWith('Active') ? 'Active' : 'Inactive'); setPage(1) }}
          allLabel="All"
        />
      </FilterSection>
      <FilterSection title="Department">
        <FilterSelect value={filterDept} onChange={v => { setFilterDept(v); setPage(1) }} options={DEPARTMENTS} placeholder="All Departments" />
      </FilterSection>
      <FilterSection title="Category">
        <FilterChips options={CATEGORIES} value={filterCat} onChange={v => { setFilterCat(v); setPage(1) }} allLabel="All" />
      </FilterSection>
      <FilterSection title="Grade Level">
        <FilterSelect value={filterGrade} onChange={v => { setFilterGrade(v); setPage(1) }} options={EMPLOYEE_LEVELS} placeholder="All Grades" />
      </FilterSection>
      <ClearFilters onClick={clearFilters} count={activeFilters} />
    </>
  )

  const toolbar = (
    <div className="flex gap-2">
      <div className="flex-1 relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
        <input className="input pl-9" placeholder="Search name, designation, dept…" value={search}
          onChange={e => { setSearch(e.target.value); setPage(1) }} />
      </div>
      <button onClick={() => setShowAdd(true)} className="btn-primary flex items-center gap-1.5 whitespace-nowrap">
        <Plus className="w-4 h-4" /> Add Employee
      </button>
    </div>
  )

  return (
    <SidebarPage sidebar={sidebar} filterCount={activeFilters} toolbar={toolbar}>

      <ResultCount count={sorted.length} total={employees.length} label="employee" />

      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm min-w-[720px]">
            <thead>
              <tr className="bg-slate-800 text-white">
                <th className="px-3 py-3 text-left text-[11px] font-bold uppercase tracking-wide w-8">#</th>
                <SortTh label="Name"        field="Name"        sortKey={sortKey} sortDir={sortDir} onSort={toggleSort} />
                <SortTh label="Designation" field="Designation" sortKey={sortKey} sortDir={sortDir} onSort={toggleSort} />
                <SortTh label="Department"  field="Department"  sortKey={sortKey} sortDir={sortDir} onSort={toggleSort} />
                <SortTh label="Grade"       field="Grade_Level" sortKey={sortKey} sortDir={sortDir} onSort={toggleSort} />
                <th className="px-3 py-3 text-left text-[11px] font-bold uppercase tracking-wide">Entitlement</th>
                <SortTh label="Seniority"   field="Seniority_Date" sortKey={sortKey} sortDir={sortDir} onSort={toggleSort} />
                <th className="px-3 py-3 text-center text-[11px] font-bold uppercase tracking-wide">Quarter</th>
                <th className="px-3 py-3 text-center text-[11px] font-bold uppercase tracking-wide">Status</th>
                <th className="px-3 py-3 text-center text-[11px] font-bold uppercase tracking-wide">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {pageData.map((emp, i) => {
                const entitled   = getEntitledGroup(emp.Grade_Level)
                const hasQuarter = !!activeAllotmentMap[emp.Emp_ID]
                const totalAlts  = allotmentCountMap[emp.Emp_ID] || 0
                const rowNum     = (page - 1) * PER_PAGE + i + 1
                return (
                  <tr key={emp.Emp_ID}
                    className={`hover:bg-brand-50/40 transition-colors ${i % 2 === 1 ? 'bg-slate-50/60' : ''} ${emp.Active !== 'TRUE' ? 'opacity-50' : ''}`}>
                    <td className="px-3 py-2.5 text-xs text-slate-400 font-medium">{rowNum}</td>
                    <td className="px-3 py-2.5">
                      <p className="font-semibold text-slate-800 whitespace-nowrap">{emp.Name}</p>
                      <p className="text-[11px] text-slate-400 font-mono">{emp.Emp_ID}</p>
                    </td>
                    <td className="px-3 py-2.5 text-xs text-slate-600 whitespace-nowrap">{emp.Designation || '—'}</td>
                    <td className="px-3 py-2.5 text-xs text-slate-600 whitespace-nowrap">{emp.Department || '—'}</td>
                    <td className="px-3 py-2.5 text-center">
                      {emp.Grade_Level
                        ? <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-brand-100 text-brand-700 text-[11px] font-bold">{emp.Grade_Level}</span>
                        : <span className="text-slate-300 text-xs">—</span>}
                    </td>
                    <td className="px-3 py-2.5 text-xs text-slate-500 whitespace-nowrap">
                      {entitled ? `Type ${entitled}` : <span className="text-slate-300">—</span>}
                    </td>
                    <td className="px-3 py-2.5 text-xs text-slate-500 whitespace-nowrap">
                      {emp.Seniority_Date || <span className="text-slate-300">—</span>}
                    </td>
                    <td className="px-3 py-2.5 text-center">
                      {hasQuarter
                        ? <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 text-[11px] font-semibold">Allotted</span>
                        : totalAlts > 0
                          ? <span className="text-[11px] text-slate-400">{totalAlts} hist.</span>
                          : <span className="text-slate-300 text-xs">—</span>}
                    </td>
                    <td className="px-3 py-2.5 text-center">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold
                        ${emp.Active === 'TRUE' ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-500'}`}>
                        {emp.Active === 'TRUE' ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="px-3 py-2.5">
                      <div className="flex items-center justify-center gap-1.5">
                        <ActionBtn icon={Pencil} color="blue" title="Edit" onClick={() => openEdit(emp)} />
                        <ActionBtn
                          icon={emp.Active === 'TRUE' ? UserX : UserCheck}
                          color={emp.Active === 'TRUE' ? 'red' : 'green'}
                          title={emp.Active === 'TRUE' ? 'Deactivate' : 'Activate'}
                          onClick={() => handleToggleActive(emp)}
                        />
                      </div>
                    </td>
                  </tr>
                )
              })}
              {sorted.length === 0 && (
                <tr><td colSpan={10} className="px-4 py-14 text-center text-slate-400">
                  <Users className="w-8 h-8 mx-auto mb-2 opacity-30" />
                  <p className="text-sm">No employees match the current filters</p>
                </td></tr>
              )}
            </tbody>
          </table>
        </div>
        <Pagination page={page} total={sorted.length} onChange={p => { setPage(p); window.scrollTo(0,0) }} />
      </div>

      {/* ── Add Modal ── */}
      <Modal open={showAdd} onClose={() => { setShowAdd(false); setForm(emptyForm) }}
        title="Add Employee" icon={Users} variant="success" size="md"
        footer={
          <div className="flex gap-2">
            <button className="btn-secondary flex-1" onClick={() => { setShowAdd(false); setForm(emptyForm) }}>Cancel</button>
            <button className="btn-primary flex-1" onClick={handleSaveNew} disabled={saving}>{saving ? 'Saving…' : 'Add Employee'}</button>
          </div>
        }
      >
        <EmployeeForm form={form} setForm={setForm} />
      </Modal>

      {/* ── Edit Modal ── */}
      <Modal open={!!selected} onClose={() => setSelected(null)}
        title={`Edit: ${selected?.Name || ''}`} icon={Pencil} variant="info" size="md"
        subtitle={selected ? `ID: ${selected.Emp_ID}` : undefined}
        footer={selected
          ? <div className="flex gap-2">
              <button className="btn-secondary flex-1" onClick={() => setSelected(null)}>Cancel</button>
              <button className="btn-primary flex-1" onClick={handleUpdate} disabled={saving}>{saving ? 'Saving…' : 'Update'}</button>
            </div>
          : null}
      >
        {selected && (
          <>
            <EmployeeForm form={form} setForm={setForm} />
            <div className="mt-3 pt-3 border-t border-slate-100">
              <label className="label">Status</label>
              <div className="flex gap-2">
                {[['TRUE','Active','bg-emerald-600'], ['FALSE','Inactive','bg-slate-500']].map(([v, label, cls]) => (
                  <button key={v} onClick={() => setForm(p => ({ ...p, active: v }))}
                    className={`flex-1 py-2 rounded-xl border text-xs font-semibold transition-colors
                      ${form.active === v ? cls + ' text-white border-transparent' : 'bg-white text-slate-600 border-slate-200'}`}>
                    {label}
                  </button>
                ))}
              </div>
            </div>
          </>
        )}
      </Modal>

    </SidebarPage>
  )
}

/* ── Sub-components ── */

function EmployeeForm({ form, setForm }) {
  const f = k => e => setForm(p => ({ ...p, [k]: e.target.value }))
  const entitled = getEntitledGroup(form.grade_level)
  return (
    <div className="space-y-3">
      <div>
        <label className="label">Full Name *</label>
        <input className="input" value={form.name} onChange={f('name')} placeholder="e.g. Ram Kumar" />
      </div>
      <div>
        <label className="label">Designation *</label>
        <input className="input" value={form.designation} onChange={f('designation')} placeholder="e.g. AE-I, JE, Technician" />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="label">Department</label>
          <select className="input" value={form.department} onChange={f('department')}>
            {DEPARTMENTS.map(d => <option key={d}>{d}</option>)}
          </select>
        </div>
        <div>
          <label className="label">Category</label>
          <select className="input" value={form.category} onChange={f('category')}>
            {CATEGORIES.map(c => <option key={c}>{c}</option>)}
          </select>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="label">Grade Level</label>
          <select className="input" value={form.grade_level} onChange={f('grade_level')}>
            <option value="">Select grade</option>
            {EMPLOYEE_LEVELS.map(l => <option key={l}>{l}</option>)}
          </select>
          {entitled && (
            <p className="text-[11px] text-brand-600 mt-1 font-medium">Entitled: Type <strong>{entitled}</strong></p>
          )}
        </div>
        <div>
          <label className="label">Seniority Date</label>
          <input className="input" type="date" value={form.seniority_date} onChange={f('seniority_date')} />
          <p className="text-[11px] text-slate-400 mt-1">Date of entry in grade</p>
        </div>
      </div>
    </div>
  )
}

function SortTh({ label, field, sortKey, sortDir, onSort }) {
  const active = sortKey === field
  const Icon = active ? (sortDir === 'asc' ? ChevronUp : ChevronDown) : ChevronsUpDown
  return (
    <th onClick={() => onSort(field)}
      className="px-3 py-3 text-left text-[11px] font-bold uppercase tracking-wide cursor-pointer select-none hover:bg-slate-700 transition-colors whitespace-nowrap">
      <span className="flex items-center gap-1">{label}<Icon className={`w-3 h-3 ${active ? 'opacity-100' : 'opacity-30'}`} /></span>
    </th>
  )
}

function ActionBtn({ icon: Icon, color, title, onClick }) {
  const colors = {
    blue:  'bg-blue-50 text-blue-600 hover:bg-blue-100',
    red:   'bg-red-50 text-red-600 hover:bg-red-100',
    green: 'bg-emerald-50 text-emerald-600 hover:bg-emerald-100',
  }
  return (
    <button onClick={onClick} title={title} className={`w-7 h-7 flex items-center justify-center rounded-lg transition-colors ${colors[color]}`}>
      <Icon className="w-3.5 h-3.5" />
    </button>
  )
}
