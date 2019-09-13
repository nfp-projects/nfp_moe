const { sendRequest } = require('./common')

exports.createArticle = function(body) {
  return sendRequest({
    method: 'POST',
    url: '/api/articles',
    body: body,
  })
}

exports.updateArticle = function(id, body) {
  return sendRequest({
    method: 'PUT',
    url: '/api/articles/' + id,
    body: body,
  })
}

exports.getAllArticles = function() {
  return sendRequest({
    method: 'GET',
    url: '/api/articles?includes=parent',
  })
}

exports.getArticle = function(id) {
  return sendRequest({
    method: 'GET',
    url: '/api/articles/' + id + '?includes=media,parent,banner',
  })
}

exports.removeArticle = function(article, id) {
  return sendRequest({
    method: 'DELETE',
    url: '/api/articles/' + id,
  })
}
