import log from './api/log'

// Run the database script automatically.
import setup from './api/setup'

setup().then(() =>
  import('./server')
).catch((error) => {
  import('./api/config').then(module => {
    log.error(error, 'Error while preparing database')
    log.error({ config: module.default.get() }, 'config used')
    process.exit(1)
  })
})
