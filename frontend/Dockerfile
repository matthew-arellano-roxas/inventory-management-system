FROM node:20-alpine AS build

WORKDIR /app

ENV NODE_OPTIONS=--max-old-space-size=2048

ARG VITE_API_URL
ARG VITE_AUTH0_AUDIENCE
ARG VITE_AUTH0_DOMAIN
ARG VITE_AUTH0_CLIENT_ID
ARG VITE_AUTH0_BACKEND_API_IDENTIFIER
ARG VITE_AUTH0_SCOPE

ENV VITE_API_URL=$VITE_API_URL
ENV VITE_AUTH0_AUDIENCE=$VITE_AUTH0_AUDIENCE
ENV VITE_AUTH0_DOMAIN=$VITE_AUTH0_DOMAIN
ENV VITE_AUTH0_CLIENT_ID=$VITE_AUTH0_CLIENT_ID
ENV VITE_AUTH0_BACKEND_API_IDENTIFIER=$VITE_AUTH0_BACKEND_API_IDENTIFIER
ENV VITE_AUTH0_SCOPE=$VITE_AUTH0_SCOPE

COPY package.json package-lock.json ./
RUN npm ci --fetch-retries=5 --fetch-retry-mintimeout=20000 --fetch-retry-maxtimeout=120000

COPY . .
RUN npm run build

FROM nginx:1.27-alpine

COPY --from=build /app/dist /usr/share/nginx/html

RUN printf "server {\n\
    listen 80;\n\
    server_name _;\n\
    root /usr/share/nginx/html;\n\
    index index.html;\n\
\n\
    location / {\n\
        try_files \$uri \$uri/ /index.html;\n\
    }\n\
\n\
    location /assets/ {\n\
        expires 1y;\n\
        add_header Cache-Control \"public, immutable\";\n\
    }\n\
}\n" > /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
