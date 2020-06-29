#!/bin/bash

if [ "$#" -ne 1 ]; then
  echo "Error: Provide the path to the app to test as argument."
  exit 2
fi

export AIIDALAB_TESTS_WORKDIR="aiidalabtests"`openssl rand -hex 8`

SELENIUM_TESTS_IMAGE="aiidalab/aiidalab-test-app-action:selenium-tests"


function cleanup {
  if [ -d "${AIIDALAB_TESTS_WORKDIR}" ]; then
    cd "${AIIDALAB_TESTS_WORKDIR}"
    docker-compose down --volumes
    cd ../
    rm -rfv "${AIIDALAB_TESTS_WORKDIR}"
  fi
}
trap cleanup EXIT

docker build --tag="${SELENIUM_TESTS_IMAGE}" selenium-tests/ && GITHUB_WORKSPACE=$1 node index.js
echo "${AIIDALAB_TESTS_WORKDIR}"
