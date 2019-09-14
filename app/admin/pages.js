const m = require('mithril')

const Authentication = require('../authentication')
const { getAllPages, removePage } = require('../api/page')
const Dialogue = require('../widgets/dialogue')

const AdminPages = {
  parseTree: function(pages) {
    let map = new Map()
    for (let i = 0; i < pages.length; i++) {
      pages[i].children = []
      map.set(pages[i].id, pages[i])
    }
    for (let i = 0; i < pages.length; i++) {
      if (pages[i].parent_id && map.has(pages[i].parent_id)) {
        map.get(pages[i].parent_id).children.push(pages[i])
        pages.splice(i, 1)
        i--
      }
    }
    return pages
  },

  oninit: function(vnode) {
    this.loading = true
    this.error = ''
    this.pages = []
    this.removePage = null

    getAllPages()
    .then(function(result) {
      vnode.state.pages = AdminPages.parseTree(result)
    })
    .catch(function(err) {
      vnode.state.error = err.message
    })
    .then(function() {
      vnode.state.loading = false
      m.redraw()
    })
  },

  confirmRemovePage: function(vnode) {
    let removingPage = this.removePage
    this.removePage = null
    this.loading = true
    removePage(removingPage, removingPage.id)
      .then(this.oninit.bind(this, vnode))
      .catch(function(err) {
        vnode.state.error = err.message
        vnode.state.loading = false
        m.redraw()
      })
  },

  drawPage: function(vnode, page) {
    return [
      m('tr', [
        m('td', [
          page.parent_id ? m('span.subpage', '| >') : null,
          m(m.route.Link, { href: '/admin/pages/' + page.id }, page.name),
        ]),
        m('td', m(m.route.Link, { href: '/page/' + page.path }, '/page/' + page.path)),
        m('td.right', page.updated_at.replace('T', ' ').split('.')[0]),
        m('td.right', m('button', { onclick: function() { vnode.state.removePage = page } }, 'Remove')),
      ]),
    ].concat(page.children.map(AdminPages.drawPage.bind(this, vnode)))
  },

  view: function(vnode) {
    return [
      (this.loading ?
        m('div.loading-spinner')
      : m('div.admin-wrapper', [
          m('div.admin-actions', [
              m('span', 'Actions:'),
              m(m.route.Link, { href: '/admin/pages/add' }, 'Create new page'),
            ]),
          m('article.editpage', [
            m('header', m('h1', 'All pages')),
            m('div.error', {
              hidden: !this.error,
              onclick: function() { vnode.state.error = '' },
            }, this.error),
            m('table', [
              m('thead', 
                m('tr', [
                  m('th', 'Title'),
                  m('th', 'Path'),
                  m('th.right', 'Updated'),
                  m('th.right', 'Actions'),
                ])
              ),
              m('tbody', this.pages.map(AdminPages.drawPage.bind(this, vnode))),
            ]),
          ]),
        ])
      ),
      m(Dialogue, {
        hidden: vnode.state.removePage === null,
        title: 'Delete ' + (vnode.state.removePage ? vnode.state.removePage.name : ''),
        message: 'Are you sure you want to remove "' + (vnode.state.removePage ? vnode.state.removePage.name : '') + '" (' + (vnode.state.removePage ? vnode.state.removePage.path : '') + ')',
        yes: 'Remove',
        yesclass: 'alert',
        no: 'Cancel',
        noclass: 'cancel',
        onyes: this.confirmRemovePage.bind(this, vnode),
        onno: function() { vnode.state.removePage = null },
      }),
    ]
  },
}

module.exports = AdminPages
