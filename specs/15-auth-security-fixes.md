# SPEC 15 — Hardening auth: enumeración de usuarios, errores de callback y REVOKE handle_new_user

> **Estado:** Draft
> **Depende de:** 13-supabase-auth · 14-security-hardening
> **Fecha:** 2026-06-03
> **Objetivo:** Corregir tres vectores de seguridad detectados en la auditoría del
> flujo de autenticación: enumeración de usuarios vía mensaje de signup, filtrado
> de errores internos en la URL del callback OAuth, y exposición de la función
> `handle_new_user()` a roles no privilegiados.

---

## Scope

**In:**

- `app/auth/page.tsx` — cambiar el mensaje de error de signup que revela si un
  email ya está registrado por un mensaje genérico que no filtra información.
- `app/auth/page.tsx` — mover `PASSWORD_REGEX` del cuerpo del componente al nivel
  del módulo (fuera de la función).
- `app/auth/callback/route.ts` — reemplazar el mensaje de error de Supabase en la
  URL de redirección por el código genérico `callback_failed`.
- Supabase Dashboard (SQL Editor vía MCP) — `REVOKE EXECUTE ON FUNCTION
public.handle_new_user() FROM anon, authenticated`.
- Supabase Dashboard — Auth Settings: activar "Leaked Password Protection"
  (HaveIBeenPwned) si no fue habilitado en spec 14.

**Out:**

- Content-Security-Policy y HSTS — spec futuro.
- Protección de rutas / middleware de autenticación — fuera de alcance.
- Validación de fortaleza de contraseña en el formulario de login — solo aplica
  en registro; el login delega a Supabase.
- Cambio a `SECURITY INVOKER` en `handle_new_user()` — el REVOKE es suficiente
  y menos invasivo para el trigger existente.
- Mapeo de errores de callback a mensajes UX detallados — se usa código genérico.

---

## Modelo de datos

No se crean tablas ni estructuras nuevas. Los únicos cambios son:

- **SQL en Supabase:** revocación de permisos sobre la función existente
  `public.handle_new_user()`.
- **Frontend:** reemplazo de literales de string y reubicación de una constante.

No hay migraciones de esquema en este spec.

---

## Plan de implementación

1. **REVOKE EXECUTE en `handle_new_user()` (Supabase SQL Editor vía MCP)**

   ```sql
   REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM anon, authenticated;
   ```

   Verificación: intentar llamar a `/rest/v1/rpc/handle_new_user` sin sesión
   devuelve `403 Forbidden`; el trigger `on_auth_user_created` sigue funcionando
   (crear un usuario de prueba genera su fila en `profiles`).

2. **Activar Leaked Password Protection (Supabase Dashboard — manual)**

   Authentication → Settings → Password → habilitar "Leaked Password Protection".

   Verificación: intentar registrarse con la contraseña `password123A!` (conocida
   como filtrada) devuelve error de Supabase antes de crear la cuenta.

3. **Corregir enumeración de usuarios en `app/auth/page.tsx`**

   Reemplazar el mensaje que revela si un email ya existe:

   ```ts
   // ❌ antes
   err.message === 'User already registered'
     ? 'Este email ya está registrado.'
     : err.message;

   // ✅ después
   ('No se pudo completar el registro. Intenta con otro email o inicia sesión.');
   ```

   Verificación: registrarse con un email existente muestra el mensaje genérico,
   sin revelar que la cuenta existe.

4. **Mover `PASSWORD_REGEX` al nivel del módulo en `app/auth/page.tsx`**

   Sacar la constante del cuerpo del componente y declararla antes del `export
default`:

   ```ts
   const PASSWORD_REGEX =
     /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z\d]).{8,}$/;

   export default function Auth() { ... }
   ```

   Verificación: `pnpm build` sin errores; la validación de contraseña sigue
   funcionando igual en el formulario de registro.

5. **Corregir filtrado de errores en `app/auth/callback/route.ts`**

   Reemplazar el error de Supabase en la URL por un código genérico:

   ```ts
   // ❌ antes
   `${origin}/auth?error=${encodeURIComponent(error.message)}`
   // ✅ después
   `${origin}/auth?error=callback_failed`;
   ```

   Verificación: forzar un fallo en el callback (código inválido) redirige a
   `/auth?error=callback_failed` sin exponer mensajes internos de Supabase.

6. **Verificación final**

   `pnpm lint` y `pnpm build` completan sin errores.
   La app carga en el navegador sin errores de consola relacionados con auth.

---

## Criterios de aceptación

- [ ] `REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM anon, authenticated`
      está aplicado; la función no es invocable vía `/rest/v1/rpc/handle_new_user`
      sin sesión autenticada con permisos explícitos.
- [ ] El trigger `on_auth_user_created` sigue funcionando: crear un usuario nuevo
      genera automáticamente su fila en `profiles`.
- [ ] "Leaked Password Protection" está activado en Supabase Auth Settings.
- [ ] Registrarse con un email ya existente muestra el mensaje genérico sin revelar
      que la cuenta existe.
- [ ] Registrarse con un email ya existente no expone `err.message` de Supabase
      en ningún lugar visible (UI, consola, red).
- [ ] `PASSWORD_REGEX` está declarado fuera del componente `Auth`, al nivel del módulo.
- [ ] La validación de contraseña en el formulario de registro funciona igual que antes.
- [ ] Un fallo en el callback OAuth redirige a `/auth?error=callback_failed` sin
      incluir el mensaje interno de Supabase en la URL.
- [ ] `pnpm lint` y `pnpm build` completan sin errores.

---

## Decisiones tomadas

- **Sí: REVOKE EXECUTE en lugar de SECURITY INVOKER** — el trigger
  `on_auth_user_created` necesita permisos elevados para insertar en `profiles`;
  cambiar a `SECURITY INVOKER` requeriría revisar y ajustar los permisos del rol
  que ejecuta el trigger. El REVOKE es suficiente para cerrar el vector de ataque
  sin tocar la lógica existente.

- **Sí: mensaje genérico en signup sin distinguir casos** — cualquier distinción
  entre "email ya registrado" y "error de red" filtra información útil a un
  atacante. Un mensaje único elimina el vector de enumeración de usuarios.

- **Sí: `callback_failed` como código genérico en lugar de mapeo de errores** —
  los errores del callback OAuth son raros en uso normal; añadir mensajes UX
  detallados para cada uno aumenta la superficie sin beneficio proporcional para
  el usuario.

- **Sí: `PASSWORD_REGEX` al nivel del módulo** — es una constante que no cambia
  entre renders; declararla dentro del componente la recrea en cada llamada sin
  ningún beneficio.

- **No: cambiar el mensaje de error de login** — el login ya usa un mensaje
  genérico ("Credenciales incorrectas"). No hay enumeración en ese flujo.

- **No: mapear `?error=callback_failed` a un mensaje UX en la UI** — la página
  `/auth` ya muestra el parámetro `error` de la URL; si en el futuro se quiere
  un mensaje más amigable, es un cambio de una línea en ese componente y no
  requiere spec propio.

---

## Riesgos identificados

- **Trigger roto tras el REVOKE** — aunque el REVOKE solo afecta a llamadas
  externas vía REST y no al trigger interno, conviene verificar explícitamente
  que `on_auth_user_created` sigue generando filas en `profiles` tras aplicar
  el SQL. Mitigación: el paso 1 del plan incluye esta verificación antes de
  continuar.

- **Leaked Password Protection bloquea contraseñas de usuarios de prueba** — si
  durante el desarrollo se usan contraseñas comunes ("Test123!"), Supabase las
  rechazará una vez activada la protección. Mitigación: usar contraseñas de prueba
  más largas y aleatorias en local.

- **Mensaje genérico de signup puede confundir al usuario legítimo** — alguien
  que intenta registrarse con un email ya existente recibirá el mensaje genérico
  en lugar de "ya tienes cuenta, inicia sesión". Mitigación aceptada: la seguridad
  prima sobre la conveniencia UX en este caso; el usuario puede intentar iniciar
  sesión con ese email.
