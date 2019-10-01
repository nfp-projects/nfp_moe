const m = require('mithril')
const Authentication = require('../authentication')
const Darkmode = require('../darkmode')
const Page = require('../api/page.p')

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

    if (Page.Tree.length) return

    Menu.loading = true

    Page.getTree()
    .then(function(results) {
      Page.Tree.splice(0, Page.Tree.length)
      Page.Tree.push.apply(Page.Tree, results)
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
        m(m.route.Link,
          { href: '/', class: 'logo' },
          m('h2', 'NFP Moe')
        ),
        m('aside', Authentication.currentUser ? [
          m('p', [
            'Welcome ' + Authentication.currentUser.email,
            m(m.route.Link, { href: '/logout' }, 'Logout'),
            (Darkmode.darkIsOn
              ? m('button.dark', { onclick: Darkmode.setDarkMode.bind(Darkmode, false) }, 'Day mode')
              : m('button.dark', { onclick: Darkmode.setDarkMode.bind(Darkmode, true) }, 'Night mode')
            ),
          ]),
          (Authentication.isAdmin
            ? m('div.adminlinks', [
                m(m.route.Link, { href: '/admin/articles/add' }, 'Create article'),
                m(m.route.Link, { href: '/admin/articles' }, 'Articles'),
                m(m.route.Link, { href: '/admin/pages' }, 'Pages'),
                m(m.route.Link, { hidden: Authentication.currentUser.level < 100, href: '/admin/staff' }, 'Staff'),
              ])
            : (Authentication.currentUser.level > 10 ? m('div.loading-spinner') : null)
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
        Menu.loading ? m('div.loading-spinner') : Page.Tree.map(function(page) {
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
