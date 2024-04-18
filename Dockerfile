FROM node:20-alpine as build

WORKDIR /app

COPY package*.json ./

RUN npm ci

COPY . .

RUN npm run build

FROM node:20.0-alpine as runtime

WORKDIR /app

COPY package*.json ./

RUN npm ci --omit=dev

COPY --from=build /app/build/* /app/

ENTRYPOINT [ "node", "index.js" ]
