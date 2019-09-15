import filter from '../filter.mjs'
import Staff from './model.mjs'

const validFields = [
  'fullname',
  'email',
  'password',
  'level',
]

export async function validUpdate(ctx) {
  let out = filter(Object.keys(ctx.request.body), validFields)

  if (out.length > 0) {
    ctx.throw(422, `Body had following invalid properties: ${out.join(', ')}`)
  }

  if (ctx.request.body.password) {
    ctx.request.body.password = await Staff.hash(ctx.request.body.password)
  }
}
