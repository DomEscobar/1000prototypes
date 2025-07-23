#!/bin/sh

# Use Railway's PORT environment variable, default to 80 if not set
PORT=${PORT:-80}

# Update nginx config to use the correct port
sed -i "s/listen 80/listen $PORT/g" /etc/nginx/nginx.conf

# Start nginx
nginx -g "daemon off;" 