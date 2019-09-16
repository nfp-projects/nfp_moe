const m = require('mithril')
const { getPage } = require('../api/page')
const { getAllPageArticlesPagination } = require('../api/article')
const { fetchPage } = require('../api/pagination')
const Authentication = require('../authentication')
const Newsentry = require('../widgets/newsentry')
const Pages = require('../widgets/pages')

const Page = {
  oninit: function(vnode) {
    this.error = ''
    this.lastpage = m.route.param('page') || '1'
    this.loadingnews = false
    this.fetchPage(vnode)
  },

  fetchPage: function(vnode) {
    this.path = m.route.param('id')
    this.news = []
    this.newslinks = null
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
      return vnode.state.fetchArticles(vnode)
    })
  },

  onupdate: function(vnode) {
    if (this.path !== m.route.param('id')) {
      this.fetchPage(vnode)
    } else if (m.route.param('page') && m.route.param('page') !== this.lastpage) {
      this.fetchArticles(vnode)
    }
  },

  fetchArticles: function(vnode) {
    this.loadingnews = true
    this.newslinks = null
    this.lastpage = m.route.param('page') || '1'

    return fetchPage(getAllPageArticlesPagination(this.page.id, {
      per_page: 10,
      page: this.lastpage,
      includes: ['files', 'media'],
    }))
    .then(function(result) {
      vnode.state.news = result.data
      vnode.state.newslinks = result.links
    })
    .catch(function(err) {
      vnode.state.error = err.message
    })
    .then(function() {
      vnode.state.loading = vnode.state.loadingnews = false
      m.redraw()
    })
  },

  view: function(vnode) {
    return (
      this.loading ?
        m('div.loading-spinner')
      : m('article.page', [
          this.page.banner ? m('.div.page-banner', { style: { 'background-image': 'url("' + this.page.banner.url + '")' } } ) : null,
          m('header', m('h1', this.page.name)),
          m('.container', {
              class: this.page.children.length ? 'multi' : '',
            }, [
            this.page.children.length
              ? m('aside.sidebar', [
                  m('h4', 'View ' + this.page.name + ':'),
                  this.page.children.map(function(page) {
                    return m(m.route.Link, { href: '/page/' + page.path }, page.name)
                  }),
                ])
              : null,
            this.page.description
              ? m('.fr-view', [
                  this.page.media ? m('img.page-cover', { src: this.page.media.url, alt: 'Cover image for ' + this.page.name } ) : null,
                  m.trust(this.page.description),
                  this.news.length && this.page.description
                    ? m('aside.news', [
                        m('h4', 'Latest posts under ' + this.page.name + ':'),
                        this.loadingnews ? m('div.loading-spinner') : this.news.map(function(article) {
                          return m(Newsentry, article)
                        }),
                        m(Pages, {
                          base: '/page/' + this.page.path,
                          links: this.newslinks,
                        }),
                      ])
                    : null,
                ])
              : this.news.length
                ? m('aside.news.single', [
                    this.page.media ? m('img.page-cover', { src: this.page.media.url, alt: 'Cover image for ' + this.page.name } ) : null,
                    m('h4', 'Latest posts under ' + this.page.name + ':'),
                    this.loadingnews ? m('div.loading-spinner') : this.news.map(function(article) {
                      return m(Newsentry, article)
                    }),
                    m(Pages, {
                      base: '/page/' + this.page.path,
                      links: this.newslinks,
                    }),
                  ])
                : this.page.media
                  ? m('img.page-cover.single', { src: this.page.media.url, alt: 'Cover image for ' + this.page.name } )
                  : null,
          ]),
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
