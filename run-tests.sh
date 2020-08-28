#!/bin/bash

if [ "$#" -lt 1 ]; then
  echo "Error: Provide the path to the app to test as argument."
  exit 2
fi

export AIIDALAB_TESTS_WORKDIR="aiidalabtests"`openssl rand -hex 8`

SELENIUM_TESTS_IMAGE="aiidalab/aiidalab-test-app-action:selenium-tests"

APP_PATH="$1"
shift

docker build --tag="${SELENIUM_TESTS_IMAGE}" selenium-tests/ && node index.js -a ${APP_PATH} "$@"
echo "${AIIDALAB_TESTS_WORKDIR}"
