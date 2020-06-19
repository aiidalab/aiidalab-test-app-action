import os

import pytest


AIIDALAB_HOST = os.environ.get('AIIDALAB_HOST', 'localhost')
AIIDALAB_PORT = os.environ.get('AIIDALAB_PORT', '8888')
JUPYTER_TOKEN = os.environ.get('JUPYTER_TOKEN', '')


@pytest.fixture
def selenium(selenium):
    selenium.implicitly_wait(10)
    selenium.maximize_window()
    return selenium


@pytest.fixture
def url():
    def url_(path=''):
        return f'http://{AIIDALAB_HOST}:{AIIDALAB_PORT}/{path}?token={JUPYTER_TOKEN}'

    return url_
