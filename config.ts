import { env } from 'process';

export const DIALECT = 'mysql';

const LOCAL_CONFIGURATION = {
  API_ENDPOINT: 'localhost',
  DB: 'soundmolto',
  PASSWORD: '',
  PORT_DB: 3306,
  SERVER: 'localhost',
  USER_DB: 'root',
};

const PRODUCTION_CONFIGURATION = {
  DB: env.DB || 'soundmolto',
  PASSWORD: env.PASSWORD || 'root',
  PORT_DB: env.PORT_DB ? Number(env.PORT_DB) : 3306,
  SERVER: env.SERVER || 'localhost',
  USER_DB: env.USER_DB || 'root',
};

export const config = {
  API_ENDPOINT: env.API_ENDPOINT || 'localhost',
  CONSTANT_INJECTION: env.CONSTANT_INJECTION || 'ireallylikethepartwherethisisasecret',
  DATABASE: env.NODE_ENV === 'PRODUCTION' ? PRODUCTION_CONFIGURATION : LOCAL_CONFIGURATION,
  HASH_SECRET: env.HASH_SECRET || 'h&^335hGVzuwAQ&&%$@ed233%',
  PORT_APP: env.PORT ? Number(env.PORT) : 1344,
  SECRET: env.SECRET || 'HltH3R3',
};
