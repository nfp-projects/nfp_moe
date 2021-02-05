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

    ctx.body = await this.Article.getAll(ctx, { }, ctx.state.filter.includes, ctx.query.sort || '-published_at')
  }

  /** GET: /api/articles/:id */
  async getSingleArticle(ctx) {
    await this.security.ensureIncludes(ctx)

    ctx.body = await this.Article.getSingle(ctx.params.id, ctx.state.filter.includes, true, ctx)
  }

  /** GET: /api/articles/public */
  async getPublicAllArticles(ctx) {
    await this.security.ensureIncludes(ctx)

    ctx.body = await this.Article.getAll(ctx, { }, ctx.state.filter.includes, ctx.query.sort || '-published_at', true)
  }

  /** GET: /api/pages/:pageId/articles/public */
  async getPublicAllPageArticles(ctx) {
    await this.security.ensureIncludes(ctx)

    ctx.body = await this.Article.getAllFromPage(ctx, ctx.params.pageId, ctx.state.filter.includes, ctx.query.sort || '-published_at', true)
  }

  /** GET: /api/articles/public/:id */
  async getPublicSingleArticle(ctx) {
    await this.security.ensureIncludes(ctx)

    ctx.body = await this.Article.getSingle(ctx.params.id, ctx.state.filter.includes, true, ctx, true)
  }

  /** POST: /api/articles */
  async createArticle(ctx) {
    await this.security.validUpdate(ctx)

    if (!ctx.request.body.staff_id) {
      ctx.request.body.staff_id = ctx.state.user.id
    }

    ctx.body = await this.Article.create(ctx.request.body)
  }

  /** PUT: /api/articles/:id */
  async updateArticle(ctx) {
    await this.security.validUpdate(ctx)

    if (ctx.request.body.is_featured) {
      await Article.setAllUnfeatured()
    }

    let article = await this.Article.updateSingle(ctx, ctx.params.id, ctx.request.body)

    ctx.body = article
  }

  /** DELETE: /api/articles/:id */
  async removeArticle(ctx) {
    await this.Article.updateSingle(ctx, ctx.params.id, { is_deleted: true })

    ctx.status = 204
  }
}
