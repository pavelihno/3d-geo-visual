FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci --omit=dev
COPY . .
RUN npm run build

FROM node:20-alpine AS runner
WORKDIR /app

ARG APP_PORT=3000
ENV APP_PORT=${APP_PORT}
ENV HOST=0.0.0.0

RUN npm install -g serve && \
    addgroup -S app && adduser -S app -G app

COPY --from=builder /app/dist ./dist
RUN chown -R app:app /app

USER app

EXPOSE ${APP_PORT}
CMD ["sh", "-c", "serve -s dist -l ${APP_PORT}"]
