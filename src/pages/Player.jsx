import React, { useMemo, useState, useEffect } from "react";
import { useLocation, Link } from "react-router-dom";
import seeds from "../data/seeds/index.js";

const childTitles = {
  title: "Tu misión de hoy",
  objective: "¿Qué vamos a lograr?",
  materials: "Lo que necesitas",
  diseña: "Imagina tu idea",
  construye: "Manos a la obra",
  prueba: "Ponlo a prueba",
  mejora: "Hazlo aún mejor",
  comparte: "Muestra tu logro",
};

export default function Player() {
  const loc = useLocation();
  const params = new URLSearchParams(loc.search);
  const seedId = params.get("seed");
  const supabaseId = params.get("supabaseId");

  const actFromSeed = useMemo(() => {
    if (!seedId) return null;
    return seeds.find((s) => s.id === seedId) || null;
  }, [seedId]);

  const [remoteAct, setRemoteAct] = useState(null);
  useEffect(() => {
    async function fetchRemote() {
      if (!supabaseId) return;
      const { fetchActivity } = await import("../lib/db");
      const a = await fetchActivity(supabaseId);
      setRemoteAct(a);
    }
    fetchRemote();
  }, [supabaseId]);

  const finalAct = actFromSeed
    || remoteAct
    || (() => {
        const draft = localStorage.getItem("activity-draft");
        return draft ? JSON.parse(draft) : null;
      })();

  if (!finalAct) {
    return (
      <main className="max-w-2xl mx-auto p-6">
        <p className="mb-4">No hay actividad para mostrar.</p>
        <Link className="btn" to="/">Inicio</Link>
      </main>
    );
  }

  const storageKey = `activity-progress:${finalAct.id || 'local'}`;
  const [progress, setProgress] = useState(() => {
    try {
      const parsed = JSON.parse(localStorage.getItem(storageKey) || "{}");
      return { current: parsed.current || 0, done: parsed.done || {}, uploads: parsed.uploads || {} };
    } catch {
      return { current: 0, done: {}, uploads: {} };
    }
  });
  const { current = 0, done = {}, uploads = {} } = progress;
  const persist = (next) => localStorage.setItem(storageKey, JSON.stringify(next));

  const steps = useMemo(() => {
    const materialsMedia = finalAct.materialsMedia || finalAct.materials_media || [];
    const fallbackMedia = materialsMedia.length > 0 ? materialsMedia : (finalAct.sections?.[0]?.media || []);
    return [
      {
        key: "materials",
        label: "🧰 " + childTitles.materials,
        type: "materials",
        text: finalAct.objective || "",
        materials: finalAct.materials || [],
        media: fallbackMedia,
        allowUploads: true,
        uploadKinds: ["image", "video", "link"],
        maxUploads: 3,
      },
      ...(finalAct.sections || []).map((s, idx) => ({
        key: s.name || `s${idx}`,
        label: iconFor(s.name) + " " + (childTitles[s.name] || s.name),
        type: "section",
        section: s,
      })),
    ];
  }, [finalAct]);

  const go = (n) => {
    const next = Math.max(0, Math.min(steps.length - 1, n));
    const p = { ...progress, current: next };
    setProgress(p); persist(p);
  };
  const next = () => go(current + 1);
  const prev = () => go(current - 1);
  const markDone = () => {
    const key = steps[current].key;
    const p = { ...progress, done: { ...done, [key]: true } };
    setProgress(p); persist(p);
  };
  const resetProgress = () => { const p = { current: 0, done: {}, uploads: {} }; setProgress(p); persist(p); };
  const setUploadsFor = (key, list) => { const p = { ...progress, uploads: { ...uploads, [key]: list } }; setProgress(p); persist(p); };

  const percent = Math.round(((current + 1) / steps.length) * 100);
  const step = steps[current];

  return (
    <main className="max-w-3xl mx-auto p-6 space-y-6">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="title">{finalAct.title}</h1>
          <p className="text-slate-600">{finalAct.objective}</p>
        </div>
        <div className="flex gap-2">
          <Link className="btn-outline" to="/">Inicio</Link>
          <button className="btn-outline" onClick={resetProgress}>Reiniciar avance</button>
        </div>
      </header>

      <div className="card">
        <div className="w-full h-2 bg-slate-200 rounded-full mb-3">
          <div className="h-2 bg-black rounded-full" style={{ width: percent + "%" }} />
        </div>
        <div className="flex items-center gap-2" style={{flexWrap:'wrap'}}>
          {steps.map((s, i) => (
            <button key={s.key} className={`chip ${i === current ? "bg-black text-white" : ""}`} onClick={() => go(i)} title={s.label}>
              {done[s.key] ? "✅" : i + 1} {shortLabel(s.label)}
            </button>
          ))}
        </div>
      </div>

      <section className="card space-y-4">
        <h3 className="font-semibold">{step.label}</h3>

        {step.type === "materials" ? (
          <MaterialsStep
            step={step}
            uploads={uploads["materials"] || []}
            setUploads={(list) => setUploadsFor("materials", list)}
          />
        ) : (
          <SectionStep
            s={step.section}
            stepKey={step.key}
            uploads={uploads[step.key] || []}
            setUploads={(list) => setUploadsFor(step.key, list)}
          />
        )}

        <div className="flex items-center justify-between pt-2">
          <button className="btn-outline" onClick={prev} disabled={current === 0}>Anterior</button>
          <div className="flex gap-2">
            <button className="btn-outline" onClick={markDone}>Marcar paso como completado</button>
            <button className="btn" onClick={next} disabled={current === steps.length - 1}>Siguiente</button>
          </div>
        </div>
      </section>
    </main>
  );
}

function MaterialsStep({ step, uploads, setUploads }) {
  return (
    <div className="space-y-3">
      <div>
        <p className="label mb-1">Lista</p>
        <ul className="list-disc ml-6">
          {(step.materials || []).map((m, i) => (<li key={i}>{m}</li>))}
        </ul>
      </div>
      {step.media && step.media.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {step.media.map((m, idx) => (<Media key={idx} item={m} />))}
        </div>
      )}
      <Uploader
        config={{ allowUploads: step.allowUploads, uploadKinds: step.uploadKinds, maxUploads: step.maxUploads }}
        uploads={uploads}
        setUploads={setUploads}
      />
    </div>
  );
}

function SectionStep({ s, stepKey, uploads, setUploads }) {
  return (
    <div className="space-y-3">
      {s.text && <p className="text-slate-700 whitespace-pre-wrap">{s.text}</p>}
      {s.media && s.media.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {s.media.map((m, idx) => (<Media key={idx} item={m} />))}
        </div>
      )}
      {s.allow_uploads === true || s.allowUploads === true ? (
        <Uploader
          config={{
            allowUploads: s.allow_uploads ?? s.allowUploads,
            uploadKinds: s.upload_kinds || s.uploadKinds || ["image", "video", "link"],
            maxUploads: s.max_uploads ?? s.maxUploads ?? 2,
          }}
          uploads={uploads}
          setUploads={setUploads}
        />
      ) : null}
    </div>
  );
}

function iconFor(name) { return {diseña:"✏️", construye:"🛠️", prueba:"🧪", mejora:"🔧", comparte:"📸"}[name] || "📘"; }
function shortLabel(label) { return label.replace(/^.+?\s/, ""); }

function Media({ item }) {
  const m = typeof item === "string" ? { url: item, kind: item.endsWith(".mp4") ? "video" : "image" } : item;
  const url = m?.url || "";
  if (m?.kind === "link") {
    return <a className="text-blue-600 underline break-all" href={url} target="_blank" rel="noreferrer">{url}</a>;
  }
  const isVideo = m?.kind === "video" || url.includes("youtube") || url.includes("vimeo") || url.endsWith(".mp4") || url.endsWith(".webm");
  return isVideo ? (<video src={url} controls className="w-full rounded-xl bg-black" />) : (<img src={url} alt="" className="w-full rounded-xl border" />);
}

function Uploader({ config, uploads, setUploads }) {
  const list = uploads || [];
  const max = config.maxUploads ?? 2;
  const remaining = Math.max(0, max - list.length);
  const onFile = (kind, file) => { const url = URL.createObjectURL(file); setUploads([...list, { kind, url, name: file.name }]); };
  const onLink = () => { const url = prompt("Pega tu link:"); if (!url) return; setUploads([...list, { kind: "link", url, name: url }]); };

  return (
    <div className="space-y-2">
      <div className="text-sm text-slate-600">Puedes subir hasta <b>{max}</b> evidencias. Te quedan {remaining}.</div>
      <div className="flex" style={{gap:'.5rem', flexWrap:'wrap'}}>
        {config.uploadKinds?.includes("image") && remaining > 0 && (
          <label className="btn-outline cursor-pointer">📷 Subir foto
            <input type="file" accept="image/*" className="hidden" onChange={(e)=>{ if (e.target.files?.[0]) onFile("image", e.target.files[0]); }} />
          </label>
        )}
        {config.uploadKinds?.includes("video") && remaining > 0 && (
          <label className="btn-outline cursor-pointer">🎥 Subir video
            <input type="file" accept="video/mp4,video/webm" className="hidden" onChange={(e)=>{ if (e.target.files?.[0]) onFile("video", e.target.files[0]); }} />
          </label>
        )}
        {config.uploadKinds?.includes("link") && remaining > 0 && (
          <button className="btn-outline" onClick={onLink}>🔗 Pegar link</button>
        )}
      </div>
      {list.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {list.map((u, idx) => (
            <div key={idx} className="border rounded-xl p-2">
              <div className="text-xs text-slate-500 mb-1">{u.kind} — {u.name}</div>
              {u.kind === "image" && (<img src={u.url} className="w-full rounded-lg" />)}
              {u.kind === "video" && (<video src={u.url} controls className="w-full rounded-lg bg-black" />)}
              {u.kind === "link" && (<a className="text-blue-600 underline break-all" href={u.url} target="_blank" rel="noreferrer">{u.url}</a>)}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
