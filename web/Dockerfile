FROM node:22-alpine AS build
ARG VITE_API_URL
ARG VITE_SOCKET_URL
ENV VITE_API_URL=${VITE_API_URL}
ENV VITE_SOCKET_URL=${VITE_SOCKET_URL}
WORKDIR /app
COPY package.json ./
RUN npm install --legacy-peer-deps --include=optional
COPY . .
RUN npx vite build --outDir dist --emptyOutDir

FROM node:22-alpine AS runtime
WORKDIR /app
RUN npm install -g serve@14
COPY --from=build /app/dist ./dist
EXPOSE 8080
CMD ["sh", "-c", "serve -s dist -l tcp://0.0.0.0:${PORT:-8080}"]
