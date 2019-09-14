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

exports.getAllArticlesPagination = function(options) {
  let extra = ''

  if (options.sort) {
    extra += '&sort=' + options.sort
  }
  if (options.per_page) {
    extra += '&perPage=' + options.per_page
  }
  if (options.page) {
    extra += '&page=' + options.page
  }
  if (options.includes) {
    extra += '&includes=' + options.includes.join(',')
  }

  return '/api/articles?' + extra
}

exports.getAllPageArticles = function(pageId, includes) {
  return sendRequest({
    method: 'GET',
    url: '/api/pages/' + pageId + '/articles?includes=' + includes.join(','),
  })
}

exports.getAllPageArticlesPagination = function(pageId, options) {
  let extra = ''

  if (options.sort) {
    extra += '&sort=' + options.sort
  }
  if (options.per_page) {
    extra += '&perPage=' + options.per_page
  }
  if (options.page) {
    extra += '&page=' + options.page
  }
  if (options.includes) {
    extra += '&includes=' + options.includes.join(',')
  }

  return '/api/pages/' + pageId + '/articles?' + extra
}

exports.getArticle = function(id) {
  return sendRequest({
    method: 'GET',
    url: '/api/articles/' + id + '?includes=media,parent,banner,files',
  })
}

exports.removeArticle = function(article, id) {
  return sendRequest({
    method: 'DELETE',
    url: '/api/articles/' + id,
  })
}
