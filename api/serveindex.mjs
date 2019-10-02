import { readFileSync } from 'fs'
import dot from 'dot'
import striptags from 'striptags'

import config from './config.mjs'
import Page from './page/model.mjs'
import Article from './article/model.mjs'

const body = readFileSync('./public/index.html').toString()
const bodyTemplate = dot.template(body)
const frontend = config.get('frontend:url')

function mapArticle(x) {
  return {
    id: x.id,
    created_at: x.created_at,
    published_at: x.published_at,
    path: x.path,
    description: x.description,
    name: x.name,
    media: x.media && ({
      large_url: x.media.large_url,
      medium_url: x.media.medium_url,
      small_url: x.media.small_url,
    }) || null,
    banner: x.banner && ({
      large_url: x.banner.large_url,
      medium_url: x.banner.medium_url,
      small_url: x.banner.small_url,
    }) || null,
    parent: x.parent && ({
      id: x.parent.id,
      name: x.parent.name,
      path: x.parent.path,
    }),
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
  }
}

function mapPage(x) {
  return {
    id: x.id,
    created_at: x.created_at,
    path: x.path,
    description: x.description,
    name: x.name,
    media: x.media && ({
      large_url: x.media.large_url,
      medium_url: x.media.medium_url,
      small_url: x.media.small_url,
    }) || null,
    banner: x.banner && ({
      large_url: x.banner.large_url,
      medium_url: x.banner.medium_url,
      small_url: x.banner.small_url,
    }) || null,
    children: x.children && x.children.map(f => ({
      id: f.id,
      path: f.path,
      name: f.name,
    })) || [],
  }
}

export async function serveIndex(ctx, path) {
  let tree = null
  let data = null
  let links = null
  let featured = null
  let url = frontend + ctx.request.url
  let image = frontend + '/assets/img/heart.jpg'
  let title = 'NFP Moe - Anime/Manga translation group'
  let description = 'Small fansubbing and scanlation group translating and encoding our favourite shows from Japan.'
  try {
    tree = (await Page.getTree()).toJSON()
    tree.forEach(item => (
      item.children = item.children.map(x => (
        { id: x.id, name: x.name, path: x.path }
      ))
    ))
    featured = await Article.getFeatured(['files', 'media', 'banner'])
    if (featured) {
      featured = mapArticle(featured.toJSON())
    }

    if (path === '/') {
      data = await Article.getFrontpageArticles(Number(ctx.query.page || '1'))

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
      data = data.toJSON().map(mapArticle)
    } else if (path.startsWith('/article/') || path.startsWith('/page/')) {
      let id = path.split('/')[2]
      if (id) {
        let found
        if (path.startsWith('/article/')) {
          found = await Article.getSingle(id, ['media', 'parent', 'banner', 'files'], false, null, true)
          if (found) {
            found = mapArticle(found.toJSON())
          }
          data = found
        } else {
          found = await Page.getSingle(id, ['media', 'banner', 'children'])
          found = mapPage(found.toJSON())
          data = found
        }
        if (found) {
          if (found.media) {
            image = found.media.large_url
          } else if (found.banner) {
            image = found.banner.large_url
          }
          if (found.description) {
            description = striptags(found.description)
          }
          if (found.parent) {
            title = found.name + ' - ' + found.parent.name + ' - NFP Moe'
          } else {
            title = found.name + ' - NFP Moe'
          }
        }
      }
    }
  } catch (e) {
    ctx.log.error(e)
    data = null
    links = null
  }
  ctx.body = bodyTemplate({
    v: config.get('CIRCLECI_VERSION'),
    tree: JSON.stringify(tree),
    data: JSON.stringify(data),
    links: JSON.stringify(links),
    featured: JSON.stringify(featured),
    url: url,
    image: image,
    title: title,
    description: description,
  })
  ctx.set('Content-Length', Buffer.byteLength(ctx.body))
  ctx.set('Cache-Control', 'max-age=0')
  ctx.set('Content-Type', 'text/html; charset=utf-8')
}
