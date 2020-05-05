# aiidalab-test-app-action

This action tests an AiiDA lab application with the latest version of AiiDA lab.

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

    steps:

      - name: Check out app
        uses: actions/checkout@v2

      - name: Test app
        uses: csadorf/aiidalab-test-app-action@v1
```
<!-- end usage -->

# Executed tests

Currently this action will only execute a smoke-test.
That means it will only attempt to execute the specified Jupyter notebooks (defaults to '*.ipynb' -- all notebooks) within the app folder.
