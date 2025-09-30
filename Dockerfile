# Stage 1: Backend Build environment
FROM node:20-bullseye AS backend-builder

RUN apt-get update && apt-get install -y --no-install-recommends \
    ca-certificates \
    curl \
    build-essential \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

ENV PLAYWRIGHT_BROWSERS_PATH=0

# Install Node.js app dependencies
COPY package.json ./
RUN npm install

# Stage 2: Frontend Build environment
FROM node:20-bullseye AS frontend-builder

WORKDIR /app

COPY frontend/package.json frontend/vite.config.js ./
RUN npm install

COPY frontend ./
RUN npm run build

# Stage 2: Production environment
FROM debian:bullseye-slim

# Isolate package installation to its own layer for maximum caching
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
    tightvncserver \
    procps \
    build-essential \
    dbus-x11 \
    && rm -rf /var/lib/apt/lists/*

# Install Node.js in its own layer
RUN curl -fsSL https://deb.nodesource.com/setup_20.x | bash - \
    && apt-get update \
    && apt-get install -y nodejs \
    && rm -rf /var/lib/apt/lists/*

# Create VNC directory
RUN mkdir -p /root/.vnc

# Install noVNC
RUN wget -qO- https://github.com/novnc/noVNC/archive/v1.2.0.tar.gz | tar xz -C /usr/local/ && \
    ln -s /usr/local/noVNC-1.2.0/vnc.html /usr/local/noVNC-1.2.0/index.html

# Install code-server
RUN curl -fsSL https://code-server.dev/install.sh | sh -s -- --version 4.9.1

WORKDIR /app

ENV PLAYWRIGHT_BROWSERS_PATH=0

# Copy dependency info and rebuild. This layer is cached until package.json changes.
COPY --from=backend-builder /app/package*.json ./
COPY --from=backend-builder /app/node_modules ./node_modules/
RUN npm rebuild

# Copy the rest of the application files.
COPY server.js .
COPY start.sh .

# Copy the built frontend assets
COPY --from=frontend-builder /app/dist /app/public

# Nginx config
COPY nginx.conf /etc/nginx/nginx.conf

# Startup script
COPY start.sh /start.sh
RUN chmod +x /start.sh

EXPOSE 8001

CMD ["/start.sh"]
