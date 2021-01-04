const storageName = 'logintoken'

const Authentication = {
  currentUser: null,
  isAdmin: false,
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

  getToken: function() {
    return localStorage.getItem(storageName)
  },
}

Authentication.updateToken(localStorage.getItem(storageName))

module.exports = Authentication
