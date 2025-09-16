# Tailwind setup rápido (Vite + React)

## 1) Instala dependencias
```bash
npm i -D tailwindcss postcss autoprefixer
```

> Si `npx tailwindcss init -p` te falla, no pasa nada: este ZIP ya trae los archivos de config.

## 2) Copia estos archivos a la raíz de tu proyecto
- `tailwind.config.js`
- `postcss.config.js`

## 3) Activa Tailwind en tu CSS
En `src/index.css` **agrega estas líneas al inicio** (arriba de tu CSS actual):
```css
@tailwind base;
@tailwind components;
@tailwind utilities;
```

## 4) Ejecuta el dev server
```bash
npm run dev
```

## Notas
- Estos archivos usan **ESM** (`export default`) porque tu `package.json` tiene `"type": "module"`.
- Si no quieres usar Tailwind, puedes dejar `postcss.config.js` con:
  ```js
  export default { plugins: {} }
  ```
  y quitar las líneas `@tailwind` en tu CSS.
