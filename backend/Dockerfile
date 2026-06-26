FROM ghcr.io/puppeteer/puppeteer:latest

WORKDIR /home/pptruser/app

COPY --chown=pptruser:pptruser package*.json ./
RUN npm ci

COPY --chown=pptruser:pptruser . .

EXPOSE 3000

CMD ["node", "server.js"]
