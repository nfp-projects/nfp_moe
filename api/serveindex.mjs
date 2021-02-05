import { readFileSync } from 'fs'
import dot from 'dot'
import striptags from 'striptags'

import config from './config.mjs'
import Page from './page/model.mjs'
// import Article from '../app/article/model.mjs'
import Article from './article/model.mjs'

const body = readFileSync('./public/index.html').toString()
const bodyTemplate = dot.template(body)
const frontend = config.get('frontend:url')

function mapArticle(trim = false, x, includeBanner = false, includeFiles = true) {
  return {
    id: x.id,
    published_at: x.published_at,
    path: x.path,
    description: x.description,
    name: x.name,
    staff: x.staff && ({
      id: x.staff.id,
      fullname: x.staff.fullname,
    }) || null,
    media: x.media && ({
      link: !trim && x.media.link || null,
      large_url: x.media.large_url,
      large_url_avif: x.media.large_url_avif,
      medium_url: x.media.medium_url,
      medium_url_avif: x.media.medium_url_avif,
      small_url: x.media.small_url,
      small_url_avif: x.media.small_url_avif,
    }) || null,
    banner: x.banner && includeBanner && ({
      large_url: x.banner.large_url,
      large_url_avif: x.banner.large_url_avif,
      medium_url: x.banner.medium_url,
      medium_url_avif: x.banner.medium_url_avif,
      small_url: x.banner.small_url,
      small_url_avif: x.banner.small_url_avif,
    }) || null,
    parent: x.parent && ({
      id: x.parent.id,
      name: x.parent.name,
      path: x.parent.path,
    }),
    files: x.files && includeFiles && x.files.map(f => ({
      filename: f.filename,
      url: f.url,
      magnet: f.magnet,
      meta: f.meta.torrent && ({
        torrent: {
          name: f.meta.torrent.name,
          files: f.meta.torrent.files.map(tf => {
            if (trim && f.meta.torrent.files.length > 4) return 1
            return {
              name: tf.name,
              size: tf.size,
            }
          }),
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
      link: x.media.link,
      large_url: x.media.large_url,
      large_url_avif: x.media.large_url_avif,
      medium_url: x.media.medium_url,
      medium_url_avif: x.media.medium_url_avif,
      small_url: x.media.small_url,
      small_url_avif: x.media.small_url_avif,
    }) || null,
    parent: x.parent && ({
      id: x.parent.id,
      name: x.parent.name,
      path: x.parent.path,
    }),
    banner: x.banner && ({
      large_url: x.banner.large_url,
      large_url_avif: x.banner.large_url_avif,
      medium_url: x.banner.medium_url,
      medium_url_avif: x.banner.medium_url_avif,
      small_url: x.banner.small_url,
      small_url_avif: x.banner.small_url_avif,
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
  let subdata = null
  let links = null
  let featured = null
  let url = frontend + ctx.request.url
  let image = frontend + '/assets/img/heart.png'
  let image_avif = frontend + '/assets/img/heart.png'
  let title = 'NFP Moe - Anime/Manga translation group'
  let description = 'Small fansubbing and scanlation group translating and encoding our favourite shows from Japan.'
  try {
    tree = await Page.getTree()
    let currPage = Number(ctx.query.page || '1')

    if (path === '/') {
      let frontpage = await Article.getFrontpageArticles(currPage)
      featured = frontpage.featured
      data = frontpage.items.map(mapArticle.bind(null, true))

      if (frontpage.total > currPage * 10) {
        links = {
          first: currPage > 1 ? { page: 1, title: 'First' } : null,
          previous: currPage > 1 ? { page: currPage - 1, title: 'Previous' } : null,
          current: { title: 'Page ' + currPage },
          next: { page: currPage + 1, title: 'Next' },
          last: { page: Math.ceil(frontpage.total / 10), title: 'Last' },
        }
      } else {
        links = {
          first: currPage > 1 ? { page: 1, title: 'First' } : null,
          previous: currPage > 1 ? { page: currPage - 1, title: 'Previous' } : null,
          current: { title: 'Page 1' },
        }
      }
      if (currPage > 1) {
        links.previous = { page: currPage - 1, title: 'Previous' }
        links.first = { page: 1, title: 'First' }
      }
    } else if (path.startsWith('/article/') || path.startsWith('/page/')) {
      let id = path.split('/')[2]
      if (id) {
        if (path.startsWith('/article/')) {
          data = await Article.getSingle(id, ['media', 'parent', 'banner', 'files', 'staff'], false, null, true)
          if (data) {
            data = mapArticle(false, data)
          }
        } else {
          data = await Page.getSingle(id, ['media', 'banner', 'children', 'parent'])
          data = mapPage(data)
          ctx.state.pagination = {
            perPage: 10,
            page: currPage,
          }
          subdata = await Article.getAllFromPage(ctx, data.id, ['files', 'media'], '-published_at', true)
          subdata = subdata.map(mapArticle.bind(null, true))
          if (ctx.state.pagination.total > currPage * 10) {
            links = {
              first: currPage > 1 ? { page: 1, title: 'First' } : null,
              previous: currPage > 1 ? { page: currPage - 1, title: 'Previous' } : null,
              current: { title: 'Page ' + currPage },
              next: { page: currPage + 1, title: 'Next' },
              last: { page: Math.ceil(ctx.state.pagination.total / 10), title: 'Last' },
            }
          } else {
            links = {
              first: currPage > 1 ? { page: 1, title: 'First' } : null,
              previous: currPage > 1 ? { page: currPage - 1, title: 'Previous' } : null,
              current: { title: 'Page 1' },
            }
          }
        }
        if (data) {
          if (data.media) {
            image = data.media.large_url
            image_avif = data.media.large_url_avifl
          } else if (data.banner) {
            image = data.banner.large_url
            image_avif = data.banner.large_url_avifl
          }
          if (data.description) {
            description = striptags(data.description)
          }
          if (data.parent) {
            title = data.name + ' - ' + data.parent.name + ' - NFP Moe'
          } else {
            title = data.name + ' - NFP Moe'
          }
        }
      }
    }    
    if (!featured) {
      featured = await Article.getFeaturedArticle(['media', 'banner'])
    }
    if (featured) {
      featured = mapArticle(true, featured, true, false)
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
    subdata: JSON.stringify(subdata),
    links: JSON.stringify(links),
    featured: JSON.stringify(featured),
    url: url,
    image: image,
    image_avif: image_avif,
    title: title,
    description: description,
  })
  ctx.set('Content-Length', Buffer.byteLength(ctx.body))
  ctx.set('Cache-Control', 'max-age=0')
  ctx.set('Content-Type', 'text/html; charset=utf-8')
}
