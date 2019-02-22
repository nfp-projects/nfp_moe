const m = require('mithril')
const Authentication = require('../authentication')

const Login = {
  loadedGoogle: false,
  loading: false,
  redirect: '',
  error: '',

  initGoogleButton: function() {
    gapi.signin2.render('googlesignin', {
      'scope': 'email',
      'width': 240,
      'height': 50,
      'longtitle': true,
      'theme': 'dark',
      'onsuccess': Login.onGoogleSuccess,
      'onfailure': Login.onGoogleFailure,
    });
  },

  onGoogleSuccess: function(googleUser) {
    Login.loading = true
    m.redraw()

    m.request({
      method: 'POST',
      url: '/api/login',
      data: { token: googleUser.Zi.access_token },
    })
    .then(function(result) {
      Authentication.updateToken(result.token)
      m.route.set(Login.redirect || '/')
    })
    .catch(function(error) {
      Login.error = 'Error while logging into NFP! ' + error.code + ': ' + error.response.message
      let auth2 = gapi.auth2.getAuthInstance();
      return auth2.signOut()
    })
    .then(function () {
      Login.loading = false
      m.redraw()
    })
  },

  onGoogleFailure: function(error) {
    Login.error = 'Error while logging into Google: ' + error
    m.redraw()
    Authentication.createGoogleScript()
  },

  oninit: function(vnode) {
    Login.redirect = vnode.attrs.redirect || ''
    if (Authentication.currentUser) return m.route.set('/')
    Login.error = ''
  },

  oncreate: function() {
    if (Authentication.currentUser) return
    Authentication.createGoogleScript()
      .then(function() {
        Login.initGoogleButton()
      })
  },

  view: function() {
    return [
      m('div.login-wrapper', [
        m('article.login', [
          m('header', [
            m('h1', 'NFP.moe login'),
          ]),
          m('div.content', [
            m('h5', 'Please login using google to access restricted area'),
            Login.error ? m('div.error', Login.error) : null,
            Login.loading ? m('div.loading-spinner') : null,
            m('div#googlesignin', { hidden: Login.loading }, m('div.loading-spinner')),
          ])
        ]),
      ]),
    ]
  }
}

module.exports = Login
