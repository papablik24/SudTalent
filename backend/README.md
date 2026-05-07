# SudTalent
Este proyecto consiste en el desarrollo del "SudTalent", una plataforma integral de gestión de carrera y vinculación diseñada para Sudamerican Voices, una escuela y estudio de doblaje líder en Chile.
**Asignatura:** Taller de programacion
**Seccion:** 001D
**Docente:** Arturo Alex Vargas Reyes
**Fecha:** 13/04/2026
**Sede:** Padre Alonso de Ovalle

## Introducción 
El presente proyecto tiene como objetivo describir la propuesta de desarrollo de una plataforma web orientada a la gestion de convocatorias y talento vocal para Sudamerican Voices. El proyecto surge a partir de la necesidad de contar con una solucion digital que permita centralizar procesos que actualmente pueden realizarse de manera disperas, como las convocatorias, la recepcion de postulaciones, la organizacion de audiciones y la administracion de perfiles de talento.

La propuesta busca apoyar al cliente mediante una herramienta que facilite la búsqueda, filtrado y seguimiento de postulantes en áreas relacionadas con doblaje, locución, podcasts y otros proyectos de voz. De esta manera, se pretende optimizar la gestión interna, reducir tiempos administrativos y mejorar la trazabilidad de la información asociada a cada convocatoria.

---

## Contexto

Sudamerican Voices es una empresa que opera como escuela/estudio de doblaje, estudio de grabación, escuela de locución y productora audiovisual. Su origen se remonta al periodo de confinamiento provocado por la pandemia del COVID-19.

Fundada por Cecilia Valenzuela y Raúl Valles, partieron con pequeños cursos de doblaje y ha evolucionado hacia una escuela/estudio que abarca diferentes disciplinas vocales y musicales.

### Modelo de negocio

Hoy en día el modelo de negocio de Sudamerican Voices se centra en la comunidad de doblaje que ellos mismos han formado desde sus inicios, ofreciendo cursos y herramientas para formar nuevos actores de doblaje y apoyar distintos proyectos de los alumnos.

### Análisis de mercado

Actualmente Chile es uno de los principales países que doblan series y películas en Latinoamérica. Sudamerican Voices no solo realiza clases, sino que también participa en grabaciones de doblaje para producciones audiovisuales de países como México o Argentina.

---

## Definición del proyecto

En Sudamerican Voices actualmente gran parte de sus clientes ya forma parte de su comunidad y/o de la industria del doblaje. La comunidad está mayoritariamente en su grupo de WhatsApp, y la inscripción de cursos y certificaciones se realiza a través de su página web.

### Objetivo general

Crear un espacio para alumnos y/o nuevos clientes, personalizado según sus gustos y necesidades en el desarrollo de su carrera de doblaje, musical, locución o podcast.

### Objetivos específicos

1. Personalizar la experiencia de usuario de los alumnos, automatizando las inscripciones para facilitar la elección de profesores, cursos y capacitaciones.
2. Implementar un motor de búsqueda y filtrado de talento que permita previsualizar demos de doblaje y trabajos disponibles.

---

## Alcance

### Límites
El proyecto se centrará en una plataforma web (Frontend y Backend) y no incluirá el desarrollo de una aplicación móvil.

### Entregables
- Repositorio del código
- Documentación técnica
- Diagrama de clases
- Diagrama de casos de uso
- Producto Mínimo Viable (MVP)

### Restricciones
El sistema debe integrarse con los servicios de almacenamiento existentes y cumplir con las normas de protección de datos personales.

---

## Planificación

La planificación del proyecto se estructurará en tres etapas:

1. Inicio
2. Desarrollo
3. Cierre

Durante la etapa de inicio se realizará el levantamiento de requerimientos, definición del alcance y análisis general del sistema.

En la etapa de desarrollo se llevará a cabo el diseño técnico y la implementación progresiva de los módulos priorizados.

En la etapa de cierre se desarrollarán pruebas, correcciones, documentación y entrega del producto mínimo viable.

---

## Definición tecnológica

### Stack propuesto
- **Frontend:** React + Vite
- **Entorno de ejecución:** Node.js
- **Backend:** Spring Boot
- **Base de datos:** MySQL
- **Autenticación:** Spring Security + JWT

### Servicios cloud
- **PaaS:** AWS Elastic Beanstalk
- **SaaS:** Amazon S3 para almacenamiento de demos de audio y video

---

## Metodología

Para el desarrollo del proyecto se utilizará una metodología híbrida, combinando una etapa inicial estructurada para análisis y diseño, con una etapa de desarrollo iterativo por módulos.

---

## Módulos del sistema

1. Registro y perfil de talento
2. Convocatorias
3. Postulaciones
4. Gestión de audiciones
5. Búsqueda y filtrado de talentos
6. Administración
7. Notificaciones
8. Historial del postulante
9. Comunidad básica

---

## Requisitos funcionales

- RF1. Registro e inicio de sesión de usuarios.
- RF2. Gestión de perfiles de talento.
- RF3. Publicación y visualización de convocatorias.
- RF4. Postulación a oportunidades.
- RF5. Gestión y evaluación de audiciones.
- RF6. Búsqueda y filtrado de talentos.
- RF7. Envío de notificaciones.
- RF8. Consulta de historial del postulante.
- RF9. Comunidad básica.
- RF10. Administración general del sistema.

---

## Requisitos no funcionales

- RNF1. Interfaz simple e intuitiva.
- RNF2. Seguridad y control de acceso.
- RNF3. Protección de datos personales.
- RNF4. Buen rendimiento.
- RNF5. Compatibilidad con navegadores actuales.
- RNF6. Estructura modular y mantenible.
- RNF7. Plataforma web escalable.
- RNF8. Respaldo básico de información.

---

## Casos de uso

| ID | Descripción | Actores involucrados |
|----|------------|----------------------|
| CU1 | Ingresar al sistema iniciando sesión | Administrador, Postulante, Profesor |
| CU2 | Crear usuario dentro de la plataforma | Postulante |
| CU3 | Crear y actualizar perfil de talento | Postulante |
| CU4 | Publicar convocatorias de voz o casting | Administrador |
| CU5 | Visualizar convocatorias activas | Postulante, Profesor |

---

## Ciclo de vida del proyecto

1. Levantamiento de requerimientos
2. Análisis del sistema
3. Diseño de la solución
4. Desarrollo e implementación
5. Pruebas y validación
6. Correcciones y ajustes
7. Entrega final

---

## Diagramas

### Diagrama de Ishikawa
![Diagrama de Ishikawa](imagenes/ishikawa.png) <-----(por poner)

### Diagrama de Casos de Uso
![Diagrama de Casos de Uso](imagenes/casos_de_uso.png) <-----(por poner)
