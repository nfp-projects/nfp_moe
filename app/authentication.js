const m = require('mithril')
const jwt = require('jsonwebtoken')

const storageName = 'logintoken'
const loadingListeners = []

window.googleLoaded = function() {
  Authentication.loadedGoogle = true
  while (Authentication.loadingListeners.length) {
    Authentication.loadingListeners.pop()()
  }
}

const Authentication = {
  currentUser: null,
  loadedGoogle: false,
  loadingGoogle: false,
  loadingListeners: [],

  updateToken: function(token) {
    if (!token) return Authentication.clearToken()
    localStorage.setItem(storageName, token)
    Authentication.currentUser = jwt.decode(token)
  },

  clearToken: function() {
    Authentication.currentUser = null
    localStorage.removeItem(storageName)
  },

  createGoogleScript: function() {
    if (Authentication.loadedGoogle) return Promise.resolve()
    return new Promise(function (res) {
      if (Authentication.loadedGoogle) return res()
      Authentication.loadingListeners.push(res)

      if (Authentication.loadingGoogle) return
      Authentication.loadingGoogle = true

      let gscript = document.createElement('script')
      gscript.type = 'text/javascript'
      gscript.async = true
      gscript.defer = true
      gscript.src = 'https://apis.google.com/js/platform.js?onload=googleLoaded'
      document.body.appendChild(gscript)
    })
  },

  getToken: function() {
    return localStorage.getItem(storageName)
  },
}

Authentication.updateToken(localStorage.getItem(storageName))

module.exports = Authentication
