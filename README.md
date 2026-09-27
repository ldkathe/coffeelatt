# Buen Café, Gran Café

Idle/clicker de cafetería inspirado en juegos como *Buen café, gran café* y
*Cookie Clicker*: se prepara café haciendo clic, se compran mejoras que
aumentan la fuerza del clic o la producción pasiva, y el progreso se guarda
en la nube para poder continuar desde cualquier dispositivo.

## Arquitectura

```
frontend/   Vite + JS vanilla → build estático servido por GitHub Pages
backend/    FastAPI (monolito modular por rutas) → desplegado en Render
supabase/   Esquema SQL (tablas + RLS) → Auth (Google) y Postgres
```

- El **frontend** corre el loop del juego en el navegador y guarda el
  progreso primero en `localStorage` (funciona sin cuenta). Si el jugador
  inicia sesión con Google (vía Supabase Auth), el estado se sincroniza
  con el backend cada pocos segundos.
- El **backend** es un único servicio FastAPI organizado en rutas
  (`/api/player`, `/api/shop`, `/api/health`). Verifica el JWT que emite
  Supabase Auth y usa la *service role key* para leer/escribir en
  Postgres. Se eligió monolito-por-rutas en vez de microservicios porque
  todavía no hay tráfico que justifique la complejidad operativa de
  varios servicios separados; el catálogo de mejoras vive en
  `app/routes/shop.py` + tabla `upgrades`, y el estado del jugador en
  `app/routes/player.py` + tabla `players`, así que separarlos en
  servicios independientes más adelante es un refactor localizado.
- **Supabase** provee Auth (Google OAuth) y la base Postgres. El frontend
  solo usa Supabase directamente para login (obtiene el JWT); todas las
  lecturas/escrituras de progreso pasan por el backend, que puede validar
  reglas de juego (anti-cheat básico) antes de tocar la base de datos.

## Desarrollo local

### Frontend

```bash
cd frontend
cp .env.example .env   # completar con tus claves de Supabase y la URL del backend
npm install
npm run dev
```

### Backend

```bash
cd backend
cp .env.example .env   # completar con tus claves de Supabase
python3 -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
uvicorn app.main:app --reload
```

La API queda en `http://localhost:8000/api`, con documentación
interactiva en `http://localhost:8000/docs`.

## Configurar Supabase

1. Crear un proyecto en [supabase.com](https://supabase.com).
2. Abrir el **SQL editor** y ejecutar `supabase/schema.sql` (crea las
   tablas `players` y `upgrades`, las políticas RLS y el catálogo inicial
   de mejoras).
3. En **Authentication → Providers**, habilitar Google y configurar el
   Client ID/Secret de un proyecto en Google Cloud Console (pantalla de
   consentimiento OAuth + credenciales web).
4. En **Authentication → URL Configuration**, agregar como *Redirect URL*
   tanto `http://localhost:5173` (dev) como la URL final de GitHub Pages.
5. Tomar de **Project Settings → API**:
   - `Project URL` → `SUPABASE_URL` / `VITE_SUPABASE_URL`
   - `anon public` key → `VITE_SUPABASE_ANON_KEY`
   - `service_role` key → `SUPABASE_SERVICE_ROLE_KEY` (solo backend, nunca
     exponerla en el frontend)
   - `JWT Secret` → `SUPABASE_JWT_SECRET`

## Deploy

### Backend en Render

El repo incluye `backend/render.yaml`. Al crear el servicio ("Blueprint")
desde este repo, Render detecta el archivo y solo falta cargar las
variables de entorno marcadas como `sync: false` (las claves de Supabase
y `ALLOWED_ORIGINS` con la URL de GitHub Pages).

### Frontend en GitHub Pages

El workflow `.github/workflows/deploy-pages.yml` compila `frontend/` y
publica `dist/` en GitHub Pages en cada push a `main`. Antes de usarlo:

1. En **Settings → Pages**, poner el *Source* en "GitHub Actions".
2. En **Settings → Secrets and variables → Actions**, crear:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
   - `VITE_API_BASE_URL` (la URL pública del backend en Render + `/api`)

Cuando se conecte un dominio propio, solo cambia `VITE_API_BASE_URL`/
`ALLOWED_ORIGINS` y la config de Pages — el build usa `base: './'` para
que funcione igual en `usuario.github.io/coffeelatt` que en la raíz de un
dominio propio.

## Roadmap

- Tabla de posiciones / leaderboard global.
- App Android empaquetando el mismo frontend con Capacitor (WebView +
  login con Google reutilizando la sesión de Supabase).
- Eventos, logros y prestigio/reinicio con bonus.
