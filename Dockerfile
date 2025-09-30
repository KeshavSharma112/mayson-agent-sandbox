# Stage 1: Build environment
FROM debian:bullseye AS builder

# Install build dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
    ca-certificates \
    curl \
    build-essential

# Setup and install modern Node.js and npm
RUN curl -fsSL https://deb.nodesource.com/setup_20.x | bash - \
    && apt-get install -y nodejs

WORKDIR /app

ENV PLAYWRIGHT_BROWSERS_PATH=0

# Install Node.js app dependencies
COPY package.json ./
RUN npm install

# Stage 2: Production environment
FROM debian:bullseye-slim

# Install runtime dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
    ca-certificates \
    curl \
    nginx \
    wget \
    chromium \
    xvfb \
    git \
    websockify \
    fluxbox \
    x11vnc \
    && curl -fsSL https://deb.nodesource.com/setup_20.x | bash - \
    && apt-get install -y nodejs

# Install noVNC
RUN wget -qO- https://github.com/novnc/noVNC/archive/v1.2.0.tar.gz | tar xz -C /usr/local/ && \
    ln -s /usr/local/noVNC-1.2.0/vnc.html /usr/local/noVNC-1.2.0/index.html

# Install code-server
RUN curl -fOL https://github.com/coder/code-server/releases/download/v4.9.1/code-server-4.9.1-linux-amd64.tar.gz && \
    tar -C /usr/local/lib -xzf code-server-4.9.1-linux-amd64.tar.gz && \
    ln -s /usr/local/lib/code-server-4.9.1-linux-amd64/bin/code-server /usr/local/bin/code-server

WORKDIR /app

ENV PLAYWRIGHT_BROWSERS_PATH=0

# Copy app files
COPY --from=builder /app .
COPY . .

# Nginx config
COPY nginx.conf /etc/nginx/nginx.conf

# Startup script
COPY start.sh /start.sh
RUN chmod +x /start.sh

EXPOSE 8001

CMD ["/start.sh"]
