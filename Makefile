test-flake8: flake8 test

test:
	./bin/gfarm-http-test.sh

test-verbose test-v:
	./bin/gfarm-http-test.sh -v

test-gfhttpc:
	./bin/gfhttpc-test.sh /tmp

test-all: test-flake8 test-gfhttpc

flake8:
	./venv/bin/flake8 api

setup setup-freezed:
	./setup.sh

setup-wo-packages:
	INSTALL_PACKAGES=0 ./setup.sh

setup-latest:
	./setup.sh requirements_dev.txt

setup-latest-wo-packages:
	INSTALL_PACKAGES=0 ./setup.sh requirements_dev.txt

freeze:
	./venv/bin/pip3 freeze > requirements.txt
