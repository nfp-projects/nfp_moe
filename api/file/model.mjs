import { createPrototype, safeColumns } from '../knex.mjs'
import config from '../config.mjs'

/*

File model:
{
  filename,
  filetype,
  size,
  path,
  staff_id,
  article_id,
  is_deleted,
  created_at,
  updated_at,
  *url,
  *magnet,
}

*/

const baseUrl = config.get('upload:baseurl')

function FileItem(data) {
  Object.assign(this, data)
  this.url = `${baseUrl}${this.path}`

  let meta = this.meta
  if (!meta.torrent) {
    this.magnet = ''
  } else {
    this.magnet = 'magnet:?'
      + 'xl=' + this.size
      + '&dn=' + encodeURIComponent(meta.torrent.name)
      + '&xt=urn:btih:' + meta.torrent.hash
      + meta.torrent.announce.map(item => ('&tr=' + encodeURIComponent(item))).join('')
  }
}

function File() {
  this.tableName = 'files'
  this.Model = FileItem
  this.publicFields = this.privateFields = safeColumns([
    'article_id',
    'filename',
    'filetype',
    'path',
    'size',
    'staff_id',
    'meta',
  ])
  this.init()
}

File.prototype = createPrototype({
})

export default new File()
