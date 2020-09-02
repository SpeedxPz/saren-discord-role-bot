FROM node:12.18.2-alpine3.12 as builder

RUN apk add --no-cache --virtual bash git
WORKDIR /usr/src/app
COPY package*.json ./
RUN npm install --no-cache

COPY . .
RUN npm run build

RUN npm prune --production

FROM node:12.18.2-alpine3.12
WORKDIR /usr/src/app
COPY --from=builder /usr/src/app/node_modules /usr/src/app/node_modules
COPY --from=builder /usr/src/app/build /usr/src/app/build

CMD [ "node", "./build/index.js" ]