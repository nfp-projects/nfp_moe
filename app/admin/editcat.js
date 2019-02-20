const m = require('mithril')
const Authentication = require('../authentication')

const EditCategory = {
  loading: true,

  oninit: function(vnode) {
    console.log(vnode.attrs)
    EditCategory.loading = !!m.route.param('id')
  },

  view: function() {
    return (
      EditCategory.loading ?
        m('div.loading-spinner')
      : m('div.admin-wrapper',
          m('article.editcat', [
            m('header', m('h1', 'Edit category')),
            m('form.editcat', [
            ])
          ])
        )
    )
  },
}

module.exports = EditCategory
