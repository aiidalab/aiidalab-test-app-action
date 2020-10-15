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


function _checkAppPath(appPath) {
  // Check whether the appPath points to the current working directory.
  // This is only tolerated in the context of a GitHub actions workflow, but a warning is emitted.
  if ( path.resolve(appPath) == path.resolve(__dirname) ) {  // appPath points to current directory
    if ( process.env.GITHUB_ACTIONS == 'true' ) {
      core.warning(
        "The app-path is pointing to the current working directory! " +
        "Make sure to checkout the app before running this action.");
      return path.join(__dirname, 'app'); // point to empty directory
    } else {
      throw new Error("The app-path may not point to the current working directory.");
    }
  } else {
    return appPath;
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
        ...( (appPath && appName) && {volumes:  [ `${appPath}:/home/aiida/apps/${appName}` ] } ),
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


async function cleanUp(projectName) {
    if ( process.env.GITHUB_ACTIONS !== 'true' ) {
      const context = path.join(__dirname, projectName);
      return compose.down({cwd: context, log: true})
        .then(
          () => { return io.rmRF(context); },
          err => { throw new Error("Unable to shutdown docker-compose: " + err); })
    }
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
      .option('app-path', {
        alias: 'a',
        description: 'Path to the app\'s directory.',
      })
      .default('app-path', process.env.GITHUB_WORKSPACE || 'app/')
      .normalize('app-path') // normalize path
      .option('image', {
        description: 'The aiidalab image to test on.',
        alias: 'i',
      })
      .default('image', core.getInput('image') || AIIDALAB_DEFAULT_IMAGE)
      .option('name', {
        alias: 'n',
        description: 'The name of the app within the apps folder.',
      })
      .default('name', core.getInput('name') || 'app')
      .option('bundled', {
        description: 'Assume that the app is pre-installed and test that one using the ' +
                     'tests in the provided app-path.',
        type: 'boolean',
      })
      .default('bundled', core.getInput('bundled').toLowerCase() === 'true' || false)
      .option('browser', {
        description: 'Specify which browser to use.',
        choices: ['chrome', 'firefox', 'opera'],
      })
      .default('browser', core.getInput('browser') || 'chrome')
      .option('screenshots', {
        alias: 's',
        description: 'Path to bind the screenshots volume to.',
      })
      .default('screenshots', core.getInput('screenshots') ? path.resolve(core.getInput('screenshots')) : undefined)
      .normalize('screenshots')  // normalize path
      .option('notebooks', {
        description: 'Which notebooks to test with generic tests.'
      })
      .default('notebooks', getNotebooks())
      .coerce('app-path', _checkAppPath)
      .coerce(['app-path', 'screenshots'], path_ => path_ ? path.resolve(path_) : path_ )
      .help()
      .argv;

    // Set some additional constants required for the docker-compose context.
    const projectName = process.env.AIIDALAB_TEST_WORKDIR || `aiidalabtests${ crypto.randomBytes(8).toString('hex') }`;
    const network = projectName + '_default';
    const jupyterToken = 'aiidalab-test'

    // Provide some context that could help during debugging.
    core.debug(`image: ${argv.image}`)
    core.debug(`app-path: ${argv.appPath}`)
    core.debug(`name: ${argv.name}`);
    core.debug(`screenshots: ${argv.screenshots}`)
    core.debug(`browser: ${argv.browser}`)
    core.debug(`bundled: ${argv.bundled}`)

    // Make screenshots directory if set
    if ( argv.screenshots ) {
      await io.mkdirP( argv.screenshots );
    }

    // Run tests...
    return startDockerCompose(projectName, argv.image, jupyterToken, argv.bundled ? "" : argv.appPath, argv.bundled ? "" : argv.name)
      .then(
        () => { return startSeleniumTests(network, jupyterToken, argv.appPath, argv.name, argv.browser, argv.notebooks, argv.screenshots, argv._); },
        err => { throw new Error("Unable to start docker-compose: " + err); })
      .then(
        () => { console.log("Completed selenium tests.")},
        err => { throw new Error("Failed to execute selenium tests: " + err); })
      .catch(err => { core.setFailed('Failed to execute selenium tests with error:\n' + err); })
      .then(() => { return cleanUp(projectName); })
  }
  catch (error) {
    core.setFailed(error.message);
  }
}

run()
