
import { createPrototype, safeColumns } from '../knex.mjs'
import Media from '../media/model.mjs'
// import Staff from '../staff/model.mjs'
// import Article from '../article/model.mjs'

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

function PageItem(data) {
  Object.assign(this, data)
  this.children = []
}

function Page() {
  this.tableName = 'pages'
  this.Model = PageItem
  this.includes = {
    media: Media.includeHasOne('pages.media_id', 'id'),
    banner: Media.includeHasOne('pages.banner_id', 'id'),
  }
  this.publicFields = this.privateFields = safeColumns([
    'staff_id',
    'parent_id',
    'name',
    'path',
    'description',
    'banner_id',
    'media_id',
  ])
  this.init()
}

Page.prototype = createPrototype({
  /* includes: {
    staff: Staff.includeHasOne('staff_id', 'id'),
  }, */

  /*banner() {
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
  },*/

  getSingle(id, includes = [], require = true, ctx = null) {
    return this._getSingle(qb => {
      qb.where(subq => {
        subq.where(this.tableName + '.id', '=', Number(id) || 0)
            .orWhere(this.tableName + '.path', '=', id)
      })
    }, includes, require, ctx)
  },

  async getTree() {
    let items = await this.getAllQuery(this.query(
      qb => qb.orderBy('name', 'ASC'),
      [],
      ['parent_id', 'id', 'name', 'path']
    ))

    let out = []
    let map = new Map()
    for (let i = 0; i < items.length; i++) {
      if (!items[i].parent_id) {
        out.push(items[i])
      }
      map.set(items[i].id, items[i])
    }
    for (let i = 0; i < items.length; i++) {
      if (items[i].parent_id && map.has(items[i].parent_id)) {
        map.get(items[i].parent_id).children.push(items[i])
      }
    }
    return out
  },
})

const pageInstance = new Page()

pageInstance.addInclude('children', pageInstance.includeHasMany('parent_id', 'pages.id'))
pageInstance.addInclude('parent', pageInstance.includeHasOne('pages.parent_id', 'id'))

export default pageInstance
