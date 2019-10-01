const common = require('./common')

exports.uploadMedia = function(file) {
  let formData = new FormData()
  formData.append('file', file)

  return common.sendRequest({
    method: 'POST',
    url: '/api/media',
    body: formData,
  })
}
