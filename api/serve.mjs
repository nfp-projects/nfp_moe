import send from 'koa-send'

export function serve(docRoot, pathname, options = {}) {
  options.root = docRoot

  return (ctx, next) => {
    if (ctx.request.method === 'OPTIONS') return

    let filepath = ctx.path.replace(pathname, '')

    if (filepath === '/') {
      filepath = '/index.html'
    }

    return send(ctx, filepath, options).catch((er) => {
      if (er.code === 'ENOENT' && er.status === 404) {
        return send(ctx, '/index.html', options)
      }
    })
  }
}
