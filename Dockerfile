FROM ubuntu:24.04

ARG DEBIAN_FRONTEND=noninteractive

# to get Gfarm
RUN apt update && apt install -y git wget

# for Gfarm
RUN apt install -y \
 libssl-dev \
 libpq-dev \
 libsasl2-dev \
 sasl2-bin \
 libglobus-gssapi-gsi-dev \
 pkg-config \
 libibverbs-dev \
 postgresql \
 postgresql-client \
 fuse \
 libfuse-dev \
 libacl1-dev \
 python3 \
 python3-docopt \
 python3-schema \
 ruby \
 golang \
 jq

# to build gfarm
RUN apt install -y make

# for GSI environment
RUN apt install -y \
 globus-gsi-cert-utils-progs \
 myproxy

# for scitokens-cpp
RUN apt install -y \
	g++ \
	cmake \
	libcurl4-openssl-dev \
	uuid-dev \
	libsqlite3-dev

# install scitokens-cpp
RUN git clone https://github.com/scitokens/scitokens-cpp.git &&\
 mkdir /scitokens-cpp/build && cd /scitokens-cpp/build &&\
 cmake -DCMAKE_INSTALL_PREFIX="/usr" .. &&\
 make &&\
 make install

ARG OSSURL=https://github.com/oss-tsukuba

# install cyrus-sasl-xoauth2-idp
ARG PKG=cyrus-sasl-xoauth2-idp
ARG VER=1.0.2

RUN cd \
 && wget --content-disposition $OSSURL/$PKG/archive/$VER.tar.gz \
 && tar pxf $PKG-$VER.tar.gz \
 && cd $PKG-$VER \
 && ./autogen.sh \
 && ./configure --libdir=$(pkg-config --variable=libdir libsasl2) \
 && make \
 && make install

# install gfarm
ARG PKG=gfarm
ARG VER=2.8.7

RUN cd \
 && wget --content-disposition $OSSURL/$PKG/archive/$VER.tar.gz \
 && tar pxf $PKG-$VER.tar.gz \
 && cd $PKG-$VER \
 && mkdir -p /app/conf \
 && ./configure --sysconfdir=/app/conf --enable-xmlattr --enable-cyrus-sasl \
 && make \
 && make install

# install gfarm-http-gateway
WORKDIR /app

ARG GFHGPATH
COPY $GFHGPATH /app

RUN apt install -y sudo &&\
 make setup

COPY entrypoint.sh /app/entrypoint.sh
RUN chmod +x /app/entrypoint.sh

ENTRYPOINT ["/bin/sh", "/app/entrypoint.sh"]
