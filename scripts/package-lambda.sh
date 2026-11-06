#!/usr/bin/env bash
set -euo pipefail

readonly FUNCTION_NAME="${1:-}"

case "$FUNCTION_NAME" in
  api | loader | authorizer) ;;
  *)
    echo "Uso: $0 <api|loader|authorizer>" >&2
    exit 1
    ;;
esac

cd "$(dirname "${BASH_SOURCE[0]}")/.."
readonly REPO_ROOT="$PWD"
readonly FUNCTION_DIR="services/${FUNCTION_NAME}"
readonly COMMON_DIR="services/common"
readonly ZIP_PATH="${REPO_ROOT}/dist/${FUNCTION_NAME}.zip"

if [[ ! -d "${FUNCTION_DIR}/src" ]]; then
  echo "No existe ${FUNCTION_DIR}/src" >&2
  exit 1
fi

stage="$(mktemp -d)"
trap 'rm -rf "$stage"' EXIT

# El handler va en la raíz del ZIP, porque Terraform configura handler.handler.
if [[ "$FUNCTION_NAME" == "authorizer" ]]; then
  cp -R "${FUNCTION_DIR}/src/." "$stage/"
else
  if [[ ! -d "$COMMON_DIR" ]]; then
    echo "${FUNCTION_NAME} necesita ${COMMON_DIR}, que no existe" >&2
    exit 1
  fi

  # esbuild busca cada import desde el archivo que lo contiene, así que common necesita sus dependencias.
  (cd "$COMMON_DIR" && npm ci --ignore-scripts)
  (cd "$FUNCTION_DIR" && npm ci --ignore-scripts)

  "${FUNCTION_DIR}/node_modules/.bin/esbuild" "${FUNCTION_DIR}/src/handler.mjs" \
    --bundle \
    --platform=node \
    --target=node24 \
    --format=esm \
    --main-fields=module,main \
    "--outfile=${stage}/handler.mjs"
fi

mkdir -p "$(dirname "$ZIP_PATH")"
rm -f "$ZIP_PATH"
(cd "$stage" && zip -qrX "$ZIP_PATH" . -x '*__pycache__*' '*.pyc')

echo "$ZIP_PATH"
