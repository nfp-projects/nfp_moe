import path from 'path'
import bookshelf from '../bookshelf'

/*

File model:
{
  filename,
  filetype,
  size,
  staff_id,
  article_id,
  is_deleted,
  created_at,
  updated_at,
}

*/

const File = bookshelf.createModel({
  tableName: 'files',
}, {
  baseUrl: 'http://192.168.42.14',
})

export default File
