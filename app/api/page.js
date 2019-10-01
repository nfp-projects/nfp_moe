const common = require('./common')

const Tree = window.__nfptree || []

exports.Tree = Tree

exports.createPage = function(body) {
  return common.sendRequest({
    method: 'POST',
    url: '/api/pages',
    body: body,
  }).then(function(res) {
    res.children = []
    if (!res.parent_id) {
      Tree.push(res)
    } else {
      for (let i = 0; i < Tree.length; i++) {
        if (Tree[i].id === res.parent_id) {
          Tree[i].children.push(res)
          break
        }
      }
    }
    return res
  })
}

exports.getTree = function() {
  return common.sendRequest({
    method: 'GET',
    url: '/api/pages?tree=true&includes=children&fields=id,name,path,children(id,name,path)',
  })
}

exports.updatePage = function(id, body) {
  return common.sendRequest({
    method: 'PUT',
    url: '/api/pages/' + id,
    body: body,
  }).then(function(res) {
    for (let i = 0; i < Tree.length; i++) {
      if (Tree[i].id === res.id) {
        res.children = Tree[i].children
        Tree[i] = res
        break
      } else if (Tree[i].id === res.parent_id) {
        for (let x = 0; x < Tree[i].children.length; x++) {
          if (Tree[i].children[x].id === res.id) {
            res.children = Tree[i].children[x].children
            Tree[i].children[x] = res
            break
          }
        }
        break
      }
    }
    if (!res.children) {
      res.children = []
    }
    return res
  })
}

exports.getAllPages = function() {
  return common.sendRequest({
    method: 'GET',
    url: '/api/pages',
  })
}

exports.getPage = function(id) {
  return common.sendRequest({
    method: 'GET',
    url: '/api/pages/' + id + '?includes=media,banner,children,news,news.media',
  })
}

exports.removePage = function(page, id) {
  return common.sendRequest({
    method: 'DELETE',
    url: '/api/pages/' + id,
  }).then(function() {
    for (let i = 0; i < Tree.length; i++) {
      if (Tree[i].id === page.id) {
        Tree.splice(i, 1)
        break
      } else if (Tree[i].id === page.parent_id) {
        for (let x = 0; x < Tree[i].children.length; x++) {
          if (Tree[i].children[x].id === page.id) {
            Tree[i].children.splice(x, 1)
            break
          }
        }
        break
      }
    }
    return null
  })
}
