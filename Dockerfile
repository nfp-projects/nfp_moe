###########################
# Angular
###########################
FROM node:12-alpine as build

ENV HOME=/app

COPY package.json $HOME/
COPY app $HOME/app
COPY public $HOME/public

WORKDIR $HOME

RUN apk add --update --no-cache --virtual .build-deps gcc g++ make libc6-compat python git && \
  apk add vips-dev fftw-dev build-base --no-cache \
        --repository http://dl-3.alpinelinux.org/alpine/v3.10/community \
        --repository http://dl-3.alpinelinux.org/alpine/v3.10/main && \
    npm install && \
    apk del .build-deps gcc g++ make libc6-compat python && \
    apk del build-base && \
    npm run build

###########################
# Server
###########################
FROM node:12-alpine

ENV HOME=/app

COPY index.mjs package.json server.mjs $HOME/

WORKDIR $HOME

RUN apk add --update --no-cache --virtual .build-deps gcc g++ make libc6-compat python git && \
  apk add vips-dev fftw-dev build-base --no-cache \
        --repository http://dl-3.alpinelinux.org/alpine/v3.10/community \
        --repository http://dl-3.alpinelinux.org/alpine/v3.10/main && \
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
