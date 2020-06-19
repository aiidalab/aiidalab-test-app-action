#!/usr/bin/env python
import pytest
from selenium.webdriver.common.by import By

from pathlib import Path


APP_PATH = Path('/selenium-tests/app/')


app_installed = pytest.mark.skipif(
    not APP_PATH.exists(),
    reason="no app in apps/app/ installed")


def _find_notebooks():
    for path in APP_PATH.glob('**/[!.]*.ipynb'):
        nb = path.relative_to(APP_PATH)
        marks = pytest.mark.xfail if str(nb) == 'example-import-error.ipynb' else []
        yield pytest.param(nb, id=str(nb), marks=marks)


for_all_notebooks = pytest.mark.parametrize(
    'notebook',
    list(_find_notebooks()))


@app_installed
def test_app_is_mounted():
    assert APP_PATH.is_dir()


@app_installed
def test_tree_apps_app(selenium, url):
    selenium.get(url('tree/apps/app'))
    selenium.find_element(By.ID, 'ipython-main-app')


@app_installed
@for_all_notebooks
def test_load_notebook(selenium, url, notebook):
    selenium.get(url('apps/apps/app/' + str(notebook)))
    selenium.find_element(By.ID, 'ipython-main-app')
    selenium.find_element(By.ID, 'notebook-container')
    selenium.find_element(By.CLASS_NAME, 'jupyter-widgets-view')
