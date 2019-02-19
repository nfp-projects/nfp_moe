import createError from 'http-errors'

export function errorHandler() {
  return async (ctx, next) => {
    try {
      await next()
    } catch (org) {
      let error = org
      if (error.message === 'EmptyResponse') {
        error = createError(404)
      } else if (error.message === 'AccessLevelDenied') {
        error = createError(403)
      }

      if (!error.status) {
        ctx.log.error(error)
        error = createError(500, `Unknown error occured: ${error.message}`)
        ctx.log.warn(error)
      } else {
        ctx.log.warn(error)
      }

      ctx.status = error.status
      ctx.body = {
        status: error.status,
        message: error.message,
        body: error.body || { },
      }
    }
  }
}
