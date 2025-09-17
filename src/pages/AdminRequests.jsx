// src/pages/AdminRequests.jsx
import React, { useEffect, useMemo, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useSession } from '../lib/session'
import { isPlatformAdmin } from '../lib/perm'

export default function AdminRequests(){
  const { profile, loading: sessLoading } = useSession()
  const isPA = isPlatformAdmin(profile)
  const myOrgId = profile?.org_id || null

  const [tab, setTab] = useState('pending') // 'pending' | 'approved' | 'rejected'
  const [reqs, setReqs] = useState([])
  const [orgs, setOrgs] = useState([])
  const [loading, setLoading] = useState(true)
  const [busyId, setBusyId] = useState(null)
  const [err, setErr] = useState('')

  // Cargar organizaciones (PA: todas; org_admin: solo la suya)
  useEffect(() => {
    if (sessLoading) return
    ;(async () => {
      try {
        setErr('')
        if (isPA) {
          const { data } = await supabase.from('organizations').select('id,name').order('name')
          setOrgs(data || [])
        } else if (myOrgId) {
          const { data } = await supabase.from('organizations').select('id,name').eq('id', myOrgId)
          setOrgs(data || [])
        } else {
          setOrgs([])
        }
      } catch (e) {
        console.error('organizations select error:', e)
        setErr('No se pudo cargar el catálogo de escuelas.')
        setOrgs([])
      }
    })()
  }, [sessLoading, isPA, myOrgId])

  // Cargar solicitudes (espera a que el perfil esté listo)
  useEffect(() => {
    if (sessLoading) return
    refresh()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessLoading])

  async function refresh(){
    setLoading(true)
    setErr('')
    // timeout de seguridad: cierre el loader aunque la red quede colgada
    const killer = setTimeout(() => setLoading(false), 10000)
    try {
      const { data, error } = await supabase
        .from('signup_requests')
        .select('id,email,requested_role,org_id,org_name,notes,status,created_at')
        .order('created_at',{ ascending:false })
      if (error) throw error
      setReqs(data || [])
    } catch (e) {
      console.error('signup_requests select error:', e)
      setErr(e?.message || 'No se pudieron cargar las solicitudes.')
      setReqs([])
    } finally {
      clearTimeout(killer)
      setLoading(false)
    }
  }

  const list = useMemo(() => reqs.filter(r => r.status === tab), [reqs, tab])

  async function createOrgByName(name){
    const { data, error } = await supabase.from('organizations').insert({ name }).select('*').single()
    if (error) throw error
    return data.id
  }

  async function approve(req, chosenOrgId){
    try{
      setBusyId(req.id)
      let orgId = null
      if (isPA) {
        orgId = chosenOrgId || req.org_id || null
        if (!orgId && req.org_name) orgId = await createOrgByName(req.org_name)
      } else {
        orgId = myOrgId // org_admin solo su escuela
      }
      if (!orgId) {
        alert(isPA ? 'Selecciona/crea una escuela.' : 'Tu perfil no tiene escuela asignada.')
        return
      }

      await supabase.rpc('approve_profile_by_email', {
        p_email: req.email,
        p_role: req.requested_role,
        p_org: orgId
      })

      await supabase.from('signup_requests').update({ status:'approved' }).eq('id', req.id)
      setReqs(prev => prev.map(x => x.id === req.id ? { ...x, status:'approved', org_id: orgId } : x))
    } catch(e){
      console.error(e)
      alert('Error al aprobar: ' + (e.message || e))
    } finally {
      setBusyId(null)
    }
  }

  async function reject(req){
    try{
      setBusyId(req.id)
      await supabase.from('signup_requests').update({ status:'rejected' }).eq('id', req.id)
      setReqs(prev => prev.map(x => x.id === req.id ? { ...x, status:'rejected' } : x))
    } catch(e){
      console.error(e)
      alert('Error al rechazar: ' + (e.message || e))
    } finally {
      setBusyId(null)
    }
  }

  async function remove(req){
    try{
      setBusyId(req.id)
      await supabase.rpc('delete_signup_request', { p_id: req.id })
      setReqs(prev => prev.filter(x => x.id !== req.id))
    } catch(e){
      console.error(e)
      alert('No se pudo eliminar: ' + (e.message || e))
    } finally {
      setBusyId(null)
    }
  }

  return (
    <main className="max-w-5xl mx-auto p-6 space-y-6">
      <header className="flex items-center justify-between">
        <h1 className="title">Solicitudes de acceso</h1>
        <div className="flex gap-2">
          <button className={`chip ${tab==='pending' ? 'active' : ''}`} onClick={()=>setTab('pending')}>Pendientes</button>
          <button className={`chip ${tab==='approved' ? 'active' : ''}`} onClick={()=>setTab('approved')}>Aprobadas</button>
          <button className={`chip ${tab==='rejected' ? 'active' : ''}`} onClick={()=>setTab('rejected')}>Rechazadas</button>
        </div>
      </header>

      {err && (
        <div className="card">
          {err}
          <div className="mt-2">
            <button className="btn-outline" onClick={refresh}>Reintentar</button>
          </div>
        </div>
      )}

      {loading ? (
        <div className="card">Cargando…</div>
      ) : list.length === 0 ? (
        <div className="card">No hay solicitudes {tab}.</div>
      ) : (
        <section className="space-y-4">
          {list.map(req => (
            <RequestCard
              key={req.id}
              req={req}
              orgs={orgs}
              isPA={isPA}
              myOrgId={myOrgId}
              busy={busyId === req.id}
              onApprove={approve}
              onReject={reject}
              onRemove={remove}
            />
          ))}
        </section>
      )}
    </main>
  )
}

function RequestCard({ req, orgs, isPA, myOrgId, busy, onApprove, onReject, onRemove }){
  const [selectedOrg, setSelectedOrg] = useState(
    isPA ? (req.org_id || '') : (myOrgId || '')
  )
  const disabled = !isPA

  return (
    <div className="card">
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-1">
          <div className="font-semibold">{req.email}</div>
          <div className="text-sm text-slate-600">Rol solicitado: <b>{labelRole(req.requested_role)}</b></div>
          <div className="text-sm text-slate-600">
            Escuela:&nbsp;
            {req.org_id
              ? <b>{orgs.find(o => o.id === req.org_id)?.name || 'ID seleccionado'}</b>
              : req.org_name
                ? <b>“{req.org_name}”</b>
                : <span className="text-slate-500">No especificada</span>}
          </div>
          <div className="text-sm text-slate-500">Creado: {new Date(req.created_at).toLocaleString()}</div>
          {req.notes && <div className="text-sm text-slate-600">Notas: {req.notes}</div>}
        </div>

        {req.status === 'pending' ? (
          <div className="space-y-2" style={{ minWidth: 280 }}>
            <label className="label">Selecciona escuela</label>
            <select
              className="input"
              value={selectedOrg}
              disabled={disabled}
              onChange={e => setSelectedOrg(e.target.value)}
            >
              {isPA ? <option value="">— Elegir escuela —</option> : null}
              {(isPA ? orgs : orgs.filter(o => o.id === myOrgId)).map(o =>
                <option key={o.id} value={o.id}>{o.name}</option>
              )}
            </select>

            <div className="flex flex-wrap gap-2">
              <button className="btn" disabled={busy} onClick={()=>onApprove(req, selectedOrg)}>Aprobar</button>
              <button className="btn-outline" disabled={busy} onClick={()=>onReject(req)}>Rechazar</button>
              <button className="btn-outline" disabled={busy} onClick={()=>onRemove(req)}>Eliminar</button>
            </div>

            {isPA && !selectedOrg && req.org_name && (
              <button className="btn-outline" disabled={busy} onClick={()=>onApprove(req, '')}>
                Crear “{req.org_name}” y aprobar
              </button>
            )}
            {!isPA && (
              <p className="text-xs text-slate-500">
                Como admin de escuela, solo puedes aprobar solicitudes de tu institución.
              </p>
            )}
          </div>
        ) : (
          <div className="flex items-center gap-2">
            <div className="chip">{req.status === 'approved' ? '✅ Aprobada' : '❌ Rechazada'}</div>
            <button className="btn-outline" disabled={busy} onClick={()=>onRemove(req)}>Eliminar</button>
          </div>
        )}
      </div>
    </div>
  )
}

function labelRole(r){
  if (r === 'org_admin') return 'Admin escuela'
  if (r === 'teacher')   return 'Maestro'
  if (r === 'student')   return 'Alumno'
  return r
}
