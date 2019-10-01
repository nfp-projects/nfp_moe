const EditPage = require('./admin/editpage')
const AdminPages = require('./admin/pages')
const AdminArticles = require('./admin/articles')
const EditArticle = require('./admin/editarticle')
const AdminStaffList = require('./admin/stafflist')
const EditStaff = require('./admin/editstaff')

window.addAdminRoutes = [
  ['/admin/pages', AdminPages],
  ['/admin/pages/:key', EditPage],
  ['/admin/articles', AdminArticles],
  ['/admin/articles/:id', EditArticle],
  ['/admin/staff', AdminStaffList],
  ['/admin/staff/:id', EditStaff],
]
