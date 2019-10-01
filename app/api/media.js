const common = require('./common')

exports.uploadMedia = function(file, height) {
  let formData = new FormData()
  formData.append('file', file)

  let extra = ''
  if (height) {
    extra = '?height=' + height
  }

  return common.sendRequest({
    method: 'POST',
    url: '/api/media' + extra,
    body: formData,
  })
}
