.PHONY: help doctor quick status health verify build smoke release backup latest \ dev-cycle release-cycle
	report snapshot maintain daily nightly menu shortcuts inventory env \
	root-check sanity check logs app-shell db-shell db-status db-tables \
	up down restart clean archive all update latest-artifacts \
	morning evening start doctor-full report-now dbbackup dbrestore \
	dbs dbt release-check helpme snapshot-now cleanall maintain-all \
	root-sanity

help:
	./start-here

doctor:
	./doctor

quick:
	./quick

status:
	./status

health:
	./health

verify:
	./verify

build:
	./build

smoke:
	./smoke

release:
	./release

release-check:
	./release

backup:
	./backup

dbbackup:
	./dbbackup

dbrestore:
	./dbrestore

latest:
	./latest

latest-artifacts:
	./artifacts

report:
	./report

report-now:
	./report-now

snapshot:
	./snapshot

snapshot-now:
	./snapshot-now

maintain:
	./maintain

maintain-all:
	./maintain

daily:
	./daily

nightly:
	./nightly

morning:
	./morning

evening:
	./evening

menu:
	./menu --list

shortcuts:
	./shortcuts

inventory:
	./inventory

env:
	./env

root-check:
	./root-check

root-sanity:
	./sanity

sanity:
	./sanity

check:
	./check

logs:
	./logs

app-shell:
	./shell

db-shell:
	./db

db-status:
	./dbs

db-tables:
	./dbt

dbs:
	./dbs

dbt:
	./dbt

up:
	./up

down:
	./down

restart:
	./restart

clean:
	./cleanall 5

cleanall:
	./cleanall 5

archive:
	./archive

update:
	./update

start:
	./start-here

doctor-full:
	./doctor-full

helpme:
	./helpme

all:
	./all-in-one


dev-cycle:
	./dev-cycle


release-cycle:
	./release-cycle
