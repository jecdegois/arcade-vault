# Memoria — security-auditor

Bitácora de auditorías de seguridad ejecutadas sobre Arcade Vault. El agente lee esto al empezar
para contexto histórico y anexa una entrada al terminar. Cada entrada indica el estado de la BD
en ese momento, los cambios aplicados en la app y si se generó SQL propuesto.

## Historial

## 2026-06-03 — Auditoría: 3 warnings activos de BD — App: sin cambios — BD: SQL propuesto — Notas: RLS en games/scores ya aplicado (rowsecurity=true, políticas correctas, public_insert_scores eliminada, rls_auto_enable eliminada). Nuevo warning: handle_new_user() SECURITY DEFINER expuesta via REST RPC (creada por spec-13). Se propone REVOKE EXECUTE para anon+authenticated. auth_leaked_password_protection sigue pendiente (manual en Dashboard). App cumple los 3 ítems: 4 headers en next.config.ts, PASSWORD_REGEX en auth/page.tsx solo en tab up, proxy.ts con getUser() y matcher correcto.
