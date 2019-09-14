import _ from 'lodash'

import config from './config.mjs'
import log from './log.mjs'
import knex from 'knex'

// This is important for setup to run cleanly.
let knexConfig = _.cloneDeep(config.get('knex'))
knexConfig.pool = { min: 1, max: 1 }

let knexSetup = knex(knexConfig)

export default function setup() {
  log.info(knexConfig, 'Running database integrity scan.')

  return knexSetup.migrate.latest({
    directory: './migrations',
  })
  .then((result) => {
    if (result[1].length === 0) {
      return log.info('Database is up to date')
    }
    for (let i = 0; i < result[1].length; i++) {
      log.info('Applied migration from', result[1][i].substr(result[1][i].lastIndexOf('\\') + 1))
    }
    return knexSetup.destroy()
  })
}
