import React, { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import seeds from './data/seeds/index.js'
import { useSession } from './lib/session.jsx'
import { fetchPublicActivities, fetchOrgActivities, fetchMarketplace } from './lib/db'

export default function App(){
  const { session, profile } = useSession()
  const [pub, setPub] = useState([])
  const [org, setOrg] = useState([])
  const [market, setMarket] = useState([])

  useEffect(()=>{
    fetchPublicActivities().then(setPub).catch(()=>{})
    fetchMarketplace().then(setMarket).catch(()=>{})
    if(session) fetchOrgActivities().then(setOrg).catch(()=>{})
  }, [session])

  // qué secciones mostrar
  const showPub = pub.length > 0
  const showOrg = !!session && org.length > 0
  const showMarket = market.length > 0

  return (
    <main className="max-w-5xl mx-auto p-6 space-y-10">
      <header className="flex items-center justify-between">
        <h1 className="title">Ingenia — Creador de Actividades STEAM</h1>
        <nav className="flex gap-2">
          <Link className="btn-outline" to="/create">Crear actividad</Link>
          <Link className="btn-outline" to="/import">Importar JSON</Link>
          <Link className="btn" to="/auth">{session ? 'Mi cuenta' : 'Entrar'}</Link>
        </nav>
      </header>

      {session && (
        <div className="card flex items-center justify-between">
          <div>
            <div className="font-semibold">Hola, {profile?.display_name || session.user.email}</div>
            <div className="text-sm text-slate-500">Rol: {profile?.role || '—'} · Org: {profile?.org_id || '—'}</div>
          </div>
          <Link className="btn-outline" to="/create">Nueva actividad</Link>
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
