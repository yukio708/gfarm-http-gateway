test-flake8: flake8 test

test:
	./bin/gfarm-http-test.sh

flake8:
	flake8 api
