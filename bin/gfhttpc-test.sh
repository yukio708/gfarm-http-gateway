#!/bin/bash
set -eu
parent=$(realpath $(dirname "$0"))
source "${parent}/gfhttpc-common"

help() {
    echo "Usage: $0 [options] Gfarm-existing-dir"
    common_help
}

url_base=$(get_url_base)
common_getopt "" "" "" "$@"
shift $((optind - 1))
if [ $# -ne 1 ]; then
    help
    exit 1
fi

# not use "opts" generated from common_getopt
opts=()
if [ $opt_insecure -eq 1 ]; then
    opts+=("-k")
fi
if [ $opt_verbose -eq 1 ]; then
    opts+=("-v")
fi

testname() {
    echo -n "${FUNCNAME[1]} ... "
}

PASS() {
    echo "PASS"
}

gf_test_base_dir=$(echo $1 | urlpathencode)
testdir="${gf_test_base_dir}/gfhttpc-test"
testfile="${testdir}/testfile.txt"

_whoami() {
    if [ $opt_verbose -eq 1 ]; then
        ${parent}/gfhttpc-whoami "${opts[@]}"
    else
        ${parent}/gfhttpc-whoami "${opts[@]}" > /dev/null
    fi
}

_ls=${parent}/gfhttpc-ls
_mkdir=${parent}/gfhttpc-mkdir
_rmdir=${parent}/gfhttpc-rmdir
_ul=${parent}/gfhttpc-upload
_dl=${parent}/gfhttpc-download
_rm=${parent}/gfhttpc-rm
_mv=${parent}/gfhttpc-mv
_stat=${parent}/gfhttpc-stat
_chmod=${parent}/gfhttpc-chmod

test_whoami() {
    set -eu
    testname
    _whoami
    PASS
}

test_mkdir() {
    set -eu
    testname
    $_mkdir "$testdir" > /dev/null
    PASS
}

test_rmdir() {
    set -eu
    testname
    $_rmdir "$testdir" > /dev/null
    PASS
}

test_ls() {
    set -eu
    testname
    $_ls "$testdir" > /dev/null
    PASS
}

test_ls_a() {
    set -eu
    testname
    $_ls -a "$testdir" > /dev/null
    PASS
}

test_ls_e() {
    set -eu
    testname
    $_ls -e "$testdir" > /dev/null
    PASS
}

test_ls_l() {
    set -eu
    testname
    $_ls -l "$testdir" > /dev/null
    PASS
}

test_ls_R() {
    set -eu
    testname
    $_ls -R "$testdir" > /dev/null
    PASS
}

test_upload_download() {
    set -eu
    testname
    data1=$(date)
    echo "$data1" | $_ul - "$testfile"
    data2=$($_dl "$testfile" -)
    [ "$data1" = "$data2" ]
    PASS
}

test_chmod_stat() {
    set -eu
    testname
    mode1=0751
    $_chmod $mode1 "$testfile"
    mode2=$($_stat "$testfile" | jq -r .Mode)
    [ "$mode1" = "$mode2" ]
    mode3=1700
    $_chmod $mode3 "$testdir"
    mode4=$($_stat "$testdir" | jq -r .Mode)
    [ "$mode3" = "$mode4" ]
    PASS
}

test_rm() {
    set -eu
    testname
    $_rm "$testfile"
    PASS
}

clean() {
    if [ $? -ne 0 ]; then
        echo NG
    fi
    $_rm "$testfile" > /dev/null 2>&1 || :
    $_rmdir "$testdir" > /dev/null 2>&1 || :
}

trap clean EXIT

test_whoami
test_mkdir
test_ls
test_ls_a
test_ls_e
test_ls_l
test_ls_R
test_upload_download
test_chmod_stat
test_rm
test_rmdir
