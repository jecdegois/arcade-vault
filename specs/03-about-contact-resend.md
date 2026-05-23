# SPEC 03 — Página About + formulario de contacto con Resend

> **Status:** Approve
> **Depende de:** 02-home-page
> **Fecha:** 2026-05-23
> **Objetivo:** Implementar la página `/about` migrando `about.jsx` a Next.js App Router y conectar el formulario de contacto a Resend para enviar correos reales a jecdegois12345@gmail.com.

---

## Scope

**In:**

- Añadir los estilos de About de `references/templates/home-about/styles.css`
  (bloque `/* ===== ABOUT PAGE ===== */`) a `app/globals.css`
- Crear `app/about/page.tsx` con los componentes `HighlightIcon` y `About`
  migrados desde `about.jsx`, incluyendo animaciones `.reveal` con IntersectionObserver
- Añadir link `/about` al final de los links de `app/components/Nav.tsx`
- Crear API route `app/api/contact/route.ts` que recibe `{ name, email, msg }`
  y envía el correo vía Resend SDK a `jecdegois12345@gmail.com`
- Instalar dependencia `resend` con pnpm
- Configurar `RESEND_API_KEY` en `.env.local`
- El formulario muestra el estado terminal de éxito tras respuesta 200 de la API
- El formulario muestra un mensaje de error visible si la API falla (estado nuevo, no existe en el prototipo)

**Out of scope:**

- Verificación de dominio propio en Resend (se usará sandbox `onboarding@resend.dev`)
- Email de confirmación al remitente (solo se notifica al admin)
- Rate limiting o captcha en el endpoint
- Validación de formato de email en el servidor más allá de que el campo no esté vacío
- Internacionalización del email enviado

---

## Implementation plan

- [ ] 1. Instalar `resend` con pnpm y añadir `RESEND_API_KEY` a `.env.local`.
         Verificación: `pnpm list resend` muestra la dependencia; `.env.local` tiene la variable.

- [ ] 2. Añadir los estilos del bloque `/* ===== ABOUT PAGE ===== */` de
         `references/templates/home-about/styles.css` a `app/globals.css`.
         Verificación: screenshot de `/games` y `/` con Playwright — sin regresión visual.

- [ ] 3. Crear `app/api/contact/route.ts` con handler POST que valida que
         `name`, `email` y `msg` no estén vacíos, llama a Resend SDK con
         `from: "onboarding@resend.dev"`, `to: "jecdegois12345@gmail.com"`,
         y devuelve `{ ok: true }` o `{ error: string }` con el status HTTP correspondiente.
         Verificación: `curl -X POST` con payload válido → llega correo a Gmail;
         con payload vacío → devuelve 400.

- [ ] 4. Crear `app/about/page.tsx` con `HighlightIcon` y `About` migrados a TSX.
         El formulario hace `fetch("/api/contact", { method: "POST", body: JSON.stringify(form) })`:
         respuesta 200 → muestra terminal de éxito; respuesta de error → muestra mensaje de error inline.
         IntersectionObserver en `useEffect` para las clases `.reveal`.
         Verificación: abrir `/about` con Playwright y comparar sección a sección contra `about.jsx`
         en `arcade-vault-standalone.html`.

- [ ] 5. Añadir link `{ href: "/about", label: "ABOUT" }` al final de los links en `Nav.tsx`.
         Verificación: link visible en desktop y en menú móvil; resaltado activo en `/about`.

---

## Acceptance criteria

- [ ] `resend` aparece en `package.json` y `RESEND_API_KEY` existe en `.env.local`.
- [ ] `/about` carga sin errores de TypeScript ni consola.
- [ ] La página muestra las dos secciones: "Acerca de" (hero + 3 highlights) y "Contacto" (intro + formulario).
- [ ] Los elementos con clase `.reveal` aparecen con animación al hacer scroll (IntersectionObserver activo).
- [ ] El formulario con campos vacíos hace shake y no llama a la API.
- [ ] Enviar el formulario con datos válidos → llega correo a `jecdegois12345@gmail.com` con nombre, email y mensaje del remitente.
- [ ] Tras envío exitoso el formulario se reemplaza por el terminal de éxito con el nombre del remitente en mayúsculas.
- [ ] El botón "ENVIAR OTRO MENSAJE" resetea el formulario y vuelve al estado inicial.
- [ ] Si la API devuelve error, el formulario muestra un mensaje de error inline sin reemplazar el formulario.
- [ ] El link "ABOUT" aparece al final del Nav en desktop y en el menú móvil, resaltado cuando la ruta es `/about`.
- [ ] No hay regresión visual en `/`, `/games`, `/auth` y `/hall-of-fame`.
- [ ] La página es navegable en viewport móvil (375px) sin scroll horizontal.

---

## Decisions

- **Sí:** API route en Next.js (`app/api/contact/route.ts`) para el envío de correo.
  La API key de Resend nunca puede exponerse al cliente; el servidor es el único lugar seguro.

- **Sí:** `from: "onboarding@resend.dev"` (sandbox de Resend).
  No hay dominio propio verificado. El sandbox solo permite enviar a emails verificados en la cuenta de Resend.

- **Sí:** `to: "jecdegois12345@gmail.com"` hardcodeado en la API route.
  Es el único destinatario; no necesita ser configurable en este spec.

- **Sí:** Animaciones `.reveal` con IntersectionObserver incluidas en este spec.
  El about.jsx las usa para la sección de contacto; omitirlas rompería la paridad visual con el prototipo.

- **Sí:** Estado de error inline en el formulario (no existe en el prototipo).
  Sin feedback de error el usuario no sabe si el envío falló; es necesario para cualquier integración real.

- **No:** Rate limiting o captcha en el endpoint.
  Sobreingenería para el MVP; el endpoint no está enlazado desde ningún bot y el volumen esperado es mínimo.

- **No:** Email de confirmación al remitente.
  El sandbox de Resend solo puede enviar al email verificado (el del admin); confirmar al remitente requeriría dominio propio.

---

## Risks

| Riesgo | Mitigación |
|---|---|
| El sandbox de Resend solo entrega correos al email verificado en la cuenta; si `jecdegois12345@gmail.com` no está verificado en Resend, el correo nunca llega. | Verificar el email en el dashboard de Resend antes de implementar el paso 3. |
| `RESEND_API_KEY` ausente en producción provoca un 500 silencioso. | La API route debe comprobar que `process.env.RESEND_API_KEY` existe y devolver 500 con mensaje claro si falta. |
| Los estilos del bloque `ABOUT PAGE` en `globals.css` colisionan con clases existentes. | Playwright detecta regresiones en el paso 2 antes de añadir la página. |
| IntersectionObserver no existe en SSR; Next.js puede intentar ejecutarlo en servidor. | Instanciar el observer solo dentro de `useEffect` (ya es el patrón del prototipo). |
