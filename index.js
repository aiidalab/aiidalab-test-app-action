'use strict';
const core = require('@actions/core');
const io = require('@actions/io');
const exec = require('@actions/exec');

const path = require('path');
const process = require('process');
const compose = require('docker-compose');
const composefile = require('composefile');
const crypto = require('crypto');
const yargs = require('yargs');

const AIIDALAB_DEFAULT_IMAGE = 'aiidalab/aiidalab-docker-stack:latest';
const SELENIUM_TESTS_IMAGE = 'aiidalab/aiidalab-test-app-action:selenium-tests';


function getAppPath() {
  if ( process.env.GITHUB_WORKSPACE ) {
      if ( path.resolve(process.env.GITHUB_WORKSPACE) != path.resolve(__dirname)) {
        return path.resolve(process.env.GITHUB_WORKSPACE);
      } else {
        core.warning("GITHUB_WORKSPACE is pointing to the current working directory!");
        return path.join(__dirname, 'app'); // point to empty directory
      }
  } else {
    core.warning("GITHUB_WORKSPACE env variable is not set!");
    return path.join(__dirname, 'app'); // point to empty directory
  }
}


function getNotebooks() {
  // Determine the pattern for the notebooks to test with generic tests.
  if (core.getInput('notebooks')) {
    return core.getInput('notebooks');
  } else if (process.env.AIIDALAB_APP_TESTS_NOTEBOOKS) {
    core.warning(
      "The use of the $AIIDALAB_APP_TESTS_NOTEBOOK environment variable " +
      "is deprecated and will be removed with the next major version change!")
    return process.env.AIIDALAB_APP_TESTS_NOTEBOOKS;
  } else {
    return '**/[!.]*.ipynb';
  }
}


async function _create_docker_compose_file(context, aiidalabImage, jupyterToken, appPath, appName) {
  // We create the docker-compose on the fly to not need to package it.
  return composefile({
    outputFolder: context,
    filename: 'docker-compose.yml',
    services: {
      aiidalab: {
        image: aiidalabImage,
        volumes: [ `${appPath}/:/home/aiida/apps/${appName}` ],
        expose: ['8888'],
        environment: {
          AIIDALAB_SETUP: 'true',
          JUPYTER_TOKEN: jupyterToken,
          },
      },
      seleniumhub: {
        image: 'selenium/hub:3.141.59-20200525',
        expose: [ '4444'],
      },
      chrome: {
        image: 'selenium/node-chrome:3.141.59-20200525',
        volumes: [ '/dev/shm:/dev/shm' ],
        depends_on: [ 'seleniumhub' ],
        environment: {
          HUB_HOST: 'seleniumhub',
        }
      },
      firefox: {
        image: 'selenium/node-firefox:3.141.59-20200525',
        volumes: [ '/dev/shm:/dev/shm' ],
        depends_on: [ 'seleniumhub' ],
        environment: {
          HUB_HOST: 'seleniumhub',
        }
      },
      opera: {
        image: 'selenium/node-opera:3.141.59-20200525',
        volumes: [ '/dev/shm:/dev/shm' ],
        depends_on: [ 'seleniumhub' ],
        environment: {
          HUB_HOST: 'seleniumhub',
        }
      },
    }
  },
  () => { core.debug("Created docker-compose file."); });
}


async function startDockerCompose(projectName, aiidalabImage, jupyterToken, appPath, appName) {
  const context = path.join(__dirname, projectName);
  return io.mkdirP(context)
    .then(() => { return _create_docker_compose_file(context, aiidalabImage, jupyterToken, appPath, appName); })
    .then(() => { return compose.upAll({
        cwd: context,
        composeOptions: [["--project-name", projectName ]],
        log: true})});
}


async function startSeleniumTests(network, jupyterToken, appPath, appName, browser, notebooks, screenshots, extra) {
  return exec.exec(
    'docker', [
      'run',
      '--env', `AIIDALAB_HOST=aiidalab`,
      '--env', `SELENIUM_HOST=seleniumhub`,
      '--env', `JUPYTER_TOKEN=${jupyterToken}`,
      '--env', `APP_NOTEBOOKS=${notebooks}`,
      '--network=' + network,
      '--mount', `type=bind,src=${appPath},dst=/selenium-tests/${appName}`,
      ...(screenshots ? ['--mount', `type=bind,src=${screenshots},dst=/selenium-tests/screenshots`] : []),
      SELENIUM_TESTS_IMAGE,
      '--capability', 'browserName', browser,
    ].concat(extra));
}


// most @actions toolkit packages have async methods
async function run() {
  try {

    const argv = yargs
      .option('screenshots', {
        alias: 's',
        description: 'Path to bind the screenshots volume to.',
      })
      .default('screenshots', core.getInput('screenshots'))
      .normalize('screenshots')  // normalize path
      .option('name', {
        alias: 'n',
        description: 'The name of the app within the apps folder.',
      })
      .default('name', core.getInput('name'))
      .help()
      .argv;

    const screenshots = argv.screenshots ? path.resolve(argv.screenshots) : '' ;
    if ( screenshots ) {
      await io.mkdirP( screenshots );
    }

    const appName = argv.name ? argv.name : 'app' ;
    core.debug(`app name: ${appName}`);

    const projectName = ( process.env.AIIDALAB_TESTS_WORKDIR ) ?
      process.env.AIIDALAB_TESTS_WORKDIR : `aiidalabtests${ crypto.randomBytes(8).toString('hex') }`;
    const network = projectName + '_default';
    const jupyterToken = 'aiidalab-test'

    const aiidalabImage = ( core.getInput('image') ) ? core.getInput('image') : AIIDALAB_DEFAULT_IMAGE;
    const appPath = getAppPath();

    const browser = ( core.getInput('browser') ) ? core.getInput('browser') : 'chrome';
    const notebooks = getNotebooks();

    // Run tests...
    return startDockerCompose(projectName, aiidalabImage, jupyterToken, appPath, appName)
      .then(
        () => { return startSeleniumTests(network, jupyterToken, appPath, appName, browser, notebooks, screenshots, argv._); },
        err => { throw new Error("Unable to start docker-compose: " + err); })
      .then(
        () => { console.log("Completed selenium tests.")},
        err => { throw new Error("Failed to execute selenium tests: " + err); })
      .catch(err => { core.setFailed('Failed to execute selenium tests with error:\n' + err); })
  }
  catch (error) {
    core.setFailed(error.message);
  }
}

run()
