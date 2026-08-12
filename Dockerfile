# This image builds and serves only the Next.js frontend (project/).
#
# Smart contract compilation/deployment is a separate, one-time step and is
# intentionally NOT performed as part of this image build (it would require
# network access to a testnet RPC and a funded private key at build time,
# which is unsafe and non-reproducible in CI/registry contexts). Deploy
# contracts first with:
#   npm install && npm run deploy:sepolia
# which regenerates deployed-addresses.json at the repo root — commit or
# mount that file before building this image.
#
# NEXT_PUBLIC_* variables are inlined into the client bundle at build time,
# so project/.env must exist (see project/.env.example) before running
# `docker build`.

# ---- Build the frontend ----
FROM node:20-alpine AS frontend-builder
WORKDIR /app

COPY project/package.json project/package-lock.json ./
RUN npm install

COPY project .
# deployed-addresses.json lives one directory above project/ in the repo;
# next.config.js reads it the same way via `require('../deployed-addresses.json')`.
COPY deployed-addresses.json /deployed-addresses.json

RUN npm run build

# ---- Production runner ----
FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production

COPY project/package.json project/package-lock.json ./
RUN npm ci --omit=dev

COPY --from=frontend-builder /app/.next ./.next
COPY --from=frontend-builder /app/public ./public
COPY --from=frontend-builder /app/next.config.js ./next.config.js

EXPOSE 3000
CMD ["npm", "start"]
