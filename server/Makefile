test-flake8: flake8 test

test:
	./bin/gfarm-http-gateway-test.sh

test-verbose test-v:
	./bin/gfarm-http-gateway-test.sh -v
	
test-gfarm-http:
	../client/test/gfarm-http-test.sh /tmp

test-all: test-flake8 test-gfarm-http

flake8:
	./venv/bin/flake8 api

setup setup-freezed:
	INSTALL_SYS_PACKAGES=0 ./setup.sh

setup-with-sys-packages:
	INSTALL_SYS_PACKAGES=1 ./setup.sh

setup-latest:
	INSTALL_SYS_PACKAGES=0 ./setup.sh requirements_dev.txt

setup-latest-with-sys-packages:
	INSTALL_SYS_PACKAGES=1 ./setup.sh requirements_dev.txt

freeze:
	./venv/bin/pip3 freeze > requirements.txt

clear-venv:
	rm -rf ./venv
