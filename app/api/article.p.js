const common = require('./common')

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
  return common.sendRequest({
    method: 'GET',
    url: '/api/articles/' + id + '?includes=media,parent,banner,files',
  })
}
