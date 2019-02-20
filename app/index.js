const m = require('mithril')

m.route.prefix('')

const Authentication = require('./authentication')
const Menu = require('./menu/menu')
const Frontpage = require('./frontpage/frontpage')
const Login = require('./login/login')
const Logout = require('./login/logout')
const EditCategory = require('./admin/editcat')

const menuRoot = document.getElementById('nav')
const mainRoot = document.getElementById('main')

m.route(mainRoot, '/', {
  '/': Frontpage,
  '/login': Login,
  '/logout': Logout,
  '/admin/addcat': EditCategory,
})
m.mount(menuRoot, Menu)
