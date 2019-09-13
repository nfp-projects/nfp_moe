const m = require('mithril')
const { getPage } = require('../api/page')
const Authentication = require('../authentication')
const Newsentry = require('../widgets/newsentry')

const Page = {
  oninit: function(vnode) {
    this.path = m.route.param('key')
    this.error = ''
    this.page = {
      id: 0,
      name: '',
      path: '',
      description: '',
      media: null,
    }

    this.loading = true

    getPage(this.path)
    .then(function(result) {
      vnode.state.page = result
    })
    .catch(function(err) {
      vnode.state.error = err.message
    })
    .then(function() {
      vnode.state.loading = false
      m.redraw()
    })
  },

  view: function(vnode) {
    return (
      this.loading ?
        m('div.loading-spinner')
      : m('article.page', [
          this.page.banner ? m('.div.page-banner', { style: { 'background-image': 'url(' + this.page.banner.url + ')' } } ) : null,
          m('header', m('h1', this.page.name)),
          m('.container', {
              class: this.page.children.length ? 'multi' : '',
            }, [
            this.page.children.length
              ? m('aside.sidebar', [
                  m('h4', 'View ' + this.page.name + ':'),
                  this.page.children.map(function(page) {
                    return m(m.route.Link, { href: '/page/' + page.path, }, page.name)
                  }),
                ])
              : null,
            this.page.description
              ? m('.fr-view', [
                  this.page.media ? m('img.page-cover', { src: this.page.media.url } ) : null,
                  m.trust(this.page.description),
                  this.page.news.length && this.page.description
                    ? m('aside.news', [
                        m('h4', 'Latest updates under ' + this.page.name + ':'),
                        this.page.news.map(function(article) {
                          return m(Newsentry, article)
                        }),
                      ])
                    : null
                ])
              : null,
          ]),
          this.page.news.length && !this.page.description
            ? m('aside.news', {
                class: this.page.description ? '' : 'single'
              }, [
                m('h4', 'Latest updates under ' + this.page.name + ':'),
                this.page.news.map(function(article) {
                  return m(Newsentry, article)
                }),
              ])
            : null,
          Authentication.currentUser
            ? m('div.admin-actions', [
              m('span', 'Admin controls:'),
              m(m.route.Link, { href: '/admin/pages/' + this.page.id }, 'Edit page'),
            ])
            : null,
        ])
    )
  },
}

module.exports = Page
