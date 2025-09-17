// src/pages/Editor.jsx
import React, { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { uploadActivityMedia } from '../lib/storage' 

/* ----------------------------- utilidades UI ----------------------------- */
function Banner({ kind = 'info', children, onClose }) {
  const colors = kind === 'error'
    ? 'bg-red-50 border-red-200 text-red-800'
    : kind === 'success'
    ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
    : 'bg-slate-50 border-slate-200 text-slate-800'
  return (
    <div className={`border rounded-xl p-3 ${colors}`}>
      <div className="flex items-start justify-between gap-3">
        <div className="text-sm leading-5">{children}</div>
        {onClose && (
          <button className="text-xs underline" onClick={onClose}>
            Cerrar
          </button>
        )}
      </div>
    </div>
  )
}

function fmtErr(e) {
  if (!e) return 'Error desconocido'
  if (typeof e === 'string') return e
  const parts = []
  if (e.message) parts.push(e.message)
  if (e.code) parts.push(`(code: ${e.code})`)
  if (e.details) parts.push(`details: ${e.details}`)
  return parts.join(' · ') || 'Error'
}

/* ------------------------------ default data ----------------------------- */
const defaultActivity = {
  id: 'draft-' + Math.random().toString(36).slice(2, 8),
  title: '',
  objective: '',
  materials: [''],
  materialsMedia: [],
  sections: [
    { name:'diseña',    text:'', media:[], allowUploads:true, uploadKinds:['image','video'],        maxUploads:2 },
    { name:'construye', text:'', media:[], allowUploads:true, uploadKinds:['image','video'],        maxUploads:3 },
    { name:'prueba',    text:'', media:[], allowUploads:true, uploadKinds:['image','video'],        maxUploads:3 },
    { name:'mejora',    text:'', media:[], allowUploads:true, uploadKinds:['image','video'],        maxUploads:2 },
    { name:'comparte',  text:'', media:[], allowUploads:true, uploadKinds:['image','video','link'], maxUploads:2 }
  ],
  estMinutes: 30,
  tags: [],
  visibility: 'org',       // 'public' | 'org' | 'private' | 'market'
  audience: 'both',        // 'both' | 'students' | 'teachers'
  grades: [],
  subjects: [],
  price_mxn: null,
  listing_status: 'draft'  // 'draft' | 'active' | 'archived' (si market)
}

const steps = [
  { key:'title',     label:'Título' },
  { key:'objective', label:'Objetivo' },
  { key:'materials', label:'Materiales' },
  { key:'s0',        label:'Diseña' },
  { key:'s1',        label:'Construye' },
  { key:'s2',        label:'Prueba' },
  { key:'s3',        label:'Mejora' },
  { key:'s4',        label:'Comparte' },
]

/* ----------------------------- ErrorBoundary ----------------------------- */
class ErrorBoundary extends React.Component {
  constructor(props){ super(props); this.state = { hasError: false, info: '' } }
  static getDerivedStateFromError(){ return { hasError: true } }
  componentDidCatch(error, info){
    // guarda algo de contexto
    this.setState({ info: `${error?.message || error} \n${info?.componentStack || ''}` })
    // log a consola para depurar
    // eslint-disable-next-line no-console
    console.error('[ErrorBoundary]', error, info)
  }
  render(){
    if(!this.state.hasError) return this.props.children
    return (
      <main className="max-w-3xl mx-auto p-6 space-y-4">
        <Banner kind="error">
          <div className="font-semibold mb-1">Ocurrió un error y detuvimos la vista.</div>
          <pre className="text-xs overflow-auto max-h-48 whitespace-pre-wrap">{this.state.info}</pre>
          <div className="mt-2">
            <button className="btn" onClick={()=>location.reload()}>Recargar</button>
          </div>
        </Banner>
      </main>
    )
  }
}

/* --------------------------------- Editor -------------------------------- */
function EditorInner(){
  const nav = useNavigate()

  const [act, setAct] = useState(() => {
    const saved = localStorage.getItem('activity-draft')
    return saved ? JSON.parse(saved) : defaultActivity
  })
  const [supabaseId, setSupabaseId] = useState(() =>
    localStorage.getItem('activity-supabase-id') || null
  )

  const [step, setStep] = useState(0)
  const [busy, setBusy] = useState(false)

  // banners
  const [banner, setBanner] = useState(null) // { kind:'success'|'error'|'info', text: string }
  const showInfo = (t)=>setBanner({kind:'info', text:t})
  const showOk   = (t)=>setBanner({kind:'success', text:t})
  const showErr  = (t)=>setBanner({kind:'error', text:t})

  // captura errores globales (crashes no controlados)
  useEffect(()=>{
    const onRej = (ev)=> showErr('Error no controlado (promesa): ' + fmtErr(ev.reason))
    const onErr = (ev)=> showErr('Error en página: ' + (ev.message || ''))
    window.addEventListener('unhandledrejection', onRej)
    window.addEventListener('error', onErr)
    return ()=> {
      window.removeEventListener('unhandledrejection', onRej)
      window.removeEventListener('error', onErr)
    }
  },[])

  // sincronia local
  useEffect(()=>{
    localStorage.setItem('activity-draft', JSON.stringify(act))
    if (supabaseId) localStorage.setItem('activity-supabase-id', supabaseId)
  }, [act, supabaseId])

  const saveLocal = ()=>{
    localStorage.setItem('activity-draft', JSON.stringify(act))
    showOk('Borrador guardado localmente ✅')
  }

  const resetDraft = ()=>{
    localStorage.removeItem('activity-draft')
    localStorage.removeItem('activity-supabase-id')
    setSupabaseId(null)
    setAct({ ...defaultActivity, id: 'draft-' + Math.random().toString(36).slice(2, 8) })
    showInfo('Borrador reiniciado')
  }

  const next = ()=> setStep(s => Math.min(steps.length-1, s+1))
  const prev = ()=> setStep(s => Math.max(0, s-1))
  const percent = Math.round(((step+1)/steps.length)*100)

  const download = ()=>{
    const blob = new Blob([JSON.stringify(act, null, 2)], {type:'application/json'})
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = (act.title || 'actividad') + '.json'
    a.click()
  }

  async function ensureSavedInSupabase(){
    setBusy(true); setBanner(null)
    try{
      const mod = await import('../lib/db')
      if (supabaseId) {
        await mod.updateActivityWithSections(supabaseId, act)
        showOk('Actualizado en Supabase ✅')
        return supabaseId
      } else {
        const created = await mod.createActivityWithSections(act)
        setSupabaseId(created.id)
        showOk('Creado en Supabase ✅')
        return created.id
      }
    } catch(e){
      const m = fmtErr(e)
      showErr('Error al guardar en Supabase: ' + m)
      // re-lanza para que quien llame decida
      throw e
    } finally {
      setBusy(false)
    }
  }

  async function onSaveSupabase(){
    try{
      await ensureSavedInSupabase()
    }catch(e){
      alert('Error al guardar en Supabase: ' + fmtErr(e))
    }
  }

  async function onPublish(){
    if(!act.title?.trim()){
      setStep(0)
      return showErr('Agrega un título antes de publicar 🙂')
    }
    try{
      const id = await ensureSavedInSupabase()
      const mod = await import('../lib/db')
      await mod.publishActivity(id, {
        visibility: act.visibility || 'public',
        listing_status: act.visibility === 'market' ? (act.listing_status || 'draft') : null
      })
      showOk('Publicado ✅ ' + (act.visibility === 'market'
        ? `(Marketplace: ${act.listing_status})`
        : `(${act.visibility})`))
      alert('Publicado ✅\nID: ' + id)
    }catch(e){
      const msg = fmtErr(e)
      showErr('Error al publicar: ' + msg)
      alert('Error al publicar: ' + msg)
    }
  }

  return (
    <main className="max-w-3xl mx-auto p-6 space-y-6">
      <header className="flex items-center justify-between">
        <h1 className="title">Editor de actividad</h1>
        <div className="flex flex-wrap gap-2">
          <button className="btn-outline" onClick={()=>{ saveLocal(); nav('/preview') }}>
            Previsualizar
          </button>
          <button className="btn-outline" onClick={download}>Descargar JSON</button>

          <button className="btn-outline" disabled={busy} onClick={onSaveSupabase}>
            {supabaseId
              ? (busy ? 'Guardando…' : 'Guardar en Supabase')
              : (busy ? 'Creando…'   : 'Crear en Supabase')}
          </button>

          <button className="btn" disabled={busy || !act.title} onClick={onPublish}>
            {busy ? 'Procesando…' : 'Publicar'}
          </button>

          <button className="btn-outline" onClick={resetDraft}>Reiniciar</button>
        </div>
      </header>

      {banner && (
        <Banner kind={banner.kind} onClose={()=>setBanner(null)}>
          {banner.text}
        </Banner>
      )}

      {/* Debug mini (opcional) */}
      {supabaseId && (
        <div className="text-xs text-slate-500">
          <code>ID Supabase: {supabaseId}</code> · <code>Visibilidad: {act.visibility}</code>{' '}
          {act.visibility==='market' && <code>· Listing: {act.listing_status}</code>}
        </div>
      )}

      <div className="card">
        <div className="flex items-center justify-between mb-4">
          <div className="text-sm font-semibold">{steps[step].label}</div>
          <div className="text-xs text-slate-500">{step+1} / {steps.length}</div>
        </div>
        <div className="w-full h-2 bg-slate-200 rounded-full mb-4">
          <div className="h-2 bg-black rounded-full" style={{width: percent+'%'}}/>
        </div>

        {/* Paso 0: Título */}
        {step===0 && (
          <div className="space-y-3">
            <div>
              <label className="label">Título</label>
              <input
                className="input"
                value={act.title}
                onChange={e=>setAct({...act, title:e.target.value})}
                placeholder="Ej. Puentes que aguantan"
              />
            </div>
            <div>
              <label className="label">Etiquetas (coma)</label>
              <input
                className="input"
                placeholder="STEAM, Estructuras, Primaria"
                value={(act.tags||[]).join(',')}
                onChange={e=>setAct({...act, tags: e.target.value.split(',').map(s=>s.trim()).filter(Boolean)})}
              />
            </div>
          </div>
        )}

        {/* Paso 1: Objetivo */}
        {step===1 && (
          <div className="space-y-3">
            <div>
              <label className="label">Objetivo</label>
              <textarea
                className="textarea"
                value={act.objective}
                onChange={e=>setAct({...act, objective:e.target.value})}
                placeholder="Describe la meta en una línea"
              />
            </div>
          </div>
        )}

        {/* Paso 2: Materiales + visibilidad/audiencia */}
        {step===2 && (
          <div className="space-y-4">
            <div>
              <label className="label">Materiales (uno por línea)</label>
              <textarea
                className="textarea"
                value={(act.materials||[]).join('\n')}
                onChange={e=>setAct({
                  ...act,
                  materials: e.target.value.split('\n').map(s=>s.trim()).filter(Boolean)
                })}
                placeholder={'Bloques\nCartón\nCinta'}
              />
            </div>

            {/* Medios de referencia del maestro para Materiales */}
            <div className="space-y-2">
              <p className="label">Medios de referencia (maestro)</p>
              <MediaRepeater
                items={act.materialsMedia || []}
                onChange={(media)=> setAct({...act, materialsMedia: media})}
              />
              <p className="text-xs text-slate-500">Sube imagen/video o pega URLs (YouTube, etc.).</p>
            </div>

            {/* --- Visibilidad y audiencia --- */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="label">Visibilidad</label>
                <select
                  className="input"
                  value={act.visibility || 'org'}
                  onChange={e=>setAct({...act, visibility:e.target.value})}
                >
                  <option value="public">Pública (todos)</option>
                  <option value="org">Sólo mi escuela</option>
                  <option value="private">Privada (sólo yo)</option>
                  <option value="market">Marketplace (de pago)</option>
                </select>
              </div>
              <div>
                <label className="label">Precio MXN (si es de pago)</label>
                <input
                  className="input"
                  type="number" min="0"
                  value={act.price_mxn ?? ''}
                  onChange={e=>setAct({...act, price_mxn: e.target.value ? Number(e.target.value) : null})}
                  placeholder="0 o vacío"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="label">Audiencia</label>
                <select
                  className="input"
                  value={act.audience || 'both'}
                  onChange={e=>setAct({...act, audience: e.target.value})}
                >
                  <option value="both">Alumnos y maestros</option>
                  <option value="students">Sólo alumnos</option>
                  <option value="teachers">Sólo maestros</option>
                </select>
              </div>
              <div>
                <label className="label">Grados (coma)</label>
                <input
                  className="input"
                  placeholder="3,4,5,6"
                  value={(act.grades||[]).join(',')}
                  onChange={e=>setAct({...act, grades: e.target.value.split(',').map(s=>s.trim()).filter(Boolean)})}
                />
              </div>
              <div>
                <label className="label">Asignaturas (coma)</label>
                <input
                  className="input"
                  placeholder="Ciencias, Tecnología, Arte"
                  value={(act.subjects||[]).join(',')}
                  onChange={e=>setAct({...act, subjects: e.target.value.split(',').map(s=>s.trim()).filter(Boolean)})}
                />
              </div>
            </div>

            {act.visibility === 'market' && (
              <div>
                <label className="label">Estado de listado (Marketplace)</label>
                <select
                  className="input"
                  value={act.listing_status || 'draft'}
                  onChange={e=>setAct({...act, listing_status: e.target.value})}
                >
                  <option value="draft">Borrador (oculto)</option>
                  <option value="active">Activo (visible en catálogo)</option>
                  <option value="archived">Archivado</option>
                </select>
              </div>
            )}
          </div>
        )}

        {/* Pasos 3–7: Secciones */}
        {step>=3 && step<=7 && (
          <SectionStep
            sectionIndex={step-3}
            act={act}
            setAct={setAct}
          />
        )}

        <div className="mt-6 flex items-center justify-between">
          <button className="btn-outline" onClick={prev} disabled={step===0}>Anterior</button>
          <div className="flex gap-2">
            <button className="btn-outline" onClick={saveLocal}>Guardar local</button>
            <button className="btn" onClick={next} disabled={step===steps.length-1}>Siguiente</button>
          </div>
        </div>
      </div>
    </main>
  )
}

/* --------------------------- subcomponentes UI --------------------------- */
function SectionStep({sectionIndex, act, setAct}){
  const s = act.sections[sectionIndex]
  const nameLabel = {0:'Diseña',1:'Construye',2:'Prueba',3:'Mejora',4:'Comparte'}[sectionIndex] || s.name

  const update = (patch)=>{
    const arr=[...act.sections]
    arr[sectionIndex] = {...arr[sectionIndex], ...patch}
    setAct({...act, sections:arr})
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold">{nameLabel}</h3>
        <div className="flex items-center gap-3 text-sm">
          <label className="flex items-center gap-1">
            <input
              type="checkbox"
              checked={s.allowUploads}
              onChange={e=>update({allowUploads:e.target.checked})}
            />
            Permitir evidencias
          </label>
          <label className="flex items-center gap-1">
            Máx.
            <input
              className="w-16 input"
              type="number" min="0"
              value={s.maxUploads}
              onChange={e=>update({maxUploads:Number(e.target.value)})}
            />
          </label>
        </div>
      </div>

      <div>
        <label className="label">Texto</label>
        <textarea
          className="textarea"
          value={s.text}
          onChange={e=>update({text:e.target.value})}
          placeholder="Instrucciones cortas y claras"
        />
      </div>

      <div className="space-y-2">
        <p className="label">Medios de referencia (maestro)</p>
        <MediaRepeater items={s.media||[]} onChange={(media)=>update({media})} />
        <div className="flex items-center gap-3">
          {['image','video','link'].map(kind=> (
            <label key={kind} className="chip">
              <input
                type="checkbox"
                className="mr-1"
                checked={s.uploadKinds.includes(kind)}
                onChange={(e)=>{
                  const set = new Set(s.uploadKinds)
                  if(e.target.checked) set.add(kind); else set.delete(kind)
                  update({uploadKinds:[...set]})
                }}
              />
              Permitir {kind}
            </label>
          ))}
        </div>
      </div>
    </div>
  )
}

function MediaRepeater({items, onChange}){
  const [uploadingIndex, setUploadingIndex] = React.useState(null)
  const [err, setErr] = React.useState('')

  const add = (kind)=> onChange([...(items||[]), {kind, url:'', name:''}])
  const update = (i, patch)=>{
    const arr=[...items]; arr[i]={...arr[i], ...patch}; onChange(arr)
  }
  const remove = (i)=>{
    const arr=[...items]; arr.splice(i,1); onChange(arr)
  }

  async function handleFile(i, kind, file){
    if(!file) return
    setErr('')
    setUploadingIndex(i)
    try{
      const { url } = await uploadActivityMedia(file)          // <-- sube a Storage
      update(i, { url, name: file.name, kind })
    }catch(e){
      console.error('[upload media]', e)
      setErr(e?.message || 'Error al subir archivo')
    }finally{
      setUploadingIndex(null)
    }
  }

  return (
    <div className="space-y-3">
      {(items||[]).map((m,i)=>(
        <div key={i} className="border rounded-xl p-3 space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <select className="input w-40" value={m.kind || 'image'} onChange={e=>update(i,{kind:e.target.value})}>
                <option value="image">Imagen</option>
                <option value="video">Video</option>
                <option value="link">URL</option>
              </select>

              {m.kind !== 'link' && (
                <label className={`btn-outline cursor-pointer ${uploadingIndex===i ? 'opacity-60 pointer-events-none' : ''}`}>
                  {uploadingIndex===i ? 'Subiendo…' : (m.kind==='image' ? 'Subir imagen' : 'Subir video')}
                  <input
                    type="file"
                    accept={m.kind==='image' ? 'image/*' : 'video/mp4,video/webm'}
                    className="hidden"
                    onChange={e=>handleFile(i, m.kind, e.target.files?.[0])}
                  />
                </label>
              )}
            </div>

            <button className="btn-outline" onClick={()=>remove(i)} disabled={uploadingIndex===i}>Eliminar</button>
          </div>

          <input
            className="input"
            placeholder={m.kind==='link' ? 'Pega URL (YouTube, Vimeo, etc.)' : 'O pega una URL externa'}
            value={m.url||''}
            onChange={e=>update(i,{url:e.target.value})}
            disabled={uploadingIndex===i}
          />

          {m.url && (
            <div className="mt-2">
              {m.kind==='image' ? <img src={m.url} className="max-h-40 rounded-lg border"/> :
               m.kind==='video' ? <video src={m.url} controls className="w-full rounded-lg bg-black"/> :
               <a className="text-blue-600 underline" href={m.url} target="_blank" rel="noreferrer">{m.url}</a>}
            </div>
          )}
        </div>
      ))}

      {err && <div className="text-sm text-red-600">{err}</div>}

      <div className="flex flex-wrap gap-2">
        <button className="btn-outline" onClick={()=>add('image')}>+ Imagen</button>
        <button className="btn-outline" onClick={()=>add('video')}>+ Video</button>
        <button className="btn-outline" onClick={()=>add('link')}>+ URL</button>
      </div>
    </div>
  )
}

/* ------------------------------ export final ----------------------------- */
export default function EditorPage(){
  return (
    <ErrorBoundary>
      <EditorInner />
    </ErrorBoundary>
  )
}
