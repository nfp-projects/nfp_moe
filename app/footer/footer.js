const m = require('mithril')
const Page = require('../api/page.p')
const Authentication = require('../authentication')

const Footer = {
  oninit: function(vnode) {
    this.year = new Date().getFullYear()
  },

  view: function() {
    return [
      m('div.footer-filler'),
      m('div.sitemap', [
        m('div', 'Sitemap'),
        m(m.route.Link, { class: 'root', href: '/' }, 'Home'),
        Page.Tree.map(function(page) {
          return [
            m(m.route.Link, { class: 'root', href: '/page/' + page.path }, page.name),
            (page.children.length
              ? m('ul', page.children.map(function(subpage) {
                  return m('li', m(m.route.Link, { class: 'child', href: '/page/' + subpage.path }, subpage.name))
                }))
              : null),
          ]
        }),
        !Authentication.currentUser
          ? m(m.route.Link, { class: 'root', href: '/login' }, 'Login')
          : null,
        m('div.meta', [
          '©'
          + this.year
          + ' NFP Encodes - nfp@nfp.moe - ',
          m('a', { rel: 'noopener', href: 'https://www.iubenda.com/privacy-policy/31076050', target: '_blank' }, 'Privacy Policy'),
          ' (Fuck EU)',
        ]),
      ]),
      m('div.footer-logo'),
    ]
  },
}

module.exports = Footer
