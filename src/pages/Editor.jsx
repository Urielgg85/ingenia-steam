import React, {useState} from 'react'
import { useNavigate } from 'react-router-dom'

const defaultActivity = {
  id: 'draft-' + Math.random().toString(36).slice(2,8),
  title: '',
  objective: '',
  materials: [''],
  materialsMedia: [],
  sections: [
    { name:'diseña', text:'', media:[], allowUploads:true, uploadKinds:['image','video'], maxUploads:2 },
    { name:'construye', text:'', media:[], allowUploads:true, uploadKinds:['image','video'], maxUploads:3 },
    { name:'prueba', text:'', media:[], allowUploads:true, uploadKinds:['image','video'], maxUploads:3 },
    { name:'mejora', text:'', media:[], allowUploads:true, uploadKinds:['image','video'], maxUploads:2 },
    { name:'comparte', text:'', media:[], allowUploads:true, uploadKinds:['image','video','link'], maxUploads:2 }
  ],
  estMinutes: 30,
  tags: [],
  visibility: 'org',
  audience: 'both',
  grades: [],
  subjects: [],
  price_mxn: null,
  listing_status: 'draft'
}

const steps = [
  { key:'title', label:'Título' },
  { key:'objective', label:'Objetivo' },
  { key:'materials', label:'Materiales' },
  { key:'s0', label:'Diseña' },
  { key:'s1', label:'Construye' },
  { key:'s2', label:'Prueba' },
  { key:'s3', label:'Mejora' },
  { key:'s4', label:'Comparte' },
]

export default function Editor(){
  const [act, setAct] = useState(()=>{
    const saved = localStorage.getItem('activity-draft')
    return saved ? JSON.parse(saved) : defaultActivity
  })
  const [step, setStep] = useState(0)
  const nav = useNavigate()

  const save = ()=>{
    localStorage.setItem('activity-draft', JSON.stringify(act))
  }

  const next = ()=> setStep(s => Math.min(steps.length-1, s+1))
  const prev = ()=> setStep(s => Math.max(0, s-1))

  const download = ()=>{
    save()
    const blob = new Blob([JSON.stringify(act, null, 2)], {type:'application/json'})
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = (act.title || 'actividad') + '.json'
    a.click()
  }

  const percent = Math.round(((step+1)/steps.length)*100)

  return (
    <main className="max-w-3xl mx-auto p-6 space-y-6">
      <header className="flex items-center justify-between">
        <h1 className="title">Editor de actividad</h1>
        <div className="flex gap-2">
          <button className="btn-outline" onClick={()=>{save(); nav('/preview')}}>Previsualizar</button>
          <button className="btn-outline" onClick={download}>Descargar JSON</button>
          <PublishButton act={act} />
        </div>
      </header>

      <div className="card">
        <div className="flex items-center justify-between mb-4">
          <div className="text-sm font-semibold">{steps[step].label}</div>
          <div className="text-xs text-slate-500">{step+1} / {steps.length}</div>
        </div>
        <div className="w-full h-2 bg-slate-200 rounded-full mb-4">
          <div className="h-2 bg-black rounded-full" style={{width: percent+'%'}}/>
        </div>

        {step===0 && (
          <div className="space-y-3">
            <div>
              <label className="label">Título</label>
              <input className="input" value={act.title} onChange={e=>setAct({...act, title:e.target.value})} placeholder="Ej. Puentes que aguantan" />
            </div>
          </div>
        )}

        {step===1 && (
          <div className="space-y-3">
            <div>
              <label className="label">Objetivo</label>
              <textarea className="textarea" value={act.objective} onChange={e=>setAct({...act, objective:e.target.value})} placeholder="Describe la meta en una línea" />
            </div>
          </div>
        )}

        {step===2 && (
          <div className="space-y-4">
            <div>
              <label className="label">Materiales (uno por línea)</label>
              <textarea className="textarea" value={(act.materials||[]).join('\\n')}
                onChange={e=>setAct({...act, materials:e.target.value.split('\\n').map(s=>s.trim()).filter(Boolean)})}
                placeholder="Bloques\\nCartón\\nCinta" />
            </div>

            {/* Medios de referencia del maestro para Materiales */}
            <div className="space-y-2">
              <p className="label">Medios de referencia (maestro)</p>
              <MediaRepeater
                items={act.materialsMedia || []}
                onChange={(media)=> setAct({...act, materialsMedia: media})}
              />
              <p className="text-xs text-slate-500">Puedes subir imagen/video o pegar URLs (YouTube, etc.).</p>
            </div>

            {/* --- Visibilidad y audiencia --- */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="label">Visibilidad</label>
                <select className="input" value={act.visibility||'org'} onChange={e=>setAct({...act, visibility:e.target.value})}>
                  <option value="public">Pública (todos)</option>
                  <option value="org">Sólo mi escuela</option>
                  <option value="private">Privada (sólo yo)</option>
                  <option value="market">Marketplace (de pago)</option>
                </select>
              </div>
              <div>
                <label className="label">Precio MXN (si es de pago)</label>
                <input className="input" type="number" min="0" value={act.price_mxn ?? ''}
                       onChange={e=>setAct({...act, price_mxn: e.target.value ? Number(e.target.value) : null})}
                       placeholder="0 o vacío" />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="label">Audiencia</label>
                <select className="input" value={act.audience || 'both'} onChange={e=>setAct({...act, audience: e.target.value})}>
                  <option value="both">Alumnos y maestros</option>
                  <option value="students">Sólo alumnos</option>
                  <option value="teachers">Sólo maestros</option>
                </select>
              </div>
              <div>
                <label className="label">Grados (coma)</label>
                <input className="input" placeholder="4°,5°,6°" value={(act.grades||[]).join(',')}
                  onChange={e=>setAct({...act, grades: e.target.value.split(',').map(s=>s.trim()).filter(Boolean)})} />
              </div>
              <div>
                <label className="label">Asignaturas (coma)</label>
                <input className="input" placeholder="Ciencia, Tecnología, Arte" value={(act.subjects||[]).join(',')}
                  onChange={e=>setAct({...act, subjects: e.target.value.split(',').map(s=>s.trim()).filter(Boolean)})} />
              </div>
            </div>

            {act.visibility === 'market' && (
              <div>
                <label className="label">Estado de listado (Marketplace)</label>
                <select className="input" value={act.listing_status || 'draft'}
                        onChange={e=>setAct({...act, listing_status: e.target.value})}>
                  <option value="draft">Borrador (oculto)</option>
                  <option value="active">Activo (visible en catálogo)</option>
                  <option value="archived">Archivado</option>
                </select>
              </div>
            )}
          </div>
        )}

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
            <button className="btn-outline" onClick={save}>Guardar</button>
            <button className="btn" onClick={next} disabled={step===steps.length-1}>Siguiente</button>
          </div>
        </div>
      </div>
    </main>
  )
}

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
            <input type="checkbox" checked={s.allowUploads} onChange={e=>update({allowUploads:e.target.checked})}/>
            Permitir evidencias
          </label>
          <label className="flex items-center gap-1">
            Máx.
            <input className="w-16 input" type="number" min="0" value={s.maxUploads} onChange={e=>update({maxUploads:Number(e.target.value)})}/>
          </label>
        </div>
      </div>

      <div>
        <label className="label">Texto</label>
        <textarea className="textarea" value={s.text} onChange={e=>update({text:e.target.value})} placeholder="Instrucciones cortas y claras" />
      </div>

      <div className="space-y-2">
        <p className="label">Medios de referencia (maestro)</p>
        <MediaRepeater items={s.media||[]} onChange={(media)=>update({media})} />
        <div className="flex items-center gap-3">
          {['image','video','link'].map(kind=> (
            <label key={kind} className="chip">
              <input type="checkbox" className="mr-1" checked={s.uploadKinds.includes(kind)} onChange={(e)=>{
                const set = new Set(s.uploadKinds)
                if(e.target.checked) set.add(kind); else set.delete(kind)
                update({uploadKinds:[...set]})
              }}/>
              Permitir {kind}
            </label>
          ))}
        </div>
      </div>
    </div>
  )
}

function MediaRepeater({items, onChange}){
  const add = (kind)=> onChange([...(items||[]), {kind, url:'', name:''}])
  const update = (i, patch)=>{
    const arr=[...items]; arr[i]={...arr[i], ...patch}; onChange(arr)
  }
  const remove = (i)=>{
    const arr=[...items]; arr.splice(i,1); onChange(arr)
  }
  const fileToUrl = (file)=> URL.createObjectURL(file)

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
                <label className="btn-outline cursor-pointer">
                  {m.kind==='image' ? 'Subir imagen' : 'Subir video'}
                  <input type="file"
                         accept={m.kind==='image' ? 'image/*' : 'video/mp4,video/webm'}
                         className="hidden"
                         onChange={e=>{
                           const f=e.target.files?.[0]; if(!f) return;
                           update(i,{url:fileToUrl(f), name:f.name})
                         }}/>
                </label>
              )}
            </div>
            <button className="btn-outline" onClick={()=>remove(i)}>Eliminar</button>
          </div>
          <input className="input" placeholder={m.kind==='link' ? 'Pega URL (YouTube, Vimeo, etc.)' : 'O pega una URL'}
                 value={m.url||''}
                 onChange={e=>update(i,{url:e.target.value})}/>
          {m.url && (
            <div className="mt-2">
              {m.kind==='image' ? <img src={m.url} className="max-h-40 rounded-lg border"/> :
               m.kind==='video' ? <video src={m.url} controls className="w-full rounded-lg bg-black"/> :
               <a className="text-blue-600 underline" href={m.url} target="_blank" rel="noreferrer">{m.url}</a>}
            </div>
          )}
        </div>
      ))}
      <div className="flex flex-wrap gap-2">
        <button className="btn-outline" onClick={()=>add('image')}>+ Imagen</button>
        <button className="btn-outline" onClick={()=>add('video')}>+ Video</button>
        <button className="btn-outline" onClick={()=>add('link')}>+ URL</button>
      </div>
    </div>
  )
}

function PublishButton({act}){
  const doPublish = async ()=>{
    try{
      const mod = await import('../lib/db')
      const payload = {...act, materialsMedia: act.materialsMedia}
      const res = await mod.createActivityWithSections(payload)
      alert('Publicado en Supabase. ID: ' + res.id)
    }catch(e){
      alert('Error: ' + (e.message || e))
    }
  }
  return <button className="btn" onClick={doPublish}>Publicar en Supabase</button>
}
