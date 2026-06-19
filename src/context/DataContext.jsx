import React, { createContext, useContext, useState, useCallback } from 'react'
import { getAllQuarters, getAllEmployees, getAllAllotments, getAllKeys, getAllRent, getAllOrders, getAuditLog } from '../lib/googleSheets'
import { useAuth } from './AuthContext'

const DataContext = createContext(null)

export function DataProvider({ children }) {
  const { user } = useAuth()
  const [quarters,    setQuarters]    = useState([])
  const [employees,   setEmployees]   = useState([])
  const [allotments,  setAllotments]  = useState([])
  const [keys,        setKeys]        = useState([])
  const [rent,        setRent]        = useState([])
  const [orders,      setOrders]      = useState([])
  const [auditLog,    setAuditLog]    = useState([])
  const [loadingData, setLoadingData] = useState(false)
  const [lastFetched, setLastFetched] = useState(null)
  const [error,       setError]       = useState(null)

  const fetchAll = useCallback(async () => {
    if (!user) return
    setLoadingData(true); setError(null)
    try {
      const results = await Promise.allSettled([
        getAllQuarters(), getAllEmployees(), getAllAllotments(),
        getAllKeys(), getAllRent(), getAllOrders(), getAuditLog()
      ])
      const [q, e, a, k, r, o, al] = results.map(r => r.status === 'fulfilled' ? r.value : [])
      setQuarters(q); setEmployees(e); setAllotments(a)
      setKeys(k); setRent(r); setOrders(o); setAuditLog(al)
      setLastFetched(new Date())
      const failed = results.filter(r => r.status === 'rejected')
      if (failed.length) console.warn('Some sheets failed to load:', failed.map(f => f.reason?.message))
    } catch (err) { setError(err.message) }
    finally { setLoadingData(false) }
  }, [user])

  const refreshQuarters   = useCallback(async () => { setQuarters(await getAllQuarters())   }, [])
  const refreshEmployees  = useCallback(async () => { setEmployees(await getAllEmployees())  }, [])
  const refreshAllotments = useCallback(async () => { setAllotments(await getAllAllotments())}, [])
  const refreshKeys       = useCallback(async () => { setKeys(await getAllKeys())            }, [])
  const refreshRent       = useCallback(async () => { setRent(await getAllRent())            }, [])
  const refreshOrders     = useCallback(async () => { setOrders(await getAllOrders())        }, [])

  const activeAllotments = allotments.filter(a => a.Status === 'Active')

  const stats = {
    total:    quarters.length,
    occupied: quarters.filter(q => q.Status === 'Occupied').length,
    vacant:   quarters.filter(q => q.Status === 'Vacant').length,
    repair:   quarters.filter(q => q.Status === 'Under Repair').length,
    reserved: quarters.filter(q => q.Status === 'Reserved').length,
    byType:     groupBy(quarters, 'Type'),
    byLocation: groupBy(quarters, 'Location'),
  }

  return (
    <DataContext.Provider value={{
      quarters, employees, allotments, keys, rent, orders, auditLog,
      activeAllotments, stats, loadingData, lastFetched, error,
      fetchAll,
      refreshQuarters, refreshEmployees, refreshAllotments,
      refreshKeys, refreshRent, refreshOrders,
    }}>
      {children}
    </DataContext.Provider>
  )
}

export function useData() { return useContext(DataContext) }

function groupBy(arr, key) {
  return arr.reduce((acc, item) => {
    const val = item[key] || 'Unknown'
    acc[val] = (acc[val] || 0) + 1
    return acc
  }, {})
}
