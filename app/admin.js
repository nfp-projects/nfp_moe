const EditPage = require('./admin/editpage')
const AdminPages = require('./admin/pages')
const AdminArticles = require('./admin/articles')
const EditArticle = require('./admin/editarticle')
const AdminStaffList = require('./admin/stafflist')
const EditStaff = require('./admin/editstaff')

window.adminRoutes = {
  pages: [AdminPages, EditPage],
  articles: [AdminArticles, EditArticle],
  staff: [AdminStaffList, EditStaff],
}
