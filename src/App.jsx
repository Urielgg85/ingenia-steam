import React, { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import seeds from './data/seeds/index.js'
import { useSession } from './lib/session.jsx'
import { fetchPublicActivities, fetchOrgActivities, fetchMarketplace } from './lib/db'
import { canCreate, isAdmin } from './lib/perm.js'

export default function App(){
  const { session, profile } = useSession()

  const [pub, setPub] = useState([])
  const [org, setOrg] = useState([])
  const [market, setMarket] = useState([])

  // 🔒 Guards anti-bucle
  const lastSessionIdRef = useRef(null)   // evita re-ejecutar si la sesión no cambió realmente
  const loadingRef = useRef(false)        // evita solapes si el efecto se vuelve a disparar rápido
  const aliveRef = useRef(true)           // cleanup para no setState en desmontaje

  useEffect(() => {
    return () => { aliveRef.current = false }
  }, [])

  useEffect(() => {
    // Normalizamos el "id" de sesión para comparar (anon vs userId)
    const curSessionId = session?.user?.id || 'anon'

    // Si la sesión efectiva no cambió, no disparamos otra tanda de requests
    if (lastSessionIdRef.current === curSessionId) return
    lastSessionIdRef.current = curSessionId

    // Si ya hay una tanda en vuelo, no iniciar otra
    if (loadingRef.current) return
    loadingRef.current = true

    ;(async () => {
      try {
        // públicas + marketplace en paralelo
        const [pubData, marketData] = await Promise.all([
          fetchPublicActivities().catch(() => []),
          fetchMarketplace().catch(() => []),
        ])
        if (!aliveRef.current) return
        setPub(pubData || [])
        setMarket(marketData || [])

        // de la org solo si hay sesión
        if (session) {
          const orgData = await fetchOrgActivities().catch(() => [])
          if (!aliveRef.current) return
          setOrg(orgData || [])
        } else {
          setOrg([])
        }
      } finally {
        loadingRef.current = false
      }
    })()
  }, [session])

  // Flags UI
  const showPub = pub.length > 0
  const showOrg = !!session && org.length > 0
  const showMarket = market.length > 0
  const allowCreate = canCreate(session, profile)
  const adminLink = isAdmin(profile)

  return (
    <main className="max-w-5xl mx-auto p-6 space-y-10">
      <header className="flex items-center justify-between">
        <h1 className="title">Ingenia — Creador de Actividades STEAM</h1>
        <nav className="flex gap-2">
          {adminLink && <Link className="btn-outline" to="/admin/solicitudes">Admin</Link>}
          {allowCreate && <Link className="btn-outline" to="/create">Crear actividad</Link>}
          {allowCreate && <Link className="btn-outline" to="/import">Importar JSON</Link>}
          <Link className="btn" to="/auth">{session ? 'Mi cuenta' : 'Entrar'}</Link>
        </nav>
      </header>

      {session && (
        <div className="card flex items-center justify-between">
          <div>
            <div className="font-semibold">Hola, {profile?.display_name || session.user.email}</div>
            <div className="text-sm text-slate-500">
              Rol: {profile?.role || '—'} · Org: {profile?.org_id || '—'}
            </div>
          </div>
          {allowCreate && <Link className="btn-outline" to="/create">Nueva actividad</Link>}
        </div>
      )}

      {showPub && (
        <section className="card">
          <h2 className="text-xl font-semibold mb-2">Prácticas públicas</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {pub.map((a)=> (
              <article key={a.id} className="border rounded-xl p-5">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <h3 className="font-semibold mb-1">{a.title}</h3>
                    <p className="text-sm text-slate-600">{a.objective}</p>
                  </div>
                  <Link className="btn" to={`/play?supabaseId=${a.id}`}>Abrir</Link>
                </div>
              </article>
            ))}
          </div>
        </section>
      )}

      {showOrg && (
        <section className="card">
          <h2 className="text-xl font-semibold mb-2">De mi escuela</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {org.map((a)=> (
              <article key={a.id} className="border rounded-xl p-5">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <h3 className="font-semibold mb-1">{a.title}</h3>
                    <p className="text-sm text-slate-600">{a.objective}</p>
                  </div>
                  <Link className="btn" to={`/play?supabaseId=${a.id}`}>Abrir</Link>
                </div>
              </article>
            ))}
          </div>
        </section>
      )}

      {showMarket && (
        <section className="card">
          <h2 className="text-xl font-semibold mb-2">Marketplace</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {market.map(a => (
              <article key={a.id} className="border rounded-xl p-5">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <h3 className="font-semibold mb-1">{a.title}</h3>
                    <p className="text-sm text-slate-600">Desde ${a.price_mxn} MXN</p>
                  </div>
                  <Link className="btn" to={`/play?supabaseId=${a.id}`}>Ver</Link>
                </div>
              </article>
            ))}
          </div>
        </section>
      )}

      {seeds.length > 0 && (
        <section className="card">
          <h2 className="text-xl font-semibold mb-2">Semillas locales (demo)</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {seeds.map((s)=> (
              <article key={s.id} className="border rounded-xl p-5">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <h3 className="font-semibold mb-1">{s.title}</h3>
                    <p className="text-sm text-slate-600">{s.objective}</p>
                  </div>
                  <Link className="btn" to={`/play?seed=${s.id}`}>Abrir</Link>
                </div>
              </article>
            ))}
          </div>
        </section>
      )}
    </main>
  )
}
