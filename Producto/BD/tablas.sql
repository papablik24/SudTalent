-- 1. Tabla de Perfiles (Roles y Accesos)
CREATE TABLE perfiles (
    id BIGSERIAL PRIMARY KEY,
    descripcion TEXT NOT NULL
);

-- 2. Tabla Superclase: Usuarios (Centraliza todos los datos comunes)
CREATE TABLE users (
    id BIGSERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    email VARCHAR(150) NOT NULL UNIQUE,
    password TEXT NOT NULL,
    phone VARCHAR(11) NOT NULL UNIQUE,
    specialization VARCHAR(50) NOT NULL,
    role VARCHAR(50) NOT NULL DEFAULT 'ALUMNO',
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    active BOOLEAN NOT NULL DEFAULT TRUE
);

-- 3. Entidades de Dominio (Subclases - Relación 1 a 1 con Usuarios - Herencia por Tabla)
CREATE TABLE alumnos (
    usuario_id BIGINT PRIMARY KEY REFERENCES users (id) ON DELETE CASCADE,
    fecha_nacimiento DATE NOT NULL
);

CREATE TABLE profesores (
    usuario_id BIGINT PRIMARY KEY REFERENCES users (id) ON DELETE CASCADE,
    especialidad TEXT NOT NULL
);

CREATE TABLE administradores (
    usuario_id BIGINT PRIMARY KEY REFERENCES users (id) ON DELETE CASCADE
);

-- 4. Entidades de Procesos (Convocatorias)
CREATE TABLE convocatorias (
    id BIGSERIAL PRIMARY KEY,
    fecha DATE NOT NULL,
    tipo TEXT NOT NULL,
    estado VARCHAR(50) NOT NULL DEFAULT 'Abierta',
    profesor_id BIGINT NOT NULL REFERENCES profesores (usuario_id) ON DELETE CASCADE
);

-- 5. Tabla Intermedia: Postulaciones (Relación Muchos a Muchos)
CREATE TABLE postulaciones (
    id BIGSERIAL PRIMARY KEY,
    alumno_id BIGINT NOT NULL REFERENCES alumnos (usuario_id) ON DELETE CASCADE,
    convocatoria_id BIGINT NOT NULL REFERENCES convocatorias (id) ON DELETE CASCADE,
    fecha_postulacion DATE NOT NULL DEFAULT CURRENT_DATE,
    CONSTRAINT unique_postulacion UNIQUE (alumno_id, convocatoria_id)
);

-- 6. Tabla WhitelistNumbers (si la tenías)
CREATE TABLE whitelist_numbers (
    id BIGSERIAL PRIMARY KEY,
    number VARCHAR(20) NOT NULL UNIQUE,
    description TEXT,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- ÍNDICES para optimizar búsquedas
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_phone ON users(phone);
CREATE INDEX idx_alumnos_usuario_id ON alumnos(usuario_id);
CREATE INDEX idx_profesores_usuario_id ON profesores(usuario_id);
CREATE INDEX idx_administradores_usuario_id ON administradores(usuario_id);
CREATE INDEX idx_convocatorias_profesor_id ON convocatorias(profesor_id);
CREATE INDEX idx_convocatorias_estado ON convocatorias(estado);
CREATE INDEX idx_postulaciones_alumno_id ON postulaciones(alumno_id);
CREATE INDEX idx_postulaciones_convocatoria_id ON postulaciones(convocatoria_id);
CREATE INDEX idx_whitelist_numbers ON whitelist_numbers(number);

-- INSERCIONES DE EJEMPLO (Opcional)
-- Insertar Perfiles
INSERT INTO perfiles (descripcion) VALUES 
('Alumno'),
('Profesor'),
('Administrador');




--- -- Insertar Usuarios (12 registros)
SET FOREIGN_KEY_CHECKS = 0;

TRUNCATE TABLE postulaciones;
TRUNCATE TABLE convocatorias;
TRUNCATE TABLE administradores;
TRUNCATE TABLE profesores;
TRUNCATE TABLE alumnos;
TRUNCATE TABLE users;
TRUNCATE TABLE perfiles;

SET FOREIGN_KEY_CHECKS = 1;

-- 1. Insertar Perfiles
INSERT INTO perfiles (descripcion) VALUES 
('Alumno'),
('Profesor'),
('Administrador');

-- 2. Insertar Usuarios
INSERT INTO users (name, email, password, phone, specialization, role, active, created_at, perfil_id) VALUES
-- Administrador (perfil_id = 3)
('Laura Godoy', 'lgodoy@sudamericanvoices.cl', '$2a$10$dummyHash1', '56910000001', 'Gestion Operativa', 'ADMINISTRADOR', true, NOW(), 3),

-- Profesores (perfil_id = 2)
('Andrea Pérez', 'aperez.dir@sudamericanvoices.cl', '$2a$10$dummyHash2', '56920000001', 'Animacion', 'PROFESOR', true, NOW(), 2),
('Carlos Muñoz', 'cmunoz@sudamericanvoices.cl', '$2a$10$dummyHash3', '56920000002', 'Locucion', 'PROFESOR', true, NOW(), 2),
('Loreto Aravena', 'laravena@sudamericanvoices.cl', '$2a$10$dummyHash4', '56920000003', 'Actuacion', 'PROFESOR', true, NOW(), 2),

-- Alumnos (perfil_id = 1)
('Pablo', 'pablo@duocuc.cl', '$2a$10$dummyHash5', '56930000001', 'Desarrollo', 'ALUMNO', true, NOW(), 1),
('Camila Soto', 'cami.soto@gmail.com', '$2a$10$dummyHash6', '56930000002', 'Ninguna', 'ALUMNO', true, NOW(), 1),
('Javier Rojas', 'jrojas.voz@outlook.com', '$2a$10$dummyHash7', '56930000003', 'Ninguna', 'ALUMNO', true, NOW(), 1),
('Valentina Castro', 'valecastrodoblaje@gmail.com', '$2a$10$dummyHash8', '56930000004', 'Canto', 'ALUMNO', true, NOW(), 1),
('Matías Fernández', 'matias.f@yahoo.com', '$2a$10$dummyHash9', '56930000005', 'Teatro', 'ALUMNO', true, NOW(), 1),
('Isidora Vega', 'isidora.v@gmail.com', '$2a$10$dummyHash10', '56930000006', 'Ninguna', 'ALUMNO', true, NOW(), 1),
('Diego Tapia', 'diegotapia@hotmail.com', '$2a$10$dummyHash11', '56930000007', 'Doblaje Inicial', 'ALUMNO', false, NOW(), 1),
('Fernanda Ríos', 'f.rios@gmail.com', '$2a$10$dummyHash12', '56930000008', 'Ninguna', 'ALUMNO', true, NOW(), 1);

-- 3. Administradores
INSERT INTO administradores (usuario_id) VALUES (1);

-- 4. Profesores
INSERT INTO profesores (usuario_id, especialidad) VALUES
(2, 'Lip-sync y Doblaje de Animación'),
(3, 'Acento Neutro y Locución Comercial'),
(4, 'Técnicas de Actuación y Expresión Vocal');

-- 5. Alumnos
INSERT INTO alumnos (usuario_id, fecha_nacimiento) VALUES
(5, '1998-05-15'),
(6, '2001-11-20'),
(7, '1995-02-10'),
(8, '2003-08-28'),
(9, '1999-12-05'),
(10, '2002-04-17'),
(11, '1997-09-30'),
(12, '2000-01-22');

-- 6. Convocatorias
INSERT INTO convocatorias (fecha, tipo, estado, profesor_id) VALUES
('2026-05-10', 'Curso Inicial de Doblaje', 'Abierta', 2),
('2026-05-15', 'Taller de Acento Neutro', 'Abierta', 3),
('2026-06-01', 'Especialización en Videojuegos', 'Cerrada', 2),
('2026-06-20', 'Masterclass Actuación de Voz', 'Abierta', 4),
('2026-07-05', 'Casting Voces Adicionales (Walla)', 'En Revisión', 2);

-- 7. Postulaciones
INSERT INTO postulaciones (alumno_id, convocatoria_id, fecha_postulacion) VALUES
(5, 1, '2026-04-20'),
(5, 2, '2026-04-21'),
(5, 4, '2026-04-25'),
(6, 1, '2026-04-22'),
(6, 3, '2026-05-01'),
(7, 2, '2026-04-22'),
(7, 4, '2026-04-23'),
(7, 5, '2026-04-26'),
(8, 1, '2026-04-23'),
(8, 5, '2026-04-27'),
(9, 3, '2026-05-02'),
(9, 4, '2026-04-24'),
(10, 1, '2026-04-24'),
(10, 2, '2026-04-25'),
(11, 1, '2026-04-26'),
(12, 2, '2026-04-26'),
(12, 5, '2026-04-28');

-- 8. Whitelist Numbers
INSERT INTO whitelist_numbers (number, description, created_at) VALUES
('56910000001', 'Teléfono corporativo Administrador Laura Godoy', NOW()),
('56920000001', 'Línea directa Directora Andrea Pérez', NOW()),
('56999999999', 'Teléfono central del estudio (Recepción)', NOW()),
('56988888888', 'Línea de emergencias técnicas', NOW());