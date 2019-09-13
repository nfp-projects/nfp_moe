import Page from './model.mjs'
import * as security from './security.mjs'

export default class PageRoutes {
  constructor(opts = {}) {
    Object.assign(this, {
      Page: opts.Page || Page,
      security: opts.security || security,
    })
  }

  /** GET: /api/pages */
  async getAllPages(ctx) {
    await this.security.ensureIncludes(ctx)

    let filter = {}
    if (ctx.query.tree && ctx.query.tree === 'true') {
      filter.parent_id = null
    }

    ctx.body = await this.Page.getAll(ctx, filter, ctx.state.filter.includes)
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

    let page = await this.Page.getSingle(ctx.params.id)

    page.set(ctx.request.body)

    await page.save()

    ctx.body = page
  }

  /** DELETE: /api/pages/:id */
  async removePage(ctx) {
    let page = await this.Page.getSingle(ctx.params.id)

    page.set({ is_deleted: true })

    await page.save()

    ctx.status = 204
  }
}
