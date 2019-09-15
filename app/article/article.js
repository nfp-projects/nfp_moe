const m = require('mithril')
const { getArticle } = require('../api/article')
const Authentication = require('../authentication')
const Fileinfo = require('../widgets/fileinfo')

const Article = {
  oninit: function(vnode) {
    this.error = ''
    this.lastarticle = m.route.param('article') || '1'
    this.loadingnews = false
    this.fetchArticle(vnode)
  },

  fetchArticle: function(vnode) {
    this.path = m.route.param('id')
    this.news = []
    this.newslinks = null
    this.article = {
      id: 0,
      name: '',
      path: '',
      description: '',
      media: null,
      banner: null,
      files: [],
    }
    this.loading = true

    getArticle(this.path)
    .then(function(result) {
      vnode.state.article = result
    })
    .catch(function(err) {
      vnode.state.error = err.message
    })
    .then(function() {
      vnode.state.loading = vnode.state.loadingnews = false
      m.redraw()
    })
  },

  onupdate: function(vnode) {
    if (this.path !== m.route.param('id')) {
      this.fetchArticle(vnode)
    }
  },

  view: function(vnode) {
    return (
      this.loading ?
        m('div.loading-spinner')
      : m('article.article', [
          m('header', m('h1', this.article.name)),
          m('.fr-view', [
            this.article.media
              ? m('a.cover', {
                  href: this.article.media.url,
                }, m('img', { src: this.article.media.medium_url }))
              : null,
            this.article.description ? m.trust(this.article.description) : null,
            (this.article.files && this.article.files.length
              ? this.article.files.map(function(file) {
                  return m(Fileinfo, { file: file })
                })
              : null),
          ]),
          Authentication.currentUser
            ? m('div.admin-actions', [
              m('span', 'Admin controls:'),
              m(m.route.Link, { href: '/admin/articles/' + this.article.id }, 'Edit article'),
            ])
            : null,
        ])
    )
  },
}

module.exports = Article
