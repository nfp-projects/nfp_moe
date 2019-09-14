const parse = require('parse-link-header')
const { sendRequest } = require('./common')

exports.fetchPage = function(url) {
  return sendRequest({
    method: 'GET',
    url: url,
  }, true)
  .then(result => {
    return {
      data: result.data,
      links: parse(result.headers.link || ''),
      total: Number(result.headers.pagination_total || '0'),
    }
  })
}
