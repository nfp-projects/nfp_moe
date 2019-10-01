import { readFileSync } from 'fs'
import send from 'koa-send'
import dot from 'dot'
import defaults from './defaults.mjs'
import config from './config.mjs'
import Page from './page/model.mjs'
import Article from './article/model.mjs'

const body = readFileSync('./public/index.html').toString()
const bodyTemplate = dot.template(body)

async function sendIndex(ctx, path) {
  let tree = null
  let data = null
  let links = null
  try {
    tree = (await Page.getTree()).toJSON()
    tree.forEach(item => (
      item.children = item.children.map(x => (
        { id: x.id, name: x.name, path: x.path }
      ))
    ))
    if (path === '/') {
      data = await Article.getFrontpageArticles()

      if (data.pagination.rowCount > 10) {
        links = {
          current: { title: 'Page 1' },
          next: { page: 2, title: 'Next' },
          last: { page: Math.ceil(data.pagination.rowCount / 10), title: 'Last' },
        }
      } else {
        links = {
          current: { title: 'Page 1' },
        }
      }
      data = data.toJSON().map(x => ({
        id: x.id,
        created_at: x.created_at,
        path: x.path,
        description: x.description,
        name: x.name,
        media: x.media && ({
          medium_url: x.media.medium_url,
          small_url: x.media.small_url,
        }) || null,
        banner: x.banner && ({
          large_url: x.banner.large_url,
          medium_url: x.banner.medium_url,
          small_url: x.banner.small_url,
        }) || null,
        files: x.files && x.files.map(f => ({
          filename: f.filename,
          url: f.url,
          magnet: f.magnet,
          meta: f.meta.torrent && ({
            torrent: {
              files: f.meta.torrent.files.map(tf => ({
                name: tf.name,
                size: tf.size,
              })),
            },
          }) || {},
        })) || [],
      }))
    }
  } catch (e) {
    ctx.log.error(e)
  }
  ctx.body = bodyTemplate({
    v: config.get('CIRCLECI_VERSION'),
    tree: JSON.stringify(tree),
    data: JSON.stringify(data),
    links: JSON.stringify(links),
  })
  ctx.set('Content-Length', Buffer.byteLength(ctx.body))
  ctx.set('Cache-Control', 'max-age=0')
  ctx.set('Content-Type', 'text/html; charset=utf-8')
}

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

    if (filepath === '/index.html') {
      return sendIndex(ctx, '/')
    }

    return send(ctx, filepath, opts).catch((er) => {
      if (er.code === 'ENOENT' && er.status === 404) {
        return sendIndex(ctx)
        // return send(ctx, '/index.html', options)
      }
    })
  }
}
