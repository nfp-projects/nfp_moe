const m = require('mithril')
const Authentication = require('../authentication')
const { getAllPages, Tree, getTree } = require('../api/page')

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
    return [
      m('div.top', [
        m('h2', 'NFP Moe'),
        m('aside', Authentication.currentUser ? [
          m('p', 'Welcome ' + Authentication.currentUser.email),
          (Authentication.currentUser.level >= 100
            ? [
              m(m.route.Link, { href: '/admin/pages' }, 'Pages'),
              m(m.route.Link, { href: '/admin/articles' }, 'Articles'),
            ]
            : null
          ),
          m(m.route.Link, { href: '/logout' }, 'Logout')
        ] : [
          m(m.route.Link, { href: '/login' }, 'Login')
        ])
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
                }, page.name)
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
  }
}

module.exports = Menu
