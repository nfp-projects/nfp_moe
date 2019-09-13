import bookshelf from '../bookshelf.mjs'
import Media from '../media/model.mjs'
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
}, {
  getSingle(id, withRelated = [], require = true, ctx = null) {
    return this.query(qb => {
        qb.where({ id: Number(id) || 0 })
          .orWhere({ path: id })
      })
      .fetch({ require, withRelated, ctx })
  },
})

export default Article
