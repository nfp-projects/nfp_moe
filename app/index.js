const m = require('mithril')
window.m = m

m.route.prefix = ''

const Menu = require('./menu/menu')
const Footer = require('./footer/footer')
const Frontpage = require('./frontpage/frontpage')
const Login = require('./login/login')
const Logout = require('./login/logout')
const Page = require('./pages/page')
const Article = require('./article/article')
const Authentication = require('./authentication')

const menuRoot = document.getElementById('nav')
const mainRoot = document.getElementById('main')
const footerRoot = document.getElementById('footer')

const allRoutes = {
  '/': Frontpage,
  '/login': Login,
  '/logout': Logout,
  '/page/:id': Page,
  '/article/:id': Article,
}

m.route(mainRoot, '/', allRoutes)
m.mount(menuRoot, Menu)
m.mount(footerRoot, Footer)

let loadingAdmin = false
let loadedAdmin = false
let loaded = 0

const onLoaded = function() {
  loaded++
  if (loaded < 2) return

  if (window.addAdminRoutes) {
    window.addAdminRoutes.forEach(function (item) {
      allRoutes[item[0]] = item[1]
    })
    m.route(mainRoot, '/', allRoutes)
  }

  Authentication.setAdmin(Authentication.currentUser && Authentication.currentUser.level >= 10)
  loadedAdmin = true
  m.redraw()
}

const loadAdmin = function(user) {
  if (loadingAdmin) {
    if (loadedAdmin) {
      Authentication.setAdmin(user && user.level >= 10)
    }
    return
  }
  if (!user || user.level < 10) return

  loadingAdmin = true

  let element = document.createElement('link')
  element.setAttribute('rel', 'stylesheet')
  element.setAttribute('type', 'text/css')
  element.setAttribute('href', '/assets/admin.css')
  element.onload = onLoaded
  document.getElementsByTagName('head')[0].appendChild(element)

  element = document.createElement('script')
  element.setAttribute('type', 'text/javascript')
  element.setAttribute('src', '/assets/admin.js')
  element.onload = onLoaded
  document.body.appendChild(element)
}

Authentication.addEvent(loadAdmin)
if (Authentication.currentUser) {
  loadAdmin(Authentication.currentUser)
}
