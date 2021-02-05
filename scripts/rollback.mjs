import _ from 'lodash'

import config from '../api/config.mjs'
import log from '../api/log.mjs'
import knex from 'knex-core'

// This is important for setup to run cleanly.
let knexConfig = _.cloneDeep(config.get('knex'))
knexConfig.pool = { min: 1, max: 1 }

let knexSetup = knex(knexConfig)

export default function rollback() {
  log.info(knexConfig, 'Running database rollback.')

  return knexSetup.migrate.rollback({
    directory: './migrations',
  })
  .then((result) => {
    if (result[1].length === 0) {
      return log.info('Database has been roll backed')
    }
    for (let i = 0; i < result[1].length; i++) {
      log.info('Rollbacked migration from', result[1][i].substr(result[1][i].lastIndexOf('\\') + 1))
    }
    return knexSetup.destroy()
  })
}

rollback()
.catch(async (error) => {
  log.error({ code: error.code, message: error.message }, 'Error while rollbacking database')
  log.error('Unable to verify database integrity.')
  process.exit(1)
}).then(() =>
  process.exit(0)
)
