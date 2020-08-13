<p align="center">
  <a href="https://github.com/actions/javascript-action/actions"><img alt="javscript-action status" src="https://github.com/actions/javascript-action/workflows/units-test/badge.svg"></a>
</p>

# aiidalab-test-app-action

This action tests an AiiDA lab docker stack and AiiDA lab applications.

See also the [aiidalab-hello-world app](https://github.com/aiidalab/aiidalab-hello-world) for an example on how to use this action for testing.

# Usage

This is an example on how to automatically test an app for each push:

<!-- start usage -->
```yaml
name: continuous-integration

on:
  [push]

jobs:

  test-app:

    runs-on: ubuntu-latest
    timeout-minutes: 10

    strategy:
      matrix:
        tag: [ stable, latest ]
        browser: [ chrome, firefox ]
      fail-fast: false

    steps:

      - name: Check out app
        uses: actions/checkout@v2

      - name: Test app
        uses: aiidalab/aiidalab-test-app-action@v2
        with:
          image: aiidalab/aiidalab-docker-stack:${{ matrix.tag }}
          browser: ${{ matrix.browser }}
          # Use a comma-separated list of glob-patterns to specify which
          # notebooks to test with generic tests.
          # Defaults to all non-hidden notebook files: '**/[!.]*.ipynb'
          # Use '!' to skip all generic tests.
          notebooks: main.ipynb,subdir/*.ipynb

      - name: Upload screenshots as artifacts
        uses: actions/upload-artifact@v2
        with:
          name: Screenshots-${{ matrix.tag }}-${{ matrix.browser }}
          path: 'screenshots/'
```
<!-- end usage -->

To run tests locally, use the `run-test.sh` script.
For example, to run tests locally for the aiidalab-hello-world app, run:

```console
$ git clone https://github.com/aiidalab/aiidalab-hello-world.git
$ ./run-tests.sh aiidalab-hello-world/
```
All arguments to ``run-test.sh`` following ``--`` are directly forwarded to ``pytest``, for example:
```console
$ ./run-tests.sh aiidalab-hello-world/ -- --maxfail=3 -k example --verbose
```

To access screenshots that were taken during the test, use the ``--screenshots`` (``-s``) option:
```console
$ ./run-tests.sh aiidalab-hello-world/ --screenshots=path/to/screenshots
```

# Executed tests

The action will execute tests using pytest in combination with selenium.
The tests bundled with the action will test whether basic platform generic pages are accessible on selected browsers.

To test a specific app, use the `action/checkout` action prior to using this action.
This will mount the checked out app on the aiidalab instance under `/home/aiida/apps/app` and run some generic tests, e.g., whether the notebooks bundled with the app are accessible via app mode.

# Implement app specific tests

To implement app specific tests, implement them using pytest and add them to the repository, e.g., in a `tests/` folder.
For example:
```python
#!/usr/bin/env python
import pytest

from selenium.webdriver.common.by import By


def test_example(selenium, url):
    selenium.get(url('apps/apps/my-app/example.ipynb'))
    selenium.find_element(By.ID, 'ipython-main-app')
    selenium.find_element(By.ID, 'notebook-container')
    selenium.find_element(By.CLASS_NAME, 'jupyter-widgets-view')
    selenium.get_screenshot_as_file('screenshots/example.png')
```

Important: The app will by default be installed under the endpoint `app`; however it is advisable to override this name and use a specific endpoint after implementing app-specific test with the `name` action parameter.
The generic app tests will then be skipped.

```yaml
      - name: Test app
        uses: aiidalab/aiidalab-test-app-action@v2
        with:
          name: my-app
```

# Development

The development of this action follows the toolkit guidelines: https://github.com/actions/toolkit/blob/master/docs/action-versioning.md
