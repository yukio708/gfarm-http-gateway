# ========= Build Stage =========
FROM ubuntu:24.04 AS builder

ENV DEBIAN_FRONTEND=noninteractive

# Set ARGs early
ARG OSSURL=https://github.com/oss-tsukuba
ARG PKG
ARG VER

# Install build dependencies
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

# Install scitokens-cpp
RUN git clone https://github.com/scitokens/scitokens-cpp.git \
    && mkdir /scitokens-cpp/build && cd /scitokens-cpp/build \
    && cmake -DCMAKE_INSTALL_PREFIX="/usr" .. \
    && make && make install

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

# ========= Runtime Stage =========
FROM ubuntu:24.04 AS runtime

ENV DEBIAN_FRONTEND=noninteractive

# Install runtime dependencies + Python + Node.js
RUN apt-get update && apt-get install -y \
    libcurl4 \
    libssl3 \
    libexpat1 \
    libgcc-s1 \
    libstdc++6 \
    ca-certificates \
    wget \
    git \
    curl \
    gnupg \
    python3 \
    python3-pip \
    sudo && \
    curl -fsSL https://deb.nodesource.com/setup_20.x | bash - && \
    apt-get install -y nodejs && \
    apt-get clean && rm -rf /var/lib/apt/lists/*

# # Optional: Install HPCI TLS certificate
# RUN mkdir -p /etc/pki/tls/certs/gfarm && \
#     cd /etc/pki/tls/certs/gfarm && \
#     wget https://www.hpci-office.jp/info/download/attachments/425328655/21d9c8b3.0

# Clone Gfarm HTTP Gateway (your webui branch)
WORKDIR /app
RUN git clone -b webui https://github.com/yukio708/gfarm-http-gateway.git

# Install Python requirements
WORKDIR /app/gfarm-http-gateway
RUN make setup

# Build React frontend
WORKDIR /app/gfarm-http-gateway/frontend/app/react-app
RUN npm install && npm run build

# Copy Gfarm client tools and libs
COPY --from=builder /usr/local/bin/gf* /usr/local/bin/
COPY --from=builder /usr/local/lib/libgf* /usr/local/lib/

# Set environment
ENV PATH="/usr/local/gfarm/bin:$PATH"
RUN ldconfig

# Entry script
COPY entrypoint.sh /usr/local/bin/entrypoint.sh
RUN chmod +x /usr/local/bin/entrypoint.sh
ENTRYPOINT ["/usr/local/bin/entrypoint.sh"]
