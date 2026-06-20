-- ============================================================================
-- SCHEMA DE PRODUCCIÓN — SUDTALENT
-- Basado en el estado real de la base de datos Supabase
-- ============================================================================
-- Orden de creación respeta dependencias entre tablas:
--   perfiles → voice_audios → users → alumnos / profesores / administradores
--   → convocatorias → postulaciones → whitelist_numbers → cursos
--   → curso_alumnos → anuncios → agenda_eventos → notificaciones
--   → audiciones → convocatorias_favoritas → password_reset_tokens
--   → ai_chat_messages → ai_query_logs
-- ============================================================================

-- ─── Extensión para gen_random_uuid() ────────────────────────────────────────
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ─── Función para updated_at automático ──────────────────────────────────────
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;


-- ============================================================================
-- 1. PERFILES
-- ============================================================================
CREATE TABLE public.perfiles (
  id          uuid        NOT NULL,
  created_at  timestamp   WITHOUT TIME ZONE,
  deleted_at  timestamp   WITHOUT TIME ZONE,
  descripcion character varying,
  updated_at  timestamp   WITHOUT TIME ZONE,
  CONSTRAINT perfiles_pkey PRIMARY KEY (id)
);


-- ============================================================================
-- 2. VOICE_AUDIOS  (debe existir antes de users por la FK profile_audio_id)
-- ============================================================================
CREATE TABLE public.voice_audios (
  id               uuid          NOT NULL DEFAULT gen_random_uuid(),
  user_id          uuid          NOT NULL,
  title            character varying NOT NULL,
  file_url         character varying NOT NULL,
  storage_path     character varying,
  duration_seconds integer,
  file_size_mb     double precision,
  media_type       character varying DEFAULT 'audio/mpeg',
  category         character varying DEFAULT 'profile',
  is_public        boolean       DEFAULT true,
  created_at       timestamp     WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at       timestamp     WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  deleted_at       timestamp     WITH TIME ZONE,
  visual_genre     character varying,
  demo_category    character varying,
  description      text,
  CONSTRAINT voice_audios_pkey PRIMARY KEY (id)
  -- FK a users se agrega después (ALTER TABLE) para evitar dependencia circular
);

CREATE INDEX idx_voice_audios_user_id   ON public.voice_audios (user_id);
CREATE INDEX idx_voice_audios_category  ON public.voice_audios (category) WHERE deleted_at IS NULL;
CREATE INDEX idx_voice_audios_deleted   ON public.voice_audios (deleted_at);

CREATE TRIGGER trg_voice_audios_updated_at
  BEFORE UPDATE ON public.voice_audios
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


-- ============================================================================
-- 3. USERS
-- ============================================================================
CREATE TABLE public.users (
  id                  uuid          NOT NULL DEFAULT gen_random_uuid(),
  email               character varying UNIQUE,
  password            character varying NOT NULL,
  name                character varying NOT NULL,
  phone               character varying,
  active              boolean       NOT NULL DEFAULT true,
  onboarded           boolean       NOT NULL DEFAULT false,
  role                character varying NOT NULL
                        CHECK (role IN ('ALUMNO', 'PROFESOR', 'ADMIN')),
  profile_type        character varying,
  status              character varying,
  specialization      character varying,
  specialties         character varying,
  age                 integer,
  bio                 character varying,
  child_name          character varying,
  child_age           integer,
  perfil_id           uuid,
  created_at          timestamp     WITHOUT TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at          timestamp     WITHOUT TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
  deleted_at          timestamp     WITHOUT TIME ZONE,
  profile_audio_url   character varying,
  profile_audio_id    uuid,
  profile_image_url   character varying,
  CONSTRAINT users_pkey              PRIMARY KEY (id),
  CONSTRAINT users_new_perfil_id_fkey    FOREIGN KEY (perfil_id)
    REFERENCES public.perfiles (id),
  CONSTRAINT users_profile_audio_id_fkey FOREIGN KEY (profile_audio_id)
    REFERENCES public.voice_audios (id)
);

-- FK circular: voice_audios.user_id → users.id
ALTER TABLE public.voice_audios
  ADD CONSTRAINT voice_audios_user_id_fkey
    FOREIGN KEY (user_id) REFERENCES public.users (id);

CREATE INDEX idx_users_email      ON public.users (email)  WHERE deleted_at IS NULL;
CREATE INDEX idx_users_role       ON public.users (role)   WHERE deleted_at IS NULL;
CREATE INDEX idx_users_deleted    ON public.users (deleted_at);

CREATE TRIGGER trg_users_updated_at
  BEFORE UPDATE ON public.users
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


-- ============================================================================
-- 4. ALUMNOS
-- ============================================================================
CREATE TABLE public.alumnos (
  usuario_id       uuid      NOT NULL,
  fecha_nacimiento date,
  created_at       timestamp WITHOUT TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at       timestamp WITHOUT TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
  deleted_at       timestamp WITHOUT TIME ZONE,
  CONSTRAINT alumnos_pkey            PRIMARY KEY (usuario_id),
  CONSTRAINT fkkboummh9a9n18amjc9wl9vojk FOREIGN KEY (usuario_id)
    REFERENCES public.users (id)
);

CREATE INDEX idx_alumnos_deleted ON public.alumnos (deleted_at);

CREATE TRIGGER trg_alumnos_updated_at
  BEFORE UPDATE ON public.alumnos
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


-- ============================================================================
-- 5. PROFESORES
-- ============================================================================
CREATE TABLE public.profesores (
  usuario_id       uuid      NOT NULL,
  especialidad     character varying,
  created_at       timestamp WITHOUT TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at       timestamp WITHOUT TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
  deleted_at       timestamp WITHOUT TIME ZONE,
  cursos_asignados character varying,
  CONSTRAINT profesores_pkey                    PRIMARY KEY (usuario_id),
  CONSTRAINT profesores_new_usuario_id_fkey FOREIGN KEY (usuario_id)
    REFERENCES public.users (id)
);

CREATE INDEX idx_profesores_deleted ON public.profesores (deleted_at);

CREATE TRIGGER trg_profesores_updated_at
  BEFORE UPDATE ON public.profesores
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


-- ============================================================================
-- 6. ADMINISTRADORES
-- ============================================================================
CREATE TABLE public.administradores (
  usuario_id uuid NOT NULL,
  CONSTRAINT administradores_pkey                     PRIMARY KEY (usuario_id),
  CONSTRAINT administradores_new_usuario_id_fkey FOREIGN KEY (usuario_id)
    REFERENCES public.users (id)
);


-- ============================================================================
-- 7. CONVOCATORIAS
-- ============================================================================
CREATE TABLE public.convocatorias (
  id              uuid      NOT NULL DEFAULT gen_random_uuid(),
  profesor_id     uuid,
  estado          character varying,
  tipo            character varying,
  fecha           date,
  created_at      timestamp WITHOUT TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at      timestamp WITHOUT TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
  deleted_at      timestamp WITHOUT TIME ZONE,
  categoria       character varying,
  descripcion     text,
  fecha_limite    date,
  genero_visual   character varying,
  requisitos      text,
  titulo          character varying NOT NULL,
  CONSTRAINT convocatorias_pkey                    PRIMARY KEY (id),
  CONSTRAINT convocatorias_new_profesor_id_fkey FOREIGN KEY (profesor_id)
    REFERENCES public.profesores (usuario_id)
);

CREATE INDEX idx_convocatorias_profesor ON public.convocatorias (profesor_id);
CREATE INDEX idx_convocatorias_estado   ON public.convocatorias (estado)   WHERE deleted_at IS NULL;
CREATE INDEX idx_convocatorias_deleted  ON public.convocatorias (deleted_at);

CREATE TRIGGER trg_convocatorias_updated_at
  BEFORE UPDATE ON public.convocatorias
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


-- ============================================================================
-- 8. POSTULACIONES
-- ============================================================================
CREATE TABLE public.postulaciones (
  id                uuid      NOT NULL DEFAULT gen_random_uuid(),
  alumno_id         uuid      NOT NULL,
  convocatoria_id   uuid      NOT NULL,
  fecha_postulacion date,
  created_at        timestamp WITHOUT TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at        timestamp WITHOUT TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
  deleted_at        timestamp WITHOUT TIME ZONE,
  estado            character varying NOT NULL,
  mensaje           text,
  voice_audio_id    uuid,
  CONSTRAINT postulaciones_pkey                        PRIMARY KEY (id),
  CONSTRAINT fkajgwnskn9dnjw59jsq1hpdvtq              FOREIGN KEY (alumno_id)
    REFERENCES public.users (id),
  CONSTRAINT postulaciones_new_alumno_id_fkey          FOREIGN KEY (alumno_id)
    REFERENCES public.alumnos (usuario_id),
  CONSTRAINT postulaciones_new_convocatoria_id_fkey    FOREIGN KEY (convocatoria_id)
    REFERENCES public.convocatorias (id),
  CONSTRAINT fkhs5x914jogujcpd9easoiw2g               FOREIGN KEY (voice_audio_id)
    REFERENCES public.voice_audios (id)
);

CREATE INDEX idx_postulaciones_alumno       ON public.postulaciones (alumno_id);
CREATE INDEX idx_postulaciones_convocatoria ON public.postulaciones (convocatoria_id);
CREATE INDEX idx_postulaciones_estado       ON public.postulaciones (estado) WHERE deleted_at IS NULL;
CREATE INDEX idx_postulaciones_deleted      ON public.postulaciones (deleted_at);

CREATE TRIGGER trg_postulaciones_updated_at
  BEFORE UPDATE ON public.postulaciones
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


-- ============================================================================
-- 9. WHITELIST_NUMBERS
-- ============================================================================
CREATE TABLE public.whitelist_numbers (
  id         uuid      NOT NULL DEFAULT gen_random_uuid(),
  usuario_id uuid,
  name       character varying,
  email      character varying,
  phone      character varying,
  category   character varying,
  status     character varying,
  created_at timestamp WITHOUT TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at timestamp WITHOUT TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
  deleted_at timestamp WITHOUT TIME ZONE,
  role       character varying
               CHECK (role IN ('ALUMNO', 'ADMIN', 'PROFESOR')),
  user_id    uuid,
  CONSTRAINT whitelist_numbers_pkey              PRIMARY KEY (id),
  CONSTRAINT fk5q5wx14fjhl3wy64h6o7jiqbd         FOREIGN KEY (user_id)
    REFERENCES public.users (id),
  CONSTRAINT whitelist_numbers_new_usuario_id_fkey FOREIGN KEY (usuario_id)
    REFERENCES public.users (id)
);

CREATE INDEX idx_whitelist_phone   ON public.whitelist_numbers (phone)   WHERE deleted_at IS NULL;
CREATE INDEX idx_whitelist_status  ON public.whitelist_numbers (status)  WHERE deleted_at IS NULL;
CREATE INDEX idx_whitelist_deleted ON public.whitelist_numbers (deleted_at);

CREATE TRIGGER trg_whitelist_updated_at
  BEFORE UPDATE ON public.whitelist_numbers
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


-- ============================================================================
-- 10. CURSOS
-- ============================================================================
CREATE TABLE public.cursos (
  id          uuid      NOT NULL,
  created_at  timestamp WITHOUT TIME ZONE NOT NULL,
  curso_key   character varying NOT NULL UNIQUE,
  descripcion text,
  modalidad   character varying NOT NULL,
  titulo      character varying NOT NULL,
  updated_at  timestamp WITHOUT TIME ZONE NOT NULL,
  profesor_id uuid,
  CONSTRAINT cursos_pkey                  PRIMARY KEY (id),
  CONSTRAINT fkpyut7pcpq36d6lipvm137yg37 FOREIGN KEY (profesor_id)
    REFERENCES public.users (id)
);

CREATE INDEX idx_cursos_profesor ON public.cursos (profesor_id);
CREATE INDEX idx_cursos_key      ON public.cursos (curso_key);

CREATE TRIGGER trg_cursos_updated_at
  BEFORE UPDATE ON public.cursos
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


-- ============================================================================
-- 11. CURSO_ALUMNOS
-- ============================================================================
CREATE TABLE public.curso_alumnos (
  curso_id          uuid      NOT NULL,
  alumno_id         uuid      NOT NULL,
  email_alumno      character varying,
  inscrito_at       timestamp WITHOUT TIME ZONE NOT NULL,
  nombre_alumno     character varying,
  profile_image_url character varying,
  CONSTRAINT curso_alumnos_pkey              PRIMARY KEY (curso_id, alumno_id),
  CONSTRAINT fkjayi099u07ku7wmq7ing9toi6     FOREIGN KEY (alumno_id)
    REFERENCES public.users (id),
  CONSTRAINT fkpotn4k5neim2tjcamp7g206rw     FOREIGN KEY (curso_id)
    REFERENCES public.cursos (id)
);

CREATE INDEX idx_curso_alumnos_alumno ON public.curso_alumnos (alumno_id);
CREATE INDEX idx_curso_alumnos_curso  ON public.curso_alumnos (curso_id);


-- ============================================================================
-- 12. ANUNCIOS
-- ============================================================================
CREATE TABLE public.anuncios (
  id           uuid      NOT NULL,
  contenido    text      NOT NULL,
  created_at   timestamp WITHOUT TIME ZONE NOT NULL,
  tipo         character varying NOT NULL,
  titulo       character varying NOT NULL,
  updated_at   timestamp WITHOUT TIME ZONE NOT NULL,
  url_recurso  character varying,
  autor_id     uuid      NOT NULL,
  curso_id     uuid      NOT NULL,
  CONSTRAINT anuncios_pkey                   PRIMARY KEY (id),
  CONSTRAINT fkknlso2si1sddylf0t617lqeg5     FOREIGN KEY (autor_id)
    REFERENCES public.users (id),
  CONSTRAINT fkeegpp3cvhj4mv22ayhccfx8fp     FOREIGN KEY (curso_id)
    REFERENCES public.cursos (id)
);

CREATE INDEX idx_anuncios_curso  ON public.anuncios (curso_id);
CREATE INDEX idx_anuncios_autor  ON public.anuncios (autor_id);

CREATE TRIGGER trg_anuncios_updated_at
  BEFORE UPDATE ON public.anuncios
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


-- ============================================================================
-- 13. AGENDA_EVENTOS
-- ============================================================================
CREATE TABLE public.agenda_eventos (
  id          uuid      NOT NULL,
  created_at  timestamp WITHOUT TIME ZONE NOT NULL,
  descripcion text,
  fecha       date      NOT NULL,
  hora        character varying NOT NULL,
  link        character varying,
  titulo      character varying NOT NULL,
  updated_at  timestamp WITHOUT TIME ZONE NOT NULL,
  curso_id    uuid      NOT NULL,
  profesor_id uuid      NOT NULL,
  CONSTRAINT agenda_eventos_pkey              PRIMARY KEY (id),
  CONSTRAINT fk2fttli3u3v9dd3p8pgx7f4sc6      FOREIGN KEY (curso_id)
    REFERENCES public.cursos (id),
  CONSTRAINT fk249unyw51fvpvpdgtis2p5dhi      FOREIGN KEY (profesor_id)
    REFERENCES public.users (id)
);

CREATE INDEX idx_agenda_curso    ON public.agenda_eventos (curso_id);
CREATE INDEX idx_agenda_profesor ON public.agenda_eventos (profesor_id);
CREATE INDEX idx_agenda_fecha    ON public.agenda_eventos (fecha);

CREATE TRIGGER trg_agenda_updated_at
  BEFORE UPDATE ON public.agenda_eventos
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


-- ============================================================================
-- 14. NOTIFICACIONES
-- ============================================================================
CREATE TABLE public.notificaciones (
  id               uuid      NOT NULL,
  fecha_creacion   timestamp WITHOUT TIME ZONE NOT NULL,
  leido            boolean   NOT NULL,
  mensaje          character varying NOT NULL,
  referencia_id    uuid,
  referencia_tipo  character varying,
  tipo             character varying NOT NULL,
  titulo           character varying NOT NULL,
  usuario_id       uuid      NOT NULL,
  CONSTRAINT notificaciones_pkey              PRIMARY KEY (id),
  CONSTRAINT fk72h5bl6fbklwx4ggwv4tepcq       FOREIGN KEY (usuario_id)
    REFERENCES public.users (id)
);

CREATE INDEX idx_notificaciones_usuario ON public.notificaciones (usuario_id);
CREATE INDEX idx_notificaciones_leido   ON public.notificaciones (leido);


-- ============================================================================
-- 15. AUDICIONES
-- ============================================================================
CREATE TABLE public.audiciones (
  id             uuid      NOT NULL,
  created_at     timestamp WITHOUT TIME ZONE NOT NULL,
  estado         character varying NOT NULL,
  fecha          character varying NOT NULL,
  hora           character varying NOT NULL,
  link           character varying,
  lugar          character varying,
  modalidad      character varying NOT NULL,
  observaciones  text,
  puntaje        integer,
  resultado      character varying NOT NULL,
  updated_at     timestamp WITHOUT TIME ZONE NOT NULL,
  alumno_id      uuid      NOT NULL,
  postulacion_id uuid      NOT NULL,
  profesor_id    uuid      NOT NULL,
  CONSTRAINT audiciones_pkey                   PRIMARY KEY (id),
  CONSTRAINT fkjf57x8sy625ema6qcihb2unct        FOREIGN KEY (alumno_id)
    REFERENCES public.users (id),
  CONSTRAINT fk521a0d71dqpdk0m797ed91sgl        FOREIGN KEY (postulacion_id)
    REFERENCES public.postulaciones (id),
  CONSTRAINT fkgaib5w3uhjf9xvb2qepelol4d        FOREIGN KEY (profesor_id)
    REFERENCES public.profesores (usuario_id)
);

CREATE INDEX idx_audiciones_alumno      ON public.audiciones (alumno_id);
CREATE INDEX idx_audiciones_postulacion ON public.audiciones (postulacion_id);
CREATE INDEX idx_audiciones_profesor    ON public.audiciones (profesor_id);

CREATE TRIGGER trg_audiciones_updated_at
  BEFORE UPDATE ON public.audiciones
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


-- ============================================================================
-- 16. CONVOCATORIAS_FAVORITAS
-- ============================================================================
CREATE TABLE public.convocatorias_favoritas (
  id               uuid      NOT NULL,
  fecha_creacion   timestamp WITHOUT TIME ZONE NOT NULL,
  convocatoria_id  uuid      NOT NULL,
  usuario_id       uuid      NOT NULL,
  CONSTRAINT convocatorias_favoritas_pkey       PRIMARY KEY (id),
  CONSTRAINT fk5vlhqaje2k7ug0cekw8nq2ri3        FOREIGN KEY (convocatoria_id)
    REFERENCES public.convocatorias (id),
  CONSTRAINT fkig091h26gw6kexhel4slee126        FOREIGN KEY (usuario_id)
    REFERENCES public.users (id)
);

CREATE UNIQUE INDEX idx_favoritas_unique ON public.convocatorias_favoritas (usuario_id, convocatoria_id);
CREATE INDEX idx_favoritas_usuario       ON public.convocatorias_favoritas (usuario_id);


-- ============================================================================
-- 17. PASSWORD_RESET_TOKENS
-- ============================================================================
CREATE TABLE public.password_reset_tokens (
  id               uuid      NOT NULL,
  created_at       timestamp WITHOUT TIME ZONE NOT NULL,
  email            character varying NOT NULL,
  expires_at       timestamp WITHOUT TIME ZONE NOT NULL,
  failed_attempts  integer   NOT NULL,
  otp              character varying NOT NULL,
  used             boolean   NOT NULL,
  CONSTRAINT password_reset_tokens_pkey PRIMARY KEY (id)
);

CREATE INDEX idx_prt_email      ON public.password_reset_tokens (email);
CREATE INDEX idx_prt_expires_at ON public.password_reset_tokens (expires_at);


-- ============================================================================
-- 18. AI_CHAT_MESSAGES
-- ============================================================================
CREATE TABLE public.ai_chat_messages (
  id               uuid      NOT NULL,
  content          text      NOT NULL,
  context_summary  text,
  conversation_id  character varying NOT NULL,
  created_at       timestamp WITHOUT TIME ZONE NOT NULL,
  role             character varying NOT NULL,
  usuario_id       uuid      NOT NULL,
  CONSTRAINT ai_chat_messages_pkey              PRIMARY KEY (id),
  CONSTRAINT fka64xjwicbn3rlxxw6cafnj84f        FOREIGN KEY (usuario_id)
    REFERENCES public.users (id)
);

CREATE INDEX idx_ai_chat_conversation ON public.ai_chat_messages (conversation_id);
CREATE INDEX idx_ai_chat_usuario      ON public.ai_chat_messages (usuario_id);
CREATE INDEX idx_ai_chat_created      ON public.ai_chat_messages (created_at);


-- ============================================================================
-- 19. AI_QUERY_LOGS
-- ============================================================================
CREATE TABLE public.ai_query_logs (
  id              uuid      NOT NULL,
  contexto_usado  text,
  estado          character varying NOT NULL,
  fecha           timestamp WITHOUT TIME ZONE NOT NULL,
  pregunta        text      NOT NULL,
  respuesta       text,
  usuario_id      uuid      NOT NULL,
  CONSTRAINT ai_query_logs_pkey               PRIMARY KEY (id),
  CONSTRAINT fkkwvsctx1q98f7vdsc9j0b2f4       FOREIGN KEY (usuario_id)
    REFERENCES public.users (id)
);

CREATE INDEX idx_ai_logs_usuario ON public.ai_query_logs (usuario_id);
CREATE INDEX idx_ai_logs_fecha   ON public.ai_query_logs (fecha);


-- ============================================================================
-- FIN DEL SCHEMA
-- ============================================================================
