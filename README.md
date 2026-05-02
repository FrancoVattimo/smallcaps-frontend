# SmallCaps DB — Hugging Face Space

Frontend estático del screener de small caps de EE.UU. Se conecta directamente a **Supabase** mediante la clave pública (`anon`) con **RLS** activado.

## Deploy en Hugging Face

1. Andá a [huggingface.co/spaces](https://huggingface.co/spaces) y creá un **New Space**.
2. Elegí **Static** como SDK.
3. Subí los 3 archivos de esta carpeta (`index.html`, `app.js`, `style.css`).
4. Hugging Face publica automáticamente tu screener en una URL pública.

## Seguridad

- El frontend usa la **publishable key** de Supabase (`sb_publishable_...`).
- Row Level Security (RLS) está configurado para **solo lectura pública**.
- **Nunca** subas la `service_role` key al frontend.

## Actualización de datos

Este frontend es **solo lectura**. Los datos se escriben desde los scripts Python corriendo localmente:

- `python webapp/price_updater.py` — actualiza precios diarios.
- `python webapp/ingestor.py` — actualiza fundamentales anuales/trimestrales.

Ambos scripts usan la `service_role` key del archivo `.env` para escribir en Supabase.
