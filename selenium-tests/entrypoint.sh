#!/bin/bash -l
set -u
set -e

echo "Waiting for Selenium hub to start up..."
wait-for --timeout=30 ${SELENIUM_HOST:-localhost}:${SELENIUM_PORT:-4444}

echo "Waiting for AiiDA lab instance to start up..."
wait-for --timeout=90 ${AIIDALAB_HOST:-localhost}:${AIIDALAB_PORT:-8888}

echo "Run selenium tests..."
pytest -v --driver Remote "$@"
