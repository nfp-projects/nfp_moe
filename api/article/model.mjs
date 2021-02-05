import { createPrototype, safeColumns } from '../knex.mjs'
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

function ArticleItem(data) {
  Object.assign(this, data)
}

function Article() {
  this.tableName = 'articles'
  this.Model = ArticleItem
  this.includes = {
    staff: Staff.includeHasOne('articles.staff_id', 'id'),
    media: Media.includeHasOne('articles.media_id', 'id'),
    banner: Media.includeHasOne('articles.banner_id', 'id'),
    parent: Page.includeHasOne('articles.parent_id', 'id'),
    files: File.includeHasMany('article_id', 'articles.id'),
  }
  this.publicFields = this.privateFields = safeColumns([
    'staff_id',
    'parent_id',
    'name',
    'path',
    'description',
    'banner_id',
    'media_id',
    'published_at',
    'is_featured',
  ])
  this.init()
}

Article.prototype = createPrototype({
  getAll(ctx, where = null, includes = [], orderBy = 'id', limitToday = false) {
    return this._getAll(ctx, (qb) => {
      if (where) qb.where(where)
      if (limitToday) {
        qb.where(this.tableName + '.published_at', '<=', (new Date()).toISOString())
      }
    }, includes, orderBy, [])
  },

  getAllFromPage(ctx, pageId, includes = [], orderBy = 'id', limitToday = false) {
    return this._getAll(ctx, (qb) => {
      qb = qb.innerJoin('pages', 'articles.parent_id', 'pages.id')
      qb.where(subq => {
        subq.where('pages.id', pageId)
            .orWhere('pages.parent_id', pageId)
      })
      if (limitToday) {
        qb.where(this.tableName + '.published_at', '<=', (new Date()).toISOString())
      }
      return qb
    }, includes, orderBy, [])
  },

  getSingle(id, includes = [], require = true, ctx = null, limitToday = false) {
    return this._getSingle(qb => {
      qb.where(subq => {
        subq.where(this.tableName + '.id', '=', Number(id) || 0)
            .orWhere(this.tableName + '.path', '=', id)
      })
      if (limitToday && (!ctx || !ctx.state.user || ctx.state.user.level < 10)) {
        qb.where(this.tableName + '.published_at', '<=', (new Date()).toISOString())
      }
    }, includes, require, ctx)
  },

  getFeaturedArticle(includes = [], ctx = null) {
    return this._getSingle(qb => {
      qb.where({ is_featured: true })
        .where(this.tableName + '.published_at', '<=', (new Date()).toISOString())
        .orderBy(this.tableName + '.published_at', 'DESC')
        .select(this.knex.raw('1 as __group'))
        .limit(1)
    }, includes, false, ctx)
  },

  async getFrontpageArticles(orgPage = 1) {
    let page = Math.max(orgPage, 1)
    let out = {
      featured: null,
      items: [],
      total: 0,
    }

    let qFeatured =  this.query(qb => {
      return qb.where({ is_featured: true })
        .where(this.tableName + '.published_at', '<=', (new Date()).toISOString())
        .orderBy(this.tableName + '.published_at', 'DESC')
        .select(this.knex.raw('1 as __group'))
        .limit(1)
    }, ['staff', 'media', 'banner'])
    let qArticles = this.query(qb => {
      return qb
        .where(this.tableName + '.published_at', '<=', (new Date()).toISOString())
        .select(this.knex.raw('2 as __group'))
        .orderBy(this.tableName + '.published_at', 'DESC')
        .limit(10)
        .offset((page - 1) * 10)
    }, ['staff', 'media', 'banner'], null, qFeatured)

    let [articles, total] = await Promise.all([
      this.getAllQuery(
        this.knex
          .unionAll(qFeatured, true)
          .unionAll(qArticles, true),
        qFeatured
      ),
      this.knex('articles')
        .where(this.tableName + '.published_at', '<=', (new Date()).toISOString())
        .where({ is_deleted: false })
        .count('* as count'),
    ])

    out.total = total[0].count
    if (articles.length > 0 && articles[0].is_featured) {
      out.featured = articles[0]
      out.items = articles.slice(1)
    } else {
      out.items = articles
    }
    return out
  },

  setAllUnfeatured() {
    return knex('articles')
      .where({ is_featured: true })
      .update({
        is_featured: false,
      })
  },

  /*parent() {
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
  },*/

  /*getAll(ctx, where = {}, withRelated = [], orderBy = 'id', limitToday = false) {
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
  },*/
})

const articleInstance = new Article()

// Hook into includes for Page
// Page.addInclude('news', articleInstance.includeHasMany('parent_id', 'pages.id'))

export default articleInstance
