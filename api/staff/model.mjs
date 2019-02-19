import bookshelf from '../bookshelf'

/* Staff model:
{
  id,
  username,
  password,
  fullname,
  is_deleted,
  level,
  created_at,
  updated_at,
}

*/

const Staff = bookshelf.createModel({
  tableName: 'staff',
}, {
  // Hide password from any relations and include requests.
  publicFields: bookshelf.safeColumns([
    'username',
    'fullname',
    'level',
  ]),
})

export default Staff
