const m = require('mithril')
const Authentication = require('../authentication')
const Darkmode = require('../darkmode')
const { Tree, getTree } = require('../api/page')

const Menu = {
  currentActive: 'home',
  error: '',
  loading: false,

  onbeforeupdate: function() {
    let currentPath = m.route.get()
    if (currentPath === '/') Menu.currentActive = 'home'
    else if (currentPath === '/login') Menu.currentActive = 'login'
    else Menu.currentActive = currentPath
  },

  oninit: function(vnode) {
    Menu.onbeforeupdate()

    Menu.loading = true

    getTree()
    .then(function(results) {
      Tree.splice(0, Tree.Length)
      Tree.push.apply(Tree, results)
    })
    .catch(function(err) {
      Menu.error = err.message
    })
    .then(function() {
      Menu.loading = false
      m.redraw()
    })
  },

  view: function() {
    var pixelRatio = window.devicePixelRatio || 1
    return [
      m('div.top', [
        m(m.route.Link,
          { href: '/', class: 'logo', style: {
            'background-image': pixelRatio > 1 ? 'url("/assets/img/logo.jpg")' : 'url("/assets/img/logo_small.jpg")'
          } },
          m('h2', 'NFP Moe')
        ),
        m('aside', Authentication.currentUser ? [
          m('p', [
            'Welcome ' + Authentication.currentUser.email,
            m(m.route.Link, { href: '/logout' }, 'Logout'),
            (Darkmode.darkIsOn
              ? m('button.dark', { onclick: Darkmode.setDarkMode.bind(Darkmode, false) }, 'Day mode')
              : m('button.dark', { onclick: Darkmode.setDarkMode.bind(Darkmode, true) }, 'Night mode')
            )
          ]),
          (Authentication.currentUser.level >= 10
            ? m('div.adminlinks', [
                m(m.route.Link, { href: '/admin/articles/add' }, 'Create article'),
                m(m.route.Link, { href: '/admin/articles' }, 'Articles'),
                m(m.route.Link, { href: '/admin/pages' }, 'Pages'),
                m(m.route.Link, { hidden: Authentication.currentUser.level < 100, href: '/admin/staff' }, 'Staff'),
              ])
            : null
          ),
        ] : (Darkmode.darkIsOn
            ? m('button.dark', { onclick: Darkmode.setDarkMode.bind(Darkmode, false) }, 'Day mode')
            : m('button.dark', { onclick: Darkmode.setDarkMode.bind(Darkmode, true) }, 'Night mode')
          )
        ),
      ]),
      m('nav', [
        m(m.route.Link, {
          href: '/',
          class: Menu.currentActive === 'home' ? 'active' : '',
        }, 'Home'),
        Menu.loading ? m('div.loading-spinner') : Tree.map(function(page) {
          if (page.children.length) {
            return m('div.hassubmenu', [
                m(m.route.Link, {
                  href: '/page/' + page.path,
                  class: Menu.currentActive === ('/page/' + page.path) ? 'active' : '',
                }, page.name),
              ])
          }
          return m(m.route.Link, {
            href: '/page/' + page.path,
            class: Menu.currentActive === ('/page/' + page.path) ? 'active' : '',
          }, page.name)
        }),
      ]),
      Menu.error ? m('div.menuerror', Menu.error) : null,
    ]
  },
}

module.exports = Menu
