import _ from 'lodash'
import jwt from 'jsonwebtoken'
import koaJwt from 'koa-jwt'
import Staff from './staff/model.mjs'
import config from './config.mjs'

export default class Jwt {
  constructor(opts = {}) {
    Object.assign(this, {
      Staff: opts.Staff || Staff,
      jwt: opts.jwt || jwt,
    })
  }

  sign(value, appendSecret = '', opts) {
    let secret = config.get('jwt:secret') + appendSecret
    let options = _.defaults(opts, config.get('jwt:options'))

    if (options.expiresIn === null) {
      delete options.expiresIn
    }

    return this.jwt.sign(value, secret, options)
  }

  signDirect(value, secret) {
    return this.jwt.sign(value, secret)
  }

  verify(token, appendSecret = '') {
    let secret = config.get('jwt:secret') + appendSecret

    return new Promise((resolve, reject) =>
      this.jwt.verify(token, secret, (err, res) => {
        if (err) return reject(err)

        resolve(res)
      })
    )
  }

  decode(token) {
    return this.jwt.decode(token)
  }

  createToken(id, email, level, opts) {
    return this.sign({
      id: id,
      email: email,
      level: level,
    }, email, opts)
  }

  static jwtMiddleware() {
    return koaJwt({
      getToken: ctx => {
        if (ctx.request.header.authorization) {
          return ctx.request.header.authorization.split(' ')[1]
        }
        if (ctx.query.token) {
          return ctx.query.token
        }
        return null
      },
      secret: (header, payload) =>
        `${config.get('jwt:secret')}${payload.email}`,
      passthrough: true,
    })
  }
}
