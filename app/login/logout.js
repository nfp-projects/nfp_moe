const m = require('mithril')
const Authentication = require('../authentication')

const Logout = {
  oninit: function() {
    Authentication.createGoogleScript()
      .then(function() {
        return new Promise(function (res) {
          gapi.load('auth2', res);
        })
      })
      .then(function() { return gapi.auth2.init() })
      .then(function() {
        let auth2 = gapi.auth2.getAuthInstance();
        return auth2.signOut()
      })
      .then(function() {
        Authentication.clearToken()
        m.route.set('/')
      }, function(err) {
        console.log('unable to logout:', err)
      })
  },

  view: function() {
    return m('div.loading-spinner')
  },
}

module.exports = Logout
