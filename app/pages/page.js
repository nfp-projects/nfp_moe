const m = require('mithril')
const ApiPage = require('../api/page.p')
const Article = require('../api/article.p')
const pagination = require('../api/pagination')
const Authentication = require('../authentication')
const Newsentry = require('../widgets/newsentry')
const Pages = require('../widgets/pages')

const Page = {
  oninit: function(vnode) {
    this.error = ''
    this.lastpage = m.route.param('page') || '1'
    this.loadingnews = false

    if (window.__nfpdata) {
      this.path = m.route.param('id')
      this.page = window.__nfpdata
      this.news = []
      this.newslinks = null
      window.__nfpdata = null
      vnode.state.fetchArticles(vnode)
    } else {
      this.fetchPage(vnode)
    }
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

    ApiPage.getPage(this.path)
    .then(function(result) {
      vnode.state.page = result
      document.title = result.name + ' - NFP Moe'
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

    return pagination.fetchPage(Article.getAllPageArticlesPagination(this.page.id, {
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
    var deviceWidth = window.innerWidth
    var pixelRatio = window.devicePixelRatio || 1
    var bannerPath = ''
    var imagePath = ''

    if (this.page && this.page.banner) {
      if (deviceWidth < 400 && pixelRatio <= 1) {
        bannerPath = this.page.banner.small_url
      } else if ((deviceWidth < 800 && pixelRatio <= 1)
                || (deviceWidth < 600 && pixelRatio > 1)) {
        bannerPath = this.page.banner.medium_url
      } else {
        bannerPath = this.page.banner.large_url
      }
    }

    if (this.page && this.page.media) {
      if ((deviceWidth < 1000 && pixelRatio <= 1)
                || (deviceWidth < 800 && pixelRatio > 1)) {
        imagePath = this.page.media.medium_url
      } else {
        imagePath = this.page.media.large_url
      }
    }

    return (
      this.loading ?
        m('div.loading-spinner')
      : m('article.page', [
          bannerPath ? m('.div.page-banner', { style: { 'background-image': 'url("' + bannerPath + '")' } } ) : null,
          this.page.parent
            ? m('div.goback', ['« ', m(m.route.Link, { href: '/page/' + this.page.parent.path }, this.page.parent.name)])
            : m('div.goback', ['« ', m(m.route.Link, { href: '/' }, 'Home')]),
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
                  imagePath ? m('a', { href: this.page.media.link}, m('img.page-cover', { src: imagePath, alt: 'Cover image for ' + this.page.name } )) : null,
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
                    imagePath ? m('a', { href: this.page.media.link}, m('img.page-cover', { src: imagePath, alt: 'Cover image for ' + this.page.name } )) : null,
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
                  ? m('img.page-cover.single', { src: this.page.media.medium_url, alt: 'Cover image for ' + this.page.name } )
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
