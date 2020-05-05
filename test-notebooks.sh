#!/bin/bash -l
python -m jupyter --version
python -m jupyter nbconvert --to html --execute ${@}
