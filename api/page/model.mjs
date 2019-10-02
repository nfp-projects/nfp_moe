
import bookshelf from '../bookshelf.mjs'
import Media from '../media/model.mjs'
import Staff from '../staff/model.mjs'
import Article from '../article/model.mjs'

/*

Page model:
{
  filename,
  filetype,
  small_image,
  medium_image,
  large_image,
  *small_url,
  *medium_url,
  *large_url,
  size,
  staff_id,
  is_deleted,
  created_at,
  updated_at,
}

*/

const Page = bookshelf.createModel({
  tableName: 'pages',

  banner() {
    return this.belongsTo(Media, 'banner_id')
  },

  parent() {
    return this.belongsTo(Page, 'parent_id')
  },

  children() {
    return this.hasManyFiltered(Page, 'children', 'parent_id')
      .query(qb => {
        qb.orderBy('name', 'ASC')
      })
  },

  news() {
    return this.hasManyFiltered(Article, 'news', 'parent_id')
      .query(qb => {
        qb.orderBy('id', 'desc')
      })
  },

  media() {
    return this.belongsTo(Media, 'media_id')
  },

  staff() {
    return this.belongsTo(Staff, 'staff_id')
  },
}, {
  getSingle(id, withRelated = [], require = true, ctx = null) {
    return this.query(qb => {
        qb.where({ id: Number(id) || 0 })
          .orWhere({ path: id })
      })
      .fetch({ require, withRelated, ctx })
  },
  getTree() {
    return this.query(qb => {
      qb.where({ parent_id: null })
      qb.select(['id', 'name', 'path'])
      qb.orderBy('name', 'ASC')
    }).fetchAll({ withRelated: ['children'] })
  },
})

export default Page
