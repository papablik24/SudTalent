console.log("?? Prueba de conectividad Frontend-Backend");
console.log("==========================================\n");

const API_URL = 'http://localhost:8080/api';

async function testConnection() {
  try {
    console.log("?? Probando endpoint: GET " + API_URL + "/whitelist");
    const response = await fetch(API_URL + '/whitelist', {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json'
      }
    });
    
    console.log("? Respuesta HTTP:", response.status, response.statusText);
    
    if (response.ok) {
      const data = await response.json();
      console.log("? Datos recibidos del backend:");
      console.log("  - Whitelist items:", data.length || 0);
      console.log("  - Datos:", JSON.stringify(data, null, 2));
    } else {
      console.warn("? Backend respondió con error:", response.status);
      const errorText = await response.text();
      console.log("  Error:", errorText);
    }
  } catch (error) {
    console.error("? Error de conexión:", error.message);
    console.error("   Asegúrate de que:");
    console.error("   1. El backend está corriendo en http://localhost:8080");
    console.error("   2. No hay firewall bloqueando la conexión");
    console.error("   3. CORS está correctamente configurado");
  }
}

testConnection();
