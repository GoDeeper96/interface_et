# ===== Etapa dev =====
FROM node:20-alpine AS dev
WORKDIR /app
COPY package*.json ./
RUN npm install
CMD ["npm", "run", "dev"]

# ===== Etapa prod =====
FROM node:20-alpine AS build
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
RUN npm run build

FROM nginx:alpine
COPY --from=build /app/dist /usr/share/nginx/html
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
