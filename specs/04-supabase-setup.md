# SPEC 04 — Integración Supabase

> **Status:** Approve
> **Depende de:** 03-about-contact-resend
> **Fecha:** 2026-05-27
> **Objetivo:** Instalar y configurar Supabase (`@supabase/supabase-js` + `@supabase/ssr`) con cliente singleton browser/server y variables de entorno documentadas, como base para specs futuros.

---

## Scope

**In:**

- Instalar `@supabase/supabase-js` y `@supabase/ssr` con pnpm
- Crear `lib/supabase/client.ts` — cliente browser (singleton con `createBrowserClient`)
- Crear `lib/supabase/server.ts` — cliente server (factory con `createServerClient` + cookies de Next.js)
- Añadir `NEXT_PUBLIC_SUPABASE_URL` y `NEXT_PUBLIC_SUPABASE_ANON_KEY` a `.env.local`
- Crear `.env.example` con los mismos keys y valores placeholder

**Out of scope:**

- Migración de autenticación (`localStorage:av_user` → Supabase Auth)
- Migración de puntuaciones (`localStorage:av_scores` → tabla Supabase)
- Creación de tablas en Supabase
- Middleware de protección de rutas
- Cualquier uso real del cliente en componentes existentes

---

## Implementation plan

[ ] 1. Instalar dependencias con pnpm: `@supabase/supabase-js` y `@supabase/ssr`.
Verificación: ambas aparecen en `package.json`.

[ ] 2. Añadir `NEXT_PUBLIC_SUPABASE_URL` y `NEXT_PUBLIC_SUPABASE_ANON_KEY` a `.env.local` con los valores del proyecto Supabase.
Verificación: variables presentes en `.env.local`.

[ ] 3. Crear `.env.example` con los mismos keys y valores placeholder (`your-supabase-url`, `your-supabase-anon-key`).
Verificación: archivo existe en la raíz del proyecto.

[ ] 4. Crear `lib/supabase/client.ts` exportando `createClient` usando `createBrowserClient` de `@supabase/ssr`.
Verificación: compila sin errores (`pnpm tsc --noEmit`).

[ ] 5. Crear `lib/supabase/server.ts` exportando `createClient` usando `createServerClient` de `@supabase/ssr` con `cookies()` de `next/headers`.
Verificación: compila sin errores (`pnpm tsc --noEmit`).

---

## Acceptance criteria

[ ] `@supabase/supabase-js` y `@supabase/ssr` aparecen en `package.json`.
[ ] `.env.local` contiene `NEXT_PUBLIC_SUPABASE_URL` y `NEXT_PUBLIC_SUPABASE_ANON_KEY` con valores reales.
[ ] `.env.example` existe en la raíz con los mismos keys y valores placeholder.
[ ] `lib/supabase/client.ts` existe y exporta `createClient` para uso en componentes cliente.
[ ] `lib/supabase/server.ts` existe y exporta `createClient` para uso en server components y route handlers.
[ ] `pnpm tsc --noEmit` pasa sin errores tras añadir los dos archivos.
[ ] La app arranca sin errores (`pnpm dev`) y las rutas existentes no tienen regresión.

---

## Decisions

- **Sí:** `@supabase/ssr` junto a `@supabase/supabase-js`.
  Necesario para compartir sesión entre server components y cliente sin refactor futuro.

- **Sí:** Dos archivos separados `client.ts` y `server.ts` en `lib/supabase/`.
  El cliente browser y el server tienen APIs distintas; mezclarlos en un solo archivo causa errores de hidratación.

- **Sí:** `.env.example` con placeholders.
  Documenta las variables requeridas sin exponer valores reales en el repositorio.

- **No:** Migración de auth ni scores en este spec.
  Se tratan en specs posteriores; este spec es solo la base de infraestructura.

- **No:** Middleware de protección de rutas.
  Sin usuarios en Supabase Auth todavía no hay nada que proteger.
