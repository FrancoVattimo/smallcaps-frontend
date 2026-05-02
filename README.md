# SmallCaps DB — Frontend

Frontend estático del screener de small caps de EE.UU. Se conecta directamente a **Supabase** mediante la clave pública (`anon`) con **RLS** activado.

## Deploy en Vercel

1. Andá a [vercel.com](https://vercel.com) e iniciá sesión con tu cuenta de GitHub.
2. Click en **"Add New Project"**.
3. Importá el repo `smallcaps-frontend`.
4. Vercel detecta automáticamente que es estático (tiene `index.html`). No hace falta configurar nada.
5. Click en **Deploy**.

Listo. Vercel te dará una URL pública tipo `https://smallcaps-frontend.vercel.app`.

## Seguridad

- El frontend usa la **publishable key** de Supabase (`sb_publishable_...`).
- Row Level Security (RLS) está configurado para **solo lectura pública**.
- **Nunca** subas la `service_role` key al frontend.

## Actualización de datos

Este frontend es **solo lectura**. Los datos se escriben desde los scripts Python corriendo localmente:

- `python webapp/price_updater.py` — actualiza precios diarios.
- `python webapp/ingestor.py` — actualiza fundamentales anuales/trimestrales.

Ambos scripts usan la `service_role` key del archivo `.env` para escribir en Supabase.

## Desarrollo local

Para probar cambios localmente antes de subirlos:

```bash
# Desde esta carpeta
npx serve .
# O simplemente abrí index.html en el navegador
```

Cada `git push` a `main` dispara un redeploy automático en Vercel.
