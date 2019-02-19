import bunyan from 'bunyan-lite'
import config from './config'
import * as defaults from './defaults'

// Clone the settings as we will be touching
// on them slightly.
let settings = defaults.default(config.get('bunyan'))

// Replace any instance of 'process.stdout' with the
// actual reference to the process.stdout.
for (let i = 0; i < settings.streams.length; i++) {
  /* istanbul ignore else */
  if (settings.streams[i].stream === 'process.stdout') {
    settings.streams[i].stream = process.stdout
  }
}

// Create our logger.
const log = bunyan.createLogger(settings)

export default log

log.logMiddleware = () =>
  (ctx, next) => {
    ctx.log = log

    return next()
  }
