const common = require('./common')

const Tree = window.__nfptree || []

exports.Tree = Tree

exports.getTree = function() {
  return common.sendRequest({
    method: 'GET',
    url: '/api/pages?tree=true&includes=children&fields=id,name,path,children(id,name,path)',
  })
}

exports.getPage = function(id) {
  return common.sendRequest({
    method: 'GET',
    url: '/api/pages/' + id + '?includes=media,banner,children,parent',
  })
}
