# 🎙️ SudTalent �🎵

![Java 21](https://img.shields.io/badge/Java_21-ED8B00?style=for-the-badge&logo=java&logoColor=white)
![Spring Boot](https://img.shields.io/badge/Spring_Boot_4-6DB33F?style=for-the-badge&logo=spring-boot&logoColor=white)
![React](https://img.shields.io/badge/React_+_Vite-61DAFB?style=for-the-badge&logo=react&logoColor=black)
![Supabase](https://img.shields.io/badge/Supabase-3ECF8E?style=for-the-badge&logo=supabase&logoColor=white)
![Docker Compose](https://img.shields.io/badge/Docker_Compose-2496ED?style=for-the-badge&logo=docker&logoColor=white)
![JWT](https://img.shields.io/badge/JWT_Auth-black?style=for-the-badge&logo=JSON%20web%20tokens)
![Nginx](https://img.shields.io/badge/Nginx-009639?style=for-the-badge&logo=nginx&logoColor=white)

**SudTalent** es una plataforma integral de gestión de carrera y vinculación para el mundo del doblaje, diseñada específicamente para **Sudamerican Voices**. Este repositorio aloja el sistema completo — **Backend Core** construido en Spring Boot y **Frontend** en React + Vite — orquestados mediante Docker Compose.

Más que un simple gestor de perfiles, SudTalent actúa como un **motor de vinculación** entre talentos vocales y oportunidades reales: centraliza convocatorias, gestiona postulaciones, expone portafolios de audio y automatiza el flujo completo de audiciones. Todo el ecosistema corre sobre infraestructura cloud de Supabase y se despliega con un único comando.

---

## 📌 Tabla de Contenidos

- [📖 Sobre el Proyecto](#-sobre-el-proyecto)
- [✨ Características Principales](#-características-principales)
- [🛠️ Stack Tecnológico](#%EF%B8%8F-stack-tecnológico)
- [🏗️ Arquitectura y Seguridad](#%EF%B8%8F-arquitectura-y-seguridad)
- [⚙️ Instalación y Despliegue (Docker Compose)](#%EF%B8%8F-instalación-y-despliegue-docker-compose)
- [📂 Estructura de Directorios](#-estructura-de-directorios)
- [🔌 Endpoints API](#-endpoints-api)
- [👨‍💻 Equipo de Desarrollo](#-equipo-de-desarrollo)

---

## 📖 Sobre el Proyecto

SudTalent nació para resolver un problema concreto de **Sudamerican Voices**, una escuela y estudio de doblaje líder en Chile: sus procesos de búsqueda, selección y seguimiento de talentos estaban completamente dispersos. Sin una plataforma unificada, coordinar convocatorias, revisar demos y gestionar postulaciones era manual, lento y propenso a errores.

La plataforma centraliza todo ese flujo en una solución moderna: los alumnos construyen su perfil profesional, suben sus demos de audio y postulan a convocatorias activas; los administradores publican castings, filtran talentos y gestionan el proceso desde un panel de control dedicado.

---

## ✨ Características Principales

**Para Postulantes y Alumnos:**
- **Perfil Profesional:** Espacio personalizado con datos de carrera, especialidades vocales e historial.
- **Portafolio de Audio:** Subida y reproducción de demos de doblaje, locución y podcasts.
- **Postulaciones:** Inscripción a convocatorias activas con seguimiento del estado en tiempo real.
- **Recuperación de Contraseña:** Flujo seguro mediante OTP enviado por correo electrónico.

**Para Administradores (Sudamerican Voices):**
- **Gestión de Convocatorias:** Publicación, edición y cierre de castings y oportunidades de voz.
- **Motor de Búsqueda de Talentos:** Filtrado avanzado con previsualización de demos de audio.
- **Panel de Control:** Gestión centralizada de usuarios, alumnos y postulaciones recibidas.
- **Sincronización de Datos:** Proceso de arranque que sincroniza el estado entre Supabase y la base de datos local.

---

## 🛠️ Stack Tecnológico

**Core Backend y Lógica de Negocio:**
- Java 21 LTS
- Spring Boot 4.x
- Spring Security (seguridad de endpoints y CORS)
- Spring Data JPA (capa de persistencia)
- Spring Web (controladores REST)
- Spring Mail (notificaciones por correo / OTP)

**Base de Datos:**
- PostgreSQL (alojado en Supabase)
- Supabase Storage (almacenamiento de archivos de audio)

**Seguridad:**
- JSON Web Tokens (JWT) para autenticación sin estado
- OTP por email para recuperación de contraseña
- Soft delete para preservar integridad referencial

**Frontend:**
- React 18 + Vite
- TypeScript
- Nginx (servidor web para la SPA en producción)

**Utilidades:**
- Lombok (reducción de código repetitivo)
- Jakarta Validation (validación de entradas)
- Spring Boot Actuator (healthchecks)
- jqwik (property-based testing)

**Infraestructura y Orquestación:**
- Docker (aislamiento de procesos, builds multi-stage)
- Docker Compose (orquestación del stack completo)

---

## 🏗️ Arquitectura y Seguridad

### Arquitectura por Capas

El código fuente sigue una separación estricta de responsabilidades:

- **Controllers:** Enrutamiento HTTP y respuestas estandarizadas hacia el cliente
- **Services:** Lógica de negocio, validaciones y coordinación entre capas
- **Repositories:** Acceso a datos mediante Spring Data JPA
- **DTOs:** Aislamiento total de las entidades de dominio, sin exponer el modelo interno
- **Security:** Filtros JWT, configuración de CORS y control de acceso por roles

### Seguridad

- **Autenticación:** Flujo completamente basado en JWT, sin estado en el servidor
- **Recuperación de contraseña:** OTP de uso único enviado por email con expiración y bloqueo por intentos
- **Protección de endpoints:** Configuración granular de Spring Security por ruta y rol

### Tolerancia a Fallos

- `GlobalExceptionHandler` (`@RestControllerAdvice`) que centraliza el manejo de todos los errores del sistema
- El cliente siempre recibe una respuesta JSON estructurada y predecible, sin stack traces expuestas
- Registro de eventos anómalos con `@Slf4j` para trazabilidad

---

## ⚙️ Instalación y Despliegue (Docker Compose)

El stack completo se levanta con un par de comandos.

### Prerrequisitos

- Docker instalado y ejecutándose
- Docker Compose disponible

### 1. Variables de Entorno

Crea un archivo `.env` dentro de la carpeta `Producto/backend/` copiando el ejemplo:

```properties
# Base de Datos — Supabase PostgreSQL
# Obtener desde Supabase Dashboard > Settings > Database
DB_URL=jdbc:postgresql://<tu_host_supabase>:5432/postgres
DB_USERNAME=postgres.<tu_id_supabase>
DB_PASSWORD=<tu_password_supabase>

# Seguridad JWT
JWT_SECRET=<tu_llave_secreta_larga>

# Perfil de Spring
SPRING_PROFILES_ACTIVE=dev

# Gmail SMTP — Recuperación de contraseña (OTP)
# Genera una contraseña de aplicación en:
# https://myaccount.google.com/security > Contraseñas de aplicaciones
MAIL_USERNAME=notificaciones.sudtalent@gmail.com
MAIL_PASSWORD=xxxx xxxx xxxx xxxx
```

También crea un archivo `.env` en la raíz de `Producto/` para el frontend:

```properties
VITE_SUPABASE_URL=https://<tu_id_supabase>.supabase.co
VITE_SUPABASE_ANON_KEY=<tu_anon_key>
VITE_SUPABASE_PROJECT_ID=<tu_project_id>
```

### 2. Levantar el Proyecto

```bash
cd Producto
docker-compose up -d --build
```

Esto construye y despliega dos servicios:

- `sudtalent-backend`: API Spring Boot en el puerto **8080**
- `sudtalent-frontend`: Interfaz React servida por Nginx en el puerto **80**

El frontend espera automáticamente a que el backend supere el healthcheck antes de arrancar.

Para detener todo de forma ordenada:

```bash
docker-compose down
```

### 3. Ejecución Local (sin Docker)

```bash
# Backend
cd Producto/backend
./mvnw spring-boot:run

# Frontend (en otra terminal)
cd Producto/frontend
npm install
npm run dev
```

---

## 📂 Estructura de Directorios

```text
SudTalent/
├── Producto/
│   ├── docker-compose.yml          # Orquestación del stack completo
│   ├── backend/                    # API Spring Boot (Java 21)
│   │   ├── src/main/java/sudtalent/sudtalentproyecto/
│   │   │   ├── config/             # Seguridad, CORS, arranque y excepciones globales
│   │   │   ├── controller/         # Endpoints REST (Auth, Alumnos, Convocatorias, etc.)
│   │   │   ├── dto/                # Objetos de transferencia de datos
│   │   │   ├── exception/          # Excepciones de dominio (OTP, Rate Limit, etc.)
│   │   │   ├── model/              # Entidades JPA
│   │   │   ├── repository/         # Interfaces Spring Data
│   │   │   ├── security/           # Filtro JWT
│   │   │   └── service/            # Lógica de negocio
│   │   └── Dockerfile              # Build multi-stage con eclipse-temurin:21
│   └── frontend/                   # SPA React + Vite
│       ├── src/
│       │   ├── components/         # Componentes de UI reutilizables
│       │   ├── hooks/              # Hooks personalizados (auth, datos, supabase)
│       │   ├── pages/              # Vistas (Admin, User, Auth)
│       │   ├── routes/             # Rutas protegidas
│       │   └── services/           # Clientes HTTP hacia el backend
│       ├── nginx.conf              # Configuración Nginx para React Router
│       └── Dockerfile              # Build multi-stage con node:22 + nginx:1.27
├── Documentación/                  # Documentos del proyecto (Gantt, casos de prueba, etc.)
└── Gestión/                        # Documentos de gestión y actas
```

---

## 🔌 Endpoints API

| Endpoint | Método | Descripción |
|:---|:---|:---|
| `/api/auth/login` | `POST` | Autenticación, retorna JWT |
| `/api/auth/register` | `POST` | Registro de nuevos usuarios |
| `/api/password-reset/request` | `POST` | Solicitar OTP de recuperación |
| `/api/password-reset/verify` | `POST` | Verificar OTP |
| `/api/password-reset/reset` | `POST` | Establecer nueva contraseña |
| `/api/alumnos` | `GET` | Listado de alumnos (admin) |
| `/api/alumnos/{id}` | `GET / PUT` | Perfil de alumno |
| `/api/convocatorias` | `GET / POST` | Listado y creación de convocatorias |
| `/api/convocatorias/{id}` | `PUT / DELETE` | Gestión de una convocatoria |
| `/api/postulaciones` | `GET / POST` | Historial y nueva postulación |
| `/api/profile` | `GET / PUT` | Perfil del usuario autenticado |
| `/actuator/health` | `GET` | Healthcheck del backend |

---

## 👨‍💻 Equipo de Desarrollo

**SudTalent** fue diseñado, desarrollado y es mantenido por:

- 💻 **Pablo Novoa**
- 💻 **Ricardo Frías**

---

> **Asignatura:** Taller de Programación — Sección 001D  
> **Docente:** Arturo Alex Vargas Reyes  
> **Institución:** Duoc UC — Sede Padre Alonso de Ovalle  
> **Fecha:** Mayo 2026
