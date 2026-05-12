# Configuración de Base de Datos Supabase - Backend

## Información de Conexión

**Host:** aws-1-us-east-2.pooler.supabase.com (Shared Pooler - IPv4)
**Port:** 5432
**Database:** postgres
**Username:** postgres.nmlqgmsdmecodosgpuyv
**Type:** PostgreSQL

## Archivo .env

El archivo `.env` en la raíz del backend contiene:

```env
DB_URL=jdbc:postgresql://aws-1-us-east-2.pooler.supabase.com:5432/postgres
DB_USERNAME=postgres.nmlqgmsdmecodosgpuyv
DB_PASSWORD=[TU_CONTRASEÑA]
JWT_SECRET=[TU_JWT_SECRET]
SPRING_PROFILES_ACTIVE=dev
```

## Configuración en application.properties

Spring Boot lee las variables de entorno automáticamente:

```properties
spring.datasource.url=${DB_URL}
spring.datasource.username=${DB_USERNAME}
spring.datasource.password=${DB_PASSWORD}
spring.datasource.driver-class-name=org.postgresql.Driver
```

## Cambios Realizados

? **Seguridad**: Credenciales trasladadas a variables de entorno
? **Pool de Conexiones**: Configurado HikariCP con 20 conexiones máximo
? **DDL Auto**: Cambio de `create-drop` a `update` (no borra datos)
? **Performance**: Batch inserts habilitado (20 registros por batch)
? **Logging**: Configurado para DEBUG en desarrollo

## Variables de Entorno Requeridas

```bash
# Requeridas
DB_URL=jdbc:postgresql://aws-1-us-east-2.pooler.supabase.com:5432/postgres
DB_USERNAME=postgres.nmlqgmsdmecodosgpuyv
DB_PASSWORD=xjbr3szSdrkd

# Recomendado
JWT_SECRET=8MR8b3SBRwtGPv0usAzVUk7Bq8ES8XNSwVqb6fBNF+wTPYSwpJxsfuQ+dViP1rne
SPRING_PROFILES_ACTIVE=dev
```

## Cómo Configurar Variables de Entorno

### En Windows (PowerShell):
```powershell
$env:DB_PASSWORD = "xjbr3szSdrkd"
$env:JWT_SECRET = "tu-secret-key"
```

### En Linux/Mac:
```bash
export DB_PASSWORD="xjbr3szSdrkd"
export JWT_SECRET="tu-secret-key"
```

### En IntelliJ IDEA:
1. Run ? Edit Configurations
2. Environment variables ? Agregar variables
3. Guardar y ejecutar

## Dependencias Requeridas

En `pom.xml`, asegúrate de tener:

```xml
<!-- PostgreSQL Driver -->
<dependency>
    <groupId>org.postgresql</groupId>
    <artifactId>postgresql</artifactId>
    <scope>runtime</scope>
</dependency>

<!-- Spring Data JPA -->
<dependency>
    <groupId>org.springframework.boot</groupId>
    <artifactId>spring-boot-starter-data-jpa</artifactId>
</dependency>

<!-- Hibernate -->
<dependency>
    <groupId>org.hibernate.orm</groupId>
    <artifactId>hibernate-core</artifactId>
</dependency>
```

## Verificar Conexión

Ejecuta el servidor y observa en los logs:

```
Inicializar base de datos desde 'schema-h2.sql'
HHH000412: Hibernate is in managed transactions mode
```

Si ves estos mensajes, ¡la conexión es exitosa! ?

## Troubleshooting

### Error: "Connection timeout"
- Verifica que la contraseña sea correcta
- Comprueba que tu IP está permitida en Supabase (Settings > Database > Networking)

### Error: "Role 'postgres.nmlqgmsdmecodosgpuyv' does not exist"
- Verifica el username correcto en Supabase

### Error: "FATAL: remaining connection slots reserved"
- Reduce `maximum-pool-size` en application.properties

## Endpoints Disponibles

Una vez conectado, tu API estará en: `http://localhost:8080`
