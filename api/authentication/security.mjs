
export function isValidLogin(ctx, body) {
  if (!body.username) {
    ctx.throw(422, 'Body was missing property username')
  }

  if (!body.password) {
    ctx.throw(422, 'Body was missing property password')
  }

  if (typeof body.password !== 'string') {
    ctx.throw(422, 'Property password must be a string')
  }

  if (typeof body.username !== 'string') {
    ctx.throw(422, 'Property username must be a string')
  }
}
