const m = require('mithril')

const { Tree } = require('../api/page')
const { getAllArticlesPagination } = require('../api/article')
const { fetchPage } = require('../api/pagination')
const Pages = require('../widgets/pages')
const Newsitem = require('../widgets/newsitem')
const Darkmode = require('../darkmode')

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
    var deviceWidth = window.innerWidth

    var bannerPath = ''
    var asuna_side = ''

    if (deviceWidth > 800) {
      if (Darkmode.darkIsOn) {
        asuna_side = '/assets/img/dark_asuna_frontpage.jpg'
      } else {
        asuna_side = '/assets/img/asuna_frontpage.jpg'
      }
    }

    if (this.featured && this.featured.banner) {
      var pixelRatio = window.devicePixelRatio || 1
      if (deviceWidth < 400 && pixelRatio <= 1) {
        bannerPath = this.featured.banner.small_url
      } else if ((deviceWidth < 800 && pixelRatio <= 1)
                || (deviceWidth < 600 && pixelRatio > 1)) {
        bannerPath = this.featured.banner.medium_url
      } else {
        bannerPath = this.featured.banner.url
      }
    }

    return [
      (this.featured && this.featured.banner
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
            Tree.map(function(page) {
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
          asuna_side ? m('img', { src: asuna_side, alt: 'Asuna standing tall welcomes you' }) : null,
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
