const parse = require('parse-link-header')
const common = require('./common')

exports.fetchPage = function(url) {
  return common.sendRequest({
    method: 'GET',
    url: url,
  }, true)
  .then(function(result) {
    return {
      data: result.data,
      links: parse(result.headers.link || ''),
      total: Number(result.headers.pagination_total || '0'),
    }
  })
}
