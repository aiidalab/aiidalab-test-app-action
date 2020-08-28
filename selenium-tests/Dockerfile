FROM python:3.8

RUN apt-get -q update && apt-get -qy install netcat

COPY wait-for /usr/bin/

RUN pip install selenium==3.141.0 pytest==5.4.3 pytest-selenium==1.17.0

WORKDIR selenium-tests

COPY entrypoint.sh test* ./

ENV AIIDALAB_HOST=aiidalab AIIDALAB_PORT=8888 SELENIUM_HOST=seleniumhub SELENIUM_PORT=4444

ENV APP_NOTEBOOKS='**/[!.]*.ipynb'

ENTRYPOINT [ "./entrypoint.sh" ]
