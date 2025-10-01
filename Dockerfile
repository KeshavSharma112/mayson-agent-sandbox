# Stage 1: Backend Build environment
FROM node:20-bookworm AS backend-builder

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
FROM node:20-bookworm AS frontend-builder

WORKDIR /app

COPY frontend/package.json frontend/vite.config.js ./
RUN npm install

COPY frontend ./
RUN npm run build

# Stage 2: Production environment
FROM debian:bookworm-slim

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
    dbus-x11 \
    python3 \
    python3-pip \
    jq \
    unzip \
    ripgrep \
    && rm -rf /var/lib/apt/lists/*

# Install uv - a fast Python package installer
RUN curl -LsSf https://astral.sh/uv/install.sh | sh && \
    ln -s /root/.cargo/bin/uv /usr/local/bin/uv

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

# Install GitHub CLI
RUN curl -fsSL https://cli.github.com/packages/githubcli-archive-keyring.gpg | dd of=/usr/share/keyrings/githubcli-archive-keyring.gpg \
    && chmod go+r /usr/share/keyrings/githubcli-archive-keyring.gpg \
    && echo "deb [arch=$(dpkg --print-architecture) signed-by=/usr/share/keyrings/githubcli-archive-keyring.gpg] https://cli.github.com/packages stable main" > /etc/apt/sources.list.d/github-cli.list \
    && apt-get update \
    && apt-get install gh -y

# Disable the integrated terminal in VS Code
RUN mkdir -p /root/.local/share/code-server/User && \
    echo '{ "workbench.panel.defaultLocation": "right", "terminal.integrated.showOnStartup": "never", "workbench.action.terminal.toggleTerminal": "workbench.action.doNothing" }' > /root/.local/share/code-server/User/settings.json


WORKDIR /app

ENV PLAYWRIGHT_BROWSERS_PATH=0

# Copy dependency info and rebuild. This layer is cached until package.json changes.
COPY --from=backend-builder /app/package*.json ./
COPY --from=backend-builder /app/node_modules ./node_modules/
RUN apt-get update && apt-get install -y --no-install-recommends build-essential && \
    npm rebuild && \
    apt-get purge -y --auto-remove build-essential && \
    rm -rf /var/lib/apt/lists/*

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
