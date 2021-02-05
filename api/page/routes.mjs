import Page from './model.mjs'
import * as security from './security.mjs'

export default class PageRoutes {
  constructor(opts = {}) {
    Object.assign(this, {
      Page: opts.Page || Page,
      security: opts.security || security,
    })
  }

  /** GET: /api/pagetree */
  async getPageTree(ctx) {
    ctx.body = await this.Page.getTree()
  }

  /** GET: /api/pages */
  async getAllPages(ctx) {
    await this.security.ensureIncludes(ctx)

    ctx.body = await this.Page.getAll(ctx, null, ctx.state.filter.includes, 'name')
  }

  /** GET: /api/pages/:id */
  async getSinglePage(ctx) {
    await this.security.ensureIncludes(ctx)

    ctx.body = await this.Page.getSingle(ctx.params.id, ctx.state.filter.includes, true, ctx)
  }

  /** POST: /api/pages */
  async createPage(ctx) {
    await this.security.validUpdate(ctx)

    ctx.body = await this.Page.create(ctx.request.body)
  }

  /** PUT: /api/pages/:id */
  async updatePage(ctx) {
    await this.security.validUpdate(ctx)

    let page = await this.Page.updateSingle(ctx, ctx.params.id, ctx.request.body)

    ctx.body = page
  }

  /** DELETE: /api/pages/:id */
  async removePage(ctx) {
    await this.Page.updateSingle(ctx, ctx.params.id, { is_deleted: true })

    ctx.status = 204
  }
}
