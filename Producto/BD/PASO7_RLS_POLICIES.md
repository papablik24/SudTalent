# 🔐 RLS (Row Level Security) - Integrado en Fase 2

## Cuándo Aplicar RLS

```
PASO 5: Reemplazar Tablas
    ↓
PASO 6: Crear Triggers
    ↓
✅ PASO 7: APLICAR RLS ← AQUÍ (Después de tablas migradasv y triggers)
    ↓
PASO 8: Verificar RLS
```

**IMPORTANTE:** Aplicar RLS DESPUÉS de haber hecho el swap de tablas, no antes.

---

## PASO 7: Habilitar RLS en Todas las Tablas

```sql
-- ============================================================================
-- HABILITAR RLS EN TODAS LAS TABLAS
-- ============================================================================

ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.alumnos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profesores ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.administradores ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.convocatorias ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.postulaciones ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.whitelist_numbers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.perfiles ENABLE ROW LEVEL SECURITY;

-- Verificar que RLS está habilitado
SELECT schemaname, tablename, rowsecurity 
FROM pg_tables 
WHERE schemaname = 'public' 
  AND tablename IN ('users', 'alumnos', 'profesores', 'administradores', 
                     'convocatorias', 'postulaciones', 'whitelist_numbers', 'perfiles')
ORDER BY tablename;
-- Todos deben mostrar rowsecurity = true
```

---

## PASO 8: Crear Políticas RLS por Tabla

### 8.1 TABLA: USERS

```sql
-- ============================================================================
-- USERS - Políticas RLS
-- ============================================================================

-- POLICY 1: Seleccionar usuarios (todos ven usuarios no eliminados)
CREATE POLICY "users_select_public" ON public.users
  FOR SELECT
  USING (deleted_at IS NULL);

-- POLICY 2: Insertar usuarios (solo ADMIN puede crear)
CREATE POLICY "users_insert_admin_only" ON public.users
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.administradores 
      WHERE usuario_id = auth.uid()
    )
  );

-- POLICY 3: Actualizar usuarios (Admin o el mismo usuario)
CREATE POLICY "users_update_self_or_admin" ON public.users
  FOR UPDATE
  USING (
    auth.uid() = id OR
    EXISTS (
      SELECT 1 FROM public.administradores 
      WHERE usuario_id = auth.uid()
    )
  );

-- POLICY 4: Eliminar/soft-delete usuarios (solo ADMIN)
CREATE POLICY "users_delete_admin_only" ON public.users
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.administradores 
      WHERE usuario_id = auth.uid()
    )
  );

GRANT SELECT ON public.users TO authenticated;
GRANT INSERT ON public.users TO authenticated;
GRANT UPDATE ON public.users TO authenticated;
GRANT DELETE ON public.users TO authenticated;
```

---

### 8.2 TABLA: ALUMNOS

```sql
-- ============================================================================
-- ALUMNOS - Políticas RLS
-- ============================================================================

-- POLICY 1: Alumnos ven sus datos, Profesores ven todos activos, Admin ve todos
CREATE POLICY "alumnos_select" ON public.alumnos
  FOR SELECT
  USING (
    usuario_id = auth.uid() OR
    EXISTS (
      SELECT 1 FROM public.profesores 
      WHERE usuario_id = auth.uid() AND deleted_at IS NULL
    ) OR
    EXISTS (
      SELECT 1 FROM public.administradores 
      WHERE usuario_id = auth.uid()
    )
  );

-- POLICY 2: Solo el alumno y admin pueden actualizar
CREATE POLICY "alumnos_update" ON public.alumnos
  FOR UPDATE
  USING (
    usuario_id = auth.uid() OR
    EXISTS (
      SELECT 1 FROM public.administradores 
      WHERE usuario_id = auth.uid()
    )
  );

-- POLICY 3: Solo admin puede insertar
CREATE POLICY "alumnos_insert_admin" ON public.alumnos
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.administradores 
      WHERE usuario_id = auth.uid()
    )
  );

-- POLICY 4: Solo admin puede eliminar
CREATE POLICY "alumnos_delete_admin" ON public.alumnos
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.administradores 
      WHERE usuario_id = auth.uid()
    )
  );

GRANT SELECT ON public.alumnos TO authenticated;
GRANT INSERT ON public.alumnos TO authenticated;
GRANT UPDATE ON public.alumnos TO authenticated;
GRANT DELETE ON public.alumnos TO authenticated;
```

---

### 8.3 TABLA: PROFESORES

```sql
-- ============================================================================
-- PROFESORES - Políticas RLS
-- ============================================================================

-- POLICY 1: Todos ven profesores no eliminados
CREATE POLICY "profesores_select" ON public.profesores
  FOR SELECT
  USING (deleted_at IS NULL);

-- POLICY 2: Solo el profesor y admin pueden actualizar
CREATE POLICY "profesores_update" ON public.profesores
  FOR UPDATE
  USING (
    usuario_id = auth.uid() OR
    EXISTS (
      SELECT 1 FROM public.administradores 
      WHERE usuario_id = auth.uid()
    )
  );

-- POLICY 3: Solo admin puede insertar
CREATE POLICY "profesores_insert_admin" ON public.profesores
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.administradores 
      WHERE usuario_id = auth.uid()
    )
  );

-- POLICY 4: Solo admin puede eliminar
CREATE POLICY "profesores_delete_admin" ON public.profesores
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.administradores 
      WHERE usuario_id = auth.uid()
    )
  );

GRANT SELECT ON public.profesores TO authenticated;
GRANT INSERT ON public.profesores TO authenticated;
GRANT UPDATE ON public.profesores TO authenticated;
GRANT DELETE ON public.profesores TO authenticated;
```

---

### 8.4 TABLA: ADMINISTRADORES

```sql
-- ============================================================================
-- ADMINISTRADORES - Políticas RLS
-- ============================================================================

-- POLICY 1: Solo admin puede leer otros admins
CREATE POLICY "administradores_select_admin" ON public.administradores
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.administradores 
      WHERE usuario_id = auth.uid()
    )
  );

-- POLICY 2: Solo admin puede insertar
CREATE POLICY "administradores_insert_admin" ON public.administradores
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.administradores 
      WHERE usuario_id = auth.uid()
    )
  );

-- POLICY 3: Solo admin puede actualizar
CREATE POLICY "administradores_update_admin" ON public.administradores
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.administradores 
      WHERE usuario_id = auth.uid()
    )
  );

-- POLICY 4: Solo admin puede eliminar
CREATE POLICY "administradores_delete_admin" ON public.administradores
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.administradores 
      WHERE usuario_id = auth.uid()
    )
  );

GRANT SELECT ON public.administradores TO authenticated;
GRANT INSERT ON public.administradores TO authenticated;
GRANT UPDATE ON public.administradores TO authenticated;
GRANT DELETE ON public.administradores TO authenticated;
```

---

### 8.5 TABLA: CONVOCATORIAS

```sql
-- ============================================================================
-- CONVOCATORIAS - Políticas RLS
-- ============================================================================

-- POLICY 1: Todos ven convocatorias no eliminadas
CREATE POLICY "convocatorias_select" ON public.convocatorias
  FOR SELECT
  USING (deleted_at IS NULL);

-- POLICY 2: Solo el profesor creador y admin pueden actualizar
CREATE POLICY "convocatorias_update" ON public.convocatorias
  FOR UPDATE
  USING (
    profesor_id = auth.uid() OR
    EXISTS (
      SELECT 1 FROM public.administradores 
      WHERE usuario_id = auth.uid()
    )
  );

-- POLICY 3: Solo profesor y admin pueden crear
CREATE POLICY "convocatorias_insert" ON public.convocatorias
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profesores 
      WHERE usuario_id = auth.uid() AND deleted_at IS NULL
    ) OR
    EXISTS (
      SELECT 1 FROM public.administradores 
      WHERE usuario_id = auth.uid()
    )
  );

-- POLICY 4: Solo profesor creador y admin pueden eliminar
CREATE POLICY "convocatorias_delete" ON public.convocatorias
  FOR DELETE
  USING (
    profesor_id = auth.uid() OR
    EXISTS (
      SELECT 1 FROM public.administradores 
      WHERE usuario_id = auth.uid()
    )
  );

GRANT SELECT ON public.convocatorias TO authenticated;
GRANT INSERT ON public.convocatorias TO authenticated;
GRANT UPDATE ON public.convocatorias TO authenticated;
GRANT DELETE ON public.convocatorias TO authenticated;
```

---

### 8.6 TABLA: POSTULACIONES

```sql
-- ============================================================================
-- POSTULACIONES - Políticas RLS
-- ============================================================================

-- POLICY 1: Alumnos ven sus postulaciones
--           Profesores ven postulaciones de sus convocatorias
--           Admin ve todas
CREATE POLICY "postulaciones_select" ON public.postulaciones
  FOR SELECT
  USING (
    -- Alumno ve sus postulaciones
    alumno_id = auth.uid() OR
    -- Profesor ve postulaciones de sus convocatorias
    EXISTS (
      SELECT 1 FROM public.convocatorias c
      WHERE c.id = postulaciones.convocatoria_id 
        AND c.profesor_id = auth.uid()
        AND c.deleted_at IS NULL
    ) OR
    -- Admin ve todo
    EXISTS (
      SELECT 1 FROM public.administradores 
      WHERE usuario_id = auth.uid()
    )
  );

-- POLICY 2: Solo el alumno y admin pueden insertar
CREATE POLICY "postulaciones_insert" ON public.postulaciones
  FOR INSERT
  WITH CHECK (
    alumno_id = auth.uid() OR
    EXISTS (
      SELECT 1 FROM public.administradores 
      WHERE usuario_id = auth.uid()
    )
  );

-- POLICY 3: Solo el alumno y admin pueden actualizar
CREATE POLICY "postulaciones_update" ON public.postulaciones
  FOR UPDATE
  USING (
    alumno_id = auth.uid() OR
    EXISTS (
      SELECT 1 FROM public.administradores 
      WHERE usuario_id = auth.uid()
    )
  );

-- POLICY 4: Solo admin puede eliminar
CREATE POLICY "postulaciones_delete" ON public.postulaciones
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.administradores 
      WHERE usuario_id = auth.uid()
    )
  );

GRANT SELECT ON public.postulaciones TO authenticated;
GRANT INSERT ON public.postulaciones TO authenticated;
GRANT UPDATE ON public.postulaciones TO authenticated;
GRANT DELETE ON public.postulaciones TO authenticated;
```

---

### 8.7 TABLA: WHITELIST_NUMBERS

```sql
-- ============================================================================
-- WHITELIST_NUMBERS - Políticas RLS
-- ============================================================================

-- POLICY 1: Solo admin puede leer whitelist
CREATE POLICY "whitelist_numbers_select_admin" ON public.whitelist_numbers
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.administradores 
      WHERE usuario_id = auth.uid()
    )
  );

-- POLICY 2: Solo admin puede insertar
CREATE POLICY "whitelist_numbers_insert_admin" ON public.whitelist_numbers
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.administradores 
      WHERE usuario_id = auth.uid()
    )
  );

-- POLICY 3: Solo admin puede actualizar
CREATE POLICY "whitelist_numbers_update_admin" ON public.whitelist_numbers
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.administradores 
      WHERE usuario_id = auth.uid()
    )
  );

-- POLICY 4: Solo admin puede eliminar
CREATE POLICY "whitelist_numbers_delete_admin" ON public.whitelist_numbers
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.administradores 
      WHERE usuario_id = auth.uid()
    )
  );

GRANT SELECT ON public.whitelist_numbers TO authenticated;
GRANT INSERT ON public.whitelist_numbers TO authenticated;
GRANT UPDATE ON public.whitelist_numbers TO authenticated;
GRANT DELETE ON public.whitelist_numbers TO authenticated;
```

---

### 8.8 TABLA: PERFILES

```sql
-- ============================================================================
-- PERFILES - Políticas RLS
-- ============================================================================

-- POLICY 1: Todos ven perfiles no eliminados
CREATE POLICY "perfiles_select" ON public.perfiles
  FOR SELECT
  USING (deleted_at IS NULL);

-- POLICY 2: Solo admin puede modificar perfiles
CREATE POLICY "perfiles_insert_admin" ON public.perfiles
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.administradores 
      WHERE usuario_id = auth.uid()
    )
  );

CREATE POLICY "perfiles_update_admin" ON public.perfiles
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.administradores 
      WHERE usuario_id = auth.uid()
    )
  );

CREATE POLICY "perfiles_delete_admin" ON public.perfiles
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.administradores 
      WHERE usuario_id = auth.uid()
    )
  );

GRANT SELECT ON public.perfiles TO authenticated;
GRANT INSERT ON public.perfiles TO authenticated;
GRANT UPDATE ON public.perfiles TO authenticated;
GRANT DELETE ON public.perfiles TO authenticated;
```

---

## PASO 9: Verificar RLS Está Activo

```sql
-- Listar todas las políticas creadas
SELECT 
  schemaname, 
  tablename, 
  policyname, 
  permissive,
  roles,
  qual,
  with_check
FROM pg_policies 
WHERE schemaname = 'public'
ORDER BY tablename, policyname;

-- Verificar que las tablas tienen RLS habilitado
SELECT 
  schemaname,
  tablename,
  rowsecurity
FROM pg_tables
WHERE schemaname = 'public'
  AND tablename IN ('users', 'alumnos', 'profesores', 'administradores',
                    'convocatorias', 'postulaciones', 'whitelist_numbers', 'perfiles')
ORDER BY tablename;
```

---

## PASO 10: Testing de RLS (Simular Usuarios)

```sql
-- Test 1: Como ALUMNO (usuario sin admin)
BEGIN;
SET LOCAL jwt.claims = '{"sub":"550e8400-e29b-41d4-a716-446655440000", "email":"alumno@example.com", "role":"authenticated"}';

-- Debe ver solo sus datos
SELECT id, email, role FROM users WHERE id = '550e8400-e29b-41d4-a716-446655440000';

-- Debe ver sus postulaciones
SELECT id, alumno_id FROM postulaciones WHERE alumno_id = '550e8400-e29b-41d4-a716-446655440000';

-- NO debe ver postulaciones de otros alumnos
SELECT COUNT(*) as other_postulations FROM postulaciones 
WHERE alumno_id != '550e8400-e29b-41d4-a716-446655440000';

ROLLBACK;

-- Test 2: Como PROFESOR
BEGIN;
SET LOCAL jwt.claims = '{"sub":"660e8400-e29b-41d4-a716-446655440000", "email":"profesor@example.com", "role":"authenticated"}';

-- Debe ver sus convocatorias
SELECT id, profesor_id FROM convocatorias 
WHERE profesor_id = '660e8400-e29b-41d4-a716-446655440000';

-- Debe ver postulaciones de sus convocatorias
SELECT pt.id 
FROM postulaciones pt
JOIN convocatorias c ON pt.convocatoria_id = c.id
WHERE c.profesor_id = '660e8400-e29b-41d4-a716-446655440000';

ROLLBACK;

-- Test 3: Como ADMIN (puede ver todo)
BEGIN;
SET LOCAL jwt.claims = '{"sub":"770e8400-e29b-41d4-a716-446655440000", "email":"admin@example.com", "role":"authenticated"}';

-- Debe ver todos los usuarios
SELECT COUNT(*) as total_users FROM users WHERE deleted_at IS NULL;

-- Debe ver todas las postulaciones
SELECT COUNT(*) as total_postulaciones FROM postulaciones WHERE deleted_at IS NULL;

-- Debe ver whitelist
SELECT COUNT(*) as total_whitelist FROM whitelist_numbers;

ROLLBACK;

-- Test 4: Sin autenticación (debe retornar error o fila vacía)
BEGIN;

SELECT id, email FROM users;
-- ERROR: debe fallar o retornar 0 filas (depende de la configuración)

ROLLBACK;
```

---

## 📋 Resumen de Permisos RLS

| Tabla | ALUMNO | PROFESOR | ADMIN | Public |
|-------|--------|----------|-------|--------|
| **users** | Lee todo (no eliminado) | Lee todo (no eliminado) | CRUD completo | Lee (no eliminado) |
| **alumnos** | Lee propio | Lee todos | CRUD completo | No acceso |
| **profesores** | Lee (no eliminado) | Lee propio | CRUD completo | Lee (no eliminado) |
| **administradores** | No acceso | No acceso | Lee/Crea/Modifica | No acceso |
| **convocatorias** | Lee (no eliminado) | Lee/Crea/Modifica propio | CRUD completo | Lee (no eliminado) |
| **postulaciones** | Lee propio | Lee de sus convocatorias | CRUD completo | No acceso |
| **whitelist_numbers** | No acceso | No acceso | CRUD completo | No acceso |
| **perfiles** | Lee (no eliminado) | Lee (no eliminado) | CRUD completo | Lee (no eliminado) |

---

## ⚠️ Notas Importantes

### 1. **RLS Solo Funciona con Autenticación**
- Sin `auth.uid()`, RLS puede bloquearlo todo
- Necesita JWT válido en `Authorization: Bearer <token>`

### 2. **Testing Local en Supabase**
- Supabase Dashboard → SQL Editor → SET LOCAL jwt.claims
- O usar cliente de Supabase con token válido

### 3. **IMPORTANT: Backend Spring Boot**
- Spring Boot hace queries **sin** JWT de Supabase
- Por eso necesita conexión directa con credenciales de BD
- RLS funciona en Supabase Dashboard, no en Spring Boot

### 4. **Para Spring Boot Usar RLS**
Necesitarías pasar el JWT en cada query:
```sql
SELECT * FROM users WHERE auth.uid() = id;
```
Esto requiere configuración especial en Spring Boot.

### 5. **Alternativa Actual**
- **Supabase Dashboard**: RLS protege todos los datos ✓
- **Spring Boot**: Usa credenciales de BD, bypasea RLS (requiere validación en código)

---

## 🔐 Seguridad en Spring Boot

Ya que Spring Boot no usa RLS, **implementamos seguridad en:**

1. **SoftDeleteService** - Validar que solo admin puede eliminar
2. **Controllers** - `@PreAuthorize("hasRole('ADMIN')")` para operaciones sensibles
3. **Services** - Lógica de negocio que valida roles
4. **Specifications** - Filtros de soft delete automático

```java
// Ejemplo: UserController
@DeleteMapping("/{id}")
@PreAuthorize("hasRole('ADMIN')")  // ← Seguridad en Spring Boot
public ResponseEntity<?> deleteUser(@PathVariable UUID id) {
    softDeleteService.softDeleteUser(id);
    return ResponseEntity.ok("Usuario eliminado");
}
```

---

## 📝 Checklist RLS

- [ ] RLS habilitado en todas las tablas
- [ ] Todas las políticas creadas sin errores
- [ ] GRANTS otorgados a rol `authenticated`
- [ ] Test 1: ALUMNO accede a sus datos ✓
- [ ] Test 2: PROFESOR accede a sus convocatorias ✓
- [ ] Test 3: ADMIN accede a todo ✓
- [ ] Test 4: Bloqueado sin autenticación ✓
- [ ] Spring Boot conecta sin errores
- [ ] Validación de roles en Controllers

