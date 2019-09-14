const m = require('mithril')

const { getAllArticlesPagination } = require('../api/article')
const { fetchPage } = require('../api/pagination')
const Pages = require('../widgets/pages')
const Newsitem = require('../widgets/newsitem')

module.exports = {
  oninit: function(vnode) {
    this.error = ''
    this.loading = false
    this.featured = null
    this.links = null
    this.fetchArticles(vnode)
  },

  onupdate: function(vnode) {
    if (this.lastpage !== (m.route.param('page') || '1')) {
      this.fetchArticles(vnode)
    }
  },

  fetchArticles(vnode) {
    this.error = ''
    this.loading = true
    this.links = null
    this.articles = []
    this.lastpage = m.route.param('page') || '1'

    return fetchPage(getAllArticlesPagination({
      per_page: 10,
      page: this.lastpage,
      includes: ['parent', 'files', 'media', 'banner'],
    }))
    .then(function(result) {
      vnode.state.articles = result.data
      vnode.state.links = result.links

      for (var i = result.data.length - 1; i >= 0; i--) {
        if (result.data[i].banner) {
          vnode.state.featured = result.data[i]
        }
      }
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
    return [
      (this.featured && this.featured.banner
        ? m('a.frontpage-banner', {
            href: '/article/' + this.featured.path,
            style: { 'background-image': 'url("' + this.featured.banner.url + '")' },
          },
          this.featured.name
        )
        : null),
      m('frontpage', [
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
    ]
  },
}
