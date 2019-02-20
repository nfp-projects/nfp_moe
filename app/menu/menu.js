const m = require('mithril')
const Authentication = require('../authentication')

const Menu = {
  currentActive: 'home',

  onbeforeupdate: function() {
    let currentPath = m.route.get()
    if (currentPath === '/') Menu.currentActive = 'home'
    else if (currentPath === '/login') Menu.currentActive = 'login'
    else Menu.currentActive = 'none'
  },

  oninit: function() {
    Menu.onbeforeupdate()
  },

  view: function() {
    return [
      m('div.top', [
        m('h2', 'NFP Moe'),
        m('aside', Authentication.currentUser ? [
          m('p', 'Welcome ' + Authentication.currentUser.email),
          (Authentication.currentUser.level >= 100 ?
            m('a[href=/admin/addcat]', { oncreate: m.route.link }, 'Create category')
            : null
          ),
          m('a[href=/logout]', { oncreate: m.route.link }, 'Logout')
        ] : [
          m('a[href=/login]', { oncreate: m.route.link }, 'Login')
        ])
      ]),
      m('nav', [
        m('a[href=/]', {
          class: Menu.currentActive === 'home' ? 'active' : '', 
          oncreate: m.route.link
        }, 'Home'),
        m('a[href=/articles]', {
          class: Menu.currentActive === 'articles' ? 'active' : '', 
          oncreate: m.route.link
        }, 'Articles'),
      ]),
    ]
  }
}

module.exports = Menu
