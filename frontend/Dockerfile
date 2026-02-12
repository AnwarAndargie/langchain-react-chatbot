FROM node:18-alpine

WORKDIR /app

COPY package.json package-lock.json* ./
RUN npm install

COPY . .

# When running with volume mount ./frontend:/app, node_modules is empty; entrypoint installs deps on first start
COPY docker-entrypoint.sh /docker-entrypoint.sh
RUN chmod +x /docker-entrypoint.sh
ENTRYPOINT ["/docker-entrypoint.sh"]

EXPOSE 5173

CMD ["npm", "run", "dev", "--", "--host"]
