#!/usr/bin/env bash
set -euo pipefail

repo="$(git -C "$(dirname "$0")" rev-parse --show-toplevel)"
cd "$repo"
if [[ $# -ne 1 || "$1" != /*.zip ]]; then
  printf 'Usage: %s /absolute/path/Coi-Nguon-Gift-Edition-RC1.zip\n' "$0" >&2
  exit 1
fi
archive="$1"
if [[ -e "$archive" ]]; then
  printf 'Output already exists: %s\n' "$archive" >&2
  exit 1
fi
if ! git diff --quiet HEAD -- src public index.html vite.config.ts package.json bun.lock package-lock.json scripts/gift-edition; then
  printf 'Commit the package inputs before building the release.\n' >&2
  exit 1
fi

go_bin="${GIFT_GO:-go}"
go_version="$("$go_bin" version)"
if [[ "$go_version" != 'go version go1.27.4 '* ]]; then
  printf 'Go 1.27.4 is required. Set GIFT_GO to the verified toolchain.\n' >&2
  exit 1
fi
go_root="$("$go_bin" env GOROOT)"
sha="$(git rev-parse HEAD)"
stage="$(mktemp -d)"
trap 'rm -rf "$stage"' EXIT
name=Coi-Nguon-Gift-Edition-RC1
out="$stage/$name"
mkdir -p "$out"
VITE_GEMINI_BIOGRAPHY_ENABLED=false npm run build
cp -R dist "$out/dist"
cp scripts/gift-edition/BAT-DAU.html "$out/"
sed 's/$/\r/' scripts/gift-edition/Mo-Coi-Nguon.cmd > "$out/Mo-Coi-Nguon.cmd"
cp "$go_root/LICENSE" "$out/GO-LICENSE.txt"
printf 'Coi Nguon Gift Edition RC1\nApplication commit: %s\nLauncher toolchain: %s\nURL: http://127.0.0.1:4315/\n' "$sha" "$go_version" > "$out/BUILD.txt"

node --import tsx --input-type=module - "$out/Gia-Pha-Mau-Tong-Hop.json" <<'NODE'
import { writeFileSync } from 'node:fs';
import { createSeedSnapshot } from './src/database/seedData.ts';
import { validateImportSnapshot } from './src/services/importValidationService.ts';
import { serializeDatabaseBackup } from './src/services/jsonBackupService.ts';
const seed = createSeedSnapshot();
const {errors} = validateImportSnapshot(seed);
if (errors.length) throw new Error(errors.join('\n'));
writeFileSync(process.argv[2], await serializeDatabaseBackup(seed));
NODE

build_launcher() {
  CGO_ENABLED=0 GOOS=windows GOARCH="$1" "$go_bin" build -trimpath \
    -ldflags "-s -w -buildid= -X main.release=$sha" \
    -o "$out/GiftEdition-$2.exe" ./scripts/gift-edition/launcher.go
}
build_launcher amd64 x64
build_launcher arm64 arm64
(cd "$stage" && zip -q -r -X "$archive" "$name")
