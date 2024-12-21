FROM node:20-alpine AS development-dependencies-env
WORKDIR /app
COPY package.json pnpm-lock.yaml ./
RUN npm install -g pnpm && pnpm install

FROM node:20-alpine AS build-env
WORKDIR /app
COPY . .
COPY --from=development-dependencies-env /app/node_modules /app/node_modules
RUN npm install -g pnpm && pnpm run build

FROM node:20-alpine AS production-dependencies-env
WORKDIR /app
COPY package.json pnpm-lock.yaml ./
RUN npm install -g pnpm && pnpm install --frozen-lockfile --prod

FROM node:20-alpine
WORKDIR /app

RUN apk add --no-cache python3 py3-pip
RUN python3 -m venv /opt/jupyterlab-env
ENV PATH="/opt/jupyterlab-env/bin:$PATH"
RUN pip install --no-cache-dir sqlglot

COPY package.json pnpm-lock.yaml ./
COPY --from=production-dependencies-env /app/node_modules /app/node_modules
COPY --from=build-env /app/build /app/build
COPY . .
RUN npm install -g pnpm
RUN pnpm install compression morgan
ENV PORT=3000
CMD ["pnpm", "start"]
