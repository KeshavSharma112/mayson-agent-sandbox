#!/bin/bash

# Start Node.js server
/usr/bin/node /app/server.js &

# Start noVNC
/usr/local/noVNC-1.2.0/utils/launch.sh --listen 8081 --vnc localhost:5900 &

# Start code-server
code-server --bind-addr 127.0.0.1:8082 --auth none /app/workspace &

# Start X server and applications
export DISPLAY=:0
Xvfb :0 -screen 0 1024x768x16 &
sleep 5
dbus-launch --exit-with-session fluxbox &
sleep 1
chromium --no-sandbox --disable-gpu --disable-dev-shm-usage &
sleep 5
x11vnc -display :0 -forever -nopw &

sleep 5

# Start Nginx
nginx -g "daemon off;"
