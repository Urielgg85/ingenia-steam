import React from "react";
import { Link } from "react-router-dom";

export default function Preview(){
  const draft = localStorage.getItem('activity-draft')
  const act = draft ? JSON.parse(draft) : null
  if(!act) return (
    <main className="max-w-2xl mx-auto p-6">
      <p>No hay actividad guardada.</p>
      <Link className="btn" to="/create">Volver al editor</Link>
    </main>
  )

  return (
    <main className="max-w-3xl mx-auto p-6 space-y-6">
      <header className="flex items-center justify-between">
        <h1 className="title">Previsualización</h1>
        <Link className="btn-outline" to="/play">Abrir en Player</Link>
      </header>

      <div className="card space-y-2">
        <h2 className="font-semibold">{act.title}</h2>
        <p className="text-slate-600">{act.objective}</p>
        <div>
          <p className="label">Materiales</p>
          <ul className="list-disc ml-6">
            {(act.materials||[]).map((m,i)=>(<li key={i}>{m}</li>))}
          </ul>
        </div>

        {Array.isArray(act.materialsMedia) && act.materialsMedia.length>0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {act.materialsMedia.map((m,i)=>(<Media key={i} item={m}/>))}
          </div>
        )}
      </div>

      <div className="space-y-4">
        {(act.sections||[]).map((s, idx)=>(
          <div key={idx} className="card space-y-2">
            <h3 className="font-semibold">{s.name}</h3>
            {s.text && <p className="text-slate-600 whitespace-pre-wrap">{s.text}</p>}
            {s.media?.length>0 && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {s.media.map((m,i)=>(<Media key={i} item={m}/>))}
              </div>
            )}
          </div>
        ))}
      </div>
    </main>
  )
}

function Media({ item }) {
  const m = typeof item === "string"
    ? { url: item, kind: item.endsWith(".mp4") ? "video" : "image" }
    : item;
  const url = m?.url || "";
  if (m?.kind === "link") {
    return <a className="text-blue-600 underline break-all" href={url} target="_blank" rel="noreferrer">{url}</a>;
  }
  const isVideo = m?.kind === "video" || url.includes("youtube") || url.includes("vimeo") || url.endsWith(".mp4") || url.endsWith(".webm");
  return isVideo ? (
    <video src={url} controls className="w-full rounded-xl bg-black" />
  ) : (
    <img src={url} alt="" className="w-full rounded-xl border" />
  );
}
