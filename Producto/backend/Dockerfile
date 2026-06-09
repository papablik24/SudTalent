# ── Stage 1: Build ──────────────────────────────────────────────────
FROM eclipse-temurin:21-jdk-alpine AS builder

WORKDIR /app

# Copiar wrapper y pom primero para aprovechar cache de capas
COPY mvnw mvnw.cmd ./
COPY .mvn .mvn
COPY pom.xml ./

# Descargar dependencias (se cachea si pom.xml no cambia)
RUN ./mvnw dependency:go-offline -B

# Copiar fuentes y compilar (skip tests para la imagen)
COPY src ./src
RUN ./mvnw package -DskipTests -B

# ── Stage 2: Runtime ─────────────────────────────────────────────────
FROM eclipse-temurin:21-jre-alpine

WORKDIR /app

# Crear usuario no-root
RUN addgroup -S sudtalent && adduser -S sudtalent -G sudtalent

# Copiar JAR desde el stage de build
COPY --from=builder /app/target/*.jar app.jar

USER sudtalent

EXPOSE 8080

ENTRYPOINT ["java", "-jar", "app.jar"]
