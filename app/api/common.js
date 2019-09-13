const m = require('mithril')
const Authentication = require('../authentication')

exports.sendRequest = function(options) {
  let token = Authentication.getToken()

  if (token) {
    options.headers = options.headers || {}
    options.headers['Authorization'] = 'Bearer ' + token
  }

  return m.request(options)
    .catch(function (error) {
      if (error.code === 403) {
        Authentication.clearToken()
        m.route.set('/login', { redirect: m.route.get() })
      }
      if (error.response && error.response.status) {
        return Promise.reject(error.response)
      }
      return Promise.reject(error)
    })
}
