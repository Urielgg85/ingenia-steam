import React, { useState } from "react";
import { useNavigate } from "react-router-dom";

export default function Importer(){
  const nav = useNavigate()
  const [err, setErr] = useState(null)

  const onFile = e => {
    const f = e.target.files?.[0]
    if(!f) return
    const rd = new FileReader()
    rd.onload = () => {
      try {
        const json = JSON.parse(rd.result)
        localStorage.setItem('activity-draft', JSON.stringify(json))
        nav('/preview')
      } catch (e) {
        setErr('JSON inválido: '+ (e.message||e))
      }
    }
    rd.readAsText(f)
  }

  return (
    <main className="max-w-2xl mx-auto p-6 space-y-4">
      <h1 className="title">Importar JSON</h1>
      <div className="card space-y-2">
        <input type="file" accept="application/json" onChange={onFile} />
        {err && <div className="text-slate-500">{err}</div>}
      </div>
    </main>
  )
}
