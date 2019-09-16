const m = require('mithril')

m.route.prefix = ''

const Menu = require('./menu/menu')
const Footer = require('./footer/footer')
const Frontpage = require('./frontpage/frontpage')
const Login = require('./login/login')
const Logout = require('./login/logout')
const EditPage = require('./admin/editpage')
const Page = require('./pages/page')
const Article = require('./article/article')
const AdminPages = require('./admin/pages')
const AdminArticles = require('./admin/articles')
const EditArticle = require('./admin/editarticle')
const AdminStaffList = require('./admin/stafflist')
const EditStaff = require('./admin/editstaff')

const menuRoot = document.getElementById('nav')
const mainRoot = document.getElementById('main')
const footerRoot = document.getElementById('footer')

m.route(mainRoot, '/', {
  '/': Frontpage,
  '/login': Login,
  '/logout': Logout,
  '/page/:id': Page,
  '/article/:id': Article,
  '/admin/pages': AdminPages,
  '/admin/pages/:key': EditPage,
  '/admin/articles': AdminArticles,
  '/admin/articles/:id': EditArticle,
  '/admin/staff': AdminStaffList,
  '/admin/staff/:id': EditStaff,
})
m.mount(menuRoot, Menu)
m.mount(footerRoot, Footer)
