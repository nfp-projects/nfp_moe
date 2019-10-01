const Authentication = require('../authentication')

exports.sendRequest = function(options, isPagination) {
  let token = Authentication.getToken()
  let pagination = isPagination

  if (token) {
    options.headers = options.headers || {}
    options.headers['Authorization'] = 'Bearer ' + token
  }

  options.extract = function(xhr) {
    let out = null
    if (pagination && xhr.status < 300) {
      let headers = {}

      xhr.getAllResponseHeaders().split('\r\n').forEach(function(item) {
        var splitted = item.split(': ')
        headers[splitted[0]] = splitted[1]
      })

      out = {
        headers: headers || {},
        data: JSON.parse(xhr.responseText),
      }
    } else {
      if (xhr.responseText) {
        out = JSON.parse(xhr.responseText)
      } else {
        out = {}
      }
    }
    if (xhr.status >= 300) {
      throw out
    }
    return out
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
