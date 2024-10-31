#!/bin/bash
set -eu
set -x

SUDO() {
    sudo "$@"
}

YUM() {
    SUDO yum "$@"
}

PIP() {
    SUDO pip3 "$@"
}

install_nodejs_for_rhel() {
    # YUM module info nodejs
    YUM module reset -y nodejs
    YUM module install -y nodejs:18
}

install_python_package() {
    PIP install fastapi
    PIP install uvicorn
}

install_for_rhel() {
    install_nodejs_for_rhel
    install_python_package
}

install_for_rhel
