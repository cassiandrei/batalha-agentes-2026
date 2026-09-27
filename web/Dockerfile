# Front do Vita: Vite (React) servido pelo Express, que também faz o proxy para o
# agente. Node 24 executa o server.ts direto (strip de tipos), sem passo de build
# extra para o servidor.
FROM node:24-alpine

WORKDIR /app

# Sem package-lock (o protótipo usa bun): npm install com peers legados. Cache e
# retentativa pelo mesmo motivo do agente — a rede do evento derruba downloads.
COPY package.json ./
RUN --mount=type=cache,target=/root/.npm \
    for i in 1 2 3 4 5; do \
      npm install --legacy-peer-deps --no-audit --no-fund --loglevel=error && break; \
      echo "npm install falhou ($i), tentando de novo"; sleep 15; \
    done && test -d node_modules

COPY . .
# tsc antes do build: o Vite não checa tipos, e é aqui que a rede permitiu rodar o tsc.
RUN npm run lint && npm run build

ENV NODE_ENV=production
ENV PORT=8080
EXPOSE 8080
CMD ["node", "server.ts"]
