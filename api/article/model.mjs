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
  getSingle(id, withRelated = [], require = true, ctx = null) {
    return this.query(qb => {
        qb.where({ id: Number(id) || 0 })
          .orWhere({ path: id })
      })
      .fetch({ require, withRelated, ctx })
  },

  getAllFromPage(ctx, pageId, withRelated = [], orderBy = 'id') {
    return this.query(qb => {
        this.baseQueryAll(ctx, qb, {}, orderBy)
        qb.leftOuterJoin('pages', 'articles.parent_id', 'pages.id')
        qb.where(subq => {
          subq.where('pages.id', pageId)
              .orWhere('pages.parent_id', pageId)
        })
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
})

export default Article
