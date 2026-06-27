FROM ghcr.io/puppeteer/puppeteer:25.2.1

USER root
RUN mkdir -p /app && chown -R pptruser:pptruser /app

WORKDIR /app
USER pptruser

COPY --chown=pptruser:pptruser package*.json ./
RUN npm ci

COPY --chown=pptruser:pptruser . .

ENV DAEMON_MODE=true
ENV PUPPETEER_EXECUTABLE_PATH=/usr/bin/google-chrome

CMD ["node", "run-scraper.js"]
