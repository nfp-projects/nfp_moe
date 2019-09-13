/* eslint max-len: 0 */
import Router from 'koa-router'

import access from './access'
import AuthRoutes from './authentication/routes'
import MediaRoutes from './media/routes'
import FileRoutes from './file/routes'
import PageRoutes from './page/routes'
import ArticleRoutes from './article/routes'
import { restrict } from './access/middleware'

const router = new Router()

// API Authentication
const authentication = new AuthRoutes()
router.post('/api/login', authentication.login.bind(authentication))

// API Media
const media = new MediaRoutes()
router.get('/api/media', restrict(access.Manager), media.getAllMedia.bind(media))
router.post('/api/media', restrict(access.Manager), media.upload.bind(media))
router.del('/api/media/:id', restrict(access.Manager), media.removeMedia.bind(media))

// API File
const file = new FileRoutes()
router.get('/api/file', restrict(access.Manager), file.getAllFiles.bind(file))
router.post('/api/articles/:articleId/file', restrict(access.Manager), file.upload.bind(file))
router.del('/api/file/:id', restrict(access.Manager), file.removeFile.bind(file))

const page = new PageRoutes()
router.get('/api/pages', page.getAllPages.bind(page))
router.get('/api/pages/:id', page.getSinglePage.bind(page))
router.post('/api/pages', restrict(access.Manager), page.createPage.bind(page))
router.put('/api/pages/:id', restrict(access.Manager), page.updatePage.bind(page))
router.del('/api/pages/:id', restrict(access.Manager), page.removePage.bind(page))

const article = new ArticleRoutes()
router.get('/api/articles', article.getAllArticles.bind(article))
router.get('/api/articles/:id', article.getSingleArticle.bind(article))
router.post('/api/articles', restrict(access.Manager), article.createArticle.bind(article))
router.put('/api/articles/:id', restrict(access.Manager), article.updateArticle.bind(article))
router.del('/api/articles/:id', restrict(access.Manager), article.removeArticle.bind(article))

export default router
