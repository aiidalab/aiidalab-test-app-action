import os
from urllib.parse import urlsplit, urlunsplit, parse_qs, urlencode

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
    def url_(url=''):
        parsed_url = urlsplit(url)
        query_string = parse_qs(parsed_url.query)
        query_string.setdefault("token", JUPYTER_TOKEN)
        return urlunsplit(parsed_url._replace(
            scheme='http',
            netloc=f"{AIIDALAB_HOST}:{AIIDALAB_PORT}",
            query=urlencode(query_string, doseq=True)
            ))

    return url_
