###########################
# Angular
###########################
FROM node:alpine as build

ENV HOME=/app

COPY package.json $HOME/
COPY app $HOME/app
COPY public $HOME/public

WORKDIR $HOME

RUN apk add --update --no-cache --virtual .build-deps gcc g++ make libc6-compat python && \
  apk add build-base --no-cache \
        --repository https://alpine.global.ssl.fastly.net/alpine/edge/main \
        --repository https://alpine.global.ssl.fastly.net/alpine/edge/testing \
        --repository https://alpine.global.ssl.fastly.net/alpine/edge/community && \
    npm install && \
    apk del .build-deps gcc g++ make libc6-compat python && \
    apk del build-base && \
    npm run build

###########################
# Server
###########################
FROM node:alpine

ENV HOME=/app

COPY index.mjs package.json server.mjs $HOME/

WORKDIR $HOME

RUN apk add --update --no-cache --virtual .build-deps gcc g++ make libc6-compat python && \
  apk add vips-dev fftw-dev build-base --no-cache \
        --repository https://alpine.global.ssl.fastly.net/alpine/edge/main \
        --repository https://alpine.global.ssl.fastly.net/alpine/edge/testing \
        --repository https://alpine.global.ssl.fastly.net/alpine/edge/community && \
    npm install --production && \
    rm -Rf $HOME/.npm $HOME/.npm $HOME/.config && \
    apk del .build-deps gcc g++ make libc6-compat python && \
    apk del build-base

COPY api $HOME/api
COPY migrations $HOME/migrations
COPY config $HOME/config
COPY --from=build /app/public $HOME/public

EXPOSE 4030

CMD ["npm", "start"]
