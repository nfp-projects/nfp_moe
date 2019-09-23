import send from 'koa-send'
import defaults from './defaults'

export function serve(docRoot, pathname, options = {}) {
  options.root = docRoot

  return (ctx, next) => {
    let opts = defaults({}, options)
    if (ctx.request.method === 'OPTIONS') return

    let filepath = ctx.path.replace(pathname, '')

    if (filepath === '/') {
      filepath = '/index.html'
    }

    if (filepath.endsWith('.jpg')
        || filepath.endsWith('.png')
        || filepath.endsWith('.js')
        || filepath.endsWith('.css')
        || filepath.endsWith('.svg')) {
      opts = defaults({ maxage: 2592000 * 1000 }, opts)
    }

    return send(ctx, filepath, opts).catch((er) => {
      if (er.code === 'ENOENT' && er.status === 404) {
        return send(ctx, '/index.html', options)
      }
    })
  }
}
