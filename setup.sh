#!/bin/bash
set -eu
set -x

source /etc/os-release

DIR=$(realpath $(dirname $0))
VENV_DIR="${DIR}/venv"
PIP="${VENV_DIR}/bin/pip3"

PYTHON=python3

SUDO() {
    sudo "$@"
}

APTGET() {
    SUDO apt-get "$@"
}

YUM() {
    SUDO yum "$@"
}

install_packages_for_debian() {
    # for Ubuntu 24.04
    APTGET install -y python3-minimal python3-pip python3-venv
    APTGET install -y nodejs
}

install_packages_for_rhel() {
    # for RHEL8 family
    YUM install -y python3.11 python3.11-pip
    # YUM module info nodejs
    YUM module reset -y nodejs
    YUM module install -y nodejs:18
}

install_python_package() {
    #rm -rf "$VENV_DIR"
    $PYTHON -m venv "$VENV_DIR"

    # TODO $PIP install -r requirements.txt
    $PIP install fastapi
    #$PIP install starlette
    $PIP install itsdangerous
    $PIP install authlib
    $PIP install httpx
    $PIP install Jinja2
    #$PIP install python-jose
    $PIP install uvicorn
    $PIP install gunicorn
}

install_for_debian() {
    install_packages_for_debian
    install_python_package
}

install_for_rhel() {
    install_packages_for_rhel
    install_python_package
}

# main
for id in $ID_LIKE; do  # ID_LIKE from /etc/os-release
    case $id in
        debian)
            install_for_debian
            break
            ;;
        rhel)
            PYTHON=python3.11
            install_for_rhel
            break
            ;;
    esac
done
