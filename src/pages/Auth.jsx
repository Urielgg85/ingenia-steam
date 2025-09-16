import React, { useState } from 'react'
import { supabase } from '../lib/supabase'
import { useSession } from '../lib/session'

export default function Auth(){
  const { session, profile } = useSession()
  const [email, setEmail] = useState('')
  const [message, setMessage] = useState('')

  const signIn = async ()=>{
    setMessage('Enviando magic link...')
    const { error } = await supabase.auth.signInWithOtp({ email })
    setMessage(error ? 'Error: '+error.message : 'Revisa tu correo para iniciar sesión.')
  }
  const signOut = async ()=>{ await supabase.auth.signOut() }

  return (
    <main className="max-w-2xl mx-auto p-6 space-y-4">
      <h1 className="title">Acceso</h1>
      {session ? (
        <div className="card space-y-2">
          <div>Sesión iniciada como <b>{profile?.display_name || session.user.email}</b></div>
          <div className="text-sm text-slate-500">Rol: {profile?.role || '—'} · Org: {profile?.org_id || '—'}</div>
          <button className="btn" onClick={signOut}>Cerrar sesión</button>
        </div>
      ) : (
        <div className="card space-y-3">
          <label className="label">Correo</label>
          <input className="input" value={email} onChange={e=>setEmail(e.target.value)} placeholder="tucorreo@escuela.edu" />
          <button className="btn" onClick={signIn}>Entrar con magic link</button>
          {message && <p className="text-sm text-slate-500">{message}</p>}
        </div>
      )}
    </main>
  )
}
