test-flake8: flake8 test

test:
	./bin/gfarm-http-test.sh

test-verbose test-v:
	./bin/gfarm-http-test.sh -v

flake8:
	flake8 api
