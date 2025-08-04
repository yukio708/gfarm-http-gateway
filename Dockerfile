# ========= Build Stage =========
FROM debian:bookworm-slim AS builder

ENV DEBIAN_FRONTEND=noninteractive

# ==== Set ARGs for build-time config ====
ARG GFARM_REPO=https://github.com/oss-tsukuba/gfarm
ARG GFARM_VER=2.8.7

ARG SASL_XOAUTH2_REPO=https://github.com/oss-tsukuba/cyrus-sasl-xoauth2-idp
ARG SASL_XOAUTH2_VER=1.0.2

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
    && wget -O cyrus-sasl-xoauth2-idp.tar.gz ${SASL_XOAUTH2_REPO}/archive/${SASL_XOAUTH2_VER}.tar.gz \
    && tar xf cyrus-sasl-xoauth2-idp.tar.gz \
    && cd cyrus-sasl-xoauth2-idp-${SASL_XOAUTH2_VER} \
    && ./autogen.sh \
    && ./configure --libdir=$(pkg-config --variable=libdir libsasl2) \
    && make && make install

# ==== Build Gfarm ====
RUN cd /tmp \
    && wget -O gfarm.tar.gz ${GFARM_REPO}/archive/${GFARM_VER}.tar.gz \
    && tar xf gfarm.tar.gz \
    && cd gfarm-${GFARM_VER} \
    && ./configure --enable-xmlattr --enable-cyrus-sasl \
    && make && make install


# ========= Runtime Stage =========
FROM debian:bookworm-slim AS runtime

ENV DEBIAN_FRONTEND=noninteractive

# ==== Install runtime dependencies ====
RUN apt-get update && apt-get install -y \
    libcurl4 libssl3 libexpat1 libgcc-s1 libstdc++6 libuuid1 \
    libsasl2-2 libsasl2-modules libsasl2-modules-db sasl2-bin \
    ca-certificates \
    curl python3 python3-pip \
    sudo make && \
    curl -fsSL https://deb.nodesource.com/setup_20.x | bash - && \
    apt-get install -y nodejs && \
    apt-get clean && rm -rf /var/lib/apt/lists/*

# ==== Copy Gfarm client binaries and libraries ====
COPY --from=builder /usr/local/bin/gf* /usr/local/bin/
COPY --from=builder /usr/local/lib/libgf* /usr/local/lib/
RUN mkdir -p /usr/lib/x86_64-linux-gnu/sasl2
COPY --from=builder /usr/lib/x86_64-linux-gnu/libSciTokens* /usr/lib/x86_64-linux-gnu/
COPY --from=builder /usr/lib/x86_64-linux-gnu/sasl2/ /usr/lib/x86_64-linux-gnu/sasl2/
RUN ldconfig

# ==== Copy gfarm-http-gateway ====
COPY . /app/gfarm-http-gateway

# ==== Build ====
WORKDIR /app/gfarm-http-gateway
RUN make setup

COPY entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh
ENTRYPOINT ["/entrypoint.sh"]