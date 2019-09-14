import bookshelf from '../bookshelf.mjs'
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

const File = bookshelf.createModel({
  tableName: 'files',

  virtuals: {
    url() {
      return `${File.baseUrl}${this.get('path')}`
    },

    magnet() {
      let meta = this.get('meta')
      if (!meta.torrent) return ''
      return 'magnet:?'
        + 'xl=' + this.get('size')
        + '&dn=' + encodeURIComponent(meta.torrent.name)
        + '&xt=urn:btih:' + meta.torrent.hash
        + meta.torrent.announce.map(item => ('&tr=' + encodeURIComponent(item))).join('')
    },
  },
}, {
  baseUrl: config.get('upload:baseurl'),
})

export default File
