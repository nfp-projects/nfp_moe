require('./polyfill')

const m = require('mithril')
window.m = m

m.route.setOrig = m.route.set
m.route.set = function(path, data, options){
  m.route.setOrig(path, data, options)
  window.scrollTo(0, 0)
}

m.route.linkOrig = m.route.link
m.route.link = function(vnode){
  m.route.linkOrig(vnode)
  window.scrollTo(0, 0)
}

const Authentication = require('./authentication')

m.route.prefix = ''
window.adminRoutes = {}
let loadingAdmin = false
let loadedAdmin = false
let loaded = 0
let elements = []

const onLoaded = function() {
  loaded++
  if (loaded < 2) return

  Authentication.setAdmin(Authentication.currentUser && Authentication.currentUser.level >= 10)
  loadedAdmin = true
  m.route.set(m.route.get())
}

const onError = function() {
  elements.forEach(function(x) { x.remove() })
  loadedAdmin = loadingAdmin = false
  loaded = 0
  m.route.set('/logout')
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

  let token = Authentication.getToken()
  let element = document.createElement('link')
  elements.push(element)
  element.setAttribute('rel', 'stylesheet')
  element.setAttribute('type', 'text/css')
  element.setAttribute('href', '/assets/admin.css?token=' + token)
  element.onload = onLoaded
  element.onerror = onError
  document.getElementsByTagName('head')[0].appendChild(element)

  element = document.createElement('script')
  elements.push(element)
  element.setAttribute('type', 'text/javascript')
  element.setAttribute('src', '/assets/admin.js?token=' + token)
  element.onload = onLoaded
  element.onerror = onError
  document.body.appendChild(element)
}

Authentication.addEvent(loadAdmin)
if (Authentication.currentUser) {
  loadAdmin(Authentication.currentUser)
}

const Menu = require('./menu/menu')
const Footer = require('./footer/footer')
const Frontpage = require('./frontpage/frontpage')
const Login = require('./login/login')
const Logout = require('./login/logout')
const Page = require('./pages/page')
const Article = require('./article/article')

const menuRoot = document.getElementById('nav')
const mainRoot = document.getElementById('main')
const footerRoot = document.getElementById('footer')

const Loader = {
  view: function() { return m('div.loading-spinner') },
}
const AdminResolver = {
  onmatch: function(args, requestedPath) {
    if (window.adminRoutes[args.path]) {
      return window.adminRoutes[args.path][args.id && 1 || 0]
    }
    return Loader
  },
  render: function(vnode) { return vnode },
}

const allRoutes = {
  '/': Frontpage,
  '/login': Login,
  '/logout': Logout,
  '/page/:id': Page,
  '/article/:id': Article,
  '/admin/:path': AdminResolver,
  '/admin/:path/:id': AdminResolver,
}

// Wait until we finish checking avif support, some views render immediately and will ask for this immediately before the callback gets called.

/*
 * imgsupport.js from leechy/imgsupport 
 */
const AVIF = new Image();
AVIF.onload = AVIF.onerror = function () {
  window.supportsavif = (AVIF.height === 2)
  document.body.className = document.body.className + ' ' + (window.supportsavif ? 'avifsupport' : 'jpegonly')

  m.route(mainRoot, '/', allRoutes)
  m.mount(menuRoot, Menu)
  m.mount(footerRoot, Footer)
}
AVIF.src = 'data:image/avif;base64,AAAAIGZ0eXBhdmlmAAAAAGF2aWZtaWYxbWlhZk1BMUIAAADybWV0YQAAAAAAAAAoaGRscgAAAAAAAAAAcGljdAAAAAAAAAAAAAAAAGxpYmF2aWYAAAAADnBpdG0AAAAAAAEAAAAeaWxvYwAAAABEAAABAAEAAAABAAABGgAAAB0AAAAoaWluZgAAAAAAAQAAABppbmZlAgAAAAABAABhdjAxQ29sb3IAAAAAamlwcnAAAABLaXBjbwAAABRpc3BlAAAAAAAAAAIAAAACAAAAEHBpeGkAAAAAAwgICAAAAAxhdjFDgQ0MAAAAABNjb2xybmNseAACAAIAAYAAAAAXaXBtYQAAAAAAAAABAAEEAQKDBAAAACVtZGF0EgAKCBgANogQEAwgMg8f8D///8WfhwB8+ErK42A=';
