# 🔒 Plan de Migración de Seguridad - SudTalent
## De BIGINT → UUID + RLS + Soft Delete

**Duración estimada:** 4 semanas  
**Riesgo:** Bajo (implementación gradual)  
**Compatibilidad:** Supabase + Spring Boot  

---

## 📋 Resumen Ejecutivo

| Fase | Tarea | Duración | Impacto |
|------|-------|----------|--------|
| **Fase 1** | Actualizar JPA entities a UUID | 2-3 días | Backend |
| **Fase 2** | Migrar datos en Supabase | 1 día | Database |
| **Fase 3** | Agregar RLS Policies | 2-3 días | Seguridad |
| **Fase 4** | Implementar Soft Delete | 2-3 días | Backend + DB |
| **Fase 5** | Testing integral | 3-5 días | QA |
| **Fase 6** | Deploy a producción | 1 día | Producción |

---

## ⏰ FASE 1: Actualizar JPA Entities a UUID (Semana 1)

### Paso 1.1: Actualizar dependencias en `pom.xml`

```xml
<!-- Ya deberías tenerlo, pero asegúrate -->
<dependency>
    <groupId>org.springframework.boot</groupId>
    <artifactId>spring-boot-starter-data-jpa</artifactId>
</dependency>

<!-- Para UUID helper en Hibernate -->
<dependency>
    <groupId>com.vladmihalcea</groupId>
    <artifactId>hibernate-types-55</artifactId>
    <version>2.21.1</version>
</dependency>
```

### Paso 1.2: Actualizar entidad `User.java`

```java
package sudtalent.sudtalentproyecto.model;

import java.time.LocalDateTime;
import java.util.UUID;

import jakarta.persistence.*;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import lombok.*;

@Entity
@Table(name = "users")
@Getter
@Setter
@AllArgsConstructor
@NoArgsConstructor
@Builder
@Inheritance(strategy = InheritanceType.JOINED) 
public class User {
    
    // ✅ CAMBIO 1: UUID en lugar de IDENTITY
    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    @Column(columnDefinition = "uuid")
    private UUID id;

    @Column(nullable = false, length = 100)
    @Builder.Default
    private String name = "";

    @Email
    @Column(unique = true, length = 150)
    private String email;

    @NotBlank
    @Column(nullable = false)
    private String password;

    @Pattern(regexp = "^[0-9]{8,15}$", message = "El teléfono debe contener entre 8 y 15 dígitos") 
    @Column(unique = true, length = 20)
    private String phone;

    @Enumerated(EnumType.STRING)
    @Column(length = 150)
    private Specialization specialization;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    @Builder.Default
    private Role role = Role.ALUMNO;

    @Column(nullable = false, updatable = false)
    @Builder.Default
    private LocalDateTime createdAt = LocalDateTime.now();

    @Column(nullable = false)
    @Builder.Default
    private LocalDateTime updatedAt = LocalDateTime.now();

    // ✅ CAMBIO 2: Agregar soft delete
    @Column(name = "deleted_at")
    private LocalDateTime deletedAt;

    @Column(nullable = false)
    @Builder.Default
    private boolean active = true;

    @Column(nullable = false)
    @Builder.Default
    private boolean onboarded = false;

    @Enumerated(EnumType.STRING)
    @Column(length = 20)
    private ProfileType profileType;

    @Column(length = 500)
    private String bio;

    @Column(length = 500)
    private String specialties;

    @Column(length = 100)
    private String childName;

    private Integer childAge;

    private Integer age;

    @Enumerated(EnumType.STRING)
    @Column(length = 20)
    @Builder.Default
    private ProfileStatus status = ProfileStatus.PENDING;

    @ManyToOne
    @JoinColumn(name = "perfil_id")
    private Profile profile;

    public enum Role {
        ALUMNO, ADMIN, PROFESOR
    }

    public enum Specialization {
        LOCUCION, PODCASTING, DOBLAJE, KIDS, OTRO
    }

    public enum ProfileType {
        PERSONAL, PARENT
    }

    public enum ProfileStatus {
        PENDING, APPROVED, INACTIVE
    }

    // ✅ MÉTODO: Marcar como eliminado (soft delete)
    public void softDelete() {
        this.deletedAt = LocalDateTime.now();
        this.active = false;
    }

    // ✅ MÉTODO: Verificar si está eliminado
    public boolean isDeleted() {
        return deletedAt != null;
    }
}
```

### Paso 1.3: Actualizar `Alumno.java`

```java
package sudtalent.sudtalentproyecto.model;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.Set;
import java.util.UUID;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Entity
@Table(name = "alumnos")
@Getter
@Setter
@AllArgsConstructor
@NoArgsConstructor
@PrimaryKeyJoinColumn(name = "usuario_id")
public class Alumno extends User {
    
    @Column(name = "fecha_nacimiento")
    private LocalDate fechaNacimiento;

    @Column(nullable = false)
    @Builder.Default
    private LocalDateTime createdAt = LocalDateTime.now();

    @Column(nullable = false)
    @Builder.Default
    private LocalDateTime updatedAt = LocalDateTime.now();
    
    @OneToMany(mappedBy = "alumno", cascade = CascadeType.ALL)
    private Set<Postulacion> postulaciones;
}
```

### Paso 1.4: Actualizar `Profesor.java`

```java
package sudtalent.sudtalentproyecto.model;

import java.time.LocalDateTime;
import java.util.Set;
import java.util.UUID;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Entity
@Table(name = "profesores")
@Getter
@Setter
@AllArgsConstructor
@NoArgsConstructor
public class Profesor {
    
    @Id
    @Column(columnDefinition = "uuid")
    private UUID usuarioId;
    
    @OneToOne
    @JoinColumn(name = "usuario_id", insertable = false, updatable = false)
    private User usuario;
    
    @Column(nullable = false)
    private String especialidad;

    @Column(nullable = false)
    @Builder.Default
    private LocalDateTime createdAt = LocalDateTime.now();

    @Column(nullable = false)
    @Builder.Default
    private LocalDateTime updatedAt = LocalDateTime.now();

    @Column(name = "deleted_at")
    private LocalDateTime deletedAt;
    
    @OneToMany(mappedBy = "profesor", cascade = CascadeType.ALL)
    private Set<Convocatoria> convocatorias;
}
```

### Paso 1.5: Actualizar `Convocatoria.java`

```java
package sudtalent.sudtalentproyecto.model;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.Set;
import java.util.UUID;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Entity
@Table(name = "convocatorias")
@Getter
@Setter
@AllArgsConstructor
@NoArgsConstructor
public class Convocatoria {
    
    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    @Column(columnDefinition = "uuid")
    private UUID id;
    
    @Column(nullable = false)
    private LocalDate fecha;
    
    @Column(nullable = false)
    private String tipo;
    
    @Column(nullable = false)
    private String estado;

    @Column(nullable = false)
    @Builder.Default
    private LocalDateTime createdAt = LocalDateTime.now();

    @Column(nullable = false)
    @Builder.Default
    private LocalDateTime updatedAt = LocalDateTime.now();

    @Column(name = "deleted_at")
    private LocalDateTime deletedAt;
    
    @ManyToOne
    @JoinColumn(name = "profesor_id", nullable = false)
    private Profesor profesor;
    
    @OneToMany(mappedBy = "convocatoria", cascade = CascadeType.ALL)
    private Set<Postulacion> postulaciones;
}
```

### Paso 1.6: Actualizar `Postulacion.java`

```java
package sudtalent.sudtalentproyecto.model;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.UUID;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Entity
@Table(name = "postulaciones", uniqueConstraints = {
    @UniqueConstraint(columnNames = {"alumno_id", "convocatoria_id"})
})
@Getter
@Setter
@AllArgsConstructor
@NoArgsConstructor
public class Postulacion {
    
    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    @Column(columnDefinition = "uuid")
    private UUID id;
    
    @Column(name = "fecha_postulacion")
    private LocalDate fechaPostulacion;

    @Column(nullable = false)
    @Builder.Default
    private LocalDateTime createdAt = LocalDateTime.now();

    @Column(nullable = false)
    @Builder.Default
    private LocalDateTime updatedAt = LocalDateTime.now();

    @Column(name = "deleted_at")
    private LocalDateTime deletedAt;
    
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "alumno_id", nullable = false)
    private Alumno alumno;
    
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "convocatoria_id", nullable = false)
    private Convocatoria convocatoria;
}
```

### Paso 1.7: Actualizar `Administrador.java`

```java
package sudtalent.sudtalentproyecto.model;

import java.time.LocalDateTime;
import java.util.UUID;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Entity
@Table(name = "administradores")
@Getter
@Setter
@AllArgsConstructor
@NoArgsConstructor
@PrimaryKeyJoinColumn(name = "usuario_id")
public class Administrador extends User {
    
    @Column(nullable = false, updatable = false)
    @Builder.Default
    private LocalDateTime createdAt = LocalDateTime.now();
}
```

### Paso 1.8: Actualizar `WhitelistNumber.java`

```java
package sudtalent.sudtalentproyecto.model;

import jakarta.persistence.*;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import java.time.LocalDateTime;
import java.util.UUID;

@Entity
@Table(name = "whitelist_numbers")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class WhitelistNumber {
    
    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    @Column(columnDefinition = "uuid")
    private UUID id;

    @NotBlank
    @Pattern(regexp = "^[0-9]{8,15}$")
    @Column(nullable = false, unique = true, length = 20)
    private String phone;

    @Column(length = 255)
    private String name;

    @Column(length = 100)
    private String email;

    @Column(length = 50)
    @Builder.Default
    private String category = "NONE";

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    @Builder.Default
    private Status status = Status.PENDIENTE;

    @Column(nullable = false, updatable = false)
    @Builder.Default
    private LocalDateTime createdAt = LocalDateTime.now();

    @Column(nullable = false)
    @Builder.Default
    private LocalDateTime updatedAt = LocalDateTime.now();

    @Column(name = "deleted_at")
    private LocalDateTime deletedAt;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "usuario_id", referencedColumnName = "id")
    private User user;

    public enum Status {
        ACTIVO, INACTIVO, PENDIENTE
    }
}
```

### Paso 1.9: Actualizar `Profile.java`

```java
package sudtalent.sudtalentproyecto.model;

import java.time.LocalDateTime;
import java.util.UUID;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Entity
@Table(name = "perfiles")
@Getter
@Setter
@AllArgsConstructor
@NoArgsConstructor
@Builder
public class Profile {
    
    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    @Column(columnDefinition = "uuid")
    private UUID id;

    @Column(nullable = false)
    private String descripcion;

    @Column(nullable = false)
    @Builder.Default
    private LocalDateTime createdAt = LocalDateTime.now();

    @Column(nullable = false)
    @Builder.Default
    private LocalDateTime updatedAt = LocalDateTime.now();

    @Column(name = "deleted_at")
    private LocalDateTime deletedAt;
}
```

### Paso 1.10: Crear Custom Repository Base para Soft Delete

```java
package sudtalent.sudtalentproyecto.repository;

import java.time.LocalDateTime;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.NoRepositoryBean;

@NoRepositoryBean
public interface SoftDeleteRepository<T, ID> extends JpaRepository<T, ID> {
    
    @Query("SELECT e FROM #{#entityName} e WHERE e.deletedAt IS NULL")
    java.util.List<T> findAllActive();
    
    @Query("SELECT e FROM #{#entityName} e WHERE e.id = ?1 AND e.deletedAt IS NULL")
    java.util.Optional<T> findByIdActive(ID id);
}
```

### Paso 1.11: Actualizar todos los Repositories

```java
// Ejemplo: UserRepository
package sudtalent.sudtalentproyecto.repository;

import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;
import sudtalent.sudtalentproyecto.model.User;

@Repository
public interface UserRepository extends SoftDeleteRepository<User, UUID> {
    
    @Query("SELECT u FROM User u WHERE u.email = ?1 AND u.deletedAt IS NULL")
    Optional<User> findByEmailActive(String email);
    
    @Query("SELECT u FROM User u WHERE u.phone = ?1 AND u.deletedAt IS NULL")
    Optional<User> findByPhoneActive(String phone);
}
```

---

## 🗄️ FASE 2: Migrar Datos en Supabase (Semana 1-2)

### Paso 2.1: Crear tabla temporal con UUIDs

```sql
-- En Supabase SQL Editor
-- Crear tabla temporal con datos migrados

CREATE TABLE users_new (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email character varying UNIQUE NOT NULL,
  name character varying NOT NULL,
  password character varying NOT NULL,
  phone character varying UNIQUE,
  age integer,
  bio character varying,
  active boolean NOT NULL DEFAULT true,
  onboarded boolean NOT NULL DEFAULT false,
  role character varying NOT NULL,
  profile_type character varying,
  specialization character varying,
  child_name character varying,
  child_age integer,
  specialties character varying,
  status character varying,
  perfil_id uuid,
  created_at timestamp without time zone NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at timestamp without time zone NOT NULL DEFAULT CURRENT_TIMESTAMP,
  deleted_at timestamp without time zone
);

-- Mapeo de IDs viejos a nuevos (para mantener referencias)
CREATE TABLE id_mapping (
  old_id bigint NOT NULL,
  new_id uuid NOT NULL,
  PRIMARY KEY (old_id)
);
```

### Paso 2.2: Migrar datos con UUID generado

```sql
-- Insertar datos con mapping de UUID
INSERT INTO id_mapping (old_id, new_id)
SELECT id, gen_random_uuid() FROM users
ORDER BY id;

-- Migrar usuarios con perfil_id actualizado
INSERT INTO users_new (id, email, name, password, phone, age, bio, active, onboarded, 
                       role, profile_type, specialization, child_name, child_age, 
                       specialties, status, perfil_id, created_at, updated_at)
SELECT m.new_id, u.email, u.name, u.password, u.phone, u.age, u.bio, u.active, 
       u.onboarded, u.role, u.profile_type, u.specialization, u.child_name, 
       u.child_age, u.specialties, u.status, p.id, u.created_at, u.created_at
FROM users u
LEFT JOIN id_mapping im ON u.id = im.old_id
LEFT JOIN perfiles_new p ON u.perfil_id = p.old_id
ORDER BY u.id;
```

### Paso 2.3: Migrar tablas relacionadas con nuevos UUIDs

```sql
-- Alumnos
CREATE TABLE alumnos_new (
  usuario_id uuid PRIMARY KEY,
  fecha_nacimiento date,
  created_at timestamp without time zone NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at timestamp without time zone NOT NULL DEFAULT CURRENT_TIMESTAMP,
  deleted_at timestamp without time zone,
  CONSTRAINT fk_alumnos_usuario FOREIGN KEY (usuario_id) 
    REFERENCES users_new(id) ON DELETE CASCADE
);

INSERT INTO alumnos_new (usuario_id, fecha_nacimiento, created_at, updated_at)
SELECT m.new_id, a.fecha_nacimiento, a.created_at, a.updated_at
FROM alumnos a
JOIN id_mapping m ON a.usuario_id = m.old_id;

-- Profesores
CREATE TABLE profesores_new (
  usuario_id uuid PRIMARY KEY,
  especialidad character varying NOT NULL,
  created_at timestamp without time zone NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at timestamp without time zone NOT NULL DEFAULT CURRENT_TIMESTAMP,
  deleted_at timestamp without time zone,
  CONSTRAINT fk_profesores_usuario FOREIGN KEY (usuario_id) 
    REFERENCES users_new(id) ON DELETE CASCADE
);

INSERT INTO profesores_new (usuario_id, especialidad, created_at, updated_at)
SELECT m.new_id, p.especialidad, p.created_at, p.updated_at
FROM profesores p
JOIN id_mapping m ON p.usuario_id = m.old_id;

-- Administradores
CREATE TABLE administradores_new (
  usuario_id uuid PRIMARY KEY,
  created_at timestamp without time zone NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_administradores_usuario FOREIGN KEY (usuario_id) 
    REFERENCES users_new(id) ON DELETE CASCADE
);

INSERT INTO administradores_new (usuario_id, created_at)
SELECT m.new_id, a.created_at
FROM administradores a
JOIN id_mapping m ON a.usuario_id = m.old_id;
```

### Paso 2.4: Migrar Convocatorias y Postulaciones

```sql
-- Perfiles (primero porque se referencia)
CREATE TABLE perfiles_new (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  descripcion character varying NOT NULL,
  created_at timestamp without time zone NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at timestamp without time zone NOT NULL DEFAULT CURRENT_TIMESTAMP,
  deleted_at timestamp without time zone
);

INSERT INTO perfiles_new (id, descripcion, created_at, updated_at)
SELECT gen_random_uuid(), descripcion, created_at, created_at
FROM perfiles;

-- Crear tabla mapping de perfiles
CREATE TABLE perfil_id_mapping (
  old_id bigint NOT NULL,
  new_id uuid NOT NULL,
  PRIMARY KEY (old_id)
);

INSERT INTO perfil_id_mapping (old_id, new_id)
SELECT p.id, pn.id
FROM perfiles p
JOIN perfiles_new pn ON p.descripcion = pn.descripcion;

-- Convocatorias
CREATE TABLE convocatorias_new (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  profesor_id uuid NOT NULL,
  fecha date NOT NULL,
  estado character varying NOT NULL,
  tipo character varying NOT NULL,
  created_at timestamp without time zone NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at timestamp without time zone NOT NULL DEFAULT CURRENT_TIMESTAMP,
  deleted_at timestamp without time zone,
  CONSTRAINT fk_convocatorias_profesor FOREIGN KEY (profesor_id) 
    REFERENCES profesores_new(usuario_id) ON DELETE CASCADE
);

INSERT INTO convocatorias_new (id, profesor_id, fecha, estado, tipo, created_at, updated_at)
SELECT gen_random_uuid(), pm.new_id, c.fecha, c.estado, c.tipo, c.created_at, c.created_at
FROM convocatorias c
JOIN id_mapping pm ON c.profesor_id = pm.old_id;

-- Postulaciones
CREATE TABLE postulaciones_new (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  alumno_id uuid NOT NULL,
  convocatoria_id uuid NOT NULL,
  fecha_postulacion date,
  created_at timestamp without time zone NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at timestamp without time zone NOT NULL DEFAULT CURRENT_TIMESTAMP,
  deleted_at timestamp without time zone,
  CONSTRAINT fk_postulaciones_alumno FOREIGN KEY (alumno_id) 
    REFERENCES alumnos_new(usuario_id) ON DELETE CASCADE,
  CONSTRAINT fk_postulaciones_convocatoria FOREIGN KEY (convocatoria_id) 
    REFERENCES convocatorias_new(id) ON DELETE CASCADE
);

INSERT INTO postulaciones_new (id, alumno_id, convocatoria_id, fecha_postulacion, created_at, updated_at)
SELECT gen_random_uuid(), am.new_id, cn.id, p.fecha_postulacion, p.created_at, p.created_at
FROM postulaciones p
JOIN id_mapping am ON p.alumno_id = am.old_id
JOIN convocatorias_new cn ON p.convocatoria_id = cn.id;

-- Whitelist Numbers
CREATE TABLE whitelist_numbers_new (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  phone character varying NOT NULL UNIQUE,
  email character varying,
  name character varying,
  category character varying,
  status character varying NOT NULL,
  usuario_id uuid,
  created_at timestamp without time zone NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at timestamp without time zone NOT NULL DEFAULT CURRENT_TIMESTAMP,
  deleted_at timestamp without time zone,
  CONSTRAINT fk_whitelist_usuario FOREIGN KEY (usuario_id) 
    REFERENCES users_new(id) ON DELETE SET NULL
);

INSERT INTO whitelist_numbers_new (id, phone, email, name, category, status, usuario_id, created_at, updated_at)
SELECT gen_random_uuid(), wn.phone, wn.email, wn.name, wn.category, wn.status, 
       CASE WHEN wn.usuario_id IS NOT NULL THEN m.new_id ELSE NULL END,
       wn.created_at, wn.updated_at
FROM whitelist_numbers wn
LEFT JOIN id_mapping m ON wn.usuario_id = m.old_id;
```

### Paso 2.5: Validar Migraciones

```sql
-- Verificar conteos
SELECT 'users' as tabla, COUNT(*) as count FROM users
UNION ALL
SELECT 'users_new', COUNT(*) FROM users_new
UNION ALL
SELECT 'alumnos', COUNT(*) FROM alumnos
UNION ALL
SELECT 'alumnos_new', COUNT(*) FROM alumnos_new
UNION ALL
SELECT 'profesores', COUNT(*) FROM profesores
UNION ALL
SELECT 'profesores_new', COUNT(*) FROM profesores_new
UNION ALL
SELECT 'convocatorias', COUNT(*) FROM convocatorias
UNION ALL
SELECT 'convocatorias_new', COUNT(*) FROM convocatorias_new
UNION ALL
SELECT 'postulaciones', COUNT(*) FROM postulaciones
UNION ALL
SELECT 'postulaciones_new', COUNT(*) FROM postulaciones_new;

-- Verificar integridad de FKs
SELECT COUNT(*) as huerfanos_alumnos 
FROM alumnos_new a 
WHERE NOT EXISTS (SELECT 1 FROM users_new u WHERE u.id = a.usuario_id);

SELECT COUNT(*) as huerfanos_profesores 
FROM profesores_new p 
WHERE NOT EXISTS (SELECT 1 FROM users_new u WHERE u.id = p.usuario_id);

SELECT COUNT(*) as huerfanos_convocatorias 
FROM convocatorias_new c 
WHERE NOT EXISTS (SELECT 1 FROM profesores_new p WHERE p.usuario_id = c.profesor_id);

SELECT COUNT(*) as huerfanos_postulaciones 
FROM postulaciones_new pt 
WHERE NOT EXISTS (SELECT 1 FROM alumnos_new a WHERE a.usuario_id = pt.alumno_id)
   OR NOT EXISTS (SELECT 1 FROM convocatorias_new c WHERE c.id = pt.convocatoria_id);
```

### Paso 2.6: Hacer Backup y Reemplazar Tablas

```sql
-- ⚠️ BACKUP PRIMERO - Hacer backup de toda la DB en Supabase
-- En Supabase Dashboard: Backups → Create Backup

-- Luego de validar TODO, reemplazar:
BEGIN TRANSACTION;

-- Renombrar tablas viejas
ALTER TABLE users RENAME TO users_old;
ALTER TABLE alumnos RENAME TO alumnos_old;
ALTER TABLE profesores RENAME TO profesores_old;
ALTER TABLE administradores RENAME TO administradores_old;
ALTER TABLE convocatorias RENAME TO convocatorias_old;
ALTER TABLE postulaciones RENAME TO postulaciones_old;
ALTER TABLE whitelist_numbers RENAME TO whitelist_numbers_old;
ALTER TABLE perfiles RENAME TO perfiles_old;

-- Renombrar tablas nuevas
ALTER TABLE users_new RENAME TO users;
ALTER TABLE alumnos_new RENAME TO alumnos;
ALTER TABLE profesores_new RENAME TO profesores;
ALTER TABLE administradores_new RENAME TO administradores;
ALTER TABLE convocatorias_new RENAME TO convocatorias;
ALTER TABLE postulaciones_new RENAME TO postulaciones;
ALTER TABLE whitelist_numbers_new RENAME TO whitelist_numbers;
ALTER TABLE perfiles_new RENAME TO perfiles;

-- Actualizar secuencias de usuarios
ALTER TABLE users ADD CONSTRAINT fk_users_perfil FOREIGN KEY (perfil_id) 
  REFERENCES perfiles(id) ON DELETE SET NULL;

COMMIT;
```

---

## 🔐 FASE 3: Agregar RLS Policies (Semana 2-3)

### Paso 3.1: Crear función para actualizar updated_at

```sql
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Crear triggers para todas las tablas
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON public.users
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_alumnos_updated_at BEFORE UPDATE ON public.alumnos
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_profesores_updated_at BEFORE UPDATE ON public.profesores
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_convocatorias_updated_at BEFORE UPDATE ON public.convocatorias
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_postulaciones_updated_at BEFORE UPDATE ON public.postulaciones
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_whitelist_numbers_updated_at BEFORE UPDATE ON public.whitelist_numbers
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_perfiles_updated_at BEFORE UPDATE ON public.perfiles
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
```

### Paso 3.2: Habilitar RLS en tablas

```sql
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.alumnos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profesores ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.administradores ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.convocatorias ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.postulaciones ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.whitelist_numbers ENABLE ROW LEVEL SECURITY;
```

### Paso 3.3: Crear RLS Policies

```sql
-- ============================================================================
-- USERS POLICIES
-- ============================================================================

-- Todos pueden ver usuarios (no borrados)
CREATE POLICY "usuarios_select_public" ON public.users
  FOR SELECT USING (deleted_at IS NULL);

-- Solo admin o el mismo usuario pueden actualizar
CREATE POLICY "usuarios_update_self_or_admin" ON public.users
  FOR UPDATE USING (
    auth.uid() = id OR 
    EXISTS (SELECT 1 FROM public.administradores WHERE usuario_id = auth.uid())
  );

-- Solo admin puede insertar
CREATE POLICY "usuarios_insert_admin_only" ON public.users
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM public.administradores WHERE usuario_id = auth.uid())
  );

-- Solo admin puede eliminar (soft delete)
CREATE POLICY "usuarios_delete_admin_only" ON public.users
  FOR DELETE USING (
    EXISTS (SELECT 1 FROM public.administradores WHERE usuario_id = auth.uid())
  );

-- ============================================================================
-- ALUMNOS POLICIES
-- ============================================================================

-- Alumnos ven sus datos, profesores ven todos, admin ve todos
CREATE POLICY "alumnos_select" ON public.alumnos
  FOR SELECT USING (
    usuario_id = auth.uid() OR
    EXISTS (SELECT 1 FROM public.profesores WHERE usuario_id = auth.uid()) OR
    EXISTS (SELECT 1 FROM public.administradores WHERE usuario_id = auth.uid())
  );

-- Solo el alumno y admin pueden actualizar
CREATE POLICY "alumnos_update" ON public.alumnos
  FOR UPDATE USING (
    usuario_id = auth.uid() OR
    EXISTS (SELECT 1 FROM public.administradores WHERE usuario_id = auth.uid())
  );

-- ============================================================================
-- PROFESORES POLICIES
-- ============================================================================

-- Todos ven profesores (no borrados)
CREATE POLICY "profesores_select" ON public.profesores
  FOR SELECT USING (deleted_at IS NULL);

-- Solo el profesor y admin pueden actualizar
CREATE POLICY "profesores_update" ON public.profesores
  FOR UPDATE USING (
    usuario_id = auth.uid() OR
    EXISTS (SELECT 1 FROM public.administradores WHERE usuario_id = auth.uid())
  );

-- ============================================================================
-- CONVOCATORIAS POLICIES
-- ============================================================================

-- Todos ven convocatorias (no borradas)
CREATE POLICY "convocatorias_select" ON public.convocatorias
  FOR SELECT USING (deleted_at IS NULL);

-- Solo el profesor creador y admin pueden actualizar
CREATE POLICY "convocatorias_update" ON public.convocatorias
  FOR UPDATE USING (
    profesor_id = auth.uid() OR
    EXISTS (SELECT 1 FROM public.administradores WHERE usuario_id = auth.uid())
  );

-- Solo profesor y admin pueden crear
CREATE POLICY "convocatorias_insert" ON public.convocatorias
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM public.profesores WHERE usuario_id = auth.uid()) OR
    EXISTS (SELECT 1 FROM public.administradores WHERE usuario_id = auth.uid())
  );

-- ============================================================================
-- POSTULACIONES POLICIES
-- ============================================================================

-- Alumnos ven sus postulaciones, profesores ven las de sus convocatorias
CREATE POLICY "postulaciones_select" ON public.postulaciones
  FOR SELECT USING (
    alumno_id = auth.uid() OR
    EXISTS (
      SELECT 1 FROM public.convocatorias c
      WHERE c.id = convocatoria_id AND c.profesor_id = auth.uid()
    ) OR
    EXISTS (SELECT 1 FROM public.administradores WHERE usuario_id = auth.uid())
  );

-- Solo el alumno y admin pueden insertar
CREATE POLICY "postulaciones_insert" ON public.postulaciones
  FOR INSERT WITH CHECK (
    alumno_id = auth.uid() OR
    EXISTS (SELECT 1 FROM public.administradores WHERE usuario_id = auth.uid())
  );

-- Solo el alumno y admin pueden actualizar
CREATE POLICY "postulaciones_update" ON public.postulaciones
  FOR UPDATE USING (
    alumno_id = auth.uid() OR
    EXISTS (SELECT 1 FROM public.administradores WHERE usuario_id = auth.uid())
  );

-- ============================================================================
-- WHITELIST POLICIES
-- ============================================================================

-- Solo admin puede ver
CREATE POLICY "whitelist_select_admin" ON public.whitelist_numbers
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.administradores WHERE usuario_id = auth.uid())
  );

-- Solo admin puede modificar
CREATE POLICY "whitelist_all_admin" ON public.whitelist_numbers
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.administradores WHERE usuario_id = auth.uid())
  );
```

---

## 🗑️ FASE 4: Implementar Soft Delete (Semana 3-4)

### Paso 4.1: Crear servicio de Soft Delete en Backend

```java
package sudtalent.sudtalentproyecto.service;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import sudtalent.sudtalentproyecto.model.User;
import sudtalent.sudtalentproyecto.model.Alumno;
import sudtalent.sudtalentproyecto.model.Profesor;
import sudtalent.sudtalentproyecto.model.Convocatoria;
import sudtalent.sudtalentproyecto.model.Postulacion;
import sudtalent.sudtalentproyecto.model.WhitelistNumber;
import sudtalent.sudtalentproyecto.repository.UserRepository;
import sudtalent.sudtalentproyecto.repository.AlumnoRepository;
import sudtalent.sudtalentproyecto.repository.ProfesorRepository;
import sudtalent.sudtalentproyecto.repository.ConvocatoriaRepository;
import sudtalent.sudtalentproyecto.repository.PostulacionRepository;
import sudtalent.sudtalentproyecto.repository.WhitelistNumberRepository;
import java.time.LocalDateTime;
import java.util.UUID;

@Service
public class SoftDeleteService {
    
    @Autowired
    private UserRepository userRepository;
    
    @Autowired
    private AlumnoRepository alumnoRepository;
    
    @Autowired
    private ProfesorRepository profesorRepository;
    
    @Autowired
    private ConvocatoriaRepository convocatoriaRepository;
    
    @Autowired
    private PostulacionRepository postulacionRepository;
    
    @Autowired
    private WhitelistNumberRepository whitelistRepository;
    
    /**
     * Soft delete de usuario - marca como eliminado pero mantiene datos
     */
    public User softDeleteUser(UUID userId) {
        User user = userRepository.findById(userId)
            .orElseThrow(() -> new IllegalArgumentException("Usuario no encontrado"));
        
        user.softDelete();
        user.setDeletedAt(LocalDateTime.now());
        user.setActive(false);
        
        return userRepository.save(user);
    }
    
    /**
     * Soft delete de alumno
     */
    public Alumno softDeleteAlumno(UUID alumnoId) {
        Alumno alumno = alumnoRepository.findById(alumnoId)
            .orElseThrow(() -> new IllegalArgumentException("Alumno no encontrado"));
        
        alumno.setDeletedAt(LocalDateTime.now());
        return alumnoRepository.save(alumno);
    }
    
    /**
     * Soft delete de profesor
     */
    public Profesor softDeleteProfesor(UUID profesorId) {
        Profesor profesor = profesorRepository.findById(profesorId)
            .orElseThrow(() -> new IllegalArgumentException("Profesor no encontrado"));
        
        profesor.setDeletedAt(LocalDateTime.now());
        return profesorRepository.save(profesor);
    }
    
    /**
     * Soft delete de convocatoria
     */
    public Convocatoria softDeleteConvocatoria(UUID convocatoriaId) {
        Convocatoria convocatoria = convocatoriaRepository.findById(convocatoriaId)
            .orElseThrow(() -> new IllegalArgumentException("Convocatoria no encontrada"));
        
        convocatoria.setDeletedAt(LocalDateTime.now());
        return convocatoriaRepository.save(convocatoria);
    }
    
    /**
     * Soft delete de postulación
     */
    public Postulacion softDeletePostulacion(UUID postulacionId) {
        Postulacion postulacion = postulacionRepository.findById(postulacionId)
            .orElseThrow(() -> new IllegalArgumentException("Postulación no encontrada"));
        
        postulacion.setDeletedAt(LocalDateTime.now());
        return postulacionRepository.save(postulacion);
    }
    
    /**
     * Restaurar usuario (deshacer soft delete)
     */
    public User restoreUser(UUID userId) {
        User user = userRepository.findById(userId)
            .orElseThrow(() -> new IllegalArgumentException("Usuario no encontrado"));
        
        user.setDeletedAt(null);
        if (!user.isActive()) {
            user.setActive(true);
        }
        
        return userRepository.save(user);
    }
}
```

### Paso 4.2: Actualizar Controllers para usar Soft Delete

```java
// Ejemplo: UserController
package sudtalent.sudtalentproyecto.controller;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import sudtalent.sudtalentproyecto.model.User;
import sudtalent.sudtalentproyecto.service.SoftDeleteService;
import sudtalent.sudtalentproyecto.repository.UserRepository;
import java.util.UUID;

@RestController
@RequestMapping("/api/users")
public class UserController {
    
    @Autowired
    private UserRepository userRepository;
    
    @Autowired
    private SoftDeleteService softDeleteService;
    
    @GetMapping("/{id}")
    public ResponseEntity<User> getUser(@PathVariable UUID id) {
        // Solo retorna si no está eliminado
        return userRepository.findByIdActive(id)
            .map(ResponseEntity::ok)
            .orElse(ResponseEntity.notFound().build());
    }
    
    @GetMapping
    public ResponseEntity<?> getAllUsers() {
        // Solo retorna usuarios no eliminados
        return ResponseEntity.ok(userRepository.findAllActive());
    }
    
    // ✅ Cambiar DELETE por SOFT DELETE
    @DeleteMapping("/{id}")
    public ResponseEntity<?> deleteUser(@PathVariable UUID id) {
        try {
            User deletedUser = softDeleteService.softDeleteUser(id);
            return ResponseEntity.ok(deletedUser);
        } catch (IllegalArgumentException e) {
            return ResponseEntity.notFound().build();
        }
    }
    
    // ✅ Nuevo endpoint: Restaurar usuario
    @PutMapping("/{id}/restore")
    public ResponseEntity<?> restoreUser(@PathVariable UUID id) {
        try {
            User restoredUser = softDeleteService.restoreUser(id);
            return ResponseEntity.ok(restoredUser);
        } catch (IllegalArgumentException e) {
            return ResponseEntity.notFound().build();
        }
    }
}
```

### Paso 4.3: Crear Specifications para filtrar activos

```java
package sudtalent.sudtalentproyecto.specification;

import org.springframework.data.jpa.domain.Specification;
import sudtalent.sudtalentproyecto.model.User;
import sudtalent.sudtalentproyecto.model.Alumno;

public class UserSpecifications {
    
    public static Specification<User> isNotDeleted() {
        return (root, query, criteriaBuilder) -> 
            criteriaBuilder.isNull(root.get("deletedAt"));
    }
    
    public static Specification<User> byEmail(String email) {
        return (root, query, criteriaBuilder) -> 
            criteriaBuilder.equal(root.get("email"), email);
    }
    
    public static Specification<User> byRole(User.Role role) {
        return (root, query, criteriaBuilder) -> 
            criteriaBuilder.equal(root.get("role"), role);
    }
    
    public static Specification<User> activeUsers() {
        return isNotDeleted().and((root, query, criteriaBuilder) -> 
            criteriaBuilder.equal(root.get("active"), true));
    }
}

// Uso en Controller:
// userRepository.findAll(
//   Specification.where(UserSpecifications.activeUsers())
//     .and(UserSpecifications.byRole(User.Role.ALUMNO))
// );
```

---

## 🧪 FASE 5: Testing Integral (Semana 4-5)

### Paso 5.1: Tests Unitarios

```java
package sudtalent.sudtalentproyecto.service;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.orm.jpa.DataJpaTest;
import sudtalent.sudtalentproyecto.model.User;
import sudtalent.sudtalentproyecto.repository.UserRepository;
import java.time.LocalDateTime;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.*;

@DataJpaTest
public class SoftDeleteServiceTest {
    
    @Autowired
    private UserRepository userRepository;
    
    private SoftDeleteService softDeleteService;
    private User testUser;
    
    @BeforeEach
    void setUp() {
        softDeleteService = new SoftDeleteService();
        softDeleteService.userRepository = userRepository;
        
        testUser = User.builder()
            .name("Test User")
            .email("test@example.com")
            .password("password123")
            .role(User.Role.ALUMNO)
            .build();
        
        testUser = userRepository.save(testUser);
    }
    
    @Test
    void testSoftDeleteUser() {
        // Arrange
        UUID userId = testUser.getId();
        
        // Act
        User deletedUser = softDeleteService.softDeleteUser(userId);
        
        // Assert
        assertNotNull(deletedUser.getDeletedAt());
        assertFalse(deletedUser.isActive());
        
        // Verificar que findById no lo retorna (soft delete)
        assertTrue(userRepository.findByIdActive(userId).isEmpty());
    }
    
    @Test
    void testRestoreUser() {
        // Arrange
        UUID userId = testUser.getId();
        softDeleteService.softDeleteUser(userId);
        
        // Act
        User restoredUser = softDeleteService.restoreUser(userId);
        
        // Assert
        assertNull(restoredUser.getDeletedAt());
        assertTrue(restoredUser.isActive());
        assertTrue(userRepository.findByIdActive(userId).isPresent());
    }
    
    @Test
    void testFindAllActiveOnlyReturnsNonDeleted() {
        // Arrange
        User user2 = User.builder()
            .name("User 2")
            .email("user2@example.com")
            .password("password123")
            .role(User.Role.ALUMNO)
            .build();
        userRepository.save(user2);
        
        softDeleteService.softDeleteUser(testUser.getId());
        
        // Act
        var activeUsers = userRepository.findAllActive();
        
        // Assert
        assertEquals(1, activeUsers.size());
        assertEquals("User 2", activeUsers.get(0).getName());
    }
}
```

### Paso 5.2: Tests de Integración

```java
package sudtalent.sudtalentproyecto.controller;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.web.servlet.MockMvc;
import sudtalent.sudtalentproyecto.model.User;
import sudtalent.sudtalentproyecto.repository.UserRepository;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest
@AutoConfigureMockMvc
public class UserControllerIntegrationTest {
    
    @Autowired
    private MockMvc mockMvc;
    
    @Autowired
    private UserRepository userRepository;
    
    private User testUser;
    
    @BeforeEach
    void setUp() {
        testUser = User.builder()
            .name("Test User")
            .email("test@example.com")
            .password("password123")
            .role(User.Role.ALUMNO)
            .build();
        testUser = userRepository.save(testUser);
    }
    
    @Test
    void testGetDeletedUserReturns404() throws Exception {
        // Act: Soft delete del usuario
        testUser.softDelete();
        testUser.setDeletedAt(java.time.LocalDateTime.now());
        userRepository.save(testUser);
        
        // Assert: GET debe retornar 404
        mockMvc.perform(get("/api/users/" + testUser.getId()))
            .andExpect(status().isNotFound());
    }
    
    @Test
    void testGetAllUsersExcludesDeleted() throws Exception {
        // Arrange
        User user2 = User.builder()
            .name("User 2")
            .email("user2@example.com")
            .password("password123")
            .role(User.Role.ALUMNO)
            .build();
        userRepository.save(user2);
        
        testUser.softDelete();
        testUser.setDeletedAt(java.time.LocalDateTime.now());
        userRepository.save(testUser);
        
        // Act & Assert
        mockMvc.perform(get("/api/users"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$[0].name").value("User 2"))
            .andExpect(jsonPath("$.length()").value(1));
    }
}
```

### Paso 5.3: Testing de RLS en Supabase

```sql
-- Crear usuario de prueba para RLS
INSERT INTO users (id, email, name, password, role) 
VALUES ('550e8400-e29b-41d4-a716-446655440000', 'testuser@example.com', 'Test User', 'hashed_pw', 'ALUMNO');

-- Test 1: Usuario no autenticado NO ve usuarios
SELECT * FROM users; -- Retorna vacío si RLS está activado

-- Test 2: Usuario autenticado solo ve usuarios no eliminados
-- (simulado con SET LOCAL)
BEGIN;
SELECT set_config('request.jwt.claims', '{"sub":"550e8400-e29b-41d4-a716-446655440000"}', false);
SELECT * FROM users WHERE deleted_at IS NULL;
COMMIT;
```

---

## 🚀 FASE 6: Deploy a Producción (Semana 5)

### Paso 6.1: Checklist Pre-Deploy

```markdown
ANTES DE DEPLOY A PRODUCCIÓN:

✓ Código Java compilado sin errores
✓ Todos los tests pasen (unitarios + integración)
✓ Migraciones validadas en dev/staging
✓ Backup de producción realizado
✓ Plan de rollback probado
✓ Comunicación al equipo

DEPLOY SEQUENCE:
1. Deploy de backend (Spring Boot)
2. Ejecutar migraciones SQL en Supabase
3. Activar RLS policies
4. Monitorear logs
5. Ejecutar smoke tests
6. Notificar a usuarios (si es necesario)
```

### Paso 6.2: Script de Deploy Automatizado

```bash
#!/bin/bash
# deploy.sh - Script de deploy automatizado

set -e  # Exit on error

echo "=== SudTalent Seguridad - Deploy ===="

# 1. Compilar backend
echo "Compilando backend..."
cd Producto/backend
mvn clean package -DskipTests
cd ../..

# 2. Hacer backup en Supabase
echo "Realizando backup..."
# Usar Supabase CLI
supabase db pull --db-url="$DB_URL"

# 3. Ejecutar migraciones SQL
echo "Ejecutando migraciones SQL..."
# Aquí va el script de migraciones

# 4. Deploy de docker
echo "Desplegando contenedor..."
docker-compose up -d

# 5. Health check
echo "Verificando salud de la aplicación..."
sleep 5
curl -f http://localhost:8080/actuator/health || exit 1

echo "✅ Deploy completado exitosamente!"
```

### Paso 6.3: Monitoreo Post-Deploy

```java
package sudtalent.sudtalentproyecto.monitoring;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.actuate.health.Health;
import org.springframework.boot.actuate.health.HealthIndicator;
import org.springframework.stereotype.Component;
import sudtalent.sudtalentproyecto.repository.UserRepository;

@Component
public class UUIDMigrationHealthIndicator implements HealthIndicator {
    
    @Autowired
    private UserRepository userRepository;
    
    @Override
    public Health health() {
        try {
            // Verificar que existan usuarios
            long userCount = userRepository.count();
            
            if (userCount == 0) {
                return Health.down()
                    .withDetail("message", "No hay usuarios en la base de datos")
                    .build();
            }
            
            // Verificar que todos tengan UUIDs
            var users = userRepository.findAll();
            long uuidCount = users.stream()
                .filter(u -> u.getId() != null)
                .count();
            
            if (uuidCount != userCount) {
                return Health.outOfService()
                    .withDetail("uuidCount", uuidCount)
                    .withDetail("totalCount", userCount)
                    .withDetail("message", "No todos los usuarios tienen UUID")
                    .build();
            }
            
            return Health.up()
                .withDetail("userCount", userCount)
                .withDetail("migratedToUUID", true)
                .build();
                
        } catch (Exception e) {
            return Health.down()
                .withException(e)
                .build();
        }
    }
}
```

---

## ⏮️ Plan de Rollback (Si algo falla)

### Opción 1: Rollback Automático (Si está en progreso)

```bash
# Si aún no se ha completado el deploy:
./scripts/rollback.sh

# Esto restaurará:
# 1. Tables viejas (users_old → users)
# 2. Backend con código anterior
# 3. Estado de BD anterior
```

### Opción 2: Rollback Manual

```sql
-- En Supabase, si algo falla:
BEGIN TRANSACTION;

-- Restaurar tablas viejas
ALTER TABLE users RENAME TO users_new;
ALTER TABLE users_old RENAME TO users;

ALTER TABLE alumnos RENAME TO alumnos_new;
ALTER TABLE alumnos_old RENAME TO alumnos;

-- ... (repetir para todas las tablas)

COMMIT;
```

---

## 📊 Timeline Recomendado

```
SEMANA 1:
  Lunes-Martes: Fase 1 (Actualizar entities Java)
  Miércoles-Jueves: Fase 2 (Migrar datos en Supabase)
  Viernes: Testing básico

SEMANA 2:
  Lunes-Martes: Fase 3 (Agregar RLS)
  Miércoles-Jueves: Fase 4 (Soft delete)
  Viernes: Testing + validaciones

SEMANA 3-4:
  Desarrollo + Fase 5 (Testing integral)

SEMANA 5:
  Fase 6 (Deploy a producción)
```

---

## 📞 Soporte durante Migración

Si encuentras problemas:

1. **Error de compilación Java:** Verifica que tengas UUID imports correctos
2. **Error en migraciones SQL:** Revisa los logs de Supabase
3. **Problemas con RLS:** Asegúrate que auth está configurado
4. **Performance lenta:** Verifica índices fueron creados

¿Necesitas ayuda con alguna fase específica?
