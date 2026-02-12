#!/bin/sh
set -e
# With ./frontend:/app mount, node_modules is empty; install so deps (e.g. lucide-react) exist
if [ ! -d node_modules/lucide-react ]; then
  npm install
fi
exec "$@"
