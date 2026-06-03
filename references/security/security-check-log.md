# Security Check Log — Arcade Vault

Historial de auditorías ejecutadas por el agente `security-auditor`. Una entrada por invocación,
en orden cronológico descendente (la más reciente primero).

---

## 2026-06-03

### App (Next.js)

| Ítem                       | Estado | Notas                                                                         |
| -------------------------- | ------ | ----------------------------------------------------------------------------- |
| 4 security headers         | ✅     | `next.config.ts` — `source: '/(.*)'`, 4 headers presentes                     |
| PASSWORD_REGEX en registro | ✅     | `app/auth/page.tsx` — solo tab `up`, error inline, sin round-trip a Supabase  |
| Proxy rutas protegidas     | ✅     | `proxy.ts` — `getUser()`, `PROTECTED_ROUTES = ['/profile']`, matcher correcto |

Sin cambios aplicados — los 3 ítems ya cumplían.

### Base de datos (Supabase) — solo lectura

**Resueltos:**

| Ítem                                      | Estado |
| ----------------------------------------- | ------ |
| RLS en `games`                            | ✅     |
| RLS en `scores`                           | ✅     |
| Política `public_insert_scores` eliminada | ✅     |
| Política `authenticated_insert_own_score` | ✅     |
| `DROP FUNCTION rls_auto_enable()`         | ✅     |

**Warnings activos (3):**

| Warning                                              | Descripción                                                                        |
| ---------------------------------------------------- | ---------------------------------------------------------------------------------- |
| `anon_security_definer_function_executable`          | `public.handle_new_user()` invocable por `anon` via `/rest/v1/rpc/handle_new_user` |
| `authenticated_security_definer_function_executable` | ídem para rol `authenticated`                                                      |
| `auth_leaked_password_protection`                    | Leaked Password Protection deshabilitada en Auth Settings                          |

### SQL propuesto (pendiente de aplicar manualmente)

```sql
-- Cerrar superficie de ataque REST RPC sin romper el trigger interno
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM anon;
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM authenticated;
```

**Auth Settings (manual en el Dashboard):**
Authentication → Settings → Password:

- Leaked Password Protection: **ON** (HaveIBeenPwned)
- Minimum password length: **8**
- Max signups per hour per IP: **10**
