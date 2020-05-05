FROM aiidalab/aiidalab-docker-stack:latest

COPY entrypoint.sh /entrypoint.sh
COPY test-notebooks.sh /test-notebooks.sh

ENTRYPOINT [ "/entrypoint.sh"]
