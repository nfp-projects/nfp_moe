const { sendRequest } = require('./common')

exports.uploadFile = function(articleId, file) {
  let formData = new FormData()
  formData.append('file', file)

  return sendRequest({
    method: 'POST',
    url: '/api/articles/' + articleId + '/file',
    body: formData,
  })
}
