// src/lib/storage.js
import { supabase } from './supabase'

function slug(s='') {
  return s.normalize('NFKD')
    .replace(/[\u0300-\u036f]/g,'')
    .replace(/[^a-zA-Z0-9.-]+/g,'-')
    .replace(/-+/g,'-')
    .toLowerCase()
    .slice(0,120)
}

export async function uploadActivityMedia(file) {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Debes iniciar sesión')

  const ext = file.name.includes('.') ? file.name.split('.').pop() : ''
  const base = file.name.replace(/\.[^.]+$/, '')
  const path = `${user.id}/${Date.now()}_${slug(base)}${ext ? '.'+ext.toLowerCase() : ''}`

  // Nota: Supabase-js v2 no expone progreso real de upload (fetch), así que mostramos "Subiendo…"
  const { error } = await supabase
    .storage
    .from('activity-media')
    .upload(path, file, {
      cacheControl: '3600',
      upsert: false,
      contentType: file.type || undefined,
    })

  if (error) throw error

  // URL pública
  const { data } = supabase.storage.from('activity-media').getPublicUrl(path)
  return { url: data.publicUrl, path }
}
