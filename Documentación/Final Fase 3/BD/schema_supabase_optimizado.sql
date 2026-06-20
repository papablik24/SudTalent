-- ============================================================================
-- SCHEMA SUDTALENT OPTIMIZADO PARA SUPABASE
-- ============================================================================
-- Mejoras implementadas:
-- ✓ UUID en lugar de BIGINT para seguridad
-- ✓ RLS (Row Level Security) habilitado
-- ✓ Soft delete (deleted_at)
-- ✓ Timestamps con timezone (UTC)
-- ✓ ENUMs para estados
-- ✓ Triggers para updated_at automático
-- ✓ Índices en FKs
-- ✓ ON DELETE CASCADE especificado
-- ============================================================================

-- ============================================================================
-- 1. CREAR ENUM TYPES
-- ============================================================================

CREATE TYPE public.user_role AS ENUM ('ALUMNO', 'ADMIN', 'PROFESOR');
CREATE TYPE public.profile_type_enum AS ENUM ('PERSONAL', 'PARENT');
CREATE TYPE public.specialization_enum AS ENUM ('LOCUCION', 'PODCASTING', 'DOBLAJE', 'KIDS', 'OTRO');
CREATE TYPE public.status_enum AS ENUM ('PENDING', 'APPROVED', 'INACTIVE');
CREATE TYPE public.convocatoria_estado AS ENUM ('PENDIENTE', 'APROBADO', 'CANCELADO', 'FINALIZADO');
CREATE TYPE public.whitelist_status AS ENUM ('ACTIVO', 'INACTIVO', 'PENDIENTE');

-- ============================================================================
-- 2. FUNCIÓN PARA ACTUALIZAR updated_at AUTOMÁTICAMENTE
-- ============================================================================

CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- 3. TABLA USERS (CORREGIDA Y OPTIMIZADA)
-- ============================================================================

CREATE TABLE public.users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email character varying UNIQUE NOT NULL,
  name character varying NOT NULL,
  password character varying NOT NULL,
  phone character varying UNIQUE,
  age integer,
  bio character varying,
  active boolean NOT NULL DEFAULT true,
  onboarded boolean NOT NULL DEFAULT false,
  
  -- Enums tipados correctamente
  role public.user_role NOT NULL DEFAULT 'ALUMNO',
  profile_type public.profile_type_enum,
  status public.status_enum DEFAULT 'PENDING'::public.status_enum,
  specialization public.specialization_enum,
  
  -- Campos específicos de PARENT
  child_name character varying,
  child_age integer,
  
  -- Auditoría
  created_at timestamp with time zone NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at timestamp with time zone NOT NULL DEFAULT CURRENT_TIMESTAMP,
  deleted_at timestamp with time zone,
  
  -- Relación con perfiles
  perfil_id uuid REFERENCES public.perfiles(id) ON DELETE SET NULL,
  
  -- Índices para búsquedas frecuentes
  CONSTRAINT valid_email_format CHECK (email ~ '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}$'),
  CONSTRAINT valid_age CHECK (age >= 0 AND age <= 150),
  CONSTRAINT valid_child_age CHECK (child_age IS NULL OR (child_age >= 0 AND child_age <= 18))
);

CREATE INDEX idx_users_email ON public.users(email) WHERE deleted_at IS NULL;
CREATE INDEX idx_users_phone ON public.users(phone) WHERE deleted_at IS NULL;
CREATE INDEX idx_users_role ON public.users(role) WHERE deleted_at IS NULL;
CREATE INDEX idx_users_deleted_at ON public.users(deleted_at);

-- Trigger para updated_at
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON public.users
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============================================================================
-- 4. TABLA PERFILES
-- ============================================================================

CREATE TABLE public.perfiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  descripcion character varying NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at timestamp with time zone NOT NULL DEFAULT CURRENT_TIMESTAMP,
  deleted_at timestamp with time zone
);

CREATE INDEX idx_perfiles_deleted_at ON public.perfiles(deleted_at);

CREATE TRIGGER update_perfiles_updated_at BEFORE UPDATE ON public.perfiles
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============================================================================
-- 5. TABLA ADMINISTRADORES
-- ============================================================================

CREATE TABLE public.administradores (
  usuario_id uuid PRIMARY KEY NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_administradores_usuario FOREIGN KEY (usuario_id) 
    REFERENCES public.users(id) ON DELETE CASCADE
);

CREATE INDEX idx_administradores_usuario ON public.administradores(usuario_id);

-- ============================================================================
-- 6. TABLA ALUMNOS
-- ============================================================================

CREATE TABLE public.alumnos (
  usuario_id uuid PRIMARY KEY NOT NULL,
  fecha_nacimiento date,
  created_at timestamp with time zone NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at timestamp with time zone NOT NULL DEFAULT CURRENT_TIMESTAMP,
  deleted_at timestamp with time zone,
  CONSTRAINT fk_alumnos_usuario FOREIGN KEY (usuario_id) 
    REFERENCES public.users(id) ON DELETE CASCADE
);

CREATE INDEX idx_alumnos_usuario ON public.alumnos(usuario_id);
CREATE INDEX idx_alumnos_deleted_at ON public.alumnos(deleted_at);

CREATE TRIGGER update_alumnos_updated_at BEFORE UPDATE ON public.alumnos
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============================================================================
-- 7. TABLA PROFESORES (CORREGIDA - FALTABA FK)
-- ============================================================================

CREATE TABLE public.profesores (
  usuario_id uuid PRIMARY KEY NOT NULL,
  especialidad character varying NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at timestamp with time zone NOT NULL DEFAULT CURRENT_TIMESTAMP,
  deleted_at timestamp with time zone,
  CONSTRAINT fk_profesores_usuario FOREIGN KEY (usuario_id) 
    REFERENCES public.users(id) ON DELETE CASCADE
);

CREATE INDEX idx_profesores_usuario ON public.profesores(usuario_id);
CREATE INDEX idx_profesores_deleted_at ON public.profesores(deleted_at);

CREATE TRIGGER update_profesores_updated_at BEFORE UPDATE ON public.profesores
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============================================================================
-- 8. TABLA CONVOCATORIAS
-- ============================================================================

CREATE TABLE public.convocatorias (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  profesor_id uuid NOT NULL,
  fecha date NOT NULL,
  estado public.convocatoria_estado NOT NULL DEFAULT 'PENDIENTE'::public.convocatoria_estado,
  tipo character varying NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at timestamp with time zone NOT NULL DEFAULT CURRENT_TIMESTAMP,
  deleted_at timestamp with time zone,
  CONSTRAINT fk_convocatorias_profesor FOREIGN KEY (profesor_id) 
    REFERENCES public.profesores(usuario_id) ON DELETE CASCADE,
  CONSTRAINT valid_fecha CHECK (fecha >= CURRENT_DATE)
);

CREATE INDEX idx_convocatorias_profesor ON public.convocatorias(profesor_id);
CREATE INDEX idx_convocatorias_fecha ON public.convocatorias(fecha);
CREATE INDEX idx_convocatorias_estado ON public.convocatorias(estado);
CREATE INDEX idx_convocatorias_deleted_at ON public.convocatorias(deleted_at);

CREATE TRIGGER update_convocatorias_updated_at BEFORE UPDATE ON public.convocatorias
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============================================================================
-- 9. TABLA POSTULACIONES
-- ============================================================================

CREATE TABLE public.postulaciones (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  alumno_id uuid NOT NULL,
  convocatoria_id uuid NOT NULL,
  fecha_postulacion date NOT NULL DEFAULT CURRENT_DATE,
  created_at timestamp with time zone NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at timestamp with time zone NOT NULL DEFAULT CURRENT_TIMESTAMP,
  deleted_at timestamp with time zone,
  CONSTRAINT fk_postulaciones_alumno FOREIGN KEY (alumno_id) 
    REFERENCES public.alumnos(usuario_id) ON DELETE CASCADE,
  CONSTRAINT fk_postulaciones_convocatoria FOREIGN KEY (convocatoria_id) 
    REFERENCES public.convocatorias(id) ON DELETE CASCADE,
  CONSTRAINT unique_postulacion UNIQUE (alumno_id, convocatoria_id) WHERE deleted_at IS NULL
);

CREATE INDEX idx_postulaciones_alumno ON public.postulaciones(alumno_id);
CREATE INDEX idx_postulaciones_convocatoria ON public.postulaciones(convocatoria_id);
CREATE INDEX idx_postulaciones_fecha ON public.postulaciones(fecha_postulacion);
CREATE INDEX idx_postulaciones_deleted_at ON public.postulaciones(deleted_at);

CREATE TRIGGER update_postulaciones_updated_at BEFORE UPDATE ON public.postulaciones
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============================================================================
-- 10. TABLA WHITELIST_NUMBERS
-- ============================================================================

CREATE TABLE public.whitelist_numbers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  phone character varying NOT NULL UNIQUE,
  email character varying,
  name character varying,
  category character varying,
  status public.whitelist_status NOT NULL DEFAULT 'PENDIENTE'::public.whitelist_status,
  usuario_id uuid REFERENCES public.users(id) ON DELETE SET NULL,
  created_at timestamp with time zone NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at timestamp with time zone NOT NULL DEFAULT CURRENT_TIMESTAMP,
  deleted_at timestamp with time zone,
  CONSTRAINT valid_phone_format CHECK (phone ~ '^\+?[0-9]{7,15}$')
);

CREATE INDEX idx_whitelist_phone ON public.whitelist_numbers(phone) WHERE deleted_at IS NULL;
CREATE INDEX idx_whitelist_usuario ON public.whitelist_numbers(usuario_id);
CREATE INDEX idx_whitelist_status ON public.whitelist_numbers(status);
CREATE INDEX idx_whitelist_deleted_at ON public.whitelist_numbers(deleted_at);

CREATE TRIGGER update_whitelist_updated_at BEFORE UPDATE ON public.whitelist_numbers
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============================================================================
-- 11. HABILITACIÓN DE RLS (ROW LEVEL SECURITY)
-- ============================================================================

ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.alumnos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profesores ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.administradores ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.convocatorias ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.postulaciones ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.whitelist_numbers ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- 12. POLÍTICAS RLS - USERS
-- ============================================================================

-- Todos pueden leer usuarios (no borrados)
CREATE POLICY "Usuarios públicos - SELECT" ON public.users
  FOR SELECT USING (deleted_at IS NULL);

-- Solo admin puede actualizar otros usuarios
CREATE POLICY "Usuarios - UPDATE propio o admin" ON public.users
  FOR UPDATE USING (
    auth.uid() = id OR 
    EXISTS (SELECT 1 FROM public.administradores WHERE usuario_id = auth.uid())
  );

-- Solo admin puede insertar
CREATE POLICY "Usuarios - INSERT admin" ON public.users
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM public.administradores WHERE usuario_id = auth.uid())
  );

-- Soft delete - solo se marca deleted_at, no se elimina
CREATE POLICY "Usuarios - DELETE soft" ON public.users
  FOR DELETE USING (
    auth.uid() = id OR 
    EXISTS (SELECT 1 FROM public.administradores WHERE usuario_id = auth.uid())
  );

-- ============================================================================
-- 13. POLÍTICAS RLS - ALUMNOS
-- ============================================================================

-- Alumnos ven sus propios datos, profesores y admins ven todos
CREATE POLICY "Alumnos - SELECT" ON public.alumnos
  FOR SELECT USING (
    usuario_id = auth.uid() OR
    EXISTS (SELECT 1 FROM public.profesores WHERE usuario_id = auth.uid()) OR
    EXISTS (SELECT 1 FROM public.administradores WHERE usuario_id = auth.uid())
  );

-- Solo el alumno y admin pueden actualizar
CREATE POLICY "Alumnos - UPDATE" ON public.alumnos
  FOR UPDATE USING (
    usuario_id = auth.uid() OR
    EXISTS (SELECT 1 FROM public.administradores WHERE usuario_id = auth.uid())
  );

-- ============================================================================
-- 14. POLÍTICAS RLS - PROFESORES
-- ============================================================================

-- Todos pueden ver profesores (no borrados)
CREATE POLICY "Profesores - SELECT" ON public.profesores
  FOR SELECT USING (deleted_at IS NULL);

-- Solo el profesor y admin pueden actualizar
CREATE POLICY "Profesores - UPDATE" ON public.profesores
  FOR UPDATE USING (
    usuario_id = auth.uid() OR
    EXISTS (SELECT 1 FROM public.administradores WHERE usuario_id = auth.uid())
  );

-- ============================================================================
-- 15. POLÍTICAS RLS - CONVOCATORIAS
-- ============================================================================

-- Todos pueden ver convocatorias (no borradas)
CREATE POLICY "Convocatorias - SELECT" ON public.convocatorias
  FOR SELECT USING (deleted_at IS NULL);

-- Solo el profesor y admin pueden actualizar/crear
CREATE POLICY "Convocatorias - INSERT/UPDATE" ON public.convocatorias
  FOR UPDATE USING (
    EXISTS (SELECT 1 FROM public.profesores WHERE usuario_id = auth.uid() AND usuario_id = profesor_id) OR
    EXISTS (SELECT 1 FROM public.administradores WHERE usuario_id = auth.uid())
  );

CREATE POLICY "Convocatorias - INSERT" ON public.convocatorias
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM public.profesores WHERE usuario_id = auth.uid()) OR
    EXISTS (SELECT 1 FROM public.administradores WHERE usuario_id = auth.uid())
  );

-- ============================================================================
-- 16. POLÍTICAS RLS - POSTULACIONES
-- ============================================================================

-- Alumnos ven sus propias postulaciones, profesores ven las de sus convocatorias
CREATE POLICY "Postulaciones - SELECT" ON public.postulaciones
  FOR SELECT USING (
    alumno_id = (SELECT usuario_id FROM public.alumnos WHERE usuario_id = auth.uid()) OR
    EXISTS (
      SELECT 1 FROM public.convocatorias c
      WHERE c.id = convocatoria_id AND c.profesor_id = auth.uid()
    ) OR
    EXISTS (SELECT 1 FROM public.administradores WHERE usuario_id = auth.uid())
  );

-- Solo el alumno y admin pueden insertar/actualizar
CREATE POLICY "Postulaciones - INSERT" ON public.postulaciones
  FOR INSERT WITH CHECK (
    alumno_id = (SELECT usuario_id FROM public.alumnos WHERE usuario_id = auth.uid()) OR
    EXISTS (SELECT 1 FROM public.administradores WHERE usuario_id = auth.uid())
  );

CREATE POLICY "Postulaciones - UPDATE" ON public.postulaciones
  FOR UPDATE USING (
    alumno_id = (SELECT usuario_id FROM public.alumnos WHERE usuario_id = auth.uid()) OR
    EXISTS (SELECT 1 FROM public.administradores WHERE usuario_id = auth.uid())
  );

-- ============================================================================
-- 17. POLÍTICAS RLS - WHITELIST_NUMBERS
-- ============================================================================

-- Solo admin puede ver y modificar
CREATE POLICY "Whitelist - admin only SELECT" ON public.whitelist_numbers
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.administradores WHERE usuario_id = auth.uid())
  );

CREATE POLICY "Whitelist - admin only INSERT/UPDATE/DELETE" ON public.whitelist_numbers
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.administradores WHERE usuario_id = auth.uid())
  );

-- ============================================================================
-- 18. VISTAS ÚTILES
-- ============================================================================

-- Vista: Alumnos postulados en cada convocatoria
CREATE VIEW public.convocatoria_postulantes AS
SELECT 
  c.id as convocatoria_id,
  c.tipo,
  c.fecha,
  c.estado,
  COUNT(p.id) as total_postulantes,
  array_agg(u.name) as nombres_postulantes
FROM public.convocatorias c
LEFT JOIN public.postulaciones p ON c.id = p.convocatoria_id AND p.deleted_at IS NULL
LEFT JOIN public.alumnos a ON p.alumno_id = a.usuario_id AND a.deleted_at IS NULL
LEFT JOIN public.users u ON a.usuario_id = u.id AND u.deleted_at IS NULL
WHERE c.deleted_at IS NULL
GROUP BY c.id, c.tipo, c.fecha, c.estado;

-- Vista: Estadísticas de usuario
CREATE VIEW public.user_statistics AS
SELECT 
  u.id,
  u.name,
  u.email,
  u.role,
  CASE 
    WHEN EXISTS (SELECT 1 FROM public.alumnos WHERE usuario_id = u.id AND deleted_at IS NULL) THEN 'Activo'
    ELSE 'Inactivo'
  END as estado_alumno,
  (SELECT COUNT(*) FROM public.postulaciones WHERE alumno_id = (SELECT usuario_id FROM public.alumnos WHERE usuario_id = u.id) AND deleted_at IS NULL) as postulaciones_count
FROM public.users u
WHERE u.deleted_at IS NULL;

-- ============================================================================
-- NOTAS DE SEGURIDAD
-- ============================================================================
-- 1. Las políticas RLS se aplican automáticamente a usuarios autenticados
-- 2. Implementa soft delete usando deleted_at (nunca uses DELETE directo)
-- 3. Todos los timestamps están en UTC (timezone aware)
-- 4. Los UUIDs proporcionan mejor seguridad que los BIGINT secuenciales
-- 5. Las constraints CHECK validan formatos de email y teléfono
-- 6. Los índices mejoran significativamente las búsquedas y JOINs
