const m = require('mithril')
const Authentication = require('../authentication')

const Logout = {
  oninit: function() {
    Authentication.clearToken()
    m.route.set('/')
  },

  view: function() {
    return m('div.loading-spinner')
  },
}

module.exports = Logout
