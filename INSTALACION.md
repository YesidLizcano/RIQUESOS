# Instalación — Backoffice Riquesos

Guía de instalación y configuración para el sistema Backoffice Riquesos.

---

## Requisitos previos

- **Node.js** 20 o superior — [Descargar Node.js](https://nodejs.org)
- **npm** (se instala con Node.js)
- **Windows 10** o superior

Para verificar que Node.js está instalado, abra una terminal (cmd) y ejecute:

```
node --version
```

Debería mostrar una versión 20.x.x o mayor.

---

## Instalación

1. **Copiar el proyecto** — Copie la carpeta del proyecto al directorio deseado.

2. **Configurar variables de entorno** — Copie el archivo `.env.example` como `.env`:

   ```
   copy .env.example .env
   ```

   Edite el archivo `.env` y cambie `NEXTAUTH_SECRET` por un valor aleatorio largo y seguro. Puede generar uno con:

   ```
   node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
   ```

3. **Instalar dependencias** — Abra una terminal en la carpeta del proyecto y ejecute:

   ```
   npm install
   ```

4. **Aplicar migraciones de base de datos**:

   ```
   npx prisma migrate deploy
   ```

5. **Crear datos iniciales** (usuario administrador y proveedores de ejemplo):

   ```
   npx prisma db seed
   ```

---

## Iniciar el sistema

### Modo producción (recomendado)

Haga doble clic en `iniciar_sistema.bat`. El script:

- Verifica que Node.js esté instalado
- Instala dependencias si faltan
- Aplica migraciones
- Compila la aplicación si es necesario
- Inicia el servidor en `http://localhost:3000`

### Modo desarrollo

Para desarrollo con recarga automática:

```
npm run dev
```

El servidor estará disponible en `http://localhost:3000`.

---

## Backups

### Ejecutar backup manualmente

Haga doble clic en `backup_diario.bat` o ejecute:

```
npm run backup
```

El backup crea un archivo comprimido en la carpeta `backups/` con el nombre `backup-dev-AAAA-MM-DD.db.gz`.

### Backup automático (Programador de tareas de Windows)

Para ejecutar el backup automáticamente todos los días:

1. Abra el **Programador de tareas** (Task Scheduler)
2. Haga clic en **Crear tarea básica**
3. Nombre: `Backup Diario Riquesos`
4. Desencadenador: **Diariamente**, elija la hora deseada (por ejemplo, 23:00)
5. Acción: **Iniciar un programa**
6. Programa: Busque el archivo `backup_diario.bat` en la carpeta del proyecto
7. Complete el asistente

Los backups anteriores a 30 días se eliminan automáticamente.

---

## Credenciales por defecto

| Campo       | Valor                |
|-------------|----------------------|
| Email       | admin@riquesos.com   |
| Contraseña  | admin123             |

**Importante**: Cambie la contraseña después del primer inicio de sesión.

---

## Solución de problemas

### Error: "node no se reconoce como un comando"

Node.js no está instalado o no está en el PATH. Instálelo desde [nodejs.org](https://nodejs.org).

### Error: "EADDRINUSE: address already in use :::3000"

Otro programa está usando el puerto 3000. Cierre ese programa o cambie el puerto:

```
set PORT=3001 && npx next start
```

### Error: "Migration failed"

La base de datos puede estar corrupta. Restaure desde un backup:

1. Copie el archivo `.db.gz` más reciente de la carpeta `backups/`
2. Descomprímalo (puede usar 7-Zip o `gunzip` en WSL)
3. Reemplace `prisma/dev.db` con el archivo restaurado
4. Ejecute `npx prisma migrate deploy`

### Error: "El backup falló"

Verifique que el archivo `prisma/dev.db` exista. Si la base de datos no se ha creado, ejecute:

```
npx prisma db push
npx prisma db seed
```