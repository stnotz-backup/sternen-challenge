#!/bin/bash
# Kopiert die aktuelle Codebasis in ein eigenes Produktiv-Repo fuer ein Kind
# und setzt dort TEST_MODE=false + das passende ACTIVE_KID_ID fest.
#
# Nutzung:
#   ./deploy.sh elias
#   ./deploy.sh linda
#
# Erstes Ausfuehren legt das oeffentliche GitHub-Repo "sternen-challenge-<kind>"
# an und aktiviert GitHub Pages. Spaeteres erneutes Ausfuehren pusht einfach
# den aktuellen Stand in dasselbe Repo.

set -euo pipefail

KID_ID="${1:-}"
if [[ "$KID_ID" != "elias" && "$KID_ID" != "linda" ]]; then
  echo "Nutzung: ./deploy.sh elias|linda"
  exit 1
fi

REPO_NAME="sternen-challenge-$KID_ID"
GH_USER="stnotz-backup"
SRC_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
TMP_DIR="$(mktemp -d)"

echo "Kopiere Code nach $TMP_DIR ..."
rsync -a --exclude='.git' --exclude='.claude' --exclude='deploy.sh' "$SRC_DIR"/ "$TMP_DIR"/

echo "Setze TEST_MODE=false und ACTIVE_KID_ID=\"$KID_ID\" ..."
sed -i '' 's/const TEST_MODE = true;/const TEST_MODE = false;/' "$TMP_DIR/config.js"
sed -i '' "s/const ACTIVE_KID_ID = \"elias\";/const ACTIVE_KID_ID = \"$KID_ID\";/" "$TMP_DIR/config.js"

cd "$TMP_DIR"
git init -q
git add -A
git commit -q -m "Produktiv-Deploy für $KID_ID ($(date +%Y-%m-%d))"

if gh repo view "$GH_USER/$REPO_NAME" >/dev/null 2>&1; then
  echo "Repo $REPO_NAME existiert schon — push..."
  git remote add origin "https://github.com/$GH_USER/$REPO_NAME.git"
  git branch -M main
  git push -f origin main
else
  echo "Lege neues öffentliches Repo $REPO_NAME an und aktiviere Pages..."
  gh repo create "$REPO_NAME" --public --source=. --remote=origin \
    --description "Sternen-Challenge für $KID_ID" --push
  gh api -X POST "repos/$GH_USER/$REPO_NAME/pages" \
    -f "source[branch]=main" -f "source[path]=/"
fi

echo ""
echo "Fertig: https://$GH_USER.github.io/$REPO_NAME/"
echo "(GitHub Pages braucht nach dem allerersten Deploy meist 1-2 Minuten, bis der Link live ist.)"
