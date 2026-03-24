.PHONY: help doctor quick status health verify build smoke release backup latest report snapshot maintain daily nightly menu shortcuts inventory env root-check sanity check logs app-shell db-shell db-status db-tables up down restart clean archive all

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

backup:
	./backup

latest:
	./latest

report:
	./report-now

snapshot:
	./snapshot

maintain:
	./maintain

daily:
	./daily

nightly:
	./nightly

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

up:
	./up

down:
	./down

restart:
	./restart

clean:
	./cleanall 5

archive:
	./archive

all:
	./all-in-one
