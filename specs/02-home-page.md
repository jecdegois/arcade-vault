# SPEC 02 — Página Home (/home → reemplaza /)

> **Status:** Implemented  
> **Depende de:** 01-mvp-visual  
> **Fecha:** 2026-05-23  
> **Objetivo:** Implementar la página Home en la ruta `/` migrando `references/templates/home-about/home.jsx` a Next.js App Router, y mover la Library a `/games`.

---

## Scope

**In:**

- Mover `app/page.tsx` (Library) a `app/games/page.tsx`
- Crear `app/page.tsx` con el componente `Home` migrado desde `references/templates/home-about/home.jsx`
- Añadir los estilos de home de `references/templates/home-about/styles.css` a `app/globals.css`
- 7 secciones de la Home: Hero, ¿Por qué Arcade Vault?, Juegos disponibles (mini-rail decorativo), Stats, Actividad en vivo (datos de `seededScores()`), Precios, CTA final
- CTAs de navegación con `<Link>` de Next.js: "EXPLORAR JUEGOS" → `/games`, "CREAR CUENTA" → `/auth`, "VER SALÓN" → `/hall-of-fame`
- Componentes internos `FloatingSilhouettes`, `FeatureIcon`, `MiniCard` como componentes locales del archivo

**Out of scope:**

- La página About (`about.jsx` del mismo directorio de referencia)
- Actualizar links en `Nav` para reflejar el cambio `/` → `/games` (asumido ya correcto desde spec 01)
- Interactividad real en el mini-rail (sin navegación al hacer clic)
- Animaciones de reveal por IntersectionObserver (se puede añadir en spec posterior)

---

## Implementation plan

- [x] 1. Mover `app/page.tsx` (Library) a `app/games/page.tsx`.
         Verificación: abrir `/games` con Playwright y comparar screenshot contra
         `references/templates/home-about/arcade-vault-standalone.html` (vista biblioteca).

- [x] 2. Añadir los estilos de Home de `references/templates/home-about/styles.css`
         (bloque `/* ===== HOME PAGE ===== */` en adelante, excluyendo `/* ===== ABOUT PAGE ===== */`)
         a `app/globals.css`.
         Verificación: screenshot de `/games`, `/auth`, `/hall-of-fame` con Playwright — sin regresión visual.

- [x] 3. Crear `app/page.tsx` con los componentes `FloatingSilhouettes`, `FeatureIcon`,
         `MiniCard` y `Home` migrados a TSX. CTAs con `<Link>`. Mini-rail sin `onClick`.
         La sección "Actividad en vivo" usa datos derivados de `seededScores()`.
         Verificación: abrir `/` con Playwright y comparar sección a sección contra
         `references/templates/home-about/home.jsx` cargado en `arcade-vault-standalone.html`.
         Ajustar estilos hasta lograr paridad visual pixel-perfect.

- [x] 4. Verificar navegación con Playwright: clicar cada CTA y confirmar que la URL resultante
         es la esperada: "EXPLORAR JUEGOS" → `/games`, "CREAR CUENTA" → `/auth`,
         "VER SALÓN →" → `/hall-of-fame`, "INSERTAR MONEDA →" → `/games`.

---

## Acceptance criteria

- [x] `/games` carga la Library sin errores; la ruta `/` ya no devuelve la Library.
- [x] `/` carga la Home sin errores de TypeScript ni consola.
- [x] La Home muestra las 7 secciones: Hero, ¿Por qué Arcade Vault?, Juegos disponibles, Stats, Actividad en vivo, Precios, CTA final.
- [x] El mini-rail muestra los primeros 6 juegos de `GAMES`; no navega al hacer clic.
- [x] La sección "Actividad en vivo" usa datos derivados de `seededScores()`, no datos hardcodeados.
- [x] Los 4 CTAs navegan a la ruta correcta con `<Link>` de Next.js.
- [x] Screenshot de Playwright de `/` es pixel-perfect respecto a la referencia `home.jsx` en `arcade-vault-standalone.html`.
- [x] No hay regresión visual en `/games`, `/auth` y `/hall-of-fame` tras añadir los estilos.
- [x] La página es navegable en viewport móvil (375px) sin scroll horizontal.

---

## Decisions

- **Sí:** La Home reemplaza `/` y la Library pasa a `/games`.
  El Home es la puerta de entrada natural de la plataforma; la Library queda como sección interna.

- **Sí:** Componentes `FloatingSilhouettes`, `FeatureIcon` y `MiniCard` como componentes locales en `app/page.tsx`.
  Son exclusivos de esta página y no se reutilizan en ninguna otra ruta.

- **Sí:** Mini-rail decorativo sin navegación al hacer clic.
  El objetivo de esta sección es mostrar juegos como atractivo visual, no duplicar la funcionalidad de Library.

- **Sí:** `seededScores()` para la sección "Actividad en vivo".
  Mantiene consistencia con el resto de la app; evita datos hardcodeados que divergirían del mock data.

- **No:** IntersectionObserver para animaciones `.reveal`.
  Añade complejidad de hidratación SSR/cliente sin impacto funcional. Se puede añadir en spec posterior.

- **No:** `onClick` en mini-rail hacia `/games/[id]`.
  Explícitamente descartado por el usuario; el mini-rail es solo decorativo en este spec.

---

## Risks

| Riesgo | Mitigación |
|---|---|
| Los estilos de Home en `globals.css` colisionan con clases existentes | Revisar que los selectores del bloque HOME no sobreescriban reglas de Library, Auth o Hall of Fame. Playwright detecta regresiones en el paso 2. |
| `seededScores()` devuelve entradas por `gameId`; la sección "Actividad en vivo" necesita aplanar scores de todos los juegos | Derivar un array unificado ordenado por score en el componente antes de renderizar. |
| Mover Library de `/` a `/games` rompe links en `Nav` que apunten a `/` | Verificar y actualizar `Nav.tsx` como parte del paso 1. |
