## Dependencies
- [NodeJS](https://nodejs.org/en/) 
- [Yarn](https://yarnpkg.com/lang/en/)
- [Docker](https://www.docker.com)

## Installation _(on Linux)_
> create a .env file based on variables from .env.example file

> run the next commands on your terminal: 
``` 
docker-compose up -d  
yarn
yarn knex migrate:latest --env test
```