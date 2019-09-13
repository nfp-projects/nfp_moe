const m = require('mithril')
const { sendRequest } = require('./common')

exports.uploadMedia = function(file) {
  let formData = new FormData()
  formData.append('file', file)

  return sendRequest({
    method: 'POST',
    url: '/api/media',
    body: formData,
  })
}
