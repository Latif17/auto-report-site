FROM ghcr.io/puppeteer/puppeteer:22.0.0

WORKDIR /home/pptruser/app

COPY --chown=pptruser:pptruser package*.json ./
RUN npm ci --omit=dev

COPY --chown=pptruser:pptruser . .

EXPOSE 3000

CMD ["node", "server.js"]
