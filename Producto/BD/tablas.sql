
-- 1. Tabla de Perfiles (Roles y Accesos)
CREATE TABLE perfiles (
    id BIGSERIAL PRIMARY KEY,
    descripcion TEXT NOT NULL
);

-- 2. Tabla Superclase: Usuarios
CREATE TABLE users (
    id BIGSERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    email VARCHAR(150) NOT NULL UNIQUE,
    phone VARCHAR(11) NOT NULL UNIQUE,
    password TEXT NOT NULL,
    specialization VARCHAR(50) NOT NULL,
    role VARCHAR(50) NOT NULL DEFAULT 'ALUMNO',
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    active BOOLEAN NOT NULL DEFAULT TRUE
);

-- 3. Entidades de Dominio (Herencia por Tabla)
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

-- 4. Convocatorias
CREATE TABLE convocatorias (
    id BIGSERIAL PRIMARY KEY,
    fecha DATE NOT NULL,
    tipo TEXT NOT NULL,
    estado VARCHAR(50) NOT NULL DEFAULT 'Abierta',
    profesor_id BIGINT NOT NULL REFERENCES profesores (usuario_id) ON DELETE CASCADE
);

-- 5. Postulaciones
CREATE TABLE postulaciones (
    id BIGSERIAL PRIMARY KEY,
    alumno_id BIGINT NOT NULL REFERENCES alumnos (usuario_id) ON DELETE CASCADE,
    convocatoria_id BIGINT NOT NULL REFERENCES convocatorias (id) ON DELETE CASCADE,
    fecha_postulacion DATE NOT NULL DEFAULT CURRENT_DATE,
    CONSTRAINT unique_postulacion UNIQUE (alumno_id, convocatoria_id)
);

-- 6. Whitelist Numbers
CREATE TABLE whitelist_numbers (
    id BIGSERIAL PRIMARY KEY,
    number VARCHAR(20) NOT NULL UNIQUE,
    description TEXT,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);


-- LIMPIEZA E INSERCIONES (PostgreSQL)
TRUNCATE TABLE postulaciones CASCADE;
TRUNCATE TABLE convocatorias CASCADE;
TRUNCATE TABLE administradores CASCADE;
TRUNCATE TABLE profesores CASCADE;
TRUNCATE TABLE alumnos CASCADE;
TRUNCATE TABLE users CASCADE;
TRUNCATE TABLE perfiles CASCADE;


-- Inserciones
INSERT INTO perfiles (descripcion) VALUES ('Alumno'), ('Profesor'), ('Administrador');

INSERT INTO users (name, email, password, phone, specialization, role, active) VALUES
('Laura Godoy', 'lgodoy@sudamericanvoices.cl', '$2a$10$dummyHash1', '56910000001', 'Gestion Operativa', 'ADMINISTRADOR', true),
('Andrea Pérez', 'aperez.dir@sudamericanvoices.cl', '$2a$10$dummyHash2', '56920000001', 'Animacion', 'PROFESOR', true),
('Carlos Muñoz', 'cmunoz@sudamericanvoices.cl', '$2a$10$dummyHash3', '56920000002', 'Locucion', 'PROFESOR', true),
('Loreto Aravena', 'laravena@sudamericanvoices.cl', '$2a$10$dummyHash4', '56920000003', 'Actuacion', 'PROFESOR', true),
('Pablo', 'pablo@duocuc.cl', '$2a$10$dummyHash5', '56930000001', 'Desarrollo', 'ALUMNO', true),
('Camila Soto', 'cami.soto@gmail.com', '$2a$10$dummyHash6', '56930000002', 'Ninguna', 'ALUMNO', true),
('Javier Rojas', 'jrojas.voz@outlook.com', '$2a$10$dummyHash7', '56930000003', 'Ninguna', 'ALUMNO', true),
('Valentina Castro', 'valecastrodoblaje@gmail.com', '$2a$10$dummyHash8', '56930000004', 'Canto', 'ALUMNO', true),
('Matías Fernández', 'matias.f@yahoo.com', '$2a$10$dummyHash9', '56930000005', 'Teatro', 'ALUMNO', true),
('Isidora Vega', 'isidora.v@gmail.com', '$2a$10$dummyHash10', '56930000006', 'Ninguna', 'ALUMNO', true),
('Diego Tapia', 'diegotapia@hotmail.com', '$2a$10$dummyHash11', '56930000007', 'Doblaje Inicial', 'ALUMNO', false),
('Fernanda Ríos', 'f.rios@gmail.com', '$2a$10$dummyHash12', '56930000008', 'Ninguna', 'ALUMNO', true);

INSERT INTO administradores (usuario_id) VALUES (1);

INSERT INTO profesores (usuario_id, especialidad) VALUES
(2, 'Lip-sync y Doblaje de Animación'),
(3, 'Acento Neutro y Locución Comercial'),
(4, 'Técnicas de Actuación y Expresión Vocal');

INSERT INTO alumnos (usuario_id, fecha_nacimiento) VALUES
(5, '1998-05-15'), (6, '2001-11-20'), (7, '1995-02-10'), (8, '2003-08-28'),
(9, '1999-12-05'), (10, '2002-04-17'), (11, '1997-09-30'), (12, '2000-01-22');

INSERT INTO convocatorias (fecha, tipo, estado, profesor_id) VALUES
('2026-05-10', 'Curso Inicial de Doblaje', 'Abierta', 2),
('2026-05-15', 'Taller de Acento Neutro', 'Abierta', 3),
('2026-06-01', 'Especialización en Videojuegos', 'Cerrada', 2),
('2026-06-20', 'Masterclass Actuación de Voz', 'Abierta', 4),
('2026-07-05', 'Casting Voces Adicionales (Walla)', 'En Revisión', 2);

INSERT INTO postulaciones (alumno_id, convocatoria_id, fecha_postulacion) VALUES
(5, 1, '2026-04-20'), (5, 2, '2026-04-21'), (5, 4, '2026-04-25'),
(6, 1, '2026-04-22'), (6, 3, '2026-05-01'), (7, 2, '2026-04-22'),
(7, 4, '2026-04-23'), (7, 5, '2026-04-26'), (8, 1, '2026-04-23'),
(8, 5, '2026-04-27'), (9, 3, '2026-05-02'), (9, 4, '2026-04-24'),
(10, 1, '2026-04-24'), (10, 2, '2026-04-25'), (11, 1, '2026-04-26'),
(12, 2, '2026-04-26'), (12, 5, '2026-04-28');

INSERT INTO whitelist_numbers (number, description) VALUES
('56910000001', 'Teléfono corporativo Administrador Laura Godoy'),
('56920000001', 'Línea directa Directora Andrea Pérez'),
('56999999999', 'Teléfono central del estudio (Recepción)'),
('56988888888', 'Línea de emergencias técnicas');


-- ÍNDICES
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_phone ON users(phone);
CREATE INDEX idx_convocatorias_profesor_id ON convocatorias(profesor_id);
CREATE INDEX idx_convocatorias_estado ON convocatorias(estado);
CREATE INDEX idx_postulaciones_alumno_id ON postulaciones(alumno_id);
CREATE INDEX idx_postulaciones_convocatoria_id ON postulaciones(convocatoria_id);
CREATE INDEX idx_whitelist_numbers ON whitelist_numbers(number);