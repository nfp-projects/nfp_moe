const { sendRequest } = require('./common')

exports.createStaff = function(body) {
  return sendRequest({
    method: 'POST',
    url: '/api/staff',
    body: body,
  })
}

exports.updateStaff = function(id, body) {
  return sendRequest({
    method: 'PUT',
    url: '/api/staff/' + id,
    body: body,
  })
}

exports.getAllStaff = function() {
  return sendRequest({
    method: 'GET',
    url: '/api/staff',
  })
}

exports.getStaff = function(id) {
  return sendRequest({
    method: 'GET',
    url: '/api/staff/' + id,
  })
}

exports.removeStaff = function(id) {
  return sendRequest({
    method: 'DELETE',
    url: '/api/staff/' + id,
  })
}
