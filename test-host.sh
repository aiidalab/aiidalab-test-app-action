#!/bin/bash
set -e
set -u

# Build the selenium test image
docker build -t selenium-tests selenium-tests/

# Start the selenium hub
docker-compose -f selenium-hub/docker-compose.yml up -d && sleep 3

# Run tests
docker run \
  -e "SELENIUM_HOST=localhost" \
  -e "AIIDALAB_HOST=${AIIDALAB_HOST-$(hostname -I | awk '{print $1}')}" \
  -e "AIIDALAB_PORT=${AIIDALAB_PORT-8888}" \
  -e "JUPYTER_TOKEN=${JUPYTER_TOKEN}" \
  --network=host \
  --expose ${SELENIUM_PORT:-4444} \
  --expose ${AIIDALAB_PORT:-8888} \
  selenium-tests --capability browserName firefox

# Stop selenium hub
docker-compose -f selenium-hub/docker-compose.yml down
