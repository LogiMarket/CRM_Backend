# Docker Compose - Para desarrollo local

## ¿Qué incluye?

- PostgreSQL 15
- pgAdmin (interfaz web para administrar BD)

## Requisitos

- Docker y Docker Compose instalados
- https://docs.docker.com/get-docker/

## Cómo usar

### 1. Iniciar servicios

```bash
docker-compose up -d
```

### 2. Verificar estado

```bash
docker-compose ps
```

Deberías ver:
- `internal_chat_db` - PostgreSQL (port 5432)
- `internal_chat_pgadmin` - pgAdmin (port 5050)

### 3. Acceder a pgAdmin

URL: http://localhost:5050

Credenciales:
- Email: `admin@example.com`
- Password: `admin`

Agregar servidor:
1. Click en "Add New Server"
2. Nombre: `Internal Chat DB`
3. Host: `postgres` (nombre del servicio en docker)
4. Port: `5432`
5. Username: `chatuser`
6. Password: `chatpassword`
7. Database: `internal_chat`

### 4. Conectar backend a BD local

Actualizar `.env.local` en `backend/`:

```env
DATABASE_HOST=localhost
DATABASE_PORT=5432
DATABASE_USER=chatuser
DATABASE_PASSWORD=chatpassword
DATABASE_NAME=internal_chat
DATABASE_URL=postgresql://chatuser:chatpassword@localhost:5432/internal_chat
```

Luego ejecutar:

```bash
cd backend
pnpm start:dev
```

### 5. Detener servicios

```bash
docker-compose down
```

Para borrar datos también:
```bash
docker-compose down -v
```

## Troubleshooting

### Puerto 5432 ya está en uso

```bash
# Cambiar puerto en docker-compose.yml
ports:
  - '5433:5432'  # Usar 5433 en lugar de 5432
```

### Conexión rechazada

```bash
# Verificar que el contenedor está corriendo
docker-compose ps

# Ver logs
docker-compose logs postgres

# Esperar a que PostgreSQL inicie
docker-compose logs postgres | grep "database system is ready"
```

### Reiniciar base de datos

```bash
docker-compose restart postgres
```

### Limpiar todo

```bash
docker-compose down -v
rm -rf postgres_data
docker-compose up -d
```

---

Para producción en Railway, la BD será creada automáticamente.
