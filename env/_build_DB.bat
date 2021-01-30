@echo off

echo clean running database container

docker stop spreaderixdb-instance >NUL 2>NUL
docker rm   spreaderixdb-instance >NUL 2>NUL

echo creating the database container
rem https://hub.docker.com/_/postgres
rem https://github.com/docker-library/postgres

docker run --rm -ti --privileged --name spreaderixdb-instance -e POSTGRES_USER=spreaderix -e POSTGRES_PASSWORD=tqsfbefsjy -p 54320:5432 postgres:latest
