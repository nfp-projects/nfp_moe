const m = require('mithril')

module.exports = {
  view: function() {
    return m('article', [
      m('header', [
        m('h1', 'Welcome to NFP Moe'),
        m('span.meta', 'Last updated many years ago'),
      ]),
    ])
  }
}
