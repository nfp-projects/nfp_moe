import _ from 'lodash'
import nconf from 'nconf'
import { readFileSync } from 'fs'

// Helper method for global usage.
nconf.inTest = () => nconf.get('NODE_ENV') === 'test'

// Config follow the following priority check order:
// 1. Enviroment variables
// 2. package.json
// 3. config/config.json
// 4. config/config.default.json



// Load enviroment variables as first priority
nconf.env({
  separator: '__',
  whitelist: [
    'DATABASE_URL',
    'NODE_ENV',
    'server__port',
    'server__host',
    'knex__connection__host',
    'knex__connection__user',
    'knex__connection__database',
    'knex__connection__password',
    'bunyan__name',
    'frontend__url',
    'jwt__secret',
    'sessionsecret',
    'bcrypt',
    'name',
    'NODE_VERSION',
  ],
  parseValues: true,
})


// Load package.json for name and such
let pckg = JSON.parse(readFileSync('./package.json'))

pckg = _.pick(pckg, ['name', 'version', 'description', 'author', 'license', 'homepage'])

if (nconf.get('DATABASE_URL')) {
  pckg.knex = { connection: nconf.get('DATABASE_URL') }
}

// Load overrides as second priority
nconf.overrides(pckg)


// Load any overrides from the appropriate config file
let configFile = 'config/config.json'

/* istanbul ignore else */
if (nconf.get('NODE_ENV') === 'test') {
  configFile = 'config/config.test.json'
}

/* istanbul ignore if */
if (nconf.get('NODE_ENV') === 'production') {
  configFile = 'config/config.production.json'
}

nconf.file('main', configFile)

// Load defaults
nconf.file('default', 'config/config.default.json')


// Final sanity checks
/* istanbul ignore if */
if (typeof global.it === 'function' & !nconf.inTest()) {
  // eslint-disable-next-line no-console
  console.log('Critical: potentially running test on production enviroment. Shutting down.')
  process.exit(1)
}


export default nconf
