const m = require('mithril')
const Authentication = require('../authentication')
const Api = require('../api/common')

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
    })
  },

  onGoogleSuccess: function(googleUser) {
    Login.loading = true
    m.redraw()

    m.request({
      method: 'POST',
      url: '/api/login',
      body: { token: googleUser.Zi.access_token },
    })
    .then(function(result) {
      Authentication.updateToken(result.token)
      m.route.set(Login.redirect || '/')
    })
    .catch(function(error) {
      Login.error = 'Error while logging into NFP! ' + error.status + ': ' + error.message
      let auth2 = gapi.auth2.getAuthInstance()
      return auth2.signOut()
    })
    .then(function () {
      Login.loading = false
      m.redraw()
    })
  },

  onGoogleFailure: function(error) {
    if (error.error !== 'popup_closed_by_user' && error.error !== 'popup_blocked_by_browser') {
      Login.error = 'Error while logging into Google: ' + error.error
      m.redraw()
    }
  },

  oninit: function(vnode) {
    Login.redirect = vnode.attrs.redirect || ''
    if (Authentication.currentUser) return m.route.set('/')
    Login.error = ''

    this.username = ''
    this.password = ''
  },

  oncreate: function() {
    if (Authentication.currentUser) return
    Authentication.createGoogleScript()
      .then(function() {
        Login.initGoogleButton()
      })
  },

  loginuser: function(vnode, e) {
    e.preventDefault()
    if (!this.username) {
      Login.error = 'Email is missing'
    } else if (!this.password) {
      Login.error = 'Password is missing'
    } else {
      Login.error = ''
    }
    if (Login.error) return

    Login.loading = true

    Api.sendRequest({
      method: 'POST',
      url: '/api/login/user',
      body: {
        username: this.username,
        password: this.password,
      },
    })
    .then(function(result) {
      Authentication.updateToken(result.token)
      m.route.set(Login.redirect || '/')
    })
    .catch(function(error) {
      Login.error = 'Error while logging into NFP! ' + error.message
      vnode.state.password = ''
    })
    .then(function () {
      Login.loading = false
      m.redraw()
    })
  },

  view: function(vnode) {
    return [
      m('div.login-wrapper', [
        m('div.login-icon'),
        m('article.login', [
          m('header', [
            m('h1', 'NFP.moe login'),
          ]),
          m('div.content', [
            m('h5', 'Please login to access restricted area'),
            Login.error ? m('div.error', Login.error) : null,
            Login.loading ? m('div.loading-spinner') : null,
            m('form', {
              hidden: Login.loading,
              onsubmit: this.loginuser.bind(this, vnode),
            }, [
              m('label', 'Email'),
              m('input', {
                type: 'text',
                value: this.username,
                oninput: function(e) { vnode.state.username = e.currentTarget.value },
              }),
              m('label', 'Password'),
              m('input', {
                type: 'password',
                value: this.password,
                oninput: function(e) { vnode.state.password = e.currentTarget.value },
              }),
              m('input', {
                type: 'submit',
                value: 'Login',
              }),
            ]),
            m('h5', { hidden: Login.loading }, 'Alternative login'),
            m('div#googlesignin', { hidden: Login.loading }, m('div.loading-spinner')),
          ]),
        ]),
      ]),
    ]
  },
}

module.exports = Login
