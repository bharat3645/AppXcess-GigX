# ---- Base Node image ----
FROM node:20-alpine AS base
WORKDIR /app

# ---- Install root dependencies (Hardhat etc.) ----
COPY package.json ./
COPY package-lock.json ./
RUN npm install

# ---- Copy contracts and scripts ----
COPY contracts ./contracts
COPY scripts ./scripts
COPY hardhat.config.js ./
COPY .env ./

# ---- Compile and deploy contracts ----
RUN npx hardhat compile
RUN npx hardhat run scripts/deploy.js --network sepolia || true

# ---- Build frontend ----
FROM node:20-alpine AS frontend-builder
WORKDIR /app

COPY project/package.json ./
COPY project/package-lock.json ./
RUN npm install
COPY project .
# Copy deployed addresses from root
COPY --from=base /app/deployed-addresses.json ./deployed-addresses.json
COPY --from=base /app/.env ./.env
RUN npm run build

# ---- Production runner ----
FROM node:20-alpine AS runner
WORKDIR /app

COPY project/package.json ./
COPY project/package-lock.json ./
RUN npm ci --omit=dev
COPY --from=frontend-builder /app/.next ./.next
COPY --from=frontend-builder /app/public ./public
COPY --from=frontend-builder /app/next.config.js ./next.config.js
COPY --from=frontend-builder /app/node_modules ./node_modules
COPY --from=frontend-builder /app/package.json ./package.json
COPY --from=frontend-builder /app/deployed-addresses.json ./deployed-addresses.json
COPY --from=frontend-builder /app/.env ./.env

EXPOSE 3000
CMD ["npm", "start"]
