import send from 'koa-send'
import defaults from './defaults.mjs'
import access from './access/index.mjs'
import { restrict } from './access/middleware.mjs'
import { serveIndex } from './serveindex.mjs'

const restrictAdmin = restrict(access.Manager)

export function serve(docRoot, pathname, options = {}) {
  options.root = docRoot

  return async (ctx, next) => {
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
      if (filepath.indexOf('admin') === -1) {
        opts = defaults({ maxage: 2592000 * 1000 }, opts)
      }
    }

    if (filepath === '/index.html') {
      return serveIndex(ctx, '/')
    }

    if (filepath.indexOf('admin') >= 0
        && (filepath.indexOf('js') >= 0
            || filepath.indexOf('css') >= 0)) {
      await restrictAdmin(ctx)
      ctx.set('Cache-Control', 'no-store, no-cache, must-revalidate')
    }

    return send(ctx, filepath, opts).catch((er) => {
      if (er.code === 'ENOENT' && er.status === 404) {
        return serveIndex(ctx, filepath)
        // return send(ctx, '/index.html', options)
      }
    })
  }
}
