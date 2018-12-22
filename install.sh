#!/bin/bash

echo 'Updating'
apt update && apt upgrade

echo 'Installing libgroove, libpng & zlib dev packages'
apt install libgroove-dev zlib1g-dev libpng-dev gcc make g++ curl lame -y python2.7 python-pip

echo 'Installing NVM'
curl -o- https://raw.githubusercontent.com/creationix/nvm/v0.33.11/install.sh | bash

source ~/.bashrc

export NVM_DIR="$HOME/.nvm"
[ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"  # This loads nvm
[ -s "$NVM_DIR/bash_completion" ] && \. "$NVM_DIR/bash_completion"  # This loads nvm bash_completion


nvm install 8.0.0
npm install --only=production && npm i -g cross-env