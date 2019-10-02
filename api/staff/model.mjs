import bookshelf from '../bookshelf.mjs'
import bcrypt from 'bcrypt'
import config from '../config.mjs'

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

  privateFields: bookshelf.safeColumns([
    'fullname',
    'email',
    'level',
  ]),
}, {
  // Hide password from any relations and include requests.
  publicFields: ['id', 'fullname'],

  hash(password) {
    return new Promise((resolve, reject) =>
      bcrypt.hash(password, config.get('bcrypt'), (err, hashed) => {
        if (err) return reject(err)

        resolve(hashed)
      })
    )
  },

  compare(password, hashed) {
    return new Promise((resolve, reject) =>
      bcrypt.compare(password, hashed, (err, res) => {
        if (err || !res) return reject(new Error('PasswordMismatch'))
        resolve()
      })
    )
  },

  getAll(ctx, where = {}, withRelated = [], orderBy = 'id') {
    return this.query(qb => {
      this.baseQueryAll(ctx, qb, where, orderBy)
      qb.select(bookshelf.safeColumns([
        'fullname',
        'email',
        'level',
      ]))
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

export default Staff
