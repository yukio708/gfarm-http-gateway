GFARM_HTTP      ?= gfarm-http
CMD_DIR         ?= ./cmd/gfarm-http

JWT_CURL        ?= jwt-curl
JWT_CURL_UPLOAD ?= jwt-curl-upload

TEST_SCRIPT     ?= ./test/gfarm-http-test.sh

PREFIX  ?= /usr/local
BINDIR  ?= $(PREFIX)/bin
DESTDIR ?=

INSTALL          ?= install
INSTALL_PROGRAM  ?= $(INSTALL) -m 0755

.PHONY: all build clean install uninstall test

all: build

build:
	go build -o $(GFARM_HTTP) $(CMD_DIR)

install:
	$(INSTALL) -d $(DESTDIR)$(BINDIR)
	$(INSTALL_PROGRAM) $(GFARM_HTTP)      $(DESTDIR)$(BINDIR)/$(GFARM_HTTP)
	$(INSTALL_PROGRAM) $(JWT_CURL)        $(DESTDIR)$(BINDIR)/$(JWT_CURL)
	$(INSTALL_PROGRAM) $(JWT_CURL_UPLOAD) $(DESTDIR)$(BINDIR)/$(JWT_CURL_UPLOAD)

uninstall:
	rm -f $(DESTDIR)$(BINDIR)/$(GFARM_HTTP)
	rm -f $(DESTDIR)$(BINDIR)/$(JWT_CURL)
	rm -f $(DESTDIR)$(BINDIR)/$(JWT_CURL_UPLOAD)

clean:
	rm -f $(GFARM_HTTP)

test: build
	$(TEST_SCRIPT) /tmp
