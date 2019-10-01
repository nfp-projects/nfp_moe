const storageName = 'logintoken'

const Authentication = {
  currentUser: null,
  isAdmin: false,
  loadedGoogle: false,
  loadingGoogle: false,
  loadingListeners: [],
  authListeners: [],

  updateToken: function(token) {
    if (!token) return Authentication.clearToken()
    localStorage.setItem(storageName, token)
    Authentication.currentUser = JSON.parse(atob(token.split('.')[1]))

    if (Authentication.authListeners.length) {
      Authentication.authListeners.forEach(function(x) { x(Authentication.currentUser) })
    }
  },

  clearToken: function() {
    Authentication.currentUser = null
    localStorage.removeItem(storageName)
    Authentication.isAdmin = false
  },

  addEvent: function(event) {
    Authentication.authListeners.push(event)
  },

  setAdmin: function(item) {
    Authentication.isAdmin = item
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

if (!window.googleLoaded) {
  window.googleLoaded = function() {
    Authentication.loadedGoogle = true
    while (Authentication.loadingListeners.length) {
      Authentication.loadingListeners.pop()()
    }
  }
}

Authentication.updateToken(localStorage.getItem(storageName))

module.exports = Authentication
