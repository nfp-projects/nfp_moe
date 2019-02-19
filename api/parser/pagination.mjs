import _ from 'lodash'
import { format } from 'url'
import config from '../config'

function limit(value, min, max, fallback) {
  let out = parseInt(value, 10)

  if (!out) {
    out = fallback
  }

  if (out < min) {
    out = min
  }

  if (out > max) {
    out = max
  }

  return out
}

export function parsePagination(ctx) {
  let out = {
    perPage: limit(ctx.query.perPage, 1, 1500, 1250),
    page: limit(ctx.query.page, 1, Number.MAX_SAFE_INTEGER, 1),
  }

  Object.keys(ctx.query).forEach(item => {
    if (item.startsWith('perPage.')) {
      let name = item.substring(8)
      out[name] = {
        perPage: limit(ctx.query[`perPage.${name}`], 1, 1500, 1250),
        page: limit(ctx.query[`page.${name}`], 1, Number.MAX_SAFE_INTEGER, 1),
      }
    }
  })

  return out
}

export function parseFilter(ctx) {
  let where
  let whereNot

  where = _.omitBy(ctx.query, test => test[0] === '!')

  whereNot = _.pickBy(ctx.query, test => test[0] === '!')
  whereNot = _.transform(
    whereNot,
    (result, value, key) => (result[key] = value.slice(1))
  )

  return {
    where: pick => _.pick(where, pick),
    whereNot: pick => _.pick(whereNot, pick),
    includes: (ctx.query.includes && ctx.query.includes.split(',')) || [],
  }
}

export function generateLinks(ctx, total) {
  let out = []

  let base = _(ctx.query)
    .omit(['page'])
    .transform((res, val, key) => res.push(`${key}=${val}`), [])
    .value()

  if (!ctx.query.perPage) {
    base.push(`perPage=${ctx.state.pagination.perPage}`)
  }

  // let protocol = ctx.protocol

  // if (config.get('frontend:url').startsWith('https')) {
  //   protocol = 'https'
  // }

  let proto = ctx.protocol

  if (config.get('frontend:url').startsWith('https')) {
    proto = 'https'
  }

  let first = format({
    protocol: proto,
    host: ctx.host,
    pathname: ctx.path,
  })

  first += `?${base.join('&')}`

  // Add the current page first
  out.push({
    rel: 'current',
    title: `Page ${ctx.query.page || 1}`,
    url: `${first}`,
  })

  // Then add any previous pages if we can
  if (ctx.state.pagination.page > 1) {
    out.push({
      rel: 'previous',
      title: 'Previous',
      url: `${first}&page=${ctx.state.pagination.page - 1}`,
    })
    out.push({
      rel: 'first',
      title: 'First',
      url: `${first}&page=1`,
    })
  }

  // Then add any next pages if we can
  if ((ctx.state.pagination.perPage * (ctx.state.pagination.page - 1)) + ctx.state.pagination.perPage < total) {
    out.push({
      rel: 'next',
      title: 'Next',
      url: `${first}&page=${ctx.state.pagination.page + 1}`,
    })
    out.push({
      rel: 'last',
      title: 'Last',
      url: `${first}&page=${Math.ceil(total / ctx.state.pagination.perPage)}`,
    })
  }

  return out
}
