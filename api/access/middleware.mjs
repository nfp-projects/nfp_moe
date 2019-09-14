import orgAccess from './index.mjs'

export function accessChecks(opts = { }) {
  const access = opts.access || orgAccess

  return (ctx, next) => {
    ctx.state.is = access.is.bind(access, ctx)
    ctx.state.atLeast = access.atLeast.bind(access, ctx)
    ctx.state.ensure = access.ensure.bind(access, ctx)

    return next()
  }
}

export function restrict(level = orgAccess.Normal) {
  return async (ctx, next) => {
    if (!ctx.headers.authorization) {
      return ctx.throw(403, 'Authentication token was not found (did you forget to login?)')
    }

    if (!ctx.state.user || !ctx.state.user.email || !ctx.state.user.level) {
      return ctx.throw(403, 'You must be authenticated to access this resource')
    }

    if (!ctx.state.atLeast(level)) {
      return ctx.throw(403, 'You do not have enough access to access this resource')
    }

    return next()
  }
}
