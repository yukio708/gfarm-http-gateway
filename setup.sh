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

DNF() {
    SUDO dnf "$@"
}

install_packages_for_debian() {
    # for Ubuntu 24.04
    APTGET update
    APTGET install -y python3-minimal python3-pip python3-venv
}

install_packages_for_rhel() {
    # for RHEL8 or RHEL9 family
    DNF install -y python3.11 python3.11-pip
}

install_python_package() {
    #rm -rf "$VENV_DIR"
    $PYTHON -m venv "$VENV_DIR"

    $PIP install -r requirements.txt
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
