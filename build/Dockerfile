FROM node:12

# Create app directory
WORKDIR /usr/src/app
RUN wget https://github.com/Yelp/dumb-init/releases/download/v1.2.2/dumb-init_1.2.2_amd64.deb
RUN dpkg -i dumb-init_*.deb

# Install app dependencies
# A wildcard is used to ensure both package.json AND package-lock.json are copied
# where available (npm@5+)
COPY artifacts/package*.json ./

# If you are building your code for production
RUN npm ci --only=production

# Bundle app source
ADD artifacts/backend.tar.gz ./
ADD artifacts/frontend.tar.gz ./
COPY artifacts/.env ./

EXPOSE 3000
CMD [ "dumb-init", "node", "server/server.js" ]
# CMD ["bash"]
