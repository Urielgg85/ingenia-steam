// src/lib/db.js
import { supabase } from './supabase'

async function getAuthAndProfile() {
  const auth = await supabase.auth.getUser()
  const user = auth?.data?.user || null
  if (!user) throw new Error('Debes iniciar sesión')

  const { data: prof, error: eProf } = await supabase
    .from('profiles')
    .select('id, org_id, approved')
    .eq('id', user.id)
    .maybeSingle()

  if (eProf) throw eProf
  if (!prof) throw new Error('Perfil no encontrado')
  return { user, prof }
}

/**
 * Crea actividad + secciones
 * - owner_id = perfil actual
 * - org_id: si visibility es 'org' o 'private', usa activity.org_id || prof.org_id
 *           si 'public' o 'market', org_id = null (o usa prof.org_id si tu modelo lo requiere)
 */
export async function createActivityWithSections(activity){
  const { user, prof } = await getAuthAndProfile()

  const base = {
    owner_id: prof.id,
    org_id:
      activity.visibility === 'public' || activity.visibility === 'market'
        ? null
        : (activity.org_id || prof.org_id || null),
    title: activity.title,
    objective: activity.objective || '',
    materials: activity.materials || [],
    materials_media: activity.materialsMedia || [],
    est_minutes: activity.estMinutes ?? null,
    tags: activity.tags || [],
    visibility: activity.visibility || 'org',            // 'org' por defecto
    audience: activity.audience || 'both',
    grades: activity.grades || [],
    subjects: activity.subjects || [],
    price_mxn: activity.price_mxn ?? null,
    listing_status: activity.listing_status || 'draft'   // 'draft' por defecto
  }

  const { data: act, error: e1 } = await supabase
    .from('activities')
    .insert(base)
    .select('*')
    .single()
  if (e1) throw e1

  const sections = (activity.sections || []).map((s, idx)=> ({
    activity_id: act.id,
    order: idx,
    name: s.name,
    text: s.text,
    media: s.media || [],
    allow_uploads: s.allowUploads ?? true,
    upload_kinds: s.uploadKinds || ['image','video'],
    max_uploads: s.maxUploads ?? 2
  }))

  if (sections.length){
    const { error: e2 } = await supabase.from('sections').insert(sections)
    if (e2) throw e2
  }
  return act
}

/**
 * Actualiza campos de actividad (sincronización simple de secciones: borra e inserta)
 */
export async function updateActivityWithSections(id, activity){
  const { user, prof } = await getAuthAndProfile()

  const patch = {
    title: activity.title,
    objective: activity.objective || '',
    materials: activity.materials || [],
    materials_media: activity.materialsMedia || [],
    est_minutes: activity.estMinutes ?? null,
    tags: activity.tags || [],
    visibility: activity.visibility,          // asume validación en UI
    audience: activity.audience || 'both',
    grades: activity.grades || [],
    subjects: activity.subjects || [],
    price_mxn: activity.price_mxn ?? null,
    listing_status: activity.listing_status || 'draft',
    org_id:
      activity.visibility === 'public' || activity.visibility === 'market'
        ? null
        : (activity.org_id || prof.org_id || null),
  }

  const { error: e1 } = await supabase.from('activities').update(patch).eq('id', id)
  if (e1) throw e1

  // Reemplazo simple de secciones (si tu modelo requiere diff granular, se puede mejorar)
  if (Array.isArray(activity.sections)) {
    const { error: delErr } = await supabase.from('sections').delete().eq('activity_id', id)
    if (delErr) throw delErr

    const sections = activity.sections.map((s, idx)=> ({
      activity_id: id,
      order: idx,
      name: s.name,
      text: s.text,
      media: s.media || [],
      allow_uploads: s.allowUploads ?? true,
      upload_kinds: s.uploadKinds || ['image','video'],
      max_uploads: s.maxUploads ?? 2
    }))
    if (sections.length){
      const { error: insErr } = await supabase.from('sections').insert(sections)
      if (insErr) throw insErr
    }
  }
  return true
}

/**
 * Publicar usando RPC (evita problemas de RLS y roles)
 * - visibility: 'public' | 'org' | 'private' | 'market'
 * - listing_status: 'active' | 'inactive' | 'draft' (opcional)
 */
export async function publishActivity(id, { visibility = 'public', listing_status = null } = {}) {
  const { error } = await supabase.rpc('publish_activity', {
    p_id: id,
    p_visibility: visibility,
    p_listing_status: listing_status
  })
  if (error) throw error
  return true
}

/**
 * Listados
 */
export async function fetchPublicActivities(){
  const { data, error } = await supabase.from('activities')
    .select('id,title,objective,tags,visibility,listing_status,price_mxn')
    .eq('visibility','public')
    .order('created_at',{ascending:false})
  if(error) throw error
  return data || []
}

/**
 * De mi escuela / privadas del dueño:
 * - org: visibilidad de escuela (te la deja ver RLS si perteneces a esa org)
 * - privadas: solo las tuyas (owner_id = user.id)
 * *No* incluye 'market' para no duplicar con Marketplace
 */
export async function fetchOrgActivities(){
  const auth = await supabase.auth.getUser()
  const uid = auth?.data?.user?.id
  if (!uid) return []

  const { data, error } = await supabase.from('activities')
    .select('id,title,objective,tags,visibility,listing_status,price_mxn')
    .or(`visibility.eq.org,owner_id.eq.${uid}`)
    .neq('visibility','market')
    .order('created_at',{ascending:false})
  if(error) throw error
  return data || []
}

export async function fetchMarketplace(){
  const { data, error } = await supabase.from('activities')
    .select('id,title,objective,tags,price_mxn,listing_status')
    .eq('visibility','market')
    .eq('listing_status','active')
    .order('created_at',{ascending:false})
  if(error) throw error
  return data || []
}

export async function fetchActivity(id){
  const { data: act, error } = await supabase
    .from('activities')
    .select('*')
    .eq('id', id)
    .single()
  if(error) throw error

  const { data: secs, error: e2 } = await supabase
    .from('sections')
    .select('*')
    .eq('activity_id', id)
    .order('order')
  if (e2) throw e2

  act.sections = secs || []
  return act
}
