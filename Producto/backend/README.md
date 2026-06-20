# SudTalent — Backend

API REST del sistema SudTalent, construida con **Spring Boot** y **Java 21**, desplegada en **Railway**.

## Stack

- Java 21 LTS
- Spring Boot 4.x (Web, Security, Data JPA, Mail)
- PostgreSQL en Supabase
- JWT para autenticación sin estado
- SMTP Gmail para envío de OTP
- Docker (build multi-stage con eclipse-temurin:21)

## Despliegue en Railway

El backend se despliega automáticamente desde el `Dockerfile` en esta carpeta.

Variables de entorno requeridas en Railway:

```
DB_URL=jdbc:postgresql://<host>:5432/postgres
DB_USERNAME=postgres.<project_id>
DB_PASSWORD=<password>
SUPABASE_URL=https://<project>.supabase.co
SUPABASE_SERVICE_ROLE_KEY=<service_role_key>
SUPABASE_PROJECT_ID=<project_id>
JWT_SECRET=<secreto_seguro>
SPRING_PROFILES_ACTIVE=prod
MAIL_USERNAME=notificaciones.sudtalent@gmail.com
MAIL_PASSWORD=<app_password_gmail>
APP_CORS_ALLOWED_ORIGINS=https://<frontend>.vercel.app
```

## Desarrollo local

```bash
cp .env.example .env
# completar credenciales en .env
./mvnw spring-boot:run
```

La API queda disponible en `http://localhost:8080/api`.

## Estructura

```
src/main/java/sudtalent/sudtalentproyecto/
├── config/        # SecurityConfig, CORS, DataSyncStartup, GlobalExceptionHandler
├── controller/    # Endpoints REST (Auth, Alumnos, Convocatorias, Postulaciones,
│                  #   Cursos, Profesores, VoiceAudio, Whitelist, Audiciones…)
├── dto/           # Objetos de transferencia de datos
├── exception/     # Excepciones de dominio (OTP, RateLimit, etc.)
├── model/         # Entidades JPA
├── repository/    # Interfaces Spring Data JPA
├── security/      # Filtro JWT
└── service/       # Lógica de negocio
```

---

**Asignatura:** Taller de Programación — Sección 001D
**Docente:** Arturo Alex Vargas Reyes
**Institución:** Duoc UC — Sede Padre Alonso de Ovalle
**Fecha:** Junio 2026
