# ========= Build Stage =========
FROM ubuntu:24.04 AS builder

ENV DEBIAN_FRONTEND=noninteractive

# ==== Set ARGs for build-time config ====
ARG GFARM_REPO=https://github.com/oss-tsukuba/gfarm
ARG GFARM_VER=2.8.7

ARG SASL_REPO=https://github.com/oss-tsukuba/cyrus-sasl-xoauth2-idp
ARG SASL_VER=1.0.2

# ==== Install build dependencies ====
RUN apt-get update && apt-get install -y \
    build-essential \
    autoconf automake libtool pkg-config \
    libssl-dev libpq-dev libsasl2-dev sasl2-bin \
    libcurl4-openssl-dev \
    libexpat1-dev \
    uuid-dev libsqlite3-dev \
    git cmake g++ \
    ca-certificates \
    wget \
    python3 python3-docopt python3-schema \
    ruby golang jq

# ==== Build scitokens-cpp ====
RUN git clone https://github.com/scitokens/scitokens-cpp.git \
    && mkdir /scitokens-cpp/build && cd /scitokens-cpp/build \
    && cmake -DCMAKE_INSTALL_PREFIX="/usr" .. \
    && make && make install

# ==== Build cyrus-sasl-xoauth2-idp ====
RUN cd /tmp \
    && wget --content-disposition ${SASL_REPO}/archive/${SASL_VER}.tar.gz \
    && tar xf ${SASL_VER}.tar.gz \
    && cd cyrus-sasl-xoauth2-idp-${SASL_VER} \
    && ./autogen.sh \
    && ./configure --libdir=$(pkg-config --variable=libdir libsasl2) \
    && make && make install

# ==== Build Gfarm ====
RUN cd /tmp \
    && wget --content-disposition ${GFARM_REPO}/archive/${GFARM_VER}.tar.gz \
    && tar xf ${GFARM_VER}.tar.gz \
    && cd gfarm-${GFARM_VER} \
    && ./configure --enable-xmlattr --enable-cyrus-sasl \
    && make && make install


# ========= Runtime Stage =========
FROM debian:bookworm-slim AS runtime

ENV DEBIAN_FRONTEND=noninteractive

# ==== Install runtime dependencies ====
RUN apt-get update && apt-get install -y \
    libcurl4 libssl3 libexpat1 libgcc-s1 libstdc++6 \
    ca-certificates \
    wget git curl gnupg \
    python3 python3-pip \
    sudo make && \
    curl -fsSL https://deb.nodesource.com/setup_20.x | bash - && \
    apt-get install -y nodejs && \
    apt-get clean && rm -rf /var/lib/apt/lists/*

# ==== Copy Gfarm client binaries and libraries ====
COPY --from=builder /usr/local/bin/gf* /usr/local/bin/
COPY --from=builder /usr/local/lib/libgf*.so* /usr/local/lib/
RUN ldconfig

# ==== Copy gfarm-http-gateway ====
COPY . /app/gfarm-http-gateway

# ==== Build ====
WORKDIR /app/gfarm-http-gateway
RUN make setup
WORKDIR /app/gfarm-http-gateway/frontend/app/react-app
RUN npm install && npm run build

COPY entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh
ENTRYPOINT ["/entrypoint.sh"]