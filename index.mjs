import log from './api/log'

// Run the database script automatically.
import setup from './api/setup'

setup().catch(async (error) => {
  log.error({ code: error.code, message: error.message }, 'Error while preparing database')
  log.error('Unable to verify database integrity.')
  log.warn('Continuing anyways')
  // import('./api/config').then(module => {
  //   log.error(error, 'Error while preparing database')
  //   log.error({ config: module.default.get() }, 'config used')
  //   process.exit(1)
  // })
}).then(() =>
  import('./server')
).catch(error => {
  log.error(error, 'Unknown error starting server')
})
