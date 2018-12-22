#!/bin/bash

echo 'Installing libgroove, libpng & zlib dev packages'
sudo apt install libgroove-dev zlib1g-dev libpng-dev gcc make g++ mysql-server-5.7 curl lame

echo 'Installing NVM'
curl -o- https://raw.githubusercontent.com/creationix/nvm/v0.33.11/install.sh | bash

source ~/.bashrc

nvm install 8.0.0

echo 'Installing NPM dependencies'
npm i
