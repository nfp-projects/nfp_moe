const common = require('./common')

exports.createStaff = function(body) {
  return common.sendRequest({
    method: 'POST',
    url: '/api/staff',
    body: body,
  })
}

exports.updateStaff = function(id, body) {
  return common.sendRequest({
    method: 'PUT',
    url: '/api/staff/' + id,
    body: body,
  })
}

exports.getAllStaff = function() {
  return common.sendRequest({
    method: 'GET',
    url: '/api/staff',
  })
}

exports.getStaff = function(id) {
  return common.sendRequest({
    method: 'GET',
    url: '/api/staff/' + id,
  })
}

exports.removeStaff = function(id) {
  return common.sendRequest({
    method: 'DELETE',
    url: '/api/staff/' + id,
  })
}
