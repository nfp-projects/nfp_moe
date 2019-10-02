import Staff from '../staff/model.mjs'
import Jwt from '../jwt.mjs'

export default class AuthHelper {
  constructor(opts = {}) {
    Object.assign(this, {
      Staff: opts.Staff || Staff,
      jwt: opts.jwt || new Jwt(),
    })
  }

  async loginStaff(ctx) {
    let staff

    try {
      staff = await this.Staff
        .query(qb => {
          qb.where({ email: ctx.request.body.username })
          qb.select('*')
        })
        .fetch({ require: true })

      await this.Staff.compare(ctx.request.body.password, staff.get('password'))
    } catch (err) {
      if (err.message === 'EmptyResponse' || err.message === 'PasswordMismatch') {
        ctx.throw(422, 'The email or password did not match')
      }
      throw err
    }

    return this.jwt.createToken(staff.get('email'), staff.get('level'))
  }
}
