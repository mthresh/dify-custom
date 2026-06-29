#!/bin/bash

HTTPS_CONFIG=''
DOLLAR='$'
export DOLLAR

if [ "${NGINX_HTTPS_ENABLED}" = "true" ]; then
    # Check if the certificate and key files for the specified domain exist
    if [ -n "${CERTBOT_DOMAIN}" ] && \
       [ -f "/etc/letsencrypt/live/${CERTBOT_DOMAIN}/${NGINX_SSL_CERT_FILENAME}" ] && \
       [ -f "/etc/letsencrypt/live/${CERTBOT_DOMAIN}/${NGINX_SSL_CERT_KEY_FILENAME}" ]; then
        SSL_CERTIFICATE_PATH="/etc/letsencrypt/live/${CERTBOT_DOMAIN}/${NGINX_SSL_CERT_FILENAME}"
        SSL_CERTIFICATE_KEY_PATH="/etc/letsencrypt/live/${CERTBOT_DOMAIN}/${NGINX_SSL_CERT_KEY_FILENAME}"
    else
        SSL_CERTIFICATE_PATH="/etc/ssl/${NGINX_SSL_CERT_FILENAME}"
        SSL_CERTIFICATE_KEY_PATH="/etc/ssl/${NGINX_SSL_CERT_KEY_FILENAME}"
    fi
    export SSL_CERTIFICATE_PATH
    export SSL_CERTIFICATE_KEY_PATH

    # set the HTTPS_CONFIG environment variable to the content of the https.conf.template
    HTTPS_CONFIG=$(envsubst < /etc/nginx/https.conf.template)
    export HTTPS_CONFIG
    # Substitute the HTTPS_CONFIG in the default.conf.template with content from https.conf.template
    envsubst '${HTTPS_CONFIG}' < /etc/nginx/conf.d/default.conf.template > /etc/nginx/conf.d/default.conf
fi
export HTTPS_CONFIG

NGINX_WEB_BASE_PATH_LOCATION=''
if [ -n "${NGINX_WEB_BASE_PATH}" ] && [ "${NGINX_WEB_BASE_PATH}" != "/" ]; then
    case "${NGINX_WEB_BASE_PATH}" in
        /*) ;;
        *) NGINX_WEB_BASE_PATH="/${NGINX_WEB_BASE_PATH}" ;;
    esac
    NGINX_WEB_BASE_PATH="${NGINX_WEB_BASE_PATH%/}"
    NGINX_WEB_BASE_PATH_LOCATION="location = ${NGINX_WEB_BASE_PATH} {
      proxy_pass http://web:3000;
      include proxy.conf;
    }

    location ${NGINX_WEB_BASE_PATH}/socket.io/ {
      resolver 127.0.0.11 valid=30s ipv6=off;
      set \$socket_io_upstream ${NGINX_SOCKET_IO_UPSTREAM};
      rewrite ^${NGINX_WEB_BASE_PATH}/(.*)$ /\$1 break;
      proxy_pass http://\$socket_io_upstream;
      include proxy.conf;
      proxy_set_header Upgrade \$http_upgrade;
      proxy_set_header Connection \"upgrade\";
      proxy_cache_bypass \$http_upgrade;
    }

    location ${NGINX_WEB_BASE_PATH}/ {
      proxy_pass http://web:3000;
      include proxy.conf;
    }"
fi
export NGINX_WEB_BASE_PATH
export NGINX_WEB_BASE_PATH_LOCATION

if [ "${NGINX_ENABLE_CERTBOT_CHALLENGE}" = "true" ]; then
    ACME_CHALLENGE_LOCATION='location /.well-known/acme-challenge/ { root /var/www/html; }'
else
    ACME_CHALLENGE_LOCATION=''
fi
export ACME_CHALLENGE_LOCATION

env_vars=$(printenv | cut -d= -f1 | sed 's/^/$/g' | paste -sd, -)

envsubst "$env_vars" < /etc/nginx/nginx.conf.template > /etc/nginx/nginx.conf
envsubst "$env_vars" < /etc/nginx/proxy.conf.template > /etc/nginx/proxy.conf

envsubst "$env_vars" < /etc/nginx/conf.d/default.conf.template > /etc/nginx/conf.d/default.conf

# Start Nginx using the default entrypoint
exec nginx -g 'daemon off;'
