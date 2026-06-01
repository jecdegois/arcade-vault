# SPEC 11 — Corrección de layout del reproductor y controles táctiles

> **Estado:** Approve
> **Depende de:** 10-mobile-touch-support
> **Fecha:** 2026-06-01
> **Objetivo:** Corregir el reproductor genérico y los cuatro reproductores específicos
> para que el gamepad táctil no aparezca en desktop, el canvas escale correctamente
> en móvil y el D-pad despache eventos de teclado funcionales.

---

## Scope

**In:**

- Corregir la visibilidad del gamepad táctil: debe estar **oculto en desktop** (`md:hidden`
  o equivalente) y visible solo en `< 768 px`. Afecta a los cuatro reproductores
  específicos y/o al propio componente de gamepad.
- Corregir el escalado del canvas en móvil: el canvas debe ocupar el ancho disponible
  (`width: 100%`) manteniendo su `aspect-ratio` original, sin scroll horizontal ni
  scroll vertical causado por el canvas.
- Corregir el D-pad: los botones deben despachar `KeyboardEvent` sintéticos sobre
  `document` con `bubbles: true` y los `key` correctos definidos en spec 10, de forma
  que los listeners existentes de cada juego los reciban.
- Los archivos afectados son los cuatro reproductores específicos
  (`asteroids/play/page.tsx`, `tetris/play/page.tsx`, `arkanoid/play/page.tsx`,
  `snake/play/page.tsx`) y los componentes de controles en
  `app/components/games/controls/`.

**Fuera de alcance:**

- Rediseño visual del HUD (puntuación, vidas, nivel).
- Reubicación del selector de skins ni de los botones PAUSA / FIN / SALIR.
- Soporte landscape en móvil.
- Nuevos juegos o nuevos mapeos de teclas.
- El reproductor genérico `games/[id]/play/page.tsx` (no renderiza canvas jugable).

---

## Plan de implementación

1. **Auditar visibilidad del gamepad** — leer los cuatro reproductores específicos y el
   componente de gamepad (`GamepadMkII.tsx` o equivalente) para identificar dónde falta
   la clase `md:hidden` (o el condicional equivalente) que lo oculta en desktop.

2. **Corregir visibilidad en desktop** — añadir `md:hidden` al wrapper del gamepad en
   cada reproductor o en el propio componente, de modo que en `>= 768 px` no se renderice
   ni ocupe espacio en el layout.

3. **Corregir escalado del canvas en móvil** — en cada reproductor específico, envolver
   el canvas en un contenedor con `w-full` y aplicar al canvas `width: 100%` +
   `height: auto` + `aspect-ratio` preservado via CSS o `CanvasScaleWrapper` si ya existe.
   Verificar que no haya scroll horizontal en viewport de 375 px.

4. **Diagnosticar el D-pad** — revisar el código de `GamepadMkII.tsx` y los controles
   individuales (`AsteroidsControls.tsx`, etc.) para identificar por qué los
   `KeyboardEvent` sintéticos no llegan a los listeners de cada juego.

5. **Corregir el dispatch del D-pad** — asegurar que cada botón llama a
   `document.dispatchEvent(new KeyboardEvent('keydown', { key: '...', bubbles: true }))`
   con el `key` correcto para cada juego. Verificar también que se despacha `keyup` si
   algún juego lo requiere.

6. **Verificar con `pnpm build`** — confirmar que no hay errores de TypeScript ni de
   compilación tras los cambios.

---

## Criterios de aceptación

- [ ] En viewport >= 768 px (desktop), el gamepad táctil no es visible en ninguno
      de los cuatro reproductores.
- [ ] En viewport >= 768 px, el layout del reproductor no tiene espacio vacío ni
      desplazamiento causado por el gamepad.
- [ ] En viewport < 768 px (móvil), el canvas ocupa el ancho completo de la pantalla
      sin scroll horizontal.
- [ ] En viewport < 768 px, el canvas mantiene su aspect-ratio original (no se
      distorsiona).
- [ ] En viewport < 768 px, pulsar cada botón del D-pad produce la acción correcta
      en el juego (movimiento, disparo, rotación, etc.) según los mapeos de spec 10.
- [ ] `pnpm build` finaliza sin errores.

---

## Decisiones tomadas y descartadas

- **Scope limitado a reproductores específicos** — el reproductor genérico
  (`games/[id]/play/page.tsx`) no renderiza canvas jugable real, por lo que no
  tiene gamepad ni canvas que corregir. Descartado de alcance.

- **Sin rediseño visual** — el HUD, los botones y el selector de skins se dejan
  intactos. Los problemas reportados son de layout y funcionalidad, no de diseño.

- **Corrección sobre spec 10, no reescritura** — se corrigen los bugs de la
  implementación existente en lugar de reescribir los componentes desde cero,
  para minimizar regresiones.

- **`md:hidden` como mecanismo de ocultado** — se usa la utilidad de Tailwind en
  lugar de `useMediaQuery` o lógica JS, para mantener consistencia con el resto
  del proyecto y evitar flicker de hidratación.

---

## Riesgos

- **D-pad: listeners registrados antes del mount del componente** — si algún juego
  registra sus listeners de teclado con `capture: true` o en un elemento distinto
  de `document`, los eventos sintéticos del D-pad no llegarán. Mitigación: verificar
  el target y las opciones de cada `addEventListener` en los cuatro juegos antes de
  corregir el dispatch.

- **Canvas scaling rompe la lógica de coordenadas** — si algún juego (Arkanoid)
  usa coordenadas absolutas del canvas para detectar clics o posición del ratón,
  escalar con CSS sin ajustar `getBoundingClientRect` puede desalinear la interacción.
  Mitigación: verificar que Arkanoid no usa eventos de puntero que dependan del
  tamaño visual del canvas.
