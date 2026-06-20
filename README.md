# 🎙️ SudTalent

![Java 21](https://img.shields.io/badge/Java_21-ED8B00?style=for-the-badge&logo=java&logoColor=white)
![Spring Boot](https://img.shields.io/badge/Spring_Boot-6DB33F?style=for-the-badge&logo=spring-boot&logoColor=white)
![React 19](https://img.shields.io/badge/React_19_+_Vite-61DAFB?style=for-the-badge&logo=react&logoColor=black)
![TypeScript](https://img.shields.io/badge/TypeScript-3178C6?style=for-the-badge&logo=typescript&logoColor=white)
![Supabase](https://img.shields.io/badge/Supabase-3ECF8E?style=for-the-badge&logo=supabase&logoColor=white)
![Vercel](https://img.shields.io/badge/Vercel-000000?style=for-the-badge&logo=vercel&logoColor=white)
![Railway](https://img.shields.io/badge/Railway-0B0D0E?style=for-the-badge&logo=railway&logoColor=white)
![JWT](https://img.shields.io/badge/JWT_Auth-black?style=for-the-badge&logo=JSON%20web%20tokens)

**SudTalent** es una plataforma integral de gestión de carrera y vinculación para el mundo del doblaje, diseñada específicamente para **Sudamerican Voices**. El sistema centraliza convocatorias, gestiona postulaciones, expone portafolios de audio y automatiza el flujo completo de audiciones.

El repositorio contiene el stack completo: **Backend** en Spring Boot (desplegado en Railway) y **Frontend** SPA en React + Vite (desplegado en Vercel), con Supabase como capa de base de datos y almacenamiento de archivos.

---

## 📌 Tabla de Contenidos

- [📖 Sobre el Proyecto](#-sobre-el-proyecto)
- [✨ Funcionalidades Implementadas](#-funcionalidades-implementadas)
- [🛠️ Stack Tecnológico](#%EF%B8%8F-stack-tecnológico)
- [🏗️ Arquitectura](#%EF%B8%8F-arquitectura)
- [🚀 Despliegue en Producción](#-despliegue-en-producción)
- [⚙️ Desarrollo Local](#%EF%B8%8F-desarrollo-local)
- [📂 Estructura de Directorios](#-estructura-de-directorios)
- [🔌 Endpoints API](#-endpoints-api)
- [👨‍💻 Equipo de Desarrollo](#-equipo-de-desarrollo)

---

## 📖 Sobre el Proyecto

SudTalent nació para resolver un problema concreto de **Sudamerican Voices**: sus procesos de búsqueda, selección y seguimiento de talentos estaban completamente dispersos. Sin una plataforma unificada, coordinar convocatorias, revisar demos y gestionar postulaciones era manual, lento y propenso a errores.

La plataforma unifica ese flujo: los alumnos construyen su perfil profesional, suben demos de audio y postulan a convocatorias activas. Los administradores publican castings, filtran talentos, gestionan profesores y cursos, y obtienen reportes ejecutivos del estado de la plataforma.

---

## ✨ Funcionalidades Implementadas

### Para Alumnos

- **Onboarding guiado** con selección de tipo de perfil (personal / empresa) y validación de lista blanca
- **Perfil profesional** con especialidades vocales, redes sociales y foto de perfil
- **Portafolio de audio** — subida, reproducción y gestión de demos de doblaje, locución y podcast
- **Convocatorias** — exploración con filtros por categoría, género y fecha límite, marcado de favoritos y vista de detalle
- **Postulaciones** — inscripción vinculando una demo de audio, seguimiento del estado y posibilidad de editar la demo enviada **una sola vez** por postulación
- **Vista de cursos** asignados por el administrador
- **Vista de historial de postulaciones** con estado de cada audición
- **Recuperación de contraseña** por OTP vía correo electrónico con reenvío de código desde el paso de verificación

### Para Administradores

- **Dashboard ejecutivo** con KPIs en tiempo real (alumnos, profesores, cursos, convocatorias, postulaciones, demos)
- **Exportación de reportes** del dashboard en PDF (jsPDF + autoTable) y Excel (xlsx), con múltiples hojas y secciones
- **Gestión de alumnos** — lista blanca, aprobación de perfiles, edición inline, asignación de cursos con flujo de confirmación (Editar → Aceptar / Cancelar), importación masiva desde WhatsApp y extracción de contactos desde imagen vía Gemini AI
- **Revisión de talentos** — búsqueda y filtrado avanzado con reproducción de demos
- **Gestión de convocatorias** — crear, editar, cambiar estado (Borrador / Activa / Cerrada / Archivada) y eliminar
- **Gestión de postulaciones** — revisión, cambio de estado y asignación de audiciones
- **Gestión de profesores** — crear cuentas con contraseña temporal (con toggle ver/ocultar), asignar cursos y especialidades
- **Gestión de cursos** — crear, editar y asignar alumnos
- **Asistente IA** integrado con Gemini para consultas sobre la plataforma
- **Configuración de perfil** del administrador

### UX / Seguridad

- Límite de **35 caracteres en todos los campos de correo** del sitio con contador visual de caracteres
- Toggle **ver / ocultar contraseña** en formularios de autenticación, registro y creación de profesores
- Restricción de **una sola edición** de demo por postulación, persistida en localStorage
- Botón de **reenvío de código OTP** con cooldown de 60 segundos en el flujo de recuperación de contraseña

---

## 🛠️ Stack Tecnológico

### Backend

| Tecnología | Versión | Uso |
|---|---|---|
| Java | 21 LTS | Runtime principal |
| Spring Boot | 4.x | Framework web y IoC |
| Spring Security | — | Seguridad de endpoints y CORS |
| Spring Data JPA | — | Capa de persistencia |
| Spring Mail | — | Envío de OTP por SMTP (Gmail) |
| PostgreSQL | — | Base de datos (Supabase) |
| JWT | — | Autenticación sin estado |
| Lombok | — | Reducción de boilerplate |
| Docker | — | Contenedorización (build multi-stage) |

### Frontend

| Tecnología | Versión | Uso |
|---|---|---|
| React | 19 | UI declarativa |
| Vite | 6 | Bundler y dev server |
| TypeScript | 5.8 | Tipado estático |
| Tailwind CSS | 4 | Estilos utilitarios |
| React Router | 7 | Enrutamiento SPA |
| Supabase JS | 2 | Auth, storage y realtime |
| jsPDF + autoTable | 4 / 5 | Exportación a PDF |
| xlsx | 0.18 | Exportación a Excel |
| Gemini AI (`@google/genai`) | 1.x | Asistente IA y extracción de imágenes |
| Motion | 12 | Animaciones |
| Lucide React | 0.546 | Iconografía |

### Infraestructura

| Servicio | Rol |
|---|---|
| **Vercel** | Hosting del frontend (SPA con rewrites) |
| **Railway** | Hosting del backend (Docker, Java 21) |
| **Supabase** | PostgreSQL + Storage de archivos de audio |
| **Docker Compose** | Orquestación para desarrollo/staging local |
| **Gmail SMTP** | Envío de correos OTP |

---

## 🏗️ Arquitectura

```
┌─────────────────────────────────────────────────────────┐
│                        Vercel                           │
│              React 19 + Vite SPA (Frontend)             │
│   /admin/** → Panel Admin    /user/** → Panel Alumno    │
└────────────────────────┬────────────────────────────────┘
                         │ HTTPS  (VITE_BACKEND_URL)
┌────────────────────────▼────────────────────────────────┐
│                       Railway                           │
│            Spring Boot API  (puerto 8080)               │
│   JWT Auth │ REST Controllers │ Spring Security         │
└──────┬─────────────────────────────┬────────────────────┘
       │ JDBC (SSL)                  │ HTTP
┌──────▼──────────┐        ┌─────────▼──────────┐
│   Supabase DB   │        │  Supabase Storage  │
│   PostgreSQL    │        │   Demos de audio   │
└─────────────────┘        └────────────────────┘
```

### Capas del Backend

- **Controllers** — enrutamiento HTTP y serialización de respuestas
- **Services** — lógica de negocio, validaciones y coordinación entre capas
- **Repositories** — acceso a datos mediante Spring Data JPA
- **DTOs** — aislamiento del modelo de dominio
- **Security** — filtro JWT, configuración CORS y control de acceso por roles (`ADMIN`, `ALUMNO`, `PROFESOR`)

---

## 🚀 Despliegue en Producción

### Frontend — Vercel

El frontend se despliega automáticamente en Vercel desde la rama principal del repositorio.

**Variables de entorno requeridas en Vercel** (Settings → Environment Variables):

```
VITE_BACKEND_URL=https://<tu-servicio>.railway.app/api
VITE_SUPABASE_URL=https://<tu-proyecto>.supabase.co
VITE_SUPABASE_ANON_KEY=<anon_key>
VITE_SUPABASE_PROJECT_ID=<project_id>
```

El archivo `vercel.json` ya incluye la regla de rewrite necesaria para React Router:

```json
{
  "rewrites": [{ "source": "/(.*)", "destination": "/index.html" }]
}
```

### Backend — Railway

El backend se despliega desde el `Dockerfile` ubicado en `Producto/backend/`.

**Variables de entorno requeridas en Railway** (Settings → Variables):

```
DB_URL=jdbc:postgresql://<host_supabase>:5432/postgres
DB_USERNAME=postgres.<proyecto_id>
DB_PASSWORD=<password>
SUPABASE_URL=https://<proyecto>.supabase.co
SUPABASE_SERVICE_ROLE_KEY=<service_role_key>
SUPABASE_PROJECT_ID=<project_id>
JWT_SECRET=<secreto_largo_y_seguro>
SPRING_PROFILES_ACTIVE=prod
MAIL_USERNAME=notificaciones.sudtalent@gmail.com
MAIL_PASSWORD=<app_password_gmail>
APP_CORS_ALLOWED_ORIGINS=https://<tu-dominio>.vercel.app
```

> **CORS:** La variable `APP_CORS_ALLOWED_ORIGINS` debe contener la URL exacta del frontend en Vercel (sin barra final).

> **Gmail SMTP:** Genera una contraseña de aplicación en [myaccount.google.com/security](https://myaccount.google.com/security) → Contraseñas de aplicaciones. Requiere verificación en dos pasos activada.

---

## ⚙️ Desarrollo Local

### Prerrequisitos

- Node.js 22+
- Java 21 + Maven (o Docker)

### Opción A — Docker Compose (recomendado)

```bash
# 1. Crear el .env del backend
cp Producto/backend/.env.example Producto/backend/.env
# Editar con tus credenciales de Supabase, JWT y Gmail

# 2. Crear el .env del frontend
cp Producto/frontend/.env.example Producto/frontend/.env
# Editar con tus credenciales de Supabase

# 3. Levantar el stack completo
cd Producto
docker-compose up -d --build
```

Servicios disponibles:
- Frontend: `http://localhost`
- Backend API: `http://localhost:8080/api`

```bash
# Detener
docker-compose down
```

### Opción B — Ejecución directa

```bash
# Terminal 1 — Backend
cd Producto/backend
cp .env.example .env   # completar credenciales
./mvnw spring-boot:run

# Terminal 2 — Frontend
cd Producto/frontend
cp .env.example .env   # completar credenciales
npm install
npm run dev            # inicia en http://localhost:5173
```

### Scripts disponibles (frontend)

| Comando | Descripción |
|---|---|
| `npm run dev` | Dev server con hot-reload |
| `npm run build` | Build de producción en `/dist` |
| `npm run lint` | Verificación de tipos TypeScript |
| `npm test` | Tests con Vitest (single run) |
| `npm run test:ui` | Tests con interfaz visual |

---

## 📂 Estructura de Directorios

```text
SudTalent/
├── Producto/
│   ├── docker-compose.yml               # Orquestación local
│   ├── backend/                         # API Spring Boot — Java 21
│   │   ├── src/main/java/sudtalent/sudtalentproyecto/
│   │   │   ├── config/                  # SecurityConfig, CORS, DataSyncStartup
│   │   │   ├── controller/              # REST: Auth, Alumnos, Convocatorias,
│   │   │   │                            #   Postulaciones, Cursos, Profesores,
│   │   │   │                            #   VoiceAudio, Whitelist, Audiciones,
│   │   │   │                            #   Anuncios, Perfil, PasswordReset
│   │   │   ├── dto/                     # Objetos de transferencia de datos
│   │   │   ├── exception/               # Excepciones de dominio (OTP, RateLimit)
│   │   │   ├── model/                   # Entidades JPA
│   │   │   ├── repository/              # Interfaces Spring Data JPA
│   │   │   ├── security/                # Filtro JWT
│   │   │   └── service/                 # Lógica de negocio
│   │   ├── Dockerfile                   # Build multi-stage (eclipse-temurin:21)
│   │   └── .env.example                 # Plantilla de variables de entorno
│   └── frontend/                        # SPA React 19 + Vite
│       ├── src/
│       │   ├── components/              # UI reutilizable (Sidebar, AudioPlayer…)
│       │   ├── pages/
│       │   │   ├── admin/               # AdminDashboard, AdminStudents,
│       │   │   │                        #   AdminReports, AdminConvocatorias,
│       │   │   │                        #   AdminPostulaciones, AdminProfesores,
│       │   │   │                        #   AdminCursos, AdminTalentReview,
│       │   │   │                        #   AdminSettings
│       │   │   ├── user/                # UserProfileView, UserConvocatorias,
│       │   │   │                        #   UserDemosView, UserCursosView,
│       │   │   │                        #   UserPostulacionesView
│       │   │   ├── AuthScreen.tsx       # Login, registro y recuperación
│       │   │   ├── UserOnboarding.tsx   # Flujo de primer acceso
│       │   │   └── AsistenteIA.tsx      # Chat con Gemini AI
│       │   ├── services/                # Clientes HTTP (convocatorias, postulaciones,
│       │   │                            #   cursos, profesores, auth, reportes…)
│       │   └── types/                   # Interfaces TypeScript compartidas
│       ├── vercel.json                  # Rewrites para React Router en Vercel
│       ├── nginx.conf                   # Configuración Nginx (Docker local)
│       └── Dockerfile                   # Build multi-stage (node:22 + nginx:1.27)
├── Documentación/                       # Gantt, casos de prueba, diagramas
└── Gestión/                             # Actas y documentos de gestión
```

---

## 🔌 Endpoints API

| Endpoint | Método | Auth | Descripción |
|---|---|---|---|
| `/api/auth/login` | POST | — | Autenticación, retorna JWT |
| `/api/auth/register` | POST | — | Registro de nuevos usuarios |
| `/api/password-reset/request` | POST | — | Solicitar OTP por correo |
| `/api/password-reset/verify` | POST | — | Verificar código OTP |
| `/api/password-reset/reset` | POST | — | Establecer nueva contraseña |
| `/api/users` | GET | Admin | Listado de todos los usuarios |
| `/api/alumnos/{id}` | GET / PUT | Auth | Perfil de alumno |
| `/api/convocatorias` | GET | — | Convocatorias públicas activas |
| `/api/convocatorias` | POST | Admin | Crear convocatoria |
| `/api/convocatorias/{id}` | PUT / DELETE | Admin | Gestión de convocatoria |
| `/api/convocatorias/favoritas/{uid}` | GET / POST / DELETE | Auth | Favoritos del usuario |
| `/api/postulaciones` | GET | Admin | Todas las postulaciones |
| `/api/postulaciones` | POST | Auth | Crear postulación |
| `/api/postulaciones/{id}` | PUT | Auth/Admin | Actualizar estado o demo |
| `/api/postulaciones/alumno/{uid}` | GET | Auth | Postulaciones del alumno |
| `/api/cursos` | GET / POST | Auth/Admin | Listado y creación de cursos |
| `/api/cursos/asignar-alumno/{uid}` | PUT | Admin | Asignar cursos a alumno |
| `/api/profesores` | GET / POST | Auth/Admin | Gestión de profesores |
| `/api/voice-audios/user/{uid}` | GET | Auth | Demos de un usuario |
| `/api/voice-audios/all-demos` | GET | Admin | Todas las demos |
| `/api/whitelist` | GET / POST / DELETE | Admin | Lista blanca de alumnos |
| `/api/audiciones` | GET / POST / PUT | Admin | Gestión de audiciones |
| `/api/profile` | GET / PUT | Auth | Perfil del usuario autenticado |
| `/actuator/health` | GET | — | Healthcheck del backend |

---

## 👨‍💻 Equipo de Desarrollo

**SudTalent** fue diseñado, desarrollado y es mantenido por:

- 💻 **Pablo Novoa**
- 💻 **Ricardo Frías**

---

> **Asignatura:** Taller de Programación — Sección 001D
> **Docente:** Arturo Alex Vargas Reyes
> **Institución:** Duoc UC — Sede Padre Alonso de Ovalle
> **Fecha:** Junio 2026
