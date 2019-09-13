const m = require('mithril')

m.route.prefix = ''

const Authentication = require('./authentication')
const Menu = require('./menu/menu')
const Frontpage = require('./frontpage/frontpage')
const Login = require('./login/login')
const Logout = require('./login/logout')
const EditPage = require('./admin/editpage')
const Page = require('./pages/page')
const AdminPages = require('./admin/pages')
const AdminArticles = require('./admin/articles')
const EditArticle = require('./admin/editarticle')

const menuRoot = document.getElementById('nav')
const mainRoot = document.getElementById('main')

m.route(mainRoot, '/', {
  '/': Frontpage,
  '/login': Login,
  '/logout': Logout,
  '/page/:key': Page,
  '/admin/pages': AdminPages,
  '/admin/pages/:key': EditPage,
  '/admin/articles': AdminArticles,
  '/admin/articles/:key': EditArticle,
})
m.mount(menuRoot, Menu)
