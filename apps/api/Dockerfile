# Musify API container for hosted (Supabase-backed) mode.
# Build from this folder:  docker build -t musify-api apps/api
# Secrets (database URLs, SUPABASE_SECRET_KEY, ...) are NEVER baked in: supply them
# as runtime environment variables / a secret store. See .env.example for the names.
FROM node:24-slim AS deps
WORKDIR /app
COPY package.json package-lock.json .npmrc ./
RUN npm ci --omit=dev --ignore-scripts

FROM node:24-slim
ENV NODE_ENV=production \
    APP_MODE=supabase \
    HOST=0.0.0.0 \
    PORT=8080 \
    MUSIFY_ONLINE_TEST=1
WORKDIR /app
COPY --from=deps --chown=node:node /app/node_modules ./node_modules
COPY --chown=node:node package.json ./
COPY --chown=node:node src ./src
COPY --chown=node:node migrations ./migrations
USER node
EXPOSE 8080
HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:'+process.env.PORT+'/health/live').then(r=>process.exit(r.ok?0:1),()=>process.exit(1))"
# Run node directly (not npm) so SIGTERM reaches start.mjs and closes the app cleanly.
CMD ["node", "src/start.mjs"]
