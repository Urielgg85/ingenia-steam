# Ingenia — STEAM Activities Starter (Vite + React + Tailwind + Supabase-ready)

## 1) Instalar y correr local
```bash
npm i
npm run dev
```

Abre http://localhost:5173

- **Crear actividad:** /create
- **Previsualizar:** /preview
- **Player (consumo):** /play (o desde Home abre seeds)
- **Importar JSON:** /import

## 2) Variables de entorno (cuando conectes Supabase)
Crea `.env`:
```bash
VITE_SUPABASE_URL=
VITE_SUPABASE_ANON_KEY=
```

## 3) Estructura básica
- `src/pages/Editor.jsx` — wizard para maestros (Título, Objetivo, Materiales + secciones fijas)
- `src/pages/Preview.jsx` — vista previa
- `src/pages/Player.jsx` — vista para alumnos (títulos lúdicos + evidencias locales)
- `src/pages/Importer.jsx` — importar un JSON y convertirlo en borrador
- `src/data/seeds/` — 3 actividades listas
- `src/lib/supabase.js` — cliente para conectar cuando actives Supabase

## 4) Conectar a Supabase (rápido)
1. Crea proyecto en https://supabase.com/ y copia URL/Anon key al `.env`.
2. En Supabase Studio → SQL editor, pega el contenido de `supabase/schema.sql` y ejecútalo.
3. En Storage crea buckets: `activity-media` y `evidence`.
4. Ajusta Reglas (Policies) con el SQL incluido abajo.

## 5) Deploy sugerido
- Vercel (vite) o Netlify/Cloudflare Pages.
- Asegúrate de setear variables de entorno en el panel.

---

### Notas
- Este MVP guarda borrador y evidencias en `localStorage`. Cambia a Supabase en `Player.jsx` (Uploader) cuando quieras persistencia real.
