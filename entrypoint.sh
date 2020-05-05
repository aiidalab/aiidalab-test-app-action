#!/bin/bash -l

# PATHS:
AIIDA_HOME="/home/aiida"
APPS_PATH="${AIIDA_HOME}/apps"
APP_PATH="${APPS_PATH}/app"

# Start up required services.
my_my_init &
wait-for-services

# Prepare the test script and make executable for 'aiida' user.
cd ${AIIDA_HOME}
cp /test-notebooks.sh ./
chown aiida:aiida test-notebooks.sh

#  Install the app and make accessible to 'aiida' user.
cp -r ${GITHUB_WORKSPACE} ${APP_PATH}
chown -R aiida:aiida ${APP_PATH}

# Execute app tests as local 'aiida' user.
su -l aiida ./test-notebooks.sh ${APP_PATH}/${1}
