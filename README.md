# Soundmolto API
Node.js + ExpressJS + TypeOrm + Typescript + JWT + ES2015 + Clustering + Tslint + Mocha + Chai + Superagent

# Quickstart
Run `bootstrap.sh` to install dependencies on Ubuntu (Or run the docker instance)

# Dependencies
## System dependencies
Listed by ubuntu/aptitude dependencies (lookup equivalent for given OS)
```
libgroove-dev
zlib1g-dev
libpng-dev
gcc
make
g++
mysql-server-5.7
curl
lame
```

## Filesystem
Currently dependent on Google cloud storage (Not ported back to local FS yet)

## Node
Tested using `v8.0.0` (Using [creationix/nvm](https://github.com/creationix/nvm))

And then run `npm i` in this directory's root.

# Structure
```json
/app
	/controllers (Controllers of the app)
	/middlewares (Middlewares for the routes of the app)
	/routes (Routes for Controllers of the app)
	/service (Services for using in any Controller)
	/entity (Models configuration for use)
	/repository (Custom queries)
/config
	/Router.ts (Config file for Routing)
	/Database (DB configuration for use)
	/Server.ts (Server configuration)
config.ts (Config file for the app)
tsconfig.json (File configuration typescript)
tslint.json (File configuration rules typescript)
Index.ts (Main file to start the app)
```

# Start App
### Development: In Development mode the express app is starter with nodemon for automatic refresh when do changes.
	npm run dev
### Test: Run test in development environment
	npm test
### Production: Run app in production environment
	npm start
