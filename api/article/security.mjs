import filter from '../filter.mjs'

const requiredFields = [
  'name',
  'path',
]

const validFields = [
  'name',
  'path',
  'staff_id',
  'description',
  'parent_id',
  'media_id',
  'banner_id',
  'published_at',
  'is_featured',
]

export async function ensureIncludes(ctx) {
  let out = filter(ctx.state.filter.includes, ['staff', 'media', 'parent', 'banner', 'files'])

  if (out.length > 0) {
    ctx.throw(422, `Includes had following invalid values: ${out.join(', ')}`)
  }
}

export async function validUpdate(ctx) {
  requiredFields.forEach(item => {
    if (ctx.request.body[item] == null) {
      ctx.throw(422, `Property was missing: ${item}`)
    }
  })

  let out = filter(Object.keys(ctx.request.body), validFields)

  if (out.length > 0) {
    ctx.throw(422, `Body had following invalid properties: ${out.join(', ')}`)
  }

  if (ctx.request.body.published_at) {
    ctx.request.body.published_at = new Date(ctx.request.body.published_at)
  }
}
