set -e

chown root:root ${GLOBUSDIR}/usercert.pem
chown root:root ${GLOBUSDIR}/userkey.pem
grid-proxy-init -q

bin/gfarm-http.sh --port 8000 --log-level debug --proxy-headers