# SPEC 13 — Autenticación con Supabase Auth

> **Estado:** Implementado
>
> **Depende de:** 06-games-table-leaderboard-supabase, 04-supabase-setup
>
> **Fecha:** 2026-06-03
>
> **Objetivo:** Conectar la pantalla de login/registro existente a Supabase Auth
>
> (email/contraseña + Google + GitHub), migrar `UserProvider` para leer la sesión
>
> real, crear la tabla `profiles` para el display name y vincular `user_id` a los
>
> scores guardados cuando el jugador está autenticado.

---

## Scope

**In:**

- Configurar en el dashboard de Supabase los proveedores Email, Google y GitHub.
- Crear la ruta `/auth/callback/route.ts` (Route Handler) que intercambia el código

  OAuth por sesión y redirige a `/`.
- Reemplazar la lógica simulada de `app/auth/page.tsx` por llamadas reales a

  Supabase Auth:
  - Registro con email/contraseña → `signUp` → muestra mensaje "revisa tu correo".
  - Login con email/contraseña → `signInWithPassword`.
  - Login con Google → `signInWithOAuth({ provider: 'google' })`.
  - Login con GitHub → `signInWithOAuth({ provider: 'github' })`.
  - Botón "JUGAR COMO INVITADO" → cierra sesión activa si la hay y continúa sin auth.
- Crear tabla `profiles` en Supabase: `user_id` (uuid PK, FK → `auth.users.id`),

  `display_name` (text), `created_at` (timestamptz).
- Trigger en Supabase que inserta una fila en `profiles` automáticamente al crearse

  un usuario en `auth.users`, tomando el `display_name` de `raw_user_meta_data`.
- Migrar `app/context.tsx` (`UserProvider`):
  - Lee la sesión de Supabase Auth en lugar de `localStorage:av_user`.
  - `AVUser` pasa a incluir `id: string` además de `name: string`.
  - Eliminar toda referencia a `localStorage:av_user`.
- Actualizar `app/Nav.tsx` para mostrar el display name del usuario autenticado

  (o "INVITADO" si no hay sesión).
- En los reproductores de juegos (`asteroids`, `tetris`, `arkanoid`, `snake`,

  `frogger`): al guardar score, leer el `user_id` de la sesión activa e incluirlo

  en el INSERT a `scores` (null si no hay sesión).

**Fuera de alcance:**

- Recuperación de contraseña ("olvidé mi contraseña") — spec futuro.
- Protección de rutas / middleware de redirección — todo sigue siendo accesible

  sin cuenta.
- Página de perfil de usuario (editar display name, ver historial) — spec futuro.
- RLS (Row Level Security) en tablas `scores` y `profiles` — spec futuro.
- Vinculación retroactiva de scores anónimos a un usuario recién registrado.
- Eliminación de cuenta.

---

## Data model

### Tabla `profiles` (Supabase)


| Columna      | Tipo        | Notas                                      |
| ------------ | ----------- | ------------------------------------------ |
| user_id      | uuid        | PK, FK → `auth.users.id` ON DELETE CASCADE |
| display_name | text        | Nick visible en leaderboard y HUD          |
| created_at   | timestamptz | default `now()`                            |


```sql
CREATE TABLE profiles (
  user_id      uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name text NOT NULL,
  created_at   timestamptz DEFAULT now()
);
```

### Trigger — auto-insertar perfil al registrarse

```sql
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO profiles (user_id, display_name)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'display_name', split_part(NEW.email, '@', 1))
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();
```

> Si el usuario se registra con OAuth (Google/GitHub), `display_name` coge el
>
> nombre del proveedor vía `raw_user_meta_data->>'full_name'`; si se registra con
>
> email/contraseña, coge la parte local del email como fallback.

### Cambios en `lib/supabase/types.ts`

```ts
export interface ProfileRow {
  user_id: string;
  display_name: string;
  created_at: string;
}
```

### Cambios en `AVUser` (`app/data.ts`)

```ts
export interface AVUser {
  id: string; // UUID de Supabase Auth
  name: string; // display_name de profiles
}
```

### `UserProvider` actualizado (`app/context.tsx`)

- Llama a `supabase.auth.getSession()` en el mount para hidratar el estado.
- Escucha `supabase.auth.onAuthStateChange` para reaccionar a login/logout/OAuth.
- Al detectar sesión activa, consulta `profiles` por `user_id` para obtener

  `display_name` y construir `AVUser { id, name }`.
- Si no existe fila en `profiles`, hace INSERT con fallback antes de construir `AVUser`.
- `setUser` queda solo para logout (`null`) — el login lo gestiona Supabase Auth.
- `localStorage:av_user` se elimina completamente.

---

## Implementation plan

1. **Configurar proveedores en Supabase Dashboard**

- Activar Email Auth (confirmar email debe estar activo).
- Añadir Google OAuth: crear credenciales en Google Cloud Console,

  pegar `Client ID` y `Client Secret` en Supabase → Auth → Providers → Google.
- Añadir GitHub OAuth: crear OAuth App en GitHub Developer Settings,

  pegar `Client ID` y `Client Secret` en Supabase → Auth → Providers → GitHub.
- En ambos proveedores, añadir como Redirect URL:

  `http://localhost:3000/auth/callback` (dev) y la URL de producción.

  Verificación: los tres proveedores aparecen como "Enabled" en el dashboard.

2. **Crear tabla `profiles` y trigger**

- Ejecutar en el SQL Editor de Supabase el DDL del data model:

  tabla `profiles` + función `handle_new_user` + trigger `on_auth_user_created`.

  Verificación: la tabla aparece en Table Editor; crear un usuario de prueba

  desde Authentication → Users genera automáticamente una fila en `profiles`.

3. **Actualizar `lib/supabase/types.ts`**

- Añadir `ProfileRow` tal como se define en el data model.
- Actualizar `AVUser` en `app/data.ts` para incluir `id: string`.

  Verificación: `pnpm build` sin errores de TypeScript en estos archivos.

4. **Crear `/auth/callback/route.ts`**

- Route Handler que recibe `?code=...` de Supabase OAuth,

  llama a `supabase.auth.exchangeCodeForSession(code)` y redirige a `/`.
- Si no hay `code`, redirige a `/auth` con `?error=missing_code`.

  Verificación: el flujo OAuth completo redirige correctamente a `/`.

5. **Migrar `app/context.tsx`**

- Añadir estado `loading: boolean` (inicialmente `true`); mientras sea `true`,

  `UserProvider` no renderiza el contenido dependiente de sesión — evita el

  flash de "INVITADO" en el primer render.
- En el mount, llamar a `supabase.auth.getSession()`:
  - Si hay sesión, consultar `profiles` por `user_id`.
  - Si no existe fila en `profiles` (cuenta OAuth confirmada sin trigger),
  
    hacer `INSERT INTO profiles (user_id, display_name) VALUES (id, fallback)`
  
    donde `fallback` es `user_metadata.full_name ?? split_part(email, '@', 1)`.
  - Construir `AVUser { id, name: display_name }` y guardar en estado.
- Suscribirse a `supabase.auth.onAuthStateChange` para reaccionar a

  login / logout / renovación de token; aplicar la misma lógica de

  consulta + fallback INSERT al recibir evento `SIGNED_IN`.
- Al recibir `SIGNED_OUT`, limpiar `user` a `null`.
- Poner `loading = false` al terminar la hidratación inicial.
- Eliminar `setUser` del contrato público del contexto; el logout se hace

  con `supabase.auth.signOut()` directamente desde los componentes.

  Verificación: al recargar con sesión activa, no hay flash de "INVITADO";

  un usuario OAuth sin fila en `profiles` obtiene su nombre correctamente.

6. **Reemplazar lógica de `app/auth/page.tsx`**

- Registro: `supabase.auth.signUp({ email, password, options: { data: { display_name: username } } })`

  → mostrar mensaje "Revisa tu correo para confirmar tu cuenta".
- Login: `supabase.auth.signInWithPassword({ email, password })` → redirigir a `/`.
- Google: `supabase.auth.signInWithOAuth({ provider: 'google', options: { redirectTo: '/auth/callback' } })`.
- GitHub: `supabase.auth.signInWithOAuth({ provider: 'github', options: { redirectTo: '/auth/callback' } })`.
- "JUGAR COMO INVITADO": `supabase.auth.signOut()` si hay sesión, luego `router.push('/')`.
- Manejo de errores: mostrar mensajes inline bajo el formulario

  ("Contraseña incorrecta", "Email ya registrado", etc.).

  Verificación: los cuatro flujos completan sin error; el mensaje de confirmación

  aparece al registrarse.

7. **Actualizar `app/Nav.tsx`**

- Leer `useUser().user` para mostrar el `name` del usuario autenticado.
- Si no hay sesión: mostrar "INVITADO" y enlace a `/auth`.
- Si hay sesión: mostrar el `name` y un botón de logout

  (`supabase.auth.signOut()` → `router.refresh()`).

  Verificación: el nombre aparece en la nav tras login y desaparece tras logout.

8. **Vincular `user_id` en los reproductores de juegos**

- En `asteroids`, `tetris`, `arkanoid`, `snake` y `frogger`: al insertar en

  `scores`, leer `(await supabase.auth.getSession()).data.session?.user.id ?? null`

  e incluirlo en el INSERT.

  Verificación: tras una partida con sesión activa, la fila en `scores` tiene

  `user_id` relleno; sin sesión sigue siendo `null`.

9. **Verificación final**

- `pnpm lint` y `pnpm build` sin errores.
- Eliminar cualquier referencia residual a `localStorage:av_user` del codebase.

---

## Acceptance criteria

- [ ] La tabla `profiles` existe en Supabase con las columnas del data model.
- [ ] El trigger `on_auth_user_created` inserta automáticamente una fila en
  ```
  `profiles` al crear un usuario nuevo en `auth.users`.
  ```
- [ ] Un usuario puede registrarse con email/contraseña y recibe un email
  ```
  de confirmación antes de poder acceder.
  ```
- [ ] Un usuario puede iniciar sesión con email/contraseña correctos.
- [ ] Un usuario puede iniciar sesión con Google OAuth y es redirigido a `/`
  ```
  tras el callback.
  ```
- [ ] Un usuario puede iniciar sesión con GitHub OAuth y es redirigido a `/`
  ```
  tras el callback.
  ```
- [ ] Al pulsar "JUGAR COMO INVITADO" se cierra cualquier sesión activa y se
  ```
  navega a `/` sin usuario autenticado.
  ```
- [ ] El formulario muestra un mensaje de error inline cuando las credenciales
  ```
  son incorrectas o el email ya está registrado.
  ```
- [ ] `UserProvider` lee la sesión de Supabase Auth; no hay ninguna referencia
  ```
  a `localStorage:av_user` en el codebase.
  ```
- [ ] Al recargar la página con sesión activa, no hay flash de "INVITADO" —
  ```
  el contenido dependiente de sesión espera a que `loading` sea `false`.
  ```
- [ ] Un usuario OAuth sin fila en `profiles` obtiene su nombre correctamente
  ```
  gracias al INSERT de fallback en `UserProvider`.
  ```
- [ ] La nav muestra el `display_name` del usuario autenticado y un botón de
  ```
  logout; sin sesión muestra "INVITADO" y enlace a `/auth`.
  ```
- [ ] Al cerrar sesión desde la nav, el estado se limpia y la nav vuelve a
  ```
  mostrar "INVITADO".
  ```
- [ ] Tras una partida con sesión activa, la fila insertada en `scores` tiene
  ```
  `user_id` relleno con el UUID del usuario.
  ```
- [ ] Tras una partida sin sesión, `user_id` en `scores` sigue siendo `null`.
- [ ] `pnpm lint` y `pnpm build` completan sin errores.

---

## Decisions

- **Sí: Email/contraseña + Google + GitHub en el mismo spec** — los tres

  proveedores comparten la misma infraestructura de callback y contexto;

  separarlos hubiera generado specs intermedios sin valor visible.
- **Sí: Confirmación de email activa** — reduce cuentas basura y spam en el

  leaderboard; la fricción es mínima para un usuario real.
- **Sí: Tabla `profiles` separada en lugar de `user_metadata`** — permite

  queries directas desde Server Components sin pasar por la API de Auth;

  facilita una futura página de perfil con historial de scores.
- **Sí: Trigger en base de datos para crear el perfil** — garantiza que toda

  cuenta tenga perfil sin depender de que el cliente lo cree; es atómico y

  no falla silenciosamente.
- **Sí: INSERT de fallback en `UserProvider`** — cubre el caso donde el trigger

  falla (OAuth edge case); el cliente actúa como red de seguridad sin duplicar

  lógica de negocio.
- **Sí: Estado `loading` en `UserProvider`** — evita el flash de "INVITADO"

  durante la hidratación inicial de la sesión de Supabase Auth.
- **Sí: `user_id` en scores desde este spec** — es el momento natural; añadirlo

  después requeriría revisar todos los reproductores de nuevo.
- **Sí: `/auth/callback/route.ts` como Route Handler** — patrón estándar de

  `@supabase/ssr`; da control explícito sobre la redirección post-OAuth y

  permite añadir lógica futura (crear perfil si no existe, logging, etc.).
- **No: Protección de rutas con middleware** — la plataforma está diseñada para

  jugar sin cuenta; forzar login reduciría la participación. Se reconsiderará

  si aparece contenido exclusivo para usuarios registrados.
- **No: Recuperación de contraseña** — añade rutas de callback adicionales y

  manejo de tokens de reset; merece su propio spec.
- **No: RLS en `profiles` y `scores`** — las tablas siguen abiertas; la

  política de seguridad se define en un spec dedicado cuando haya roles claros.
- **No: Vinculación retroactiva de scores anónimos** — un score guardado sin

  sesión no se asocia al usuario si luego se registra; la complejidad no

  justifica el beneficio en esta fase.

---

## Risks

- **Redirect URL mal configurada en Google / GitHub** — si la URL de callback

  no coincide exactamente con la registrada en el proveedor OAuth, el login

  fallará con un error del proveedor (no de Supabase). Mitigación: añadir tanto

  `localhost:3000` como la URL de producción antes de desplegar.
- **Trigger con `SECURITY DEFINER` en Supabase** — la función corre con

  permisos elevados; un error en ella bloquearía el registro de nuevos usuarios.

  Mitigación: probar el trigger con un usuario de prueba antes de considerar

  el spec terminado.
- ~~Flash de "INVITADO" al hidratar~~ — resuelto en el paso 5 del plan con

  estado `loading` en `UserProvider`.
- ~~Perfil inexistente tras confirmación de email~~ — resuelto en el paso 5

  del plan con INSERT de fallback en `UserProvider`.
- ~~**Deadlock en `onAuthStateChange` con callback `async`**~~ — **resuelto**

  (ver sección [Nota de implementación](#nota-de-implementación-deadlock-en-onauthstatechange)).

---

## Nota de implementación — Deadlock en `onAuthStateChange`

### Problema

El plan original proponía que `UserProvider` hiciera la consulta a `profiles`

**directamente dentro del callback de `onAuthStateChange`**:

```ts
// ❌ PATRÓN ROTO — provoca deadlock
supabase.auth.onAuthStateChange(async (_event, session) => {
  if (session) {
    const name = await supabase.from('profiles').select('display_name')...  // se cuelga aquí
    setUser({ id: session.user.id, name });
  }
});
```

Existe un **bug conocido de `supabase-js`**

([referencia oficial](https://supabase.com/docs/guides/troubleshooting/why-is-my-supabase-api-call-not-returning-PGzXw0)):

hacer cualquier llamada async a la API de Supabase dentro del callback de

`onAuthStateChange` provoca un **deadlock** — esa llamada y todas las siguientes

sobre el mismo cliente quedan colgadas indefinidamente. Como consecuencia,

`setUser` nunca se ejecuta, `user` queda `null` en todo el árbol React y **ni el**

**navbar ni el redirect de `/auth` funcionan**, aunque el usuario tenga sesión activa.

> El bug afecta tanto al evento `INITIAL_SESSION` (carga de página con sesión
>
> existente) como a `SIGNED_IN`.

### Solución implementada

El callback de `onAuthStateChange` debe ser **síncrono** y no invocar métodos de

Supabase directamente. La consulta a `profiles` se **difiere** con `setTimeout(0)`

para que corra fuera del lock interno de auth:

```ts
// ✅ PATRÓN CORRECTO — app/context.tsx
function userFromSession(session: Session): AVUser {
  const meta = session.user.user_metadata ?? {};
  const name =
    meta.full_name ??
    meta.display_name ??
    session.user.email?.split('@')[0] ??
    'Usuario';
  const avatar = meta.avatar_url ?? meta.picture ?? null;
  return { id: session.user.id, name, avatar };
}

supabase.auth.onAuthStateChange((_event, session) => {
  // ⚠️ NO async aquí
  if (session) {
    setUser(userFromSession(session)); // síncrono con user_metadata
    setLoading(false);
    setTimeout(() => {
      // consulta a profiles FUERA del lock
      fetchOrCreateProfile(supabase, session.user.id, base.name)
        .then((name) => setUser((prev) => (prev ? { ...prev, name } : prev)))
        .catch(() => {});
    }, 0);
  } else {
    setUser(null);
    setLoading(false);
  }
});
```

**Flujo resultante:**

1. `INITIAL_SESSION` dispara al montar → `setUser` con datos de `user_metadata` → navbar se pinta
2. `setTimeout(0)` → consulta a `profiles` → actualiza el nombre canónico si difiere
3. `/auth` con sesión activa → `useEffect` detecta `user !== null` → `router.replace('/')`

El avatar (foto de Google/GitHub) se obtiene de `user_metadata.avatar_url` o

`user_metadata.picture`. Usuarios de email/contraseña no tienen imagen; el navbar

muestra la inicial del nombre como fallback.

> **Regla general para este proyecto:** nunca usar `async`/`await` ni llamar
>
> métodos del cliente Supabase directamente dentro del callback de
>
> `onAuthStateChange`. Diferir siempre con `setTimeout(0)` o usar un estado
>
> intermedio.

