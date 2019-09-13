import jsonmask from 'json-mask'

export function mask() {
  return async function(ctx, next) {
    await next()

    let body = ctx.body
    let fields = ctx.query['fields'] || ctx.fields

    if (!body || 'object' != typeof body || !fields) return

    if (body && body.toJSON) {
      body = body.toJSON()
    }

    ctx.body = jsonmask.filter(body, jsonmask.compile(fields))
  }
}
