import { supabase } from './supabase'

export async function createActivityWithSections(activity){
  const auth = await supabase.auth.getUser()
  if(!auth.data.user) throw new Error('Debes iniciar sesión')
  const { data: prof, error: eProf } = await supabase.from('profiles').select('id, org_id').eq('id', auth.data.user.id).maybeSingle()
  if(eProf) throw eProf
  if(!prof) throw new Error('Perfil no encontrado')

  const { data: act, error: e1 } = await supabase.from('activities').insert({
    owner_id: prof.id,
    org_id: activity.visibility === 'public' || activity.visibility === 'market' ? null : (activity.org_id || prof.org_id),
    title: activity.title,
    objective: activity.objective,
    materials: activity.materials || [],
    materials_media: activity.materialsMedia || [],
    est_minutes: activity.estMinutes || null,
    tags: activity.tags || [],
    visibility: activity.visibility || 'org',
    audience: activity.audience || 'both',
    grades: activity.grades || [],
    subjects: activity.subjects || [],
    price_mxn: activity.price_mxn || null,
    listing_status: activity.listing_status || 'draft'
  }).select('*').single()
  if(e1) throw e1

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
  if(sections.length){
    const { error: e2 } = await supabase.from('sections').insert(sections)
    if(e2) throw e2
  }
  return act
}

export async function fetchPublicActivities(){
  const { data, error } = await supabase.from('activities')
    .select('id,title,objective,tags,visibility,listing_status,price_mxn')
    .eq('visibility','public')
    .order('created_at',{ascending:false})
  if(error) throw error
  return data || []
}

export async function fetchOrgActivities(){
  const { data, error } = await supabase.from('activities')
    .select('id,title,objective,tags,visibility,listing_status,price_mxn')
    .neq('visibility','public')
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
  const { data: act, error } = await supabase.from('activities').select('*').eq('id', id).single()
  if(error) throw error
  const { data: secs } = await supabase.from('sections').select('*').eq('activity_id', id).order('order')
  act.sections = secs || []
  return act
}
