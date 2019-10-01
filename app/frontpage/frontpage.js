const m = require('mithril')

const Page = require('../api/page.p')
const Article = require('../api/article.p')
const Pagination = require('../api/pagination')
const Pages = require('../widgets/pages')
const Newsitem = require('../widgets/newsitem')

const Frontpage = {
  oninit: function(vnode) {
    this.error = ''
    this.loading = false
    this.featured = null
    this.links = null

    if (window.__nfpdata
        && window.__nfplinks) {
      this.links = window.__nfplinks
      this.articles = window.__nfpdata
      this.lastpage = '1'
      window.__nfpdata = null
      window.__nfplinks = null
      Frontpage.processFeatured(vnode, this.articles)
    } else {
      this.fetchArticles(vnode)
    }
  },

  onupdate: function(vnode) {
    if (this.lastpage !== (m.route.param('page') || '1')) {
      this.fetchArticles(vnode)
    }
  },

  fetchArticles: function(vnode) {
    this.error = ''
    this.loading = true
    this.links = null
    this.articles = []
    this.lastpage = m.route.param('page') || '1'

    return Pagination.fetchPage(Article.getAllArticlesPagination({
      per_page: 10,
      page: this.lastpage,
      includes: ['parent', 'files', 'media', 'banner'],
    }))
    .then(function(result) {
      vnode.state.articles = result.data
      vnode.state.links = result.links
      Frontpage.processFeatured(vnode, result.data)
    })
    .catch(function(err) {
      vnode.state.error = err.message
    })
    .then(function() {
      vnode.state.loading = false
      m.redraw()
    })
  },

  processFeatured: function(vnode, data) {
    for (var i = data.length - 1; i >= 0; i--) {
      if (data[i].banner) {
        vnode.state.featured = data[i]
      }
    }
  },

  view: function(vnode) {
    var deviceWidth = window.innerWidth

    var bannerPath = ''

    if (this.featured && this.featured.banner) {
      var pixelRatio = window.devicePixelRatio || 1
      if (deviceWidth < 400 && pixelRatio <= 1) {
        bannerPath = this.featured.banner.small_url
      } else if ((deviceWidth < 800 && pixelRatio <= 1)
                || (deviceWidth < 600 && pixelRatio > 1)) {
        bannerPath = this.featured.banner.medium_url
      } else {
        bannerPath = this.featured.banner.large_url
      }
    }

    return [
      (bannerPath
        ? m('a.frontpage-banner', {
            href: '/article/' + this.featured.path,
            style: { 'background-image': 'url("' + bannerPath + '")' },
          },
          this.featured.name
        )
        : null),
      m('frontpage', [
        m('aside.sidebar', [
          m('div.categories', [
            m('h4', 'Categories'),
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
          ]),
          m('div.asunaside'),
        ]),
        m('.frontpage-news', [
          (this.loading
            ? m('div.loading-spinner')
            : null),
          this.articles.map(function(article) {
            return m(Newsitem, article)
          }),
          m(Pages, {
            base: '/',
            links: this.links,
          }),
        ]),
      ]),
    ]
  },
}

module.exports = Frontpage
