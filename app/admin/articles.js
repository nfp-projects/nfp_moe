const Article = require('../api/article')
const pagination = require('../api/pagination')
const Dialogue = require('../widgets/dialogue')
const Pages = require('../widgets/pages')

const AdminArticles = {
  oninit: function(vnode) {
    this.error = ''
    this.lastpage = m.route.param('page') || '1'
    this.articles = []
    this.removeArticle = null

    this.fetchArticles(vnode)
  },

  onupdate: function(vnode) {
    if (m.route.param('page') && m.route.param('page') !== this.lastpage) {
      this.fetchArticles(vnode)
    }
  },

  fetchArticles: function(vnode) {
    this.loading = true
    this.links = null
    this.lastpage = m.route.param('page') || '1'

    return pagination.fetchPage(Article.getAllArticlesPagination({
      per_page: 10,
      page: this.lastpage,
      includes: ['parent'],
    }))
    .then(function(result) {
      vnode.state.articles = result.data
      vnode.state.links = result.links
    })
    .catch(function(err) {
      vnode.state.error = err.message
    })
    .then(function() {
      vnode.state.loading = false
      m.redraw()
    })
  },

  confirmRemoveArticle: function(vnode) {
    let removingArticle = this.removeArticle
    this.removeArticle = null
    this.loading = true
    Article.removeArticle(removingArticle, removingArticle.id)
      .then(this.oninit.bind(this, vnode))
      .catch(function(err) {
        vnode.state.error = err.message
        vnode.state.loading = false
        m.redraw()
      })
  },

  drawArticle: function(vnode, article) {
    let parent
    if (article.parent) {
      parent = {
        path: '/page/' + article.parent.path,
        name: article.parent.name,
      }
    } else {
      parent = {
        path: '/',
        name: '-- Frontpage --',
      }
    }
    return [
      m('tr', [
        m('td', m(m.route.Link, { href: '/admin/articles/' + article.id }, article.name)),
        m('td', m(m.route.Link, { href: parent.path }, parent.name)),
        m('td', m(m.route.Link, { href: '/article/' + article.path }, '/article/' + article.path)),
        m('td.right', article.updated_at.replace('T', ' ').split('.')[0]),
        m('td.right', m('button', { onclick: function() { vnode.state.removeArticle = article } }, 'Remove')),
      ]),
    ]
  },

  view: function(vnode) {
    return [
      m('div.admin-wrapper', [
        m('div.admin-actions', [
            m('span', 'Actions:'),
            m(m.route.Link, { href: '/admin/articles/add' }, 'Create new article'),
          ]),
        m('article.editarticle', [
          m('header', m('h1', 'All articles')),
          m('div.error', {
            hidden: !this.error,
            onclick: function() { vnode.state.error = '' },
          }, this.error),
          (this.loading
            ? m('div.loading-spinner.full')
            : m('table', [
              m('thead', 
                m('tr', [
                  m('th', 'Title'),
                  m('th', 'Page'),
                  m('th', 'Path'),
                  m('th.right', 'Updated'),
                  m('th.right', 'Actions'),
                ])
              ),
              m('tbody', this.articles.map(AdminArticles.drawArticle.bind(this, vnode))),
            ])
          ),
          m(Pages, {
            base: '/admin/articles',
            links: this.links,
          }),
        ]),
      ]),
      m(Dialogue, {
        hidden: vnode.state.removeArticle === null,
        title: 'Delete ' + (vnode.state.removeArticle ? vnode.state.removeArticle.name : ''),
        message: 'Are you sure you want to remove "' + (vnode.state.removeArticle ? vnode.state.removeArticle.name : '') + '" (' + (vnode.state.removeArticle ? vnode.state.removeArticle.path : '') + ')',
        yes: 'Remove',
        yesclass: 'alert',
        no: 'Cancel',
        noclass: 'cancel',
        onyes: this.confirmRemoveArticle.bind(this, vnode),
        onno: function() { vnode.state.removeArticle = null },
      }),
    ]
  },
}

module.exports = AdminArticles
