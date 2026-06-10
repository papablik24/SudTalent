# Configuración de Supabase

## 1. Obtener tus credenciales

1. Dirígete a [Supabase](https://supabase.com) y crea una cuenta
2. Crea un nuevo proyecto
3. Vé a **Settings > API**
4. Copia:
   - `Project URL` (para `VITE_SUPABASE_URL`)
   - `anon public` key (para `VITE_SUPABASE_ANON_KEY`)

## 2. Configurar variables de entorno

Abre el archivo `.env` en la raíz del proyecto frontend y reemplaza:

```env
VITE_SUPABASE_URL="https://tu-proyecto.supabase.co"
VITE_SUPABASE_ANON_KEY="tu-clave-anonima"
```

## 3. Usar Supabase en tu aplicación

### Opción A: Hook `useSupabase`

```typescript
import { useSupabase } from "@/hooks/useSupabase";

export function MyComponent() {
  const { getData, insertData, updateData } = useSupabase();

  // Obtener datos
  const fetchUsers = async () => {
    const { data, error } = await getData("users");
    console.log(data);
  };

  // Insertar datos
  const createUser = async () => {
    const { data, error } = await insertData("users", {
      name: "John Doe",
      email: "john@example.com",
    });
  };

  // Actualizar datos
  const updateUser = async () => {
    const { data, error } = await updateData("users", "user-id", {
      name: "Jane Doe",
    });
  };

  return <button onClick={fetchUsers}>Cargar usuarios</button>;
}
```

### Opción B: Cliente directo

```typescript
import { supabase } from "@/services/supabaseClient";

const { data, error } = await supabase
  .from("users")
  .select("*");
```

## 4. Métodos disponibles en el hook `useSupabase`

### Autenticación
- `signUpWithPhone(phone, password)` - Registrarse
- `signInWithPhone(phone, password)` - Iniciar sesión
- `signOut()` - Cerrar sesión

### Base de datos
- `getData(table, query?)` - Obtener datos
- `insertData(table, data)` - Insertar datos
- `updateData(table, id, updates)` - Actualizar datos
- `deleteData(table, id)` - Eliminar datos

### Storage (archivos)
- `uploadFile(bucket, path, file)` - Subir archivo
- `downloadFile(bucket, path)` - Descargar archivo

## 5. Ejemplos

### Obtener usuarios con filtro
```typescript
const { data, error } = await getData("users", {
  eq: { status: "APPROVED" },
  order: { column: "createdAt", ascending: false },
  limit: 10
});
```

### Subir archivo de demo
```typescript
const file = new File(["audio data"], "demo.mp3");
const { data, error } = await uploadFile("voice-demos", "user-123/demo.mp3", file);
```

## 6. Estructura de tablas recomendada

```sql
-- Tabla de usuarios
CREATE TABLE users (
  id UUID PRIMARY KEY,
  name VARCHAR(255),
  phone VARCHAR(20),
  email VARCHAR(255),
  avatar_url TEXT,
  status VARCHAR(50),
  profile_type VARCHAR(50),
  primary_category VARCHAR(50),
  created_at TIMESTAMP,
  updated_at TIMESTAMP
);

-- Tabla de perfiles de talento
CREATE TABLE talent_profiles (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES users(id),
  type VARCHAR(50),
  experience TEXT,
  created_at TIMESTAMP
);

-- Tabla de demostraciones de voz
CREATE TABLE voice_demos (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES users(id),
  title VARCHAR(255),
  category VARCHAR(50),
  duration INTEGER,
  file_url TEXT,
  created_at TIMESTAMP
);
```

## 7. Troubleshooting

Si ves errores de conexión:
- Verifica que `VITE_SUPABASE_URL` y `VITE_SUPABASE_ANON_KEY` estén correctas
- Reinicia el servidor de desarrollo
- Revisa la consola del navegador para más detalles
