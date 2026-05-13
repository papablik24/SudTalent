# SudTalent 🎙️

**Plataforma Integral de Gestión de Carrera y Vinculación para Doblaje**

> Solución digital para la centralización de convocatorias, gestión de talento vocal y automatización de procesos para Sudamerican Voices.


[![React](https://img.shields.io/badge/React-2024-blue.svg)](https://react.dev/) [![Spring Boot](https://img.shields.io/badge/Spring%20Boot-3.x-green.svg)](https://spring.io/projects/spring-boot) [![Java](https://img.shields.io/badge/Java-17-orange.svg)](https://www.oracle.com/java/) [![Supabase](https://img.shields.io/badge/Supabase-PostgreSQL-3ecf8e.svg)](https://supabase.com/) [![JWT](https://img.shields.io/badge/Auth-JWT-black.svg)](https://jwt.io/)


## Tabla de Contenidos

- [Descripción](#descripción)
- [Características principales](#características-principales)
- [Módulos del Sistema](#módulos-del-sistema)
- [Stack Tecnológico](#stack-tecnológico)
- [Requisitos del sistema](#requisitos-del-sistema)
- [Instalación y ejecución](#instalación-y-ejecución)
- [Estructura del proyecto](#estructura-del-proyecto)
- [Endpoints API](#endpoints-api)
- [Planificación](#planificación)
- [Notas adicionales](#notas-adicionales)

------------

## Descripción

SudTalent es una plataforma diseñada para **Sudamerican Voices**, una escuela y estudio de doblaje líder en Chile. El objetivo principal es optimizar la búsqueda, filtrado y seguimiento de talentos en áreas de doblaje, locución y podcasts, centralizando procesos que actualmente se encuentran dispersos.

## Características principales

### Para Postulantes y Alumnos
- **Perfil Personalizado:** Espacio diseñado según los gustos y necesidades en el desarrollo de la carrera de doblaje.
- **Inscripciones Automatizadas:** Optimización del proceso para facilitar la elección de profesores y cursos.
- **Portafolio:** Visualización de demos de doblaje y trabajos disponibles.
- **Historial:** Consulta del historial de postulaciones del usuario.

### Para Administradores (Sudamerican Voices)
- **Gestión de Convocatorias:** Publicación y administración de castings y oportunidades de voz.
- **Motor de Búsqueda:** Filtrado avanzado de talentos con previsualización de demos.
- **Gestión de Audiciones:** Organización y evaluación de las pruebas de talento.
- **Panel de Control:** Administración general del sistema y comunidad básica.

------------

## Stack Tecnológico

| Componente       | Tecnología                         |
|------------------|------------------------------------|
| **Frontend**     | React + Vite             |
| **Backend**      | Java Spring Boot         |
| **Base de Datos**| PostgreSQL (Supabase)    |
| **Autenticación**| Spring Security + JWT    |
| **Almacenamiento**| Amazon S3 (Demos audio/video)|
| **Despliegue**   | AWS Elastic Beanstalk    |

## Requisitos del sistema

#### Entorno de Usuario
- Interfaz simple e intuitiva compatible con navegadores actuales.
- Conectividad a internet para acceso a la plataforma web.

#### Requisitos de Desarrollo
- Entorno de ejecución Node.js para el frontend.
- Java para el desarrollo del backend en Spring Boot.
- Acceso a servicios de almacenamiento en la nube (AWS).

------------

## Instalación y ejecución

### Prerrequisitos
# Instalar dependencias globales (Node.js debe estar instalado)
npm install -g vite

git clone (https://github.com/papablik24/SudTalent.git)
cd SudTalent

# Instalar dependencias del Frontend
cd frontend
npm install

# Instalar dependencias del Backend (Maven)
cd ../backend
mvn install

# Frontend (en carpeta frontend)
npm run dev

# Backend (en carpeta backend)
mvn spring-boot:run

##Estructura del Proyecto

SudTalent/
├── frontend/             # Aplicación React + Vite
│   ├── src/
│   │   ├── components/   # Componentes de UI
│   │   ├── pages/        # Vistas (Perfil, Convocatorias)
│   │   └── services/     # Conexión con Backend
├── backend/              # Aplicación Spring Boot (Java)
│   ├── src/main/java/
│   │   ├── controller/   # Endpoints REST
│   │   ├── service/      # Lógica de negocio
│   │   └── model/        # Entidades de base de datos
└── docs/                 # Documentación técnica y diagramas

# Detalle de Endpoints y Planificación - SudTalent

## Endpoints API (Previstos)

| Endpoint | Método | Descripción |
| :--- | :--- | :--- |
| `/api/auth/login` | **POST** | Autenticación mediante JWT |
| `/api/talentos` | **GET** | Búsqueda y filtrado de talentos |
| `/api/convocatorias` | **POST** | Publicación de nuevos castings |
| `/api/postulaciones` | **POST** | Registro de postulaciones |

---

## Planificación (Ciclo de Vida)

El proyecto se estructura en tres etapas principales:

1.  **Inicio:** Levantamiento de requerimientos y diseño de la solución.
2.  **Desarrollo:** Implementación modular del sistema (Frontend y Backend).
3.  **Cierre:** Ejecución de pruebas, correcciones y entrega del Producto Mínimo Viable (MVP).

---

## Notas adicionales

* **Estudiantes:** Pablo Novoa - Ricardo Frias (Analista Programador Duoc UC).
* **Asignatura:** Taller de Programación (Sección 001D).
* **Docente:** Arturo Alex Vargas Reyes.
* **Sede:** Padre Alonso de Ovalle.
* **Fecha:** 13/05/2026.
