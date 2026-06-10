# 🔄 SQL de Migración Verificado - Fase 2

## ✅ VERIFICACIÓN DE COMPATIBILIDAD

### Estado Actual del Backend (Después de cambios)
- ✓ **IDs**: UUID (tipo `java.util.UUID`)
- ✓ **Timestamps**: `LocalDateTime` (sin timezone)
- ✓ **Soft Delete**: Campo `deletedAt` en todas las entidades
- ✓ **Herencia**: Alumno y Administrador heredan de User (JOINED)
- ✓ **Relaciones**: Profesor es entidad separada con FK a User

### Estructura SQL Validada
```
users (UUID id) ← Padre
├── alumnos (UUID usuario_id) ← Hija de users
└── administradores (UUID usuario_id) ← Hija de users

profesores (UUID usuario_id) ← FK a users (no hereda, es tabla separada)
convocatorias (UUID id) → FK profesor_id a profesores
postulaciones (UUID id) → FK alumno_id a alumnos, FK convocatoria_id a convocatorias
whitelist_numbers (UUID id) → FK usuario_id a users (opcional)
perfiles (UUID id) → FK en users.perfil_id
```

---

## 🔧 SQL DE MIGRACIÓN VERIFICADO Y MEJORADO

### PASO 1: Preparación (Ejecutar PRIMERO)

```sql
-- 1. Hacer BACKUP (CRÍTICO)
-- En Supabase Dashboard: Backups → Create Backup Manual
-- ESPERAR a que complete antes de continuar

-- 2. Crear tabla de mapeo de IDs
CREATE TABLE IF NOT EXISTS id_mapping (
  old_id bigint NOT NULL PRIMARY KEY,
  new_id uuid NOT NULL UNIQUE,
  created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);

-- 3. Crear tabla de perfil mapping (porque se referencia en users)
CREATE TABLE IF NOT EXISTS perfil_id_mapping (
  old_id bigint NOT NULL PRIMARY KEY,
  new_id uuid NOT NULL UNIQUE,
  created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);

-- 4. Generar mapeos de UUID para usuarios ANTES de migrar
-- Esto preserva las relaciones
INSERT INTO id_mapping (old_id, new_id)
SELECT id, gen_random_uuid() 
FROM users
WHERE id NOT IN (SELECT old_id FROM id_mapping)
ORDER BY id;

-- Verificar que se creó el mapeo
SELECT COUNT(*) as mapeados FROM id_mapping;
SELECT COUNT(*) as usuarios_en_bd FROM users;
-- Deben ser iguales
```

---

### PASO 2: Crear Tablas Nuevas (ESTRUCTURA COMPLETA)

```sql
-- ============================================================================
-- TABLA PERFILES
-- ============================================================================

CREATE TABLE IF NOT EXISTS perfiles_new (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  descripcion character varying(500) NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at timestamp with time zone NOT NULL DEFAULT CURRENT_TIMESTAMP,
  deleted_at timestamp with time zone,
  CONSTRAINT perfiles_new_pkey PRIMARY KEY (id)
);

-- Crear índices
CREATE INDEX idx_perfiles_new_deleted_at ON perfiles_new(deleted_at) WHERE deleted_at IS NULL;

-- ============================================================================
-- TABLA USERS (Parent)
-- ============================================================================

CREATE TABLE IF NOT EXISTS users_new (
  id uuid PRIMARY KEY,
  email character varying(150) UNIQUE NOT NULL,
  name character varying(100) NOT NULL,
  password character varying(255) NOT NULL,
  phone character varying(20) UNIQUE,
  age integer CHECK (age >= 0 AND age <= 150),
  bio character varying(500),
  active boolean NOT NULL DEFAULT true,
  onboarded boolean NOT NULL DEFAULT false,
  
  -- Enums como text con constraint (compatible con Java @Enumerated)
  role character varying(50) NOT NULL DEFAULT 'ALUMNO',
  profile_type character varying(50),
  specialization character varying(50),
  status character varying(50) DEFAULT 'PENDING',
  
  -- Campos específicos para padres
  child_name character varying(100),
  child_age integer CHECK (child_age IS NULL OR (child_age >= 0 AND child_age <= 18)),
  specialties character varying(500),
  
  -- Auditoría (LocalDateTime sin timezone de Java)
  created_at timestamp without time zone NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at timestamp without time zone NOT NULL DEFAULT CURRENT_TIMESTAMP,
  deleted_at timestamp without time zone,
  
  -- Relación con perfiles
  perfil_id uuid REFERENCES perfiles_new(id) ON DELETE SET NULL,
  
  CONSTRAINT users_new_pkey PRIMARY KEY (id),
  CONSTRAINT valid_email_format CHECK (email ~ '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}$'),
  CONSTRAINT valid_phone_format CHECK (phone IS NULL OR phone ~ '^[0-9]{7,15}$'),
  CONSTRAINT valid_role CHECK (role IN ('ALUMNO', 'ADMIN', 'PROFESOR')),
  CONSTRAINT valid_profile_type CHECK (profile_type IS NULL OR profile_type IN ('PERSONAL', 'PARENT')),
  CONSTRAINT valid_status CHECK (status IN ('PENDING', 'APPROVED', 'INACTIVE'))
);

-- Crear índices en users_new
CREATE INDEX idx_users_new_email ON users_new(email) WHERE deleted_at IS NULL;
CREATE INDEX idx_users_new_phone ON users_new(phone) WHERE deleted_at IS NULL;
CREATE INDEX idx_users_new_role ON users_new(role) WHERE deleted_at IS NULL;
CREATE INDEX idx_users_new_deleted_at ON users_new(deleted_at);
CREATE INDEX idx_users_new_perfil_id ON users_new(perfil_id);

-- ============================================================================
-- TABLA ALUMNOS (Child of users - JOINED Inheritance)
-- ============================================================================

CREATE TABLE IF NOT EXISTS alumnos_new (
  usuario_id uuid PRIMARY KEY,
  fecha_nacimiento date,
  created_at timestamp without time zone NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at timestamp without time zone NOT NULL DEFAULT CURRENT_TIMESTAMP,
  deleted_at timestamp without time zone,
  
  CONSTRAINT alumnos_new_pkey PRIMARY KEY (usuario_id),
  CONSTRAINT fk_alumnos_new_usuario FOREIGN KEY (usuario_id) 
    REFERENCES users_new(id) ON DELETE CASCADE
);

CREATE INDEX idx_alumnos_new_deleted_at ON alumnos_new(deleted_at);

-- ============================================================================
-- TABLA ADMINISTRADORES (Child of users - JOINED Inheritance)
-- ============================================================================

CREATE TABLE IF NOT EXISTS administradores_new (
  usuario_id uuid PRIMARY KEY,
  created_at timestamp without time zone NOT NULL DEFAULT CURRENT_TIMESTAMP,
  
  CONSTRAINT administradores_new_pkey PRIMARY KEY (usuario_id),
  CONSTRAINT fk_administradores_new_usuario FOREIGN KEY (usuario_id) 
    REFERENCES users_new(id) ON DELETE CASCADE
);

-- ============================================================================
-- TABLA PROFESORES (Separate table with FK to users - NO HEREDA)
-- ============================================================================

CREATE TABLE IF NOT EXISTS profesores_new (
  usuario_id uuid PRIMARY KEY,
  especialidad character varying(200) NOT NULL,
  created_at timestamp without time zone NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at timestamp without time zone NOT NULL DEFAULT CURRENT_TIMESTAMP,
  deleted_at timestamp without time zone,
  
  CONSTRAINT profesores_new_pkey PRIMARY KEY (usuario_id),
  CONSTRAINT fk_profesores_new_usuario FOREIGN KEY (usuario_id) 
    REFERENCES users_new(id) ON DELETE CASCADE
);

CREATE INDEX idx_profesores_new_deleted_at ON profesores_new(deleted_at);

-- ============================================================================
-- TABLA CONVOCATORIAS
-- ============================================================================

CREATE TABLE IF NOT EXISTS convocatorias_new (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  profesor_id uuid NOT NULL,
  fecha date NOT NULL,
  estado character varying(50) NOT NULL DEFAULT 'PENDIENTE',
  tipo character varying(100) NOT NULL,
  created_at timestamp without time zone NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at timestamp without time zone NOT NULL DEFAULT CURRENT_TIMESTAMP,
  deleted_at timestamp without time zone,
  
  CONSTRAINT convocatorias_new_pkey PRIMARY KEY (id),
  CONSTRAINT fk_convocatorias_new_profesor FOREIGN KEY (profesor_id) 
    REFERENCES profesores_new(usuario_id) ON DELETE CASCADE,
  CONSTRAINT valid_convocatoria_fecha CHECK (fecha >= CURRENT_DATE),
  CONSTRAINT valid_convocatoria_estado CHECK (estado IN ('PENDIENTE', 'APROBADO', 'CANCELADO', 'FINALIZADO'))
);

CREATE INDEX idx_convocatorias_new_profesor ON convocatorias_new(profesor_id);
CREATE INDEX idx_convocatorias_new_fecha ON convocatorias_new(fecha);
CREATE INDEX idx_convocatorias_new_estado ON convocatorias_new(estado);
CREATE INDEX idx_convocatorias_new_deleted_at ON convocatorias_new(deleted_at);

-- ============================================================================
-- TABLA POSTULACIONES
-- ============================================================================

CREATE TABLE IF NOT EXISTS postulaciones_new (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  alumno_id uuid NOT NULL,
  convocatoria_id uuid NOT NULL,
  fecha_postulacion date NOT NULL DEFAULT CURRENT_DATE,
  created_at timestamp without time zone NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at timestamp without time zone NOT NULL DEFAULT CURRENT_TIMESTAMP,
  deleted_at timestamp without time zone,
  
  CONSTRAINT postulaciones_new_pkey PRIMARY KEY (id),
  CONSTRAINT fk_postulaciones_new_alumno FOREIGN KEY (alumno_id) 
    REFERENCES alumnos_new(usuario_id) ON DELETE CASCADE,
  CONSTRAINT fk_postulaciones_new_convocatoria FOREIGN KEY (convocatoria_id) 
    REFERENCES convocatorias_new(id) ON DELETE CASCADE,
  CONSTRAINT unique_postulacion UNIQUE (alumno_id, convocatoria_id) WHERE deleted_at IS NULL
);

CREATE INDEX idx_postulaciones_new_alumno ON postulaciones_new(alumno_id);
CREATE INDEX idx_postulaciones_new_convocatoria ON postulaciones_new(convocatoria_id);
CREATE INDEX idx_postulaciones_new_fecha ON postulaciones_new(fecha_postulacion);
CREATE INDEX idx_postulaciones_new_deleted_at ON postulaciones_new(deleted_at);

-- ============================================================================
-- TABLA WHITELIST_NUMBERS
-- ============================================================================

CREATE TABLE IF NOT EXISTS whitelist_numbers_new (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  phone character varying(20) NOT NULL UNIQUE,
  email character varying(150),
  name character varying(100),
  category character varying(50),
  status character varying(50) NOT NULL DEFAULT 'PENDIENTE',
  usuario_id uuid,
  created_at timestamp without time zone NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at timestamp without time zone NOT NULL DEFAULT CURRENT_TIMESTAMP,
  deleted_at timestamp without time zone,
  
  CONSTRAINT whitelist_numbers_new_pkey PRIMARY KEY (id),
  CONSTRAINT fk_whitelist_numbers_new_usuario FOREIGN KEY (usuario_id) 
    REFERENCES users_new(id) ON DELETE SET NULL,
  CONSTRAINT valid_phone_format CHECK (phone ~ '^[0-9]{7,15}$'),
  CONSTRAINT valid_whitelist_status CHECK (status IN ('ACTIVO', 'INACTIVO', 'PENDIENTE'))
);

CREATE INDEX idx_whitelist_numbers_new_phone ON whitelist_numbers_new(phone) WHERE deleted_at IS NULL;
CREATE INDEX idx_whitelist_numbers_new_usuario ON whitelist_numbers_new(usuario_id);
CREATE INDEX idx_whitelist_numbers_new_status ON whitelist_numbers_new(status);
CREATE INDEX idx_whitelist_numbers_new_deleted_at ON whitelist_numbers_new(deleted_at);
```

---

### PASO 3: Migrar Datos (ORDEN CRÍTICO)

```sql
-- IMPORTANTE: Migrar en este orden para respetar FKs

-- 1. Migrar PERFILES (sin dependencias)
INSERT INTO perfiles_new (id, descripcion, created_at, updated_at)
SELECT gen_random_uuid(), descripcion, created_at, COALESCE(created_at, CURRENT_TIMESTAMP)
FROM perfiles
WHERE id NOT IN (SELECT old_id FROM perfil_id_mapping);

-- Registrar mapeo de perfiles
INSERT INTO perfil_id_mapping (old_id, new_id)
SELECT p.id, pn.id
FROM perfiles p
JOIN perfiles_new pn ON p.descripcion = pn.descripcion
WHERE p.id NOT IN (SELECT old_id FROM perfil_id_mapping);

-- 2. Migrar USERS (depende de perfiles)
INSERT INTO users_new (
  id, email, name, password, phone, age, bio, active, onboarded,
  role, profile_type, specialization, status,
  child_name, child_age, specialties,
  created_at, updated_at, perfil_id
)
SELECT 
  m.new_id,  -- UUID del mapping
  u.email,
  u.name,
  u.password,
  u.phone,
  u.age,
  u.bio,
  u.active,
  u.onboarded,
  u.role,
  u.profile_type,
  u.specialization,
  u.status,
  u.child_name,
  u.child_age,
  u.specialties,
  u.created_at,
  COALESCE(u.updated_at, u.created_at, CURRENT_TIMESTAMP),
  pm.new_id  -- UUID del perfil
FROM users u
LEFT JOIN id_mapping m ON u.id = m.old_id
LEFT JOIN perfil_id_mapping pm ON u.perfil_id = pm.old_id
WHERE m.new_id IS NOT NULL;

-- 3. Migrar ALUMNOS (depende de users)
INSERT INTO alumnos_new (usuario_id, fecha_nacimiento, created_at, updated_at)
SELECT 
  m.new_id,
  a.fecha_nacimiento,
  COALESCE(a.created_at, CURRENT_TIMESTAMP),
  COALESCE(a.updated_at, CURRENT_TIMESTAMP)
FROM alumnos a
JOIN id_mapping m ON a.usuario_id = m.old_id
WHERE m.new_id NOT IN (SELECT usuario_id FROM alumnos_new);

-- 4. Migrar ADMINISTRADORES (depende de users)
INSERT INTO administradores_new (usuario_id, created_at)
SELECT 
  m.new_id,
  COALESCE(a.created_at, CURRENT_TIMESTAMP)
FROM administradores a
JOIN id_mapping m ON a.usuario_id = m.old_id
WHERE m.new_id NOT IN (SELECT usuario_id FROM administradores_new);

-- 5. Migrar PROFESORES (depende de users)
INSERT INTO profesores_new (usuario_id, especialidad, created_at, updated_at)
SELECT 
  m.new_id,
  p.especialidad,
  COALESCE(p.created_at, CURRENT_TIMESTAMP),
  COALESCE(p.updated_at, CURRENT_TIMESTAMP)
FROM profesores p
JOIN id_mapping m ON p.usuario_id = m.old_id
WHERE m.new_id NOT IN (SELECT usuario_id FROM profesores_new);

-- 6. Migrar CONVOCATORIAS (depende de profesores)
INSERT INTO convocatorias_new (id, profesor_id, fecha, estado, tipo, created_at, updated_at)
SELECT 
  gen_random_uuid(),
  pm.new_id,
  c.fecha,
  c.estado,
  c.tipo,
  COALESCE(c.created_at, CURRENT_TIMESTAMP),
  COALESCE(c.created_at, CURRENT_TIMESTAMP)
FROM convocatorias c
JOIN id_mapping pm ON c.profesor_id = pm.old_id
WHERE c.id NOT IN (SELECT DISTINCT id FROM convocatorias_new);

-- 7. Migrar POSTULACIONES (depende de alumnos y convocatorias)
-- NOTA: Esto es más complejo porque necesitamos los nuevos IDs de convocatorias
-- Crear tabla temporal de mapeo de convocatorias
CREATE TEMP TABLE convocatoria_mapping AS
SELECT c.id as old_id, cn.id as new_id
FROM convocatorias c
JOIN convocatorias_new cn ON c.profesor_id = (
  SELECT usuario_id FROM profesores_new 
  WHERE usuario_id = (SELECT new_id FROM id_mapping WHERE old_id = c.profesor_id)
)
AND c.tipo = cn.tipo
AND c.fecha = cn.fecha;

INSERT INTO postulaciones_new (id, alumno_id, convocatoria_id, fecha_postulacion, created_at, updated_at)
SELECT 
  gen_random_uuid(),
  am.new_id,
  cm.new_id,
  p.fecha_postulacion,
  COALESCE(p.created_at, CURRENT_TIMESTAMP),
  COALESCE(p.updated_at, CURRENT_TIMESTAMP)
FROM postulaciones p
JOIN id_mapping am ON p.alumno_id = am.old_id
JOIN convocatoria_mapping cm ON p.convocatoria_id = cm.old_id
WHERE p.id NOT IN (SELECT DISTINCT id FROM postulaciones_new);

-- 8. Migrar WHITELIST_NUMBERS (depende de users, pero usuario_id es opcional)
INSERT INTO whitelist_numbers_new (id, phone, email, name, category, status, usuario_id, created_at, updated_at)
SELECT 
  gen_random_uuid(),
  wn.phone,
  wn.email,
  wn.name,
  wn.category,
  wn.status,
  CASE WHEN wn.usuario_id IS NOT NULL THEN m.new_id ELSE NULL END,
  COALESCE(wn.created_at, CURRENT_TIMESTAMP),
  COALESCE(wn.updated_at, CURRENT_TIMESTAMP)
FROM whitelist_numbers wn
LEFT JOIN id_mapping m ON wn.usuario_id = m.old_id
WHERE wn.id NOT IN (SELECT DISTINCT id FROM whitelist_numbers_new);
```

---

### PASO 4: Validar Migraciones

```sql
-- Verificar conteos
SELECT 'users' as tabla, COUNT(*) as old_count FROM users
UNION ALL SELECT 'users_new', COUNT(*) FROM users_new
UNION ALL SELECT 'alumnos', COUNT(*) FROM alumnos
UNION ALL SELECT 'alumnos_new', COUNT(*) FROM alumnos_new
UNION ALL SELECT 'profesores', COUNT(*) FROM profesores
UNION ALL SELECT 'profesores_new', COUNT(*) FROM profesores_new
UNION ALL SELECT 'administradores', COUNT(*) FROM administradores
UNION ALL SELECT 'administradores_new', COUNT(*) FROM administradores_new
UNION ALL SELECT 'convocatorias', COUNT(*) FROM convocatorias
UNION ALL SELECT 'convocatorias_new', COUNT(*) FROM convocatorias_new
UNION ALL SELECT 'postulaciones', COUNT(*) FROM postulaciones
UNION ALL SELECT 'postulaciones_new', COUNT(*) FROM postulaciones_new
UNION ALL SELECT 'whitelist_numbers', COUNT(*) FROM whitelist_numbers
UNION ALL SELECT 'whitelist_numbers_new', COUNT(*) FROM whitelist_numbers_new
ORDER BY tabla;

-- Verificar integridad de FKs
SELECT 'Alumnos sin usuario' as check_name, COUNT(*) as count
FROM alumnos_new a 
WHERE NOT EXISTS (SELECT 1 FROM users_new u WHERE u.id = a.usuario_id)

UNION ALL SELECT 'Profesores sin usuario', COUNT(*)
FROM profesores_new p 
WHERE NOT EXISTS (SELECT 1 FROM users_new u WHERE u.id = p.usuario_id)

UNION ALL SELECT 'Convocatorias sin profesor', COUNT(*)
FROM convocatorias_new c 
WHERE NOT EXISTS (SELECT 1 FROM profesores_new p WHERE p.usuario_id = c.profesor_id)

UNION ALL SELECT 'Postulaciones sin alumno', COUNT(*)
FROM postulaciones_new pt 
WHERE NOT EXISTS (SELECT 1 FROM alumnos_new a WHERE a.usuario_id = pt.alumno_id)

UNION ALL SELECT 'Postulaciones sin convocatoria', COUNT(*)
FROM postulaciones_new pt 
WHERE NOT EXISTS (SELECT 1 FROM convocatorias_new c WHERE c.id = pt.convocatoria_id)

UNION ALL SELECT 'Whitelist sin usuario (NULL OK)', COUNT(*)
FROM whitelist_numbers_new wn 
WHERE wn.usuario_id IS NOT NULL 
  AND NOT EXISTS (SELECT 1 FROM users_new u WHERE u.id = wn.usuario_id);
```

---

### PASO 5: Reemplazar Tablas (PUNTO DE NO RETORNO)

```sql
-- ⚠️ ASEGÚRATE DE HABER HECHO BACKUP ANTES

BEGIN TRANSACTION;

-- Eliminar FKs de tablas viejas (si existen)
ALTER TABLE administradores DROP CONSTRAINT IF EXISTS fk_administradores_usuario;
ALTER TABLE alumnos DROP CONSTRAINT IF EXISTS fk_alumnos_usuario;
ALTER TABLE profesores DROP CONSTRAINT IF EXISTS fk_profesores_usuario;
ALTER TABLE convocatorias DROP CONSTRAINT IF EXISTS fk_convocatorias_profesor;
ALTER TABLE postulaciones DROP CONSTRAINT IF EXISTS fk_postulaciones_alumno;
ALTER TABLE postulaciones DROP CONSTRAINT IF EXISTS fk_postulaciones_convocatoria;
ALTER TABLE whitelist_numbers DROP CONSTRAINT IF EXISTS fk_whitelist_numbers_usuario;
ALTER TABLE users DROP CONSTRAINT IF EXISTS fk_users_perfil;

-- Renombrar tablas viejas a _old
ALTER TABLE IF EXISTS users RENAME TO users_old;
ALTER TABLE IF EXISTS alumnos RENAME TO alumnos_old;
ALTER TABLE IF EXISTS profesores RENAME TO profesores_old;
ALTER TABLE IF EXISTS administradores RENAME TO administradores_old;
ALTER TABLE IF EXISTS convocatorias RENAME TO convocatorias_old;
ALTER TABLE IF EXISTS postulaciones RENAME TO postulaciones_old;
ALTER TABLE IF EXISTS whitelist_numbers RENAME TO whitelist_numbers_old;
ALTER TABLE IF EXISTS perfiles RENAME TO perfiles_old;

-- Renombrar tablas nuevas (sin _new)
ALTER TABLE users_new RENAME TO users;
ALTER TABLE alumnos_new RENAME TO alumnos;
ALTER TABLE profesores_new RENAME TO profesores;
ALTER TABLE administradores_new RENAME TO administradores;
ALTER TABLE convocatorias_new RENAME TO convocatorias;
ALTER TABLE postulaciones_new RENAME TO postulaciones;
ALTER TABLE whitelist_numbers_new RENAME TO whitelist_numbers;
ALTER TABLE perfiles_new RENAME TO perfiles;

-- Limpiar tablas de mapeo
DROP TABLE IF EXISTS id_mapping CASCADE;
DROP TABLE IF EXISTS perfil_id_mapping CASCADE;
DROP TABLE IF EXISTS convocatoria_mapping CASCADE;

COMMIT;
```

---

### PASO 6: Crear Triggers para Auditoría

```sql
-- Función para actualizar updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers en todas las tablas
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_alumnos_updated_at BEFORE UPDATE ON alumnos
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_profesores_updated_at BEFORE UPDATE ON profesores
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_convocatorias_updated_at BEFORE UPDATE ON convocatorias
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_postulaciones_updated_at BEFORE UPDATE ON postulaciones
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_whitelist_numbers_updated_at BEFORE UPDATE ON whitelist_numbers
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_perfiles_updated_at BEFORE UPDATE ON perfiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
```

---

## 📋 Checklist de Ejecución

- [ ] BACKUP de base de datos creado y verificado
- [ ] Tablas nuevas creadas sin errores (Paso 2)
- [ ] Mapeos de ID generados correctamente (Paso 1)
- [ ] Datos migrados sin errores (Paso 3)
- [ ] Validaciones pasan sin errores huérfanos (Paso 4)
- [ ] Tablas antiguas renombradas a _old (Paso 5)
- [ ] Triggers creados exitosamente (Paso 6)
- [ ] Test: SELECT COUNT(*) FROM users; // Debe retornar X usuarios
- [ ] Test: SELECT * FROM alumnos WHERE deleted_at IS NULL; // Funciona
- [ ] Test: Verificar que Spring Boot se conecta sin errores

---

## ⚠️ Cambios Respecto al Plan Original

| Cambio | Razón |
|--------|-------|
| `timestamp without time zone` en lugar de `timestamp with time zone` | Coincide con `LocalDateTime` de Java (sin timezone) |
| Constraints CHECK adicionales | Validar enums en DB (PENDING, APPROVED, etc.) |
| Índices en `deleted_at` | Optimizar queries con soft delete |
| Orden específico de migraciones | Respetar orden de foreign keys |
| Mapeos separados de perfiles | Porque perfiles es tabla independiente |
| Manejo de NULL en usuario_id de whitelist | Es una relación opcional |

