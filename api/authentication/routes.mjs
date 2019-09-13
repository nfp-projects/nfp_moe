import Staff from '../staff/model'
import Jwt from '../jwt'
import * as google from './google'

export default class AuthRoutes {
  constructor(opts = {}) {
    Object.assign(this, {
      Staff: opts.Staff || Staff,
      jwt: opts.jwt || new Jwt(),
      google: opts.google || google,
    })
  }

  /*
   * POST /api/login - Authenticate a user using social login
   *
   * @body {string} token - The google token to authenticate
   * @returns
   *
   * { token: 'Authentication token' }
   */
  async login(ctx) {
    let output = await google.getProfile(ctx.request.body.token)

    if (output.email_verified !== 'true') ctx.throw(422, 'Email was not verified with google')
    if (!output.email) ctx.throw(422, 'Email was missing from google response')

    let level = 1
    let staff = await this.Staff
      .query({ where: { email: output.email }})
      .fetch({ require: false })

    if (staff && staff.id && staff.get('level')) {
      level = staff.get('level')
    }

    ctx.body = { token: this.jwt.createToken(output.email, level) }
  }
}
