/* eslint max-len: 0 */
import Router from 'koa-router'

import access from './access/index.mjs'
import AuthRoutes from './authentication/routes.mjs'
import MediaRoutes from './media/routes.mjs'
import FileRoutes from './file/routes.mjs'
import PageRoutes from './page/routes.mjs'
import ArticleRoutes from './article/routes.mjs'
import StaffRoutes from './staff/routes.mjs'
import { restrict } from './access/middleware.mjs'

const router = new Router()

// API Authentication
const authentication = new AuthRoutes()
router.post('/api/login', authentication.login.bind(authentication))
router.post('/api/login/user', authentication.loginUser.bind(authentication))

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
router.get('/api/articles', restrict(access.Manager), article.getAllArticles.bind(article))
router.get('/api/articles/public', article.getPublicAllArticles.bind(article))
router.get('/api/articles/public/:id', article.getPublicSingleArticle.bind(article))
router.get('/api/pages/:pageId/articles/public', article.getPublicAllPageArticles.bind(article))
router.get('/api/pages/:pageId/articles', restrict(access.Manager), article.getAllPageArticles.bind(article))
router.get('/api/articles/:id', restrict(access.Manager), article.getSingleArticle.bind(article))
router.post('/api/articles', restrict(access.Manager), article.createArticle.bind(article))
router.put('/api/articles/:id', restrict(access.Manager), article.updateArticle.bind(article))
router.del('/api/articles/:id', restrict(access.Manager), article.removeArticle.bind(article))

const staff = new StaffRoutes()
router.get('/api/staff', restrict(access.Admin), staff.getAllStaff.bind(staff))
router.get('/api/staff/:id', restrict(access.Admin), staff.getSingleStaff.bind(staff))
router.post('/api/staff', restrict(access.Admin), staff.createStaff.bind(staff))
router.put('/api/staff/:id', restrict(access.Admin), staff.updateStaff.bind(staff))
router.del('/api/staff/:id', restrict(access.Admin), staff.removeStaff.bind(staff))

export default router
