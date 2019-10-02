import bookshelf from '../bookshelf.mjs'
import Media from '../media/model.mjs'
import File from '../file/model.mjs'
import Staff from '../staff/model.mjs'
import Page from '../page/model.mjs'

/*

Article model:
{
  name,
  path,
  description,
  media_id,
  staff_id,
  parent_id,
  is_deleted,
  created_at,
  updated_at,
}

*/

const Article = bookshelf.createModel({
  tableName: 'articles',

  parent() {
    return this.belongsTo(Page, 'parent_id')
  },

  banner() {
    return this.belongsTo(Media, 'banner_id')
  },

  media() {
    return this.belongsTo(Media, 'media_id')
  },

  staff() {
    return this.belongsTo(Staff, 'staff_id')
  },

  files() {
    return this.hasManyFiltered(File, 'file', 'article_id')
      .query(qb => {
        qb.orderBy('id', 'asc')
      })
  },
}, {
  getAll(ctx, where = {}, withRelated = [], orderBy = 'id', limitToday = false) {
    return this.query(qb => {
      this.baseQueryAll(ctx, qb, where, orderBy)
      if (limitToday) {
        qb.where('published_at', '<=', (new Date()).toISOString())
      }
    })
    .fetchPage({
      pageSize: ctx.state.pagination.perPage,
      page: ctx.state.pagination.page,
      withRelated,
      ctx: ctx,
    })
    .then(result => {
      ctx.state.pagination.total = result.pagination.rowCount
      return result
    })
  },

  getSingle(id, withRelated = [], require = true, ctx = null, limitToday = false) {
    return this.query(qb => {
        qb.where(subq => {
          subq.where({ id: Number(id) || 0 })
              .orWhere({ path: id })
        })
        if (limitToday && (!ctx || !ctx.state.user || ctx.state.user.level < 10)) {
          qb.where('published_at', '<=', (new Date()).toISOString())
        }
      })
      .fetch({ require, withRelated, ctx })
  },

  async getFeatured(withRelated = [], ctx = null) {
    let data = await this.query(qb => {
        qb.where({ is_featured: true })
          .where('published_at', '<=', (new Date()).toISOString())
      })
      .fetch({ require: false, withRelated, ctx })
    if (!data) {
      data = await this.query(qb => {
          qb.where('published_at', '<=', (new Date()).toISOString())
            .whereNotNull('banner_id')
        })
        .fetch({ require: false, withRelated, ctx })
    }
    return data
  },

  getAllFromPage(ctx, pageId, withRelated = [], orderBy = 'id', limitToday = false) {
    return this.query(qb => {
        this.baseQueryAll(ctx, qb, {}, orderBy)
        qb.leftOuterJoin('pages', 'articles.parent_id', 'pages.id')
        qb.where(subq => {
          subq.where('pages.id', pageId)
              .orWhere('pages.parent_id', pageId)
        })
        if (limitToday) {
          qb.where('published_at', '<=', (new Date()).toISOString())
        }
        qb.select('articles.*')
      })
      .fetchPage({
        pageSize: ctx.state.pagination.perPage,
        page: ctx.state.pagination.page,
        withRelated,
        ctx: ctx,
      })
      .then(result => {
        ctx.state.pagination.total = result.pagination.rowCount
        return result
      })
  },

  setAllUnfeatured() {
    return bookshelf.knex('articles')
      .where({ is_featured: true })
      .update({
        is_featured: false,
      })
  },

  getFrontpageArticles(page = 1) {
    return this.query(qb => {
        qb.orderBy('published_at', 'DESC')
          .where('published_at', '<=', (new Date()).toISOString())
      })
      .fetchPage({
        pageSize: 10,
        page: page,
        withRelated: ['files', 'media', 'banner', 'parent', 'staff'],
      })
  },
})

export default Article
