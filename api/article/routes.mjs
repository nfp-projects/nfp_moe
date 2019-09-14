import Article from './model.mjs'
import * as security from './security.mjs'

export default class ArticleRoutes {
  constructor(opts = {}) {
    Object.assign(this, {
      Article: opts.Article || Article,
      security: opts.security || security,
    })
  }

  /** GET: /api/articles */
  async getAllArticles(ctx) {
    await this.security.ensureIncludes(ctx)

    ctx.body = await this.Article.getAll(ctx, { }, ctx.state.filter.includes)
  }

  /** GET: /api/pages/:pageId/articles */
  async getAllPageArticles(ctx) {
    await this.security.ensureIncludes(ctx)

    ctx.body = await this.Article.getAllFromPage(ctx, ctx.params.pageId, ctx.state.filter.includes, ctx.query.sort || '-id')
  }

  /** GET: /api/articles/:id */
  async getSingleArticle(ctx) {
    await this.security.ensureIncludes(ctx)

    ctx.body = await this.Article.getSingle(ctx.params.id, ctx.state.filter.includes, true, ctx)
  }

  /** POST: /api/articles */
  async createArticle(ctx) {
    await this.security.validUpdate(ctx)

    ctx.body = await this.Article.create(ctx.request.body)
  }

  /** PUT: /api/articles/:id */
  async updateArticle(ctx) {
    await this.security.validUpdate(ctx)

    let page = await this.Article.getSingle(ctx.params.id)

    page.set(ctx.request.body)

    await page.save()

    ctx.body = page
  }

  /** DELETE: /api/articles/:id */
  async removeArticle(ctx) {
    let page = await this.Article.getSingle(ctx.params.id)

    page.set({ is_deleted: true })

    await page.save()

    ctx.status = 204
  }
}
