#!/usr/bin/env bash
# =============================================================================
#  SUBIR CAMBIOS AL VPS - SISTEMA DE TRÁNSITO
# =============================================================================
#
#  Qué hace, en orden:
#
#    1. Revisa que no haya cambios a mano en el servidor.
#    2. Muestra qué commits nuevos se van a bajar.
#    3. COPIA DE SEGURIDAD: base de datos + código + commit actual.
#    4. git pull.
#    5. Cambios en la base de datos (cada uno se fija si ya está hecho,
#       así que se puede correr más de una vez sin romper nada).
#    6. npm install solo si cambiaron las dependencias.
#    7. Reinicia el backend (pm2).
#    8. Compila el frontend (npm run build).
#
#  Cómo se ejecuta en el VPS (la copia se hace ANTES de bajar el código,
#  por eso el script se lee directo de GitHub sin hacer pull todavía):
#
#    cd /opt/sistemas-municipales/transito
#    git fetch origin
#    git show origin/main:deploy/subir-vps.sh > /tmp/subir-vps.sh
#    bash /tmp/subir-vps.sh
#
#  La contraseña de la base NO está en este archivo: se lee de
#  backend/.env del servidor. Si no la encuentra, la pide.
#
# =============================================================================

set -euo pipefail

# ---------------------------------------------------------------------------
#  CONFIGURACIÓN
# ---------------------------------------------------------------------------

APP_DIR="/opt/sistemas-municipales/transito"
PM2_NOMBRE="transito-api"
RAMA="main"
CARPETA_COPIAS="/opt/sistemas-municipales/copias-transito"

# ---------------------------------------------------------------------------
#  AYUDAS
# ---------------------------------------------------------------------------

verde()   { printf "\033[32m%s\033[0m\n" "$*"; }
amarillo(){ printf "\033[33m%s\033[0m\n" "$*"; }
rojo()    { printf "\033[31m%s\033[0m\n" "$*"; }
titulo()  { echo; printf "\033[1;36m==> %s\033[0m\n" "$*"; }

preguntar() {
  # preguntar "¿Seguimos?"  -> devuelve 0 si responde s/si
  local respuesta
  read -r -p "$1 [s/N] " respuesta
  [[ "$respuesta" =~ ^([sS]|[sS][iIíÍ])$ ]]
}

leer_env() {
  # leer_env DB_NAME  -> valor dentro de backend/.env (sin comillas)
  local clave="$1"
  local archivo="$APP_DIR/backend/.env"
  [[ -f "$archivo" ]] || return 0
  grep -E "^${clave}=" "$archivo" | tail -n 1 | cut -d= -f2- \
    | tr -d '\r' | sed -e 's/^"//' -e 's/"$//' -e "s/^'//" -e "s/'$//"
}

cd "$APP_DIR"

# ---------------------------------------------------------------------------
#  DATOS DE LA BASE (desde backend/.env)
# ---------------------------------------------------------------------------

DB_NAME="$(leer_env DB_NAME)"
DB_USER="$(leer_env DB_USER)"
DB_HOST="$(leer_env DB_HOST)"
DB_PORT="$(leer_env DB_PORT)"
DB_PASSWORD="$(leer_env DB_PASSWORD)"

DB_NAME="${DB_NAME:-transito_db}"
DB_USER="${DB_USER:-root}"
DB_HOST="${DB_HOST:-localhost}"
DB_PORT="${DB_PORT:-3306}"

if [[ -z "$DB_PASSWORD" ]]; then
  read -r -s -p "Contraseña de MySQL para '$DB_USER': " DB_PASSWORD
  echo
fi

# La contraseña va por variable de entorno: no aparece en pantalla
# ni en la lista de procesos.
export MYSQL_PWD="$DB_PASSWORD"

MYSQL=(mysql -h "$DB_HOST" -P "$DB_PORT" -u "$DB_USER" "$DB_NAME")

sql_valor() {
  "${MYSQL[@]}" -N -B -e "$1"
}

titulo "Probando conexión a la base '$DB_NAME'"
sql_valor "SELECT 1" > /dev/null
verde "Conexión OK."

# El usuario tiene que poder modificar tablas (ALTER). Se revisa ANTES
# de tocar nada, para no quedar con el código bajado y la base a medias.
PERMISOS="$(sql_valor "SHOW GRANTS FOR CURRENT_USER()" | tr '[:lower:]' '[:upper:]')"

if grep -qE "ALL PRIVILEGES|[ ,]ALTER[ ,]" <<< "$PERMISOS"; then
  verde "El usuario '$DB_USER' puede modificar tablas."
else
  rojo "El usuario '$DB_USER' no tiene permiso para modificar tablas (ALTER):"
  echo "$PERMISOS"
  rojo "No se tocó nada. Dale el permiso o corré el script con otro usuario."
  exit 1
fi

# ---------------------------------------------------------------------------
#  1. CAMBIOS A MANO EN EL SERVIDOR
# ---------------------------------------------------------------------------

titulo "1. Revisando cambios locales en el servidor"

if [[ -n "$(git status --porcelain --untracked-files=no)" ]]; then
  amarillo "Hay archivos modificados a mano en el servidor:"
  git status --short --untracked-files=no
  echo
  amarillo "El 'git pull' puede fallar o pisarlos."
  preguntar "¿Seguir igual?" || { rojo "Cancelado. No se tocó nada."; exit 1; }
else
  verde "Sin cambios a mano."
fi

# ---------------------------------------------------------------------------
#  2. QUÉ SE VA A BAJAR
# ---------------------------------------------------------------------------

titulo "2. Commits nuevos en GitHub"

git fetch origin "$RAMA"

COMMIT_ANTERIOR="$(git rev-parse HEAD)"
COMMIT_NUEVO="$(git rev-parse "origin/$RAMA")"

if [[ "$COMMIT_ANTERIOR" == "$COMMIT_NUEVO" ]]; then
  amarillo "No hay commits nuevos: el código ya está actualizado."
  preguntar "¿Correr igual la copia, la base y el build?" \
    || { echo "Nada para hacer."; exit 0; }
else
  git --no-pager log --oneline "$COMMIT_ANTERIOR..$COMMIT_NUEVO"
fi

echo
preguntar "¿Hacemos la copia de seguridad y subimos los cambios?" \
  || { rojo "Cancelado. No se tocó nada."; exit 1; }

# ---------------------------------------------------------------------------
#  3. COPIA DE SEGURIDAD
# ---------------------------------------------------------------------------

FECHA="$(date +%Y-%m-%d_%H-%M)"
COPIA="$CARPETA_COPIAS/$FECHA"

titulo "3. Copia de seguridad en $COPIA"

mkdir -p "$COPIA"

echo "$COMMIT_ANTERIOR" > "$COPIA/commit_anterior.txt"

echo "- Base de datos..."
mysqldump -h "$DB_HOST" -P "$DB_PORT" -u "$DB_USER" \
  --single-transaction --no-tablespaces \
  "$DB_NAME" | gzip > "$COPIA/base_${DB_NAME}.sql.gz"

# Una copia vacía no sirve: se corta acá.
if [[ "$(gzip -dc "$COPIA/base_${DB_NAME}.sql.gz" | wc -c)" -lt 500 ]]; then
  rojo "La copia de la base salió vacía. No sigo."
  exit 1
fi

echo "- Código (sin node_modules, sin build y sin fotos)..."
tar -czf "$COPIA/codigo.tar.gz" \
  --exclude='./node_modules' \
  --exclude='./backend/node_modules' \
  --exclude='./frontend/node_modules' \
  --exclude='./frontend/dist' \
  --exclude='./backend/uploads' \
  --exclude='./uploads' \
  -C "$APP_DIR" .

verde "Copia lista:"
ls -lh "$COPIA"

# ---------------------------------------------------------------------------
#  4. BAJAR EL CÓDIGO
# ---------------------------------------------------------------------------

titulo "4. git pull"

git pull --ff-only origin "$RAMA"

# ---------------------------------------------------------------------------
#  5. CAMBIOS EN LA BASE DE DATOS
# ---------------------------------------------------------------------------

titulo "5. Cambios en la base de datos"

# 5.a  infracciones.accionPosterior: agregar 'RETIRO_GRUA'

TIPO_ACCION="$(sql_valor "
  SELECT COLUMN_TYPE
  FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'infracciones'
    AND COLUMN_NAME = 'accionPosterior'")"

TIPO_ESPERADO_VIEJO="enum('ESPERAR_RESPONSABLE','MUNICIPALIDAD','OTRA_ACTUACION','RETIRO_INMEDIATO','BUSQUEDA_REMOCION')"

if [[ "$TIPO_ACCION" == *"'RETIRO_GRUA'"* ]]; then
  verde "- RETIRO_GRUA ya existe. Nada para hacer."
elif [[ "$TIPO_ACCION" == "$TIPO_ESPERADO_VIEJO" ]]; then
  echo "- Agregando RETIRO_GRUA a infracciones.accionPosterior..."
  "${MYSQL[@]}" -e "
    ALTER TABLE infracciones
      MODIFY accionPosterior ENUM(
        'ESPERAR_RESPONSABLE',
        'MUNICIPALIDAD',
        'OTRA_ACTUACION',
        'RETIRO_INMEDIATO',
        'BUSQUEDA_REMOCION',
        'RETIRO_GRUA'
      ) DEFAULT NULL;"
  verde "  Listo."
else
  # La columna no es como se esperaba: no se toca para no perder datos.
  rojo "- infracciones.accionPosterior tiene un formato distinto al esperado:"
  rojo "    $TIPO_ACCION"
  rojo "  No la modifiqué. Avisá antes de seguir."
  rojo "  El código YA se bajó pero el backend NO se reinició."
  exit 1
fi

# 5.b  Rol 'grua' (el backend también lo crea solo al iniciar)

"${MYSQL[@]}" -e "
  INSERT INTO roles (nombre, descripcion, activo, createdAt, updatedAt)
  SELECT 'grua',
         'Grúa: retira vehículos con Acta de Infracción listos para llevar al predio',
         1, NOW(), NOW()
  FROM DUAL
  WHERE NOT EXISTS (SELECT 1 FROM roles WHERE nombre = 'grua');"
verde "- Rol 'grua' OK."

# 5.c  reclamos.informeJefeGuardia (de una versión anterior; por si falta)

EXISTE_INFORME="$(sql_valor "
  SELECT COUNT(*)
  FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'reclamos'
    AND COLUMN_NAME = 'informeJefeGuardia'")"

if [[ "$EXISTE_INFORME" == "0" ]]; then
  echo "- Agregando reclamos.informeJefeGuardia..."
  "${MYSQL[@]}" -e "ALTER TABLE reclamos ADD COLUMN informeJefeGuardia TEXT NULL;"
  verde "  Listo."
else
  verde "- reclamos.informeJefeGuardia ya existe."
fi

# 5.d  Reclamos que quedaron con estado vacío al ingresar al predio
#      (backend/sql/2026-11-26_estado_reclamo_en_predio.sql)

VACIOS_PREDIO="$(sql_valor "
  SELECT COUNT(*) FROM reclamos
  WHERE estado = '' AND etapaActual = 'EN_PREDIO'")"

if [[ "$VACIOS_PREDIO" != "0" ]]; then
  echo "- Corrigiendo $VACIOS_PREDIO reclamo(s) en predio con estado vacío..."
  "${MYSQL[@]}" -e "
    UPDATE reclamos
    SET estado = 'EN_SEGUIMIENTO'
    WHERE estado = '' AND etapaActual = 'EN_PREDIO';"
  verde "  Listo."
else
  verde "- No hay reclamos en predio con estado vacío."
fi

OTROS_VACIOS="$(sql_valor "SELECT COUNT(*) FROM reclamos WHERE estado = ''")"

if [[ "$OTROS_VACIOS" != "0" ]]; then
  amarillo "- Quedan $OTROS_VACIOS reclamo(s) con estado vacío en otra etapa."
  amarillo "  No los toqué. Para verlos:"
  amarillo "  SELECT id, numeroReclamo, etapaActual FROM reclamos WHERE estado = '';"
fi

# ---------------------------------------------------------------------------
#  6. DEPENDENCIAS (solo si cambiaron)
# ---------------------------------------------------------------------------

titulo "6. Dependencias"

CAMBIADOS="$(git diff --name-only "$COMMIT_ANTERIOR" HEAD || true)"

if grep -qE '^backend/package(-lock)?\.json$' <<< "$CAMBIADOS"; then
  echo "- Cambiaron las dependencias del backend: npm install..."
  (cd backend && npm install --omit=dev)
else
  verde "- Backend: sin cambios de dependencias."
fi

if grep -qE '^frontend/package(-lock)?\.json$' <<< "$CAMBIADOS"; then
  echo "- Cambiaron las dependencias del frontend: npm install..."
  (cd frontend && npm install)
else
  verde "- Frontend: sin cambios de dependencias."
fi

# ---------------------------------------------------------------------------
#  7. REINICIAR BACKEND
# ---------------------------------------------------------------------------

titulo "7. Reiniciando backend ($PM2_NOMBRE)"

pm2 restart "$PM2_NOMBRE"
sleep 4

if pm2 describe "$PM2_NOMBRE" 2>/dev/null | grep -qE "status[^a-z]+online"; then
  verde "Backend en línea."
else
  amarillo "Revisá el estado del backend:"
  pm2 status "$PM2_NOMBRE" || true
fi

echo "Últimas líneas del log:"
pm2 logs "$PM2_NOMBRE" --lines 15 --nostream || true

# ---------------------------------------------------------------------------
#  8. COMPILAR FRONTEND
# ---------------------------------------------------------------------------

titulo "8. Compilando frontend"

(cd frontend && npm run build)

# ---------------------------------------------------------------------------
#  LISTO
# ---------------------------------------------------------------------------

titulo "TERMINADO"

verde "Commit anterior: $COMMIT_ANTERIOR"
verde "Commit actual:   $(git rev-parse HEAD)"
verde "Copia en:        $COPIA"

cat <<EOF

Si algo salió mal y hay que VOLVER ATRÁS:

  cd $APP_DIR
  git reset --hard $COMMIT_ANTERIOR
  pm2 restart $PM2_NOMBRE
  cd frontend && npm run build

  # Solo si hace falta restaurar la BASE (se pierde lo cargado después):
  gunzip < $COPIA/base_${DB_NAME}.sql.gz | mysql -u $DB_USER -p $DB_NAME

Recordá entrar al sistema con Ctrl+F5 para que el navegador
tome la versión nueva.
EOF
