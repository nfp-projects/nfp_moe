import Staff from '../staff/model.mjs'
import Jwt from '../jwt.mjs'
import * as security from './security.mjs'
import AuthHelper from './helper.mjs'

export default class AuthRoutes {
  constructor(opts = {}) {
    Object.assign(this, {
      helper: opts.helper || new AuthHelper(),
      Staff: opts.Staff || Staff,
      jwt: opts.jwt || new Jwt(),
      security: opts.security || security,
    })
  }

  /*
   * POST /api/login/user - Authenticate a user using password login
   *
   * @body {string} username - Username
   * @body {string} password - Password
   * @returns
   *
   * { token: 'Authentication token' }
   */
  async loginUser(ctx) {
    this.security.isValidLogin(ctx, ctx.request.body)

    let token = await this.helper.loginStaff(ctx)

    ctx.body = { token }
  }
}
