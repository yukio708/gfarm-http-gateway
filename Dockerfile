### Builder
FROM ubuntu:24.04 AS builder

ARG DEBIAN_FRONTEND=noninteractive

RUN apt update && apt install -y \
    git cmake g++ \
    libcurl4-openssl-dev \
    uuid-dev libsqlite3-dev \
    pkg-config libssl-dev

RUN git clone https://github.com/scitokens/scitokens-cpp.git \
 && mkdir /scitokens-cpp/build && cd /scitokens-cpp/build \
 && cmake -DCMAKE_INSTALL_PREFIX="/scitokens-install" .. \
 && make && make install


### Final Image
FROM ubuntu:24.04

ARG DEBIAN_FRONTEND=noninteractive
ARG OSSURL=https://github.com/oss-tsukuba

# Install runtime dependencies
RUN apt update && apt install -y \
    git wget make \
    libssl-dev libpq-dev libsasl2-dev sasl2-bin \
    libglobus-gssapi-gsi-dev pkg-config libibverbs-dev \
    postgresql postgresql-client \
    fuse libfuse-dev libacl1-dev \
    python3 python3-docopt python3-schema \
    ruby golang jq \
    globus-gsi-cert-utils-progs myproxy \
    sudo

# Copy scitokens-cpp from builder stage
COPY --from=builder /scitokens-install /usr

# Install cyrus-sasl-xoauth2-idp
ARG PKG=cyrus-sasl-xoauth2-idp
ARG VER=1.0.2
RUN cd \
 && wget --content-disposition $OSSURL/$PKG/archive/$VER.tar.gz \
 && tar pxf $PKG-$VER.tar.gz \
 && cd $PKG-$VER \
 && ./autogen.sh \
 && ./configure --libdir=$(pkg-config --variable=libdir libsasl2) \
 && make && make install

# Install Gfarm
ARG PKG=gfarm
ARG VER=2.8.7
RUN cd \
 && wget --content-disposition $OSSURL/$PKG/archive/$VER.tar.gz \
 && tar pxf $PKG-$VER.tar.gz \
 && cd $PKG-$VER \
 && ./configure --enable-xmlattr --enable-cyrus-sasl \
 && make && make install

# Install gfarm-http-gateway
WORKDIR /app
ARG GFHGPATH
COPY $GFHGPATH /app
RUN make setup

COPY entrypoint.sh /app/entrypoint.sh
RUN chmod +x /app/entrypoint.sh

ENTRYPOINT ["/bin/sh", "/app/entrypoint.sh"]