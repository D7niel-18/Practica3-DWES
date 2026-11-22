# Gestión de préstamos de equipos

Aplicación web para gestionar un inventario de equipos informáticos y controlar sus préstamos y devoluciones. Desarrollada con Node.js, Express y PostgreSQL.

## 1. Requisitos

Para ejecutar el proyecto es necesario tener instalado:

- Node.js 24 o superior.
- npm.
- Docker Desktop.
- Docker Compose.

## 2. Instalación

Clonar el repositorio:

```bash
git clone URL_DEL_REPOSITORIO
```

Entrar en la carpeta del proyecto:

```bash
cd practica-prestamos
```

Instalar las dependencias:

```bash
npm install
```

Las principales dependencias utilizadas son:

- **Express 5:** servidor y gestión de rutas HTTP.
- **pg 8:** conexión con PostgreSQL.
- **EJS 3:** generación de las vistas HTML.
- **dotenv:** lectura de las variables de entorno.

## 3. Configuración

Crear un archivo `.env` en la raíz del proyecto:

```env
POSTGRES_DB=prestamos
POSTGRES_USER=postgres
POSTGRES_PASSWORD=postgres123
POSTGRES_PORT=5432
PORT=3000
```

El archivo `.env` contiene la configuración de la base de datos y del servidor.

No se debe subir este archivo al repositorio. Para ello está incluido en `.gitignore`.

## 4. Arranque de Docker y PostgreSQL

Iniciar el contenedor de PostgreSQL:

```bash
docker compose up -d
```

Comprobar que está funcionando:

```bash
docker ps
```

La base de datos utiliza PostgreSQL 18 y almacena sus datos en un volumen persistente de Docker.

### Inicialización de la base de datos

El archivo `init.sql` se ejecuta automáticamente cuando PostgreSQL inicializa un volumen vacío.

Este archivo realiza las siguientes operaciones:

1. Crea el esquema `practica_prestamos`.
2. Crea las tablas `equipos`, `usuarios` y `prestamos`.
3. Define las claves primarias y foráneas.
4. Añade restricciones `UNIQUE`, `NOT NULL` y `CHECK`.
5. Crea un índice único parcial para impedir que un equipo tenga más de un préstamo activo.
6. Inserta los datos iniciales.

Para consultar la base de datos desde la terminal:

```bash
docker exec -it practica_prestamos_db psql -U postgres -d prestamos
```

Para volver a inicializar la base de datos desde cero:

```bash
docker compose down -v
docker compose up -d
```

**Importante:** el comando `docker compose down -v` elimina también el volumen y, por tanto, todos los datos almacenados.

## 5. Arranque de Node.js

Una vez iniciada la base de datos, arrancar el servidor:

```bash
npm start
```

El servidor estará disponible en:

http://localhost:3000

La aplicación comprueba la conexión con PostgreSQL antes de iniciar el servidor.

## 6. Estructura del proyecto

```text
practica-prestamos/
│
├── compose.yaml
├── init.sql
├── .env
├── .env.example
├── .gitignore
├── package.json
├── package-lock.json
├── README.md
│
├── src/
│   ├── server.mjs
│   ├── db.mjs
│   ├── equipos.repo.mjs
│   └── equipos.validacion.mjs
│
├── views/
│   ├── equipos.ejs
│   └── equipo.ejs
│
├── public/
│   ├── css/
|       └── estilos.css
│
└── pruebas/
    └── api.mjs
```

### Descripción de los archivos principales

| Archivo | Funcionalidad |
|---|---|
| `server.mjs` | Configura Express y define las rutas de la aplicación. |
| `db.mjs` | Configura el pool de conexiones con PostgreSQL. |
| `equipos.repo.mjs` | Contiene las consultas SQL y las operaciones sobre equipos y préstamos. |
| `equipos.validacion.mjs` | Valida los datos de los equipos y los identificadores. |
| `init.sql` | Crea las tablas, restricciones, índice y datos iniciales. |
| `equipos.ejs` | Muestra el listado de equipos, filtros y paginación. |
| `equipo.ejs` | Muestra la información, el préstamo actual y el historial de un equipo. |
| `api.mjs` | Ejecuta las pruebas automáticas de la API. |

## 8. Funcionalidades y rutas

### 8.1. Vistas HTML

| Método | Ruta | Descripción |
|---|---|---|
| GET | `/equipos` | Muestra el listado de equipos. |
| GET | `/equipos/:id` | Muestra el detalle de un equipo, su préstamo actual y su historial. |

El listado permite:

- Buscar equipos por nombre.
- Filtrar por categoría.
- Filtrar por disponibilidad.
- Ordenar por código o nombre.
- Paginar los resultados, mostrando cinco equipos por página.
- Conservar los filtros al cambiar de página.

### 8.2. API REST de equipos

| Método | Ruta | Descripción |
|---|---|---|
| POST | `/api/equipos` | Crea un equipo. |
| PUT | `/api/equipos/:id` | Actualiza los datos de un equipo. |
| DELETE | `/api/equipos/:id` | Elimina un equipo sin historial de préstamos. |

Para crear un equipo se envía un JSON:

```json
{
    "codigo": "PORT-004",
    "nombre": "Portatil de pruebas",
    "categoria": "Portatil"
}
```

La actualización utiliza los mismos campos. El campo `disponible` no se modifica mediante esta operación.

### 8.3. API REST de préstamos

| Método | Ruta | Descripción |
|---|---|---|
| POST | `/api/prestamos` | Registra un préstamo. |
| POST | `/api/prestamos/:id/devolucion` | Registra la devolución de un préstamo. |

Para crear un préstamo se envía:

```json
{
    "equipoId": 1,
    "usuarioId": 1
}
```

Las operaciones de préstamo y devolución utilizan transacciones para mantener la coherencia entre las tablas `equipos` y `prestamos`.

Cuando se presta un equipo, pasa a estar no disponible. Al devolverlo, vuelve a estar disponible.

Solo se permite un préstamo activo por equipo.

### 8.4. Códigos HTTP

| Código | Significado |
|---|---|
| 200 | Operación realizada correctamente. |
| 201 | Recurso creado correctamente. |
| 204 | Recurso eliminado correctamente, sin contenido de respuesta. |
| 400 | Datos o identificadores no válidos. |
| 404 | Recurso inexistente. |
| 409 | Conflicto con el estado actual o una restricción de la base de datos. |
| 500 | Error interno del servidor. |

Cuando se intenta crear un préstamo con un usuario inexistente, se devuelve `400`. Se considera que el identificador enviado no es válido para los usuarios registrados.

## 9. Pruebas

### 9.1. Pruebas automáticas de la API

El proyecto incluye un script en `pruebas/api.mjs` que utiliza `fetch` y `assert` para comprobar el funcionamiento de las operaciones HTTP.

Para ejecutarlo, el servidor y Docker deben estar iniciados:

```bash
node pruebas/api.mjs
```

El script genera códigos únicos para crear sus propios equipos, por lo que no depende de los equipos que se hayan modificado manualmente.

### 9.2. Tabla de pruebas

| Prueba | Resultado esperado |
|---|---|
| Alta de equipo | 201 Created |
| Alta de equipo repetido | 409 Conflict |
| Alta con datos inválidos | 400 Bad Request |
| Envío de JSON malformado | 400 Bad Request |
| Actualización correcta (PUT) | 200 OK |
| Actualización de equipo inexistente | 404 Not Found |
| Actualización con código repetido | 409 Conflict |
| Eliminación sin historial | 204 No Content |
| Eliminación de equipo inexistente | 404 Not Found |
| Eliminación con préstamos registrados | 409 Conflict |
| Creación de préstamo | 201 Created |
| Préstamo duplicado | 409 Conflict |
| Usuario inexistente al prestar | 400 Bad Request |
| Rollback tras usuario inexistente | Equipo disponible y sin préstamo activo |
| Devolución de préstamo | 200 OK |
| Segunda devolución | 409 Conflict |
| Dos préstamos simultáneos al mismo equipo | Un 201 y un 409 |
| Detalle tras simultaneidad | Un único préstamo activo |

### 9.3. Pruebas de filtros y paginación

Estas pruebas se realizan directamente desde el navegador accediendo a:

```text
http://localhost:3000/equipos
```

Se comprueba:

- Búsqueda por nombre.
- Filtrado por categoría.
- Filtrado por disponibilidad.
- Ordenación por código y nombre.
- Paginación de cinco equipos.
- Conservación de los filtros al cambiar de página.

### 9.4. Pruebas manuales con CURL

También se pueden probar las operaciones de la API utilizando `curl` desde Git Bash, sin necesidad de ejecutar el script automático.

#### Alta de un equipo (201)

```bash
curl -i -X POST http://localhost:3000/api/equipos \
-H "Content-Type: application/json" \
-d '{"codigo":"CURL-001","nombre":"Equipo CURL","categoria":"Portatil"}'
```

Resultado esperado: `201 Created`.

#### Alta de un equipo repetido (409)

Ejecutar de nuevo el comando anterior.

Resultado esperado: `409 Conflict`.

#### Alta con datos inválidos (400)

```bash
curl -i -X POST http://localhost:3000/api/equipos \
-H "Content-Type: application/json" \
-d '{"codigo":"","nombre":"Equipo inválido","categoria":"Portatil"}'
```

Resultado esperado: `400 Bad Request`.

#### JSON malformado (400)

```bash
curl -i -X POST http://localhost:3000/api/equipos \
-H "Content-Type: application/json" \
-d '{"codigo":'
```

Resultado esperado: `400 Bad Request`.

#### Actualizar un equipo (200)

```bash
curl -i -X PUT http://localhost:3000/api/equipos/1 \
-H "Content-Type: application/json" \
-d '{"codigo":"PORT-001","nombre":"Portatil actualizado","categoria":"Portatil"}'
```

Resultado esperado: `200 OK`.

#### Actualizar un equipo inexistente (404)

```bash
curl -i -X PUT http://localhost:3000/api/equipos/999999 \
-H "Content-Type: application/json" \
-d '{"codigo":"TEST-999","nombre":"Equipo inexistente","categoria":"Portatil"}'
```

Resultado esperado: `404 Not Found`.

#### Actualizar con un código repetido (409)

```bash
curl -i -X PUT http://localhost:3000/api/equipos/1 \
-H "Content-Type: application/json" \
-d '{"codigo":"PORT-002","nombre":"Equipo duplicado","categoria":"Portatil"}'
```

Resultado esperado: `409 Conflict`, siempre que el equipo con código `PORT-002` siga existiendo.

#### Eliminar un equipo sin historial (204)

```bash
curl -i -X DELETE http://localhost:3000/api/equipos/9
```

Resultado esperado: `204 No Content`, siempre que el equipo 9 no tenga préstamos registrados.

#### Eliminar un equipo inexistente (404)

```bash
curl -i -X DELETE http://localhost:3000/api/equipos/999999
```

Resultado esperado: `404 Not Found`.

#### Crear un préstamo (201)

```bash
curl -i -X POST http://localhost:3000/api/prestamos \
-H "Content-Type: application/json" \
-d '{"equipoId":1,"usuarioId":1}'
```

Resultado esperado: `201 Created`.

La respuesta incluye el identificador del préstamo creado. Se debe guardar para realizar la devolución.

#### Intentar prestar un equipo ocupado (409)

Ejecutar de nuevo el comando de creación del préstamo anterior.

Resultado esperado: `409 Conflict`.

#### Intentar prestar con un usuario inexistente (400)

```bash
curl -i -X POST http://localhost:3000/api/prestamos \
-H "Content-Type: application/json" \
-d '{"equipoId":2,"usuarioId":999999}'
```

Resultado esperado: `400 Bad Request`.

El equipo debe continuar disponible porque la transacción se ha deshecho mediante `ROLLBACK`.

#### Consultar el detalle de un equipo

```bash
curl -i http://localhost:3000/equipos/2
```

Resultado esperado: `200 OK`. La respuesta es HTML y permite comprobar el estado del equipo y su historial.

#### Registrar una devolución (200)

Sustituir `1` por el identificador real del préstamo creado anteriormente:

```bash
curl -i -X POST http://localhost:3000/api/prestamos/1/devolucion
```

Resultado esperado: `200 OK`.

El equipo vuelve a estar disponible.

#### Intentar devolver el mismo préstamo otra vez (409)

```bash
curl -i -X POST http://localhost:3000/api/prestamos/1/devolucion
```

Resultado esperado: `409 Conflict`.

#### Devolver un préstamo inexistente (404)

```bash
curl -i -X POST http://localhost:3000/api/prestamos/999999/devolucion
```

Resultado esperado: `404 Not Found`.

## 10. Tecnologías utilizadas

- Node.js 24.
- Express 5.
- PostgreSQL 18.
- Docker y Docker Compose.
- JavaScript.
- EJS.
- pg 8.
- HTML5 y CSS.
- Fetch API para las pruebas automáticas.