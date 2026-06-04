# SPEC 14 — Seguridad: RLS, contraseña robusta y headers HTTP

> **Estado:** Aprobado
> **Depende de:** 04-supabase-integration · 06-games-table-leaderboard-supabase · 13-supabase-auth
> **Fecha:** 2026-05-26
> **Objetivo:** Aplicar el checklist de seguridad: RLS en `games` y `scores`,
> validación de contraseña robusta en el cliente, configuración de Supabase Auth
> (contraseña mínima, leaked-password, signup rate) y headers HTTP en Next.js.

---

## Scope

**In:**

- Supabase Dashboard (SQL Editor vía MCP) — habilitar RLS en `games` y `scores`,
  eliminar la política permisiva `public_insert_scores`, crear políticas correctas,
  revocar/eliminar la función `rls_auto_enable()`.
- Supabase Dashboard — Auth Settings: mínimo 8 caracteres, leaked-password
  protection ON, max signup rate.
- `app/auth/page.tsx` — añadir validación de contraseña con regex en el formulario
  de registro; mostrar mensaje de error inline si no se cumple antes de llamar a
  Supabase.
- `next.config.ts` — añadir los tres headers de seguridad HTTP en todas las rutas.
- Protección de rutas con Proxy Next.js: información sobre proxy aquí:
  https://nextjs.org/docs/app/getting-started/proxy

Ejemplo: proxy.ts

```ts
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// This function can be marked `async` if using `await` inside
export function proxy(request: NextRequest) {
  return NextResponse.redirect(new URL('/home', request.url));
}

// Alternatively, you can use a default export:
// export default function proxy(request: NextRequest) { ... }

export const config = {
  matcher: '/about/:path*',
};
```

**Out:**

- Content-Security-Policy y HSTS — configuración más compleja, spec futuro.
- Edición de perfil / cambio de contraseña desde panel de usuario — spec futuro.
- Validación de fortaleza de contraseña en el formulario de login — solo se valida
  en registro; el login delega la verificación a Supabase.
- FK formal entre `scores.user_id` y `auth.users` — queda para cuando se añada
  tabla `profiles`.

---

## Modelo de datos

No se crean tablas nuevas. Cambios sobre lo existente:

### Políticas RLS — `public.scores`

| Operación | Rol                 | Condición                                                  |
| --------- | ------------------- | ---------------------------------------------------------- |
| SELECT    | anon, authenticated | `USING (true)` — leaderboard público                       |
| INSERT    | authenticated       | `WITH CHECK (auth.uid() = user_id)` — solo el propio score |

Se elimina la política actual `public_insert_scores` (WITH CHECK always-true).

### Políticas RLS — `public.games`

| Operación | Rol                 | Condición                         |
| --------- | ------------------- | --------------------------------- |
| SELECT    | anon, authenticated | `USING (true)` — catálogo público |

No se crean políticas de INSERT / UPDATE / DELETE: ningún cliente puede modificar
el catálogo de juegos.

### Función `public.rls_auto_enable()`

Se elimina (`DROP FUNCTION public.rls_auto_enable()`). Fue creada automáticamente
por Supabase como auxiliar; ya no es necesaria.

### Regex de contraseña (frontend)

```ts
const PASSWORD_REGEX = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z\d]).{8,}$/;
```

Requisitos que valida:

- Al menos una letra minúscula
- Al menos una letra mayúscula
- Al menos un dígito
- Al menos un símbolo (cualquier carácter que no sea letra ni dígito)
- Longitud mínima de 8 caracteres

---

## Plan de implementación

1. **Habilitar RLS y aplicar políticas en Supabase (via MCP)**

   Ejecutar en el SQL Editor:

   ```sql
   -- Habilitar RLS en ambas tablas
   ALTER TABLE public.games ENABLE ROW LEVEL SECURITY;
   ALTER TABLE public.scores ENABLE ROW LEVEL SECURITY;

   -- games: solo lectura pública
   CREATE POLICY "public_read_games"
     ON public.games FOR SELECT
     TO anon, authenticated
     USING (true);

   -- scores: lectura pública
   CREATE POLICY "public_read_scores"
     ON public.scores FOR SELECT
     TO anon, authenticated
     USING (true);

   -- scores: eliminar política permisiva existente
   DROP POLICY IF EXISTS "public_insert_scores" ON public.scores;

   -- scores: inserción solo del propio score
   CREATE POLICY "authenticated_insert_own_score"
     ON public.scores FOR INSERT
     TO authenticated
     WITH CHECK (auth.uid() = user_id);

   -- Eliminar función auxiliar no necesaria
   DROP FUNCTION IF EXISTS public.rls_auto_enable();
   ```

   Verificación: en el SQL Editor, `SELECT * FROM public.scores` como rol `anon`
   devuelve filas; un INSERT sin sesión activa devuelve error de RLS.

2. **Configurar Supabase Auth settings (Dashboard manual)**

   Authentication → Settings:
   - **Minimum password length**: 8
   - **Password strength**: habilitar "Leaked Password Protection" (HaveIBeenPwned)
   - **Rate limiting**: "Max signups per hour per IP" — valor recomendado por
     Supabase: 10 (ajustar según tráfico esperado)

   Verificación: intentar crear cuenta con contraseña "password" (conocida como
   filtrada) devuelve error de Supabase.

3. **Validación de contraseña en `app/auth/page.tsx`**
   - Definir la constante `PASSWORD_REGEX` al inicio del componente.
   - En el handler del formulario de registro (antes de llamar a
     `supabase.auth.signUp`): evaluar `PASSWORD_REGEX.test(password)`.
   - Si no pasa: establecer un estado de error local y mostrar debajo del campo
     de contraseña el mensaje:
     _"La contraseña debe tener mínimo 8 caracteres e incluir mayúsculas,
     minúsculas, números y símbolos."_
   - Si pasa: limpiar el error y continuar con el flujo normal.
   - No llamar a Supabase si la validación falla (evitar el round-trip
     innecesario).

   Verificación: rellenar el form de registro con "abc" → aparece el mensaje de
   error, el formulario no envía; con "Abc123!@" → no aparece error y el flujo
   continúa.

4. **Añadir security headers en `next.config.ts`**

   ```ts
   const securityHeaders = [
     { key: 'X-Content-Type-Options', value: 'nosniff' },
     { key: 'X-Frame-Options', value: 'DENY' },
     { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
     { key: 'X-DNS-Prefetch-Control', value: 'off' },
   ];

   // En el objeto de configuración de Next.js:
   headers: async () => [
     { source: '/(.*)', headers: securityHeaders },
   ],
   ```

   Verificación: `curl -I http://localhost:3000` muestra los cuatro headers en
   la respuesta.

5. **Protección de rutas con Proxy Next.js**

6. **Verificación final**

   `npm run build` completa sin errores de TypeScript.
   La app carga en el navegador sin errores de consola relacionados con RLS o headers.

---

## Criterios de aceptación

- [ ] RLS está habilitado en `public.games` con política SELECT pública.
- [ ] RLS está habilitado en `public.scores` con política SELECT pública.
- [ ] La política `public_insert_scores` (WITH CHECK always-true) ha sido eliminada.
- [ ] Solo usuarios autenticados pueden insertar en `scores`, y solo con `user_id = auth.uid()`.
- [ ] Ningún cliente puede INSERT / UPDATE / DELETE en `games`.
- [ ] La función `rls_auto_enable()` ha sido eliminada de Supabase.
- [ ] En Auth Settings: longitud mínima de contraseña = 8.
- [ ] En Auth Settings: Leaked Password Protection está activado.
- [ ] En Auth Settings: Max signup rate está configurado.
- [ ] El formulario de registro muestra error inline si la contraseña no cumple el regex.
- [ ] El formulario de registro no llama a Supabase si la contraseña no cumple el regex.
- [ ] Una contraseña válida ("Abc123!@") pasa la validación sin mostrar error.
- [ ] Los headers `X-Content-Type-Options`, `X-Frame-Options`, `Referrer-Policy` y
      `X-DNS-Prefetch-Control` están presentes en todas las respuestas HTTP.
- [ ] `npm run build` completa sin errores de TypeScript.

---

## Decisiones tomadas

- **Sí: DROP `rls_auto_enable()`** — fue creada automáticamente por Supabase; no
  tiene uso en la app y expone una superficie de ataque innecesaria.

- **Sí: SELECT público en `scores`** — el leaderboard debe ser visible sin login;
  la alternativa (solo autenticados ven el leaderboard) añadiría fricción sin
  beneficio de seguridad real.

- **Sí: INSERT en `scores` solo para autenticados con `auth.uid() = user_id`** —
  impide que un usuario anónimo o autenticado falsifique scores en nombre de otro.

- **Sí: validación regex solo en registro, no en login** — el login delega a
  Supabase; añadir regex ahí bloquearía a usuarios que crearon su cuenta antes de
  este spec o por OAuth.

- **No: CSP ni HSTS en este spec** — Content-Security-Policy requiere inventariar
  todos los orígenes externos (Supabase, Resend, fuentes, etc.) y HSTS tiene
  implicaciones irreversibles en el dominio. Ambos merecen su propio spec.

- **No: FK `scores.user_id → auth.users`** — sin tabla `profiles` la FK apunta
  directamente a `auth.users`, que Supabase no recomienda referenciar directamente
  desde `public`. Se añade cuando exista `profiles`.

---

## Riesgos identificados

- **Scores históricos con `user_id = null`** — los scores guardados antes de este
  spec (por invitados) tienen `user_id = null`. La política INSERT con
  `auth.uid() = user_id` los bloquearía si un invitado intenta insertar ahora.
  Esto es intencionado: a partir de este spec solo usuarios autenticados guardan
  scores. Los scores históricos en el leaderboard siguen visibles (SELECT público).

- **RLS en `games` puede romper queries existentes** — si algún componente hace
  una query a `games` sin pasar las credenciales correctas. Mitigación: la política
  SELECT es pública (`anon` incluido), así que ninguna query existente debería fallar.

- **Usuarios que crearon su cuenta antes del regex** — podrían tener contraseñas
  que no cumplirían el nuevo regex. No hay problema porque el regex solo aplica
  al formulario de registro del cliente; el login no lo usa.