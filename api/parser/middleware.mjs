import format from 'format-link-header'

import * as pagination from './pagination.mjs'

export default class ParserMiddleware {
  constructor(opts = {}) {
    Object.assign(this, {
      pagination: opts.pagination || pagination,
      format: opts.format || format,
    })
  }

  contextParser() {
    return (ctx, next) => {
      ctx.state.pagination = this.pagination.parsePagination(ctx)
      ctx.state.filter = this.pagination.parseFilter(ctx)

      return next()
    }
  }

  generateLinks() {
    return async (ctx, next) => {
      await next()

      if (ctx.state.pagination.total > 0) {
        ctx.set('Link', this.format(this.pagination.generateLinks(ctx, ctx.state.pagination.total)))
      }

      if (ctx.state.pagination.total != null) {
        ctx.set('pagination_total', ctx.state.pagination.total)
      }
    }
  }
}
