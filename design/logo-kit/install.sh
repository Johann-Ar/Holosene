#!/usr/bin/env sh
# Usage : depuis la racine du projet →  sh chemin/vers/logo-kit/install.sh
set -e
KIT="$(cd "$(dirname "$0")" && pwd)"
mkdir -p design public/media
[ "$KIT" = "$(pwd)/design/logo-kit" ] || { rm -rf design/logo-kit; cp -R "$KIT" design/logo-kit; }
cp design/logo-kit/svg/monogram-*.svg public/media/
if ! grep -q "Identité visuelle — logo S·o" CLAUDE.md 2>/dev/null; then
  printf "\n" >> CLAUDE.md; cat design/logo-kit/CLAUDE.md >> CLAUDE.md
fi
echo "OK : kit dans design/logo-kit, SVG copiés dans public/media, règles ajoutées à CLAUDE.md"
