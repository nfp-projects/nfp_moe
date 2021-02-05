import { createPrototype, safeColumns } from '../knex.mjs'
import bcrypt from 'bcrypt'
/*import config from '../config.mjs'*/

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

function StaffItem(data) {
  Object.assign(this, data)
}

function Staff() {
  this.tableName = 'staff'
  this.Model = StaffItem
  this.privateFields = safeColumns(['fullname','email','level',])
  this.publicFields = ['id', 'fullname']
  this.init()
}

Staff.prototype = createPrototype({
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

  _getSingle(subq, includes = [], require = true, ctx = null) {
    return this.getSingleQuery(this.query(qb => {
      return qb
        .where(qb => {
          if (subq) subq(qb)
        })
    }, includes, this.privateFields), require)
  },

  /* getAll(ctx, where = {}, withRelated = [], orderBy = 'id') {
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
  }, */
})

export default new Staff()
