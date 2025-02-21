test-flake8: flake8 test

test:
	./bin/gfarm-http-test.sh

test-verbose test-v:
	./bin/gfarm-http-test.sh -v

flake8:
	./venv/bin/flake8 api

setup:
	./setup.sh
