#!/bin/bash
# Always run in same directory
DIR="$(dirname "$(readlink -f "$0")")"
cd $DIR
cd ..
# Build frontend
npm run build
# Copy package.json files to artifacts dir
cp package*.json build/artifacts

cd build

# make a working dir
workdir=$(uuidgen)
mkdir -p $workdir
cd $workdir

# package frontend
cp -r ../../public .
tar -cvf frontend.tar.gz public/
cp frontend.tar.gz ../artifacts/frontend.tar.gz

# package backend
mkdir -p server
cp -r ../../server .
tar -cvf backend.tar.gz server/
cp backend.tar.gz ../artifacts/backend.tar.gz

cd $DIR
rm -rf $workdir

# Build & tag docker image
docker build -t cumulio/spotify-app .
docker tag cumulio/spotify-app 457806912465.dkr.ecr.eu-west-1.amazonaws.com/cumulio:spotify-app
docker push 457806912465.dkr.ecr.eu-west-1.amazonaws.com/cumulio:spotify-app
