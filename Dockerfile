FROM ubuntu:18.04

ENV DEBIAN_FRONTEND noninteractive
ENV NODE_ENV production
ENV PORT 80

# Create app directory
WORKDIR /usr/src/app
ENV NODE_ENV production
COPY package*.json ./
COPY . .
RUN ./install.sh
ENV NODE_PATH /root/.nvm/versions/node/v8.0.0/lib/node_modules
ENV PATH /root/.nvm/versions/node/v8.0.0/bin:$PATH

EXPOSE 80 443
CMD [ "npm", "start" ]
