(function(){function r(e,n,t){function o(i,f){if(!n[i]){if(!e[i]){var c="function"==typeof require&&require;if(!f&&c)return c(i,!0);if(u)return u(i,!0);var a=new Error("Cannot find module '"+i+"'");throw a.code="MODULE_NOT_FOUND",a}var p=n[i]={exports:{}};e[i][0].call(p.exports,function(r){var n=e[i][1][r];return o(n||r)},p,p.exports,r,e,n,t)}return n[i].exports}for(var u="function"==typeof require&&require,i=0;i<t.length;i++)o(t[i]);return o}return r})()({1:[function(require,module,exports){
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

},{"./admin/articles":2,"./admin/editarticle":3,"./admin/editpage":4,"./admin/editstaff":5,"./admin/pages":7,"./admin/stafflist":8}],2:[function(require,module,exports){
const Article = require('../api/article')
const pagination = require('../api/pagination')
const Dialogue = require('../widgets/dialogue')
const Pages = require('../widgets/pages')

const AdminArticles = {
  oninit: function(vnode) {
    this.error = ''
    this.lastpage = m.route.param('page') || '1'
    this.articles = []
    this.removeArticle = null

    this.fetchArticles(vnode)
  },

  onupdate: function(vnode) {
    if (m.route.param('page') && m.route.param('page') !== this.lastpage) {
      this.fetchArticles(vnode)
    }
  },

  fetchArticles: function(vnode) {
    this.loading = true
    this.links = null
    this.lastpage = m.route.param('page') || '1'

    return pagination.fetchPage(Article.getAllArticlesPagination({
      per_page: 10,
      page: this.lastpage,
      includes: ['parent'],
    }))
    .then(function(result) {
      vnode.state.articles = result.data
      vnode.state.links = result.links
    })
    .catch(function(err) {
      vnode.state.error = err.message
    })
    .then(function() {
      vnode.state.loading = false
      m.redraw()
    })
  },

  confirmRemoveArticle: function(vnode) {
    let removingArticle = this.removeArticle
    this.removeArticle = null
    this.loading = true
    Article.removeArticle(removingArticle, removingArticle.id)
      .then(this.oninit.bind(this, vnode))
      .catch(function(err) {
        vnode.state.error = err.message
        vnode.state.loading = false
        m.redraw()
      })
  },

  drawArticle: function(vnode, article) {
    let parent
    if (article.parent) {
      parent = {
        path: '/page/' + article.parent.path,
        name: article.parent.name,
      }
    } else {
      parent = {
        path: '/',
        name: '-- Frontpage --',
      }
    }
    return [
      m('tr', [
        m('td', m(m.route.Link, { href: '/admin/articles/' + article.id }, article.name)),
        m('td', m(m.route.Link, { href: parent.path }, parent.name)),
        m('td', m(m.route.Link, { href: '/article/' + article.path }, '/article/' + article.path)),
        m('td.right', article.updated_at.replace('T', ' ').split('.')[0]),
        m('td.right', m('button', { onclick: function() { vnode.state.removeArticle = article } }, 'Remove')),
      ]),
    ]
  },

  view: function(vnode) {
    return [
      m('div.admin-wrapper', [
        m('div.admin-actions', [
            m('span', 'Actions:'),
            m(m.route.Link, { href: '/admin/articles/add' }, 'Create new article'),
          ]),
        m('article.editarticle', [
          m('header', m('h1', 'All articles')),
          m('div.error', {
            hidden: !this.error,
            onclick: function() { vnode.state.error = '' },
          }, this.error),
          (this.loading
            ? m('div.loading-spinner.full')
            : m('table', [
              m('thead', 
                m('tr', [
                  m('th', 'Title'),
                  m('th', 'Page'),
                  m('th', 'Path'),
                  m('th.right', 'Updated'),
                  m('th.right', 'Actions'),
                ])
              ),
              m('tbody', this.articles.map(AdminArticles.drawArticle.bind(this, vnode))),
            ])
          ),
          m(Pages, {
            base: '/admin/articles',
            links: this.links,
          }),
        ]),
      ]),
      m(Dialogue, {
        hidden: vnode.state.removeArticle === null,
        title: 'Delete ' + (vnode.state.removeArticle ? vnode.state.removeArticle.name : ''),
        message: 'Are you sure you want to remove "' + (vnode.state.removeArticle ? vnode.state.removeArticle.name : '') + '" (' + (vnode.state.removeArticle ? vnode.state.removeArticle.path : '') + ')',
        yes: 'Remove',
        yesclass: 'alert',
        no: 'Cancel',
        noclass: 'cancel',
        onyes: this.confirmRemoveArticle.bind(this, vnode),
        onno: function() { vnode.state.removeArticle = null },
      }),
    ]
  },
}

module.exports = AdminArticles

},{"../api/article":9,"../api/pagination":14,"../widgets/dialogue":17,"../widgets/pages":20}],3:[function(require,module,exports){
const Authentication = require('../authentication')
const FileUpload = require('../widgets/fileupload')
const Froala = require('./froala')
const Page = require('../api/page')
const File = require('../api/file')
const Fileinfo = require('../widgets/fileinfo')
const Article = require('../api/article')

const EditArticle = {
  getFroalaOptions: function() {
    return {
      theme: 'gray',
      heightMin: 150,
      videoUpload: false,
      imageUploadURL: '/api/media',
      imageManagerLoadURL: '/api/media',
      imageManagerDeleteMethod: 'DELETE',
      imageManagerDeleteURL: '/api/media',
      events: {
        'imageManager.beforeDeleteImage': function(img) {
          this.opts.imageManagerDeleteURL = '/api/media/' + img.data('id')
        },
      },
      requestHeaders: {
        'Authorization': 'Bearer ' + Authentication.getToken(),
      },
    }
  },

  oninit: function(vnode) {
    this.froala = null
    this.loadedFroala = Froala.loadedFroala

    if (!this.loadedFroala) {
      Froala.createFroalaScript()
      .then(function() {
        vnode.state.loadedFroala = true
        m.redraw()
      })
    }

    this.fetchArticle(vnode)
  },

  onupdate: function(vnode) {
    if (this.lastid !== m.route.param('id')) {
      this.fetchArticle(vnode)
    }
  },

  fetchArticle: function(vnode) {
    this.lastid = m.route.param('id')
    this.loading = this.lastid !== 'add'
    this.creating = this.lastid === 'add'
    this.loadingFile = false
    this.error = ''
    this.article = {
      name: '',
      path: '',
      description: '',
      media: null,
      banner: null,
      files: [],
    }
    this.editedPath = false
    this.froala = null
    this.loadedFroala = Froala.loadedFroala

    if (this.lastid !== 'add') {
      Article.getArticle(this.lastid)
      .then(function(result) {
        vnode.state.editedPath = true
        vnode.state.article = result
      })
      .catch(function(err) {
        vnode.state.error = err.message
      })
      .then(function() {
        vnode.state.loading = false
        m.redraw()
      })
    }
  },

  updateValue: function(name, e) {
    this.article[name] = e.currentTarget.value
    if (name === 'path') {
      this.editedPath = true
    } else if (name === 'name' && !this.editedPath) {
      this.article.path = this.article.name.toLowerCase().replace(/ /g, '-')
    }
  },

  updateParent: function(e) {
    this.article.parent_id = Number(e.currentTarget.value)
    if (this.article.parent_id === -1) {
      this.article.parent_id = null
    }
  },

  mediaUploaded: function(type, media) {
    this.article[type] = media
  },

  mediaRemoved: function(type) {
    this.article[type] = null
  },

  save: function(vnode, e) {
    e.preventDefault()
    if (!this.article.name) {
      this.error = 'Name is missing'
    } else if (!this.article.path) {
      this.error = 'Path is missing'
    } else {
      this.error = ''
    }
    if (this.error) return

    this.article.description = vnode.state.froala && vnode.state.froala.html.get() || this.article.description
    if (this.article.description) {
      this.article.description = this.article.description.replace(/<p[^>]+data-f-id="pbf"[^>]+>[^>]+>[^>]+>[^>]+>/, '')
    }

    this.loading = true

    let promise

    if (this.article.id) {
      promise = Article.updateArticle(this.article.id, {
        name: this.article.name,
        path: this.article.path,
        parent_id: this.article.parent_id,
        description: this.article.description,
        banner_id: this.article.banner && this.article.banner.id,
        media_id: this.article.media && this.article.media.id,
      })
    } else {
      promise = Article.createArticle({
        name: this.article.name,
        path: this.article.path,
        parent_id: this.article.parent_id,
        description: this.article.description,
        banner_id: this.article.banner && this.article.banner.id,
        media_id: this.article.media && this.article.media.id,
      })
    }

    promise.then(function(res) {
      if (vnode.state.article.id) {
        res.media = vnode.state.article.media
        res.banner = vnode.state.article.banner
        res.files = vnode.state.article.files
        vnode.state.article = res
      } else {
        m.route.set('/admin/articles/' + res.id)
      }
    })
    .catch(function(err) {
      vnode.state.error = err.message
    })
    .then(function() {
      vnode.state.loading = false
      m.redraw()
    })
  },

  uploadFile: function(vnode, event) {
    if (!event.target.files[0]) return
    vnode.state.error = ''
    vnode.state.loadingFile = true

    File.uploadFile(this.article.id, event.target.files[0])
    .then(function(res) {
      vnode.state.article.files.push(res)
    })
    .catch(function(err) {
      vnode.state.error = err.message
    })
    .then(function() {
      event.target.value = null
      vnode.state.loadingFile = false
      m.redraw()
    })
  },

  getFlatTree: function() {
    let out = [{id: null, name: '-- Frontpage --'}]
    Page.Tree.forEach(function(page) {
      out.push({ id: page.id, name: page.name })
      if (page.children.length) {
        page.children.forEach(function(sub) {
          out.push({ id: sub.id, name: page.name + ' -> ' + sub.name })
        })
      }
    })
    return out
  },

  view: function(vnode) {
    const parents = this.getFlatTree()
    return (
      this.loading ?
        m('div.loading-spinner')
      : m('div.admin-wrapper', [
          m('div.admin-actions', this.article.id
            ? [
              m('span', 'Actions:'),
              m(m.route.Link, { href: '/article/' + this.article.path }, 'View article'),
            ]
            : null),
          m('article.editarticle', [
            m('header', m('h1', this.creating ? 'Create Article' : 'Edit ' + (this.article.name || '(untitled)'))),
            m('div.error', {
              hidden: !this.error,
              onclick: function() { vnode.state.error = '' },
            }, this.error),
            m(FileUpload, {
              onupload: this.mediaUploaded.bind(this, 'banner'),
              onerror: function(e) { vnode.state.error = e },
              ondelete: this.mediaRemoved.bind(this, 'banner'),
              media: this.article && this.article.banner,
            }),
            m(FileUpload, {
              class: 'cover',
              useimg: true,
              onupload: this.mediaUploaded.bind(this, 'media'),
              ondelete: this.mediaRemoved.bind(this, 'media'),
              onerror: function(e) { vnode.state.error = e },
              media: this.article && this.article.media,
            }),
            m('form.editarticle.content', {
              onsubmit: this.save.bind(this, vnode),
            }, [
              m('label', 'Parent'),
              m('select', {
                onchange: this.updateParent.bind(this),
              }, parents.map(function(item) { return m('option', { value: item.id || -1, selected: item.id === vnode.state.article.parent_id }, item.name) })),
              m('label', 'Name'),
              m('input', {
                type: 'text',
                value: this.article.name,
                oninput: this.updateValue.bind(this, 'name'),
              }),
              m('label', 'Description'),
              (
                this.loadedFroala ?
                  m('div', {
                    oncreate: function(div) {
                      vnode.state.froala = new FroalaEditor(div.dom, EditArticle.getFroalaOptions(), function() {
                        vnode.state.froala.html.set(vnode.state.article.description)
                      })
                    },
                  })
                  : null
              ),
              m('label', 'Path'),
              m('input', {
                type: 'text',
                value: this.article.path,
                oninput: this.updateValue.bind(this, 'path'),
              }),
              m('div.loading-spinner', { hidden: this.loadedFroala }),
              m('input', {
                type: 'submit',
                value: 'Save',
              }),
            ]),
            this.article.files.length
              ? m('files', [
                  m('h4', 'Files'),
                  this.article.files.map(function(item) { return m(Fileinfo, { file: item }) }),
                ])
              : null,
            this.article.id
              ? m('div.fileupload', [
                'Add file',
                m('input', {
                  accept: '*',
                  type: 'file',
                  onchange: this.uploadFile.bind(this, vnode),
                }),
                (vnode.state.loadingFile ? m('div.loading-spinner') : null),
              ])
              : null,
          ]),
        ])
    )
  },
}

module.exports = EditArticle

},{"../api/article":9,"../api/file":11,"../api/page":13,"../authentication":16,"../widgets/fileinfo":18,"../widgets/fileupload":19,"./froala":6}],4:[function(require,module,exports){
const Authentication = require('../authentication')
const FileUpload = require('../widgets/fileupload')
const Froala = require('./froala')
const Page = require('../api/page')

const EditPage = {
  getFroalaOptions: function() {
    return {
      theme: 'gray',
      heightMin: 150,
      videoUpload: false,
      imageUploadURL: '/api/media',
      imageManagerLoadURL: '/api/media',
      imageManagerDeleteMethod: 'DELETE',
      imageManagerDeleteURL: '/api/media',
      events: {
        'imageManager.beforeDeleteImage': function(img) {
          this.opts.imageManagerDeleteURL = '/api/media/' + img.data('id')
        },
      },
      requestHeaders: {
        'Authorization': 'Bearer ' + Authentication.getToken(),
      },
    }
  },

  oninit: function(vnode) {
    this.loading = m.route.param('key') !== 'add'
    this.creating = m.route.param('key') === 'add'
    this.error = ''
    this.page = {
      name: '',
      path: '',
      description: '',
      media: null,
    }
    this.editedPath = false
    this.froala = null
    this.loadedFroala = Froala.loadedFroala

    if (m.route.param('key') !== 'add') {
      Page.getPage(m.route.param('key'))
      .then(function(result) {
        vnode.state.editedPath = true
        vnode.state.page = result
      })
      .catch(function(err) {
        vnode.state.error = err.message
      })
      .then(function() {
        vnode.state.loading = false
        m.redraw()
      })
    }

    if (!this.loadedFroala) {
      Froala.createFroalaScript()
      .then(function() {
        vnode.state.loadedFroala = true
        m.redraw()
      })
    }
  },

  updateValue: function(name, e) {
    this.page[name] = e.currentTarget.value
    if (name === 'path') {
      this.editedPath = true
    } else if (name === 'name' && !this.editedPath) {
      this.page.path = this.page.name.toLowerCase().replace(/ /g, '-')
    }
  },

  updateParent: function(e) {
    this.page.parent_id = Number(e.currentTarget.value)
    if (this.page.parent_id === -1) {
      this.page.parent_id = null
    }
  },

  fileUploaded: function(type, media) {
    this.page[type] = media
  },

  fileRemoved: function(type) {
    this.page[type] = null
  },

  save: function(vnode, e) {
    e.preventDefault()
    if (!this.page.name) {
      this.error = 'Name is missing'
    } else if (!this.page.path) {
      this.error = 'Path is missing'
    }
    if (this.error) return

    this.page.description = vnode.state.froala ? vnode.state.froala.html.get() : this.page.description
    if (this.page.description) {
      this.page.description = this.page.description.replace(/<p[^>]+data-f-id="pbf"[^>]+>[^>]+>[^>]+>[^>]+>/, '')
    }

    this.loading = true

    let promise

    if (this.page.id) {
      promise = Page.updatePage(this.page.id, {
        name: this.page.name,
        path: this.page.path,
        parent_id: this.page.parent_id,
        description: this.page.description,
        banner_id: this.page.banner && this.page.banner.id || null,
        media_id: this.page.media && this.page.media.id || null,
      })
    } else {
      promise = Page.createPage({
        name: this.page.name,
        path: this.page.path,
        parent_id: this.page.parent_id,
        description: this.page.description,
        banner_id: this.page.banner && this.page.banner.id || null,
        media_id: this.page.media && this.page.media.id || null,
      })
    }

    promise.then(function(res) {
      if (vnode.state.page.id) {
        res.media = vnode.state.page.media
        res.banner = vnode.state.page.banner
        vnode.state.page = res
      } else {
        m.route.set('/admin/pages/' + res.id)
      }
    })
    .catch(function(err) {
      vnode.state.error = err.message
    })
    .then(function() {
      vnode.state.loading = false
      m.redraw()
    })

    return false
  },

  view: function(vnode) {
    const parents = [{id: null, name: '-- Frontpage --'}].concat(Page.Tree).filter(function (page) { return !vnode.state.page || page.id !== vnode.state.page.id})
    return (
      this.loading ?
        m('div.loading-spinner')
      : m('div.admin-wrapper', [
          m('div.admin-actions', this.page.id
            ? [
              m('span', 'Actions:'),
              m(m.route.Link, { href: '/page/' + this.page.path }, 'View page'),
              m(m.route.Link, { href: '/admin/pages/add' }, 'Create new page'),
            ]
            : null),
          m('article.editpage', [
            m('header', m('h1', this.creating ? 'Create Page' : 'Edit ' + (this.page.name || '(untitled)'))),
            m('div.error', {
              hidden: !this.error,
              onclick: function() { vnode.state.error = '' },
            }, this.error),
            m(FileUpload, {
              onupload: this.fileUploaded.bind(this, 'banner'),
              ondelete: this.fileRemoved.bind(this, 'banner'),
              onerror: function(e) { vnode.state.error = e },
              media: this.page && this.page.banner,
            }),
            m(FileUpload, {
              class: 'cover',
              useimg: true,
              onupload: this.fileUploaded.bind(this, 'media'),
              ondelete: this.fileRemoved.bind(this, 'media'),
              onerror: function(e) { vnode.state.error = e },
              media: this.page && this.page.media,
            }),
            m('form.editpage.content', {
              onsubmit: this.save.bind(this, vnode),
            }, [
              m('label', 'Parent'),
              m('select', {
                onchange: this.updateParent.bind(this),
              }, parents.map(function(item) {
                return m('option', { value: item.id || -1, selected: item.id === vnode.state.page.parent_id }, item.name)
              })),
              m('label', 'Name'),
              m('input', {
                type: 'text',
                value: this.page.name,
                oninput: this.updateValue.bind(this, 'name'),
              }),
              m('label', 'Description'),
              (
                this.loadedFroala ?
                  m('div', {
                    oncreate: function(div) {
                      vnode.state.froala = new FroalaEditor(div.dom, EditPage.getFroalaOptions(), function() {
                        vnode.state.froala.html.set(vnode.state.page.description)
                      })
                    },
                  })
                  : null
              ),
              m('label', 'Path'),
              m('input', {
                type: 'text',
                value: this.page.path,
                oninput: this.updateValue.bind(this, 'path'),
              }),
              m('div.loading-spinner', { hidden: this.loadedFroala }),
              m('input', {
                type: 'submit',
                value: 'Save',
              }),
            ]),
          ]),
        ])
    )
  },
}

module.exports = EditPage

},{"../api/page":13,"../authentication":16,"../widgets/fileupload":19,"./froala":6}],5:[function(require,module,exports){
const Staff = require('../api/staff')

const EditStaff = {
  oninit: function(vnode) {
    this.fetchStaff(vnode)
  },

  onupdate: function(vnode) {
    if (this.lastid !== m.route.param('id')) {
      this.fetchStaff(vnode)
    }
  },

  fetchStaff: function(vnode) {
    this.lastid = m.route.param('id')
    this.loading = this.lastid !== 'add'
    this.creating = this.lastid === 'add'
    this.error = ''
    this.staff = {
      fullname: '',
      email: '',
      password: '',
      level: 10,
    }

    if (this.lastid !== 'add') {
      Staff.getStaff(this.lastid)
      .then(function(result) {
        vnode.state.editedPath = true
        vnode.state.staff = result
      })
      .catch(function(err) {
        vnode.state.error = err.message
      })
      .then(function() {
        vnode.state.loading = false
        m.redraw()
      })
    }
  },

  updateValue: function(fullname, e) {
    this.staff[fullname] = e.currentTarget.value
  },

  save: function(vnode, e) {
    e.preventDefault()
    if (!this.staff.fullname) {
      this.error = 'Fullname is missing'
    } else if (!this.staff.email) {
      this.error = 'Email is missing'
    } else {
      this.error = ''
    }
    if (this.error) return

    this.staff.description = vnode.state.froala && vnode.state.froala.html.get() || this.staff.description

    this.loading = true

    let promise

    if (this.staff.id) {
      promise = Staff.updateStaff(this.staff.id, {
        fullname: this.staff.fullname,
        email: this.staff.email,
        level: this.staff.level,
        password: this.staff.password,
      })
    } else {
      promise = Staff.createStaff({
        fullname: this.staff.fullname,
        email: this.staff.email,
        level: this.staff.level,
        password: this.staff.password,
      })
    }

    promise.then(function(res) {
      m.route.set('/admin/staff')
    })
    .catch(function(err) {
      vnode.state.error = err.message
    })
    .then(function() {
      vnode.state.loading = false
      m.redraw()
    })
  },

  updateLevel: function(e) {
    this.staff.level = Number(e.currentTarget.value)
  },

  view: function(vnode) {
    const levels = [[10, 'Manager'], [100, 'Admin']]
    return (
      this.loading ?
        m('div.loading-spinner')
      : m('div.admin-wrapper', [
          m('div.admin-actions', this.staff.id
            ? [
              m('span', 'Actions:'),
              m(m.route.Link, { href: '/admin/staff' }, 'Staff list'),
            ]
            : null),
          m('article.editstaff', [
            m('header', m('h1', this.creating ? 'Create Staff' : 'Edit ' + (this.staff.fullname || '(untitled)'))),
            m('div.error', {
              hidden: !this.error,
              onclick: function() { vnode.state.error = '' },
            }, this.error),
            m('form.editstaff.content', {
              onsubmit: this.save.bind(this, vnode),
            }, [
              m('label', 'Level'),
              m('select', {
                onchange: this.updateLevel.bind(this),
              }, levels.map(function(level) { return m('option', { value: level[0], selected: level[0] === vnode.state.staff.level }, level[1]) })),
              m('label', 'Fullname'),
              m('input', {
                type: 'text',
                value: this.staff.fullname,
                oninput: this.updateValue.bind(this, 'fullname'),
              }),
              m('label', 'Email'),
              m('input', {
                type: 'text',
                value: this.staff.email,
                oninput: this.updateValue.bind(this, 'email'),
              }),
              m('label', 'Password (optional)'),
              m('input', {
                type: 'text',
                value: this.staff.password,
                oninput: this.updateValue.bind(this, 'password'),
              }),
              m('input', {
                type: 'submit',
                value: 'Save',
              }),
            ]),
          ]),
        ])
    )
  },
}

module.exports = EditStaff

},{"../api/staff":15}],6:[function(require,module,exports){
const Froala = {
  files: [
    { type: 'css', url: 'https://cdn.jsdelivr.net/npm/froala-editor@3.0.4/css/froala_editor.pkgd.min.css' },
    { type: 'css', url: 'https://cdn.jsdelivr.net/npm/froala-editor@3.0.4/css/themes/gray.min.css' },
    { type: 'js', url: 'https://cdn.jsdelivr.net/npm/froala-editor@3.0.4/js/froala_editor.pkgd.min.js' },
  ],
  loadedFiles: 0,
  loadedFroala: false,

  checkLoadedAll: function(res) {
    if (Froala.loadedFiles < Froala.files.length) {
      return
    }
    Froala.loadedFroala = true
    res()
  },

  createFroalaScript: function() {
    if (Froala.loadedFroala) return Promise.resolve()
    return new Promise(function(res) {
      let onload = function() {
        Froala.loadedFiles++
        Froala.checkLoadedAll(res)
      }
      let head = document.getElementsByTagName('head')[0]

      for (var i = 0; i < Froala.files.length; i++) {
        let element
        if (Froala.files[i].type === 'css') {
          element = document.createElement('link')
          element.setAttribute('rel', 'stylesheet')
          element.setAttribute('type', 'text/css')
          element.setAttribute('href', Froala.files[i].url)
        } else {
          element = document.createElement('script')
          element.setAttribute('type', 'text/javascript')
          element.setAttribute('src', Froala.files[i].url)
        }
        element.onload = onload
        head.insertBefore(element, head.firstChild)
      }
    })
  },
}

module.exports = Froala

},{}],7:[function(require,module,exports){
const Page = require('../api/page')
const Dialogue = require('../widgets/dialogue')

const AdminPages = {
  parseTree: function(pages) {
    let map = new Map()
    for (let i = 0; i < pages.length; i++) {
      pages[i].children = []
      map.set(pages[i].id, pages[i])
    }
    for (let i = 0; i < pages.length; i++) {
      if (pages[i].parent_id && map.has(pages[i].parent_id)) {
        map.get(pages[i].parent_id).children.push(pages[i])
        pages.splice(i, 1)
        i--
      }
    }
    return pages
  },

  oninit: function(vnode) {
    this.loading = true
    this.error = ''
    this.pages = []
    this.removePage = null

    Page.getAllPages()
    .then(function(result) {
      vnode.state.pages = AdminPages.parseTree(result)
    })
    .catch(function(err) {
      vnode.state.error = err.message
    })
    .then(function() {
      vnode.state.loading = false
      m.redraw()
    })
  },

  confirmRemovePage: function(vnode) {
    let removingPage = this.removePage
    this.removePage = null
    this.loading = true
    Page.removePage(removingPage, removingPage.id)
      .then(this.oninit.bind(this, vnode))
      .catch(function(err) {
        vnode.state.error = err.message
        vnode.state.loading = false
        m.redraw()
      })
  },

  drawPage: function(vnode, page) {
    return [
      m('tr', [
        m('td', [
          page.parent_id ? m('span.subpage', '| >') : null,
          m(m.route.Link, { href: '/admin/pages/' + page.id }, page.name),
        ]),
        m('td', m(m.route.Link, { href: '/page/' + page.path }, '/page/' + page.path)),
        m('td.right', page.updated_at.replace('T', ' ').split('.')[0]),
        m('td.right', m('button', { onclick: function() { vnode.state.removePage = page } }, 'Remove')),
      ]),
    ].concat(page.children.map(AdminPages.drawPage.bind(this, vnode)))
  },

  view: function(vnode) {
    return [
      (this.loading ?
        m('div.loading-spinner')
      : m('div.admin-wrapper', [
          m('div.admin-actions', [
              m('span', 'Actions:'),
              m(m.route.Link, { href: '/admin/pages/add' }, 'Create new page'),
            ]),
          m('article.editpage', [
            m('header', m('h1', 'All pages')),
            m('div.error', {
              hidden: !this.error,
              onclick: function() { vnode.state.error = '' },
            }, this.error),
            m('table', [
              m('thead', 
                m('tr', [
                  m('th', 'Title'),
                  m('th', 'Path'),
                  m('th.right', 'Updated'),
                  m('th.right', 'Actions'),
                ])
              ),
              m('tbody', this.pages.map(AdminPages.drawPage.bind(this, vnode))),
            ]),
          ]),
        ])
      ),
      m(Dialogue, {
        hidden: vnode.state.removePage === null,
        title: 'Delete ' + (vnode.state.removePage ? vnode.state.removePage.name : ''),
        message: 'Are you sure you want to remove "' + (vnode.state.removePage ? vnode.state.removePage.name : '') + '" (' + (vnode.state.removePage ? vnode.state.removePage.path : '') + ')',
        yes: 'Remove',
        yesclass: 'alert',
        no: 'Cancel',
        noclass: 'cancel',
        onyes: this.confirmRemovePage.bind(this, vnode),
        onno: function() { vnode.state.removePage = null },
      }),
    ]
  },
}

module.exports = AdminPages

},{"../api/page":13,"../widgets/dialogue":17}],8:[function(require,module,exports){
const Staff = require('../api/staff')
const Dialogue = require('../widgets/dialogue')
const Pages = require('../widgets/pages')

const AdminStaffList = {
  oninit: function(vnode) {
    this.error = ''
    this.lastpage = m.route.param('page') || '1'
    this.staff = []
    this.removeStaff = null

    this.fetchStaffs(vnode)
  },

  fetchStaffs: function(vnode) {
    this.loading = true

    return Staff.getAllStaff()
    .then(function(result) {
      vnode.state.staff = result
    })
    .catch(function(err) {
      vnode.state.error = err.message
    })
    .then(function() {
      vnode.state.loading = false
      m.redraw()
    })
  },

  confirmRemoveStaff: function(vnode) {
    let removingStaff = this.removeStaff
    this.removeStaff = null
    this.loading = true
    Staff.removeStaff(removingStaff.id)
      .then(this.oninit.bind(this, vnode))
      .catch(function(err) {
        vnode.state.error = err.message
        vnode.state.loading = false
        m.redraw()
      })
  },

  getLevel: function(level) {
    if (level === 100) {
      return 'Admin'
    }
    return 'Manager'
  },

  view: function(vnode) {
    return [
      m('div.admin-wrapper', [
        m('div.admin-actions', [
            m('span', 'Actions:'),
            m(m.route.Link, { href: '/admin/staff/add' }, 'Create new staff'),
          ]),
        m('article.editarticle', [
          m('header', m('h1', 'All staff')),
          m('div.error', {
            hidden: !this.error,
            onclick: function() { vnode.state.error = '' },
          }, this.error),
          (this.loading
            ? m('div.loading-spinner.full')
            : m('table', [
                m('thead', 
                  m('tr', [
                    m('th', 'Fullname'),
                    m('th', 'Email'),
                    m('th', 'Level'),
                    m('th.right', 'Updated'),
                    m('th.right', 'Actions'),
                  ])
                ),
                m('tbody', this.staff.map(function(item) {
                  return m('tr', [
                    m('td', m(m.route.Link, { href: '/admin/staff/' + item.id }, item.fullname)),
                    m('td', item.email),
                    m('td.right', AdminStaffList.getLevel(item.level)),
                    m('td.right', (item.updated_at || '---').replace('T', ' ').split('.')[0]),
                    m('td.right', m('button', { onclick: function() { vnode.state.removeStaff = item } }, 'Remove')),
                  ])
                })),
              ])
          ),
          m(Pages, {
            base: '/admin/staff',
            links: this.links,
          }),
        ]),
      ]),
      m(Dialogue, {
        hidden: vnode.state.removeStaff === null,
        title: 'Delete ' + (vnode.state.removeStaff ? vnode.state.removeStaff.name : ''),
        message: 'Are you sure you want to remove "' + (vnode.state.removeStaff ? vnode.state.removeStaff.fullname : '') + '" (' + (vnode.state.removeStaff ? vnode.state.removeStaff.email : '') + ')',
        yes: 'Remove',
        yesclass: 'alert',
        no: 'Cancel',
        noclass: 'cancel',
        onyes: this.confirmRemoveStaff.bind(this, vnode),
        onno: function() { vnode.state.removeStaff = null },
      }),
    ]
  },
}

module.exports = AdminStaffList

},{"../api/staff":15,"../widgets/dialogue":17,"../widgets/pages":20}],9:[function(require,module,exports){
const common = require('./common')

exports.createArticle = function(body) {
  return common.sendRequest({
    method: 'POST',
    url: '/api/articles',
    body: body,
  })
}

exports.updateArticle = function(id, body) {
  return common.sendRequest({
    method: 'PUT',
    url: '/api/articles/' + id,
    body: body,
  })
}

exports.getAllArticles = function() {
  return common.sendRequest({
    method: 'GET',
    url: '/api/articles?includes=parent',
  })
}

exports.getAllArticlesPagination = function(options) {
  let extra = ''

  if (options.sort) {
    extra += '&sort=' + options.sort
  }
  if (options.per_page) {
    extra += '&perPage=' + options.per_page
  }
  if (options.page) {
    extra += '&page=' + options.page
  }
  if (options.includes) {
    extra += '&includes=' + options.includes.join(',')
  }

  return '/api/articles?' + extra
}

exports.getAllPageArticles = function(pageId, includes) {
  return common.sendRequest({
    method: 'GET',
    url: '/api/pages/' + pageId + '/articles?includes=' + includes.join(','),
  })
}

exports.getAllPageArticlesPagination = function(pageId, options) {
  let extra = ''

  if (options.sort) {
    extra += '&sort=' + options.sort
  }
  if (options.per_page) {
    extra += '&perPage=' + options.per_page
  }
  if (options.page) {
    extra += '&page=' + options.page
  }
  if (options.includes) {
    extra += '&includes=' + options.includes.join(',')
  }

  return '/api/pages/' + pageId + '/articles?' + extra
}

exports.getArticle = function(id) {
  return common.sendRequest({
    method: 'GET',
    url: '/api/articles/' + id + '?includes=media,parent,banner,files',
  })
}

exports.removeArticle = function(article, id) {
  return common.sendRequest({
    method: 'DELETE',
    url: '/api/articles/' + id,
  })
}

},{"./common":10}],10:[function(require,module,exports){
const Authentication = require('../authentication')

exports.sendRequest = function(options, isPagination) {
  let token = Authentication.getToken()
  let pagination = isPagination

  if (token) {
    options.headers = options.headers || {}
    options.headers['Authorization'] = 'Bearer ' + token
  }

  options.extract = function(xhr) {
    let out = null
    if (pagination && xhr.status < 300) {
      let headers = {}

      xhr.getAllResponseHeaders().split('\r\n').forEach(function(item) {
        var splitted = item.split(': ')
        headers[splitted[0]] = splitted[1]
      })

      out = {
        headers: headers || {},
        data: JSON.parse(xhr.responseText),
      }
    } else {
      if (xhr.responseText) {
        out = JSON.parse(xhr.responseText)
      } else {
        out = {}
      }
    }
    if (xhr.status >= 300) {
      throw out
    }
    return out
  }

  return m.request(options)
    .catch(function (error) {
      if (error.code === 403) {
        Authentication.clearToken()
        m.route.set('/login', { redirect: m.route.get() })
      }
      if (error.response && error.response.status) {
        return Promise.reject(error.response)
      }
      return Promise.reject(error)
    })
}

},{"../authentication":16}],11:[function(require,module,exports){
const common = require('./common')

exports.uploadFile = function(articleId, file) {
  let formData = new FormData()
  formData.append('file', file)

  return common.sendRequest({
    method: 'POST',
    url: '/api/articles/' + articleId + '/file',
    body: formData,
  })
}

},{"./common":10}],12:[function(require,module,exports){
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

},{"./common":10}],13:[function(require,module,exports){
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

},{"./common":10}],14:[function(require,module,exports){
const parse = require('parse-link-header')
const common = require('./common')

exports.fetchPage = function(url) {
  return common.sendRequest({
    method: 'GET',
    url: url,
  }, true)
  .then(function(result) {
    return {
      data: result.data,
      links: parse(result.headers.link || ''),
      total: Number(result.headers.pagination_total || '0'),
    }
  })
}

},{"./common":10,"parse-link-header":21}],15:[function(require,module,exports){
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

},{"./common":10}],16:[function(require,module,exports){
const storageName = 'logintoken'

const Authentication = {
  currentUser: null,
  isAdmin: false,
  loadedGoogle: false,
  loadingGoogle: false,
  loadingListeners: [],
  authListeners: [],

  updateToken: function(token) {
    if (!token) return Authentication.clearToken()
    localStorage.setItem(storageName, token)
    Authentication.currentUser = JSON.parse(atob(token.split('.')[1]))

    if (Authentication.authListeners.length) {
      Authentication.authListeners.forEach(function(x) { x(Authentication.currentUser) })
    }
  },

  clearToken: function() {
    Authentication.currentUser = null
    localStorage.removeItem(storageName)
    Authentication.isAdmin = false
  },

  addEvent: function(event) {
    Authentication.authListeners.push(event)
  },

  setAdmin: function(item) {
    Authentication.isAdmin = item
  },

  createGoogleScript: function() {
    if (Authentication.loadedGoogle) return Promise.resolve()
    return new Promise(function (res) {
      if (Authentication.loadedGoogle) return res()
      Authentication.loadingListeners.push(res)

      if (Authentication.loadingGoogle) return
      Authentication.loadingGoogle = true

      let gscript = document.createElement('script')
      gscript.type = 'text/javascript'
      gscript.async = true
      gscript.defer = true
      gscript.src = 'https://apis.google.com/js/platform.js?onload=googleLoaded'
      document.body.appendChild(gscript)
    })
  },

  getToken: function() {
    return localStorage.getItem(storageName)
  },
}

if (!window.googleLoaded) {
  window.googleLoaded = function() {
    Authentication.loadedGoogle = true
    while (Authentication.loadingListeners.length) {
      Authentication.loadingListeners.pop()()
    }
  }
}

Authentication.updateToken(localStorage.getItem(storageName))

module.exports = Authentication

},{}],17:[function(require,module,exports){
const Dialogue = {
  view: function(vnode) {
    return m('div.floating-container', {
        hidden: vnode.attrs.hidden,
      }, m('dialogue', [
          m('h2', vnode.attrs.title),
          m('p', vnode.attrs.message),
          m('div.buttons', [
            m('button', { class: vnode.attrs.yesclass || '', onclick: vnode.attrs.onyes }, vnode.attrs.yes),
            m('button', { class: vnode.attrs.noclass || '', onclick: vnode.attrs.onno }, vnode.attrs.no),
          ]),
        ])
      )
  },
}

module.exports = Dialogue

},{}],18:[function(require,module,exports){
const Fileinfo = {
  getPrefix: function(vnode) {
    if (!vnode.attrs.file.filename.endsWith('.torrent')) {
      return vnode.attrs.file.filename.split('.').slice(-1)
    }
    if (vnode.attrs.file.filename.indexOf('720 ') >= 0) {
      return '720p'
    }
    if (vnode.attrs.file.filename.indexOf('1080 ') >= 0) {
      return '1080p'
    }
    if (vnode.attrs.file.filename.indexOf('480 ') >= 0) {
      return '480p'
    }
    return 'Other'
  },

  getTitle: function(vnode) {
    if (vnode.attrs.file.meta.torrent) {
      return vnode.attrs.file.meta.torrent.name
    }
    return vnode.attrs.file.filename
  },

  getDownloadName: function(vnode) {
    if (vnode.attrs.file.meta.torrent) {
      return 'Torrent'
    }
    return 'Download'
  },

  getSize: function(orgSize) {
    var size = orgSize
    var i = -1
    var byteUnits = [' kB', ' MB', ' GB', ' TB', 'PB', 'EB', 'ZB', 'YB']
    do {
      size = size / 1024
      i++
    } while (size > 1024)

    return Math.max(size, 0.1).toFixed(1) + byteUnits[i]
  },

  view: function(vnode) {
    return m('fileinfo', { class: vnode.attrs.slim ? 'slim' : ''}, [
      m('div.filetitle', [
        m('span.prefix', this.getPrefix(vnode) + ':'),
        m('a', {
          target: '_blank',
          rel: 'noopener',
          href: vnode.attrs.file.url,
        }, this.getDownloadName(vnode)),
        vnode.attrs.file.magnet
          ? m('a', {
              href: vnode.attrs.file.magnet,
            }, 'Magnet')
          : null,
        m('span', this.getTitle(vnode)),
      ]),
      vnode.attrs.file.meta.torrent && !vnode.attrs.slim
        ? m('ul', vnode.attrs.file.meta.torrent.files.map(function(file) {
            return m('li', [
              file.name + ' ',
              m('span.meta', '(' + Fileinfo.getSize(file.size) + ')'),
            ])
          }))
        : null,
    ])
  },
}

module.exports = Fileinfo

},{}],19:[function(require,module,exports){
const Media = require('../api/media')

const FileUpload = {
  uploadFile: function(vnode, event) {
    if (!event.target.files[0]) return
    vnode.state.updateError(vnode, '')
    vnode.state.loading = true

    Media.uploadMedia(event.target.files[0])
    .then(function(res) {
      if (vnode.attrs.onupload) {
        vnode.attrs.onupload(res)
      }
    })
    .catch(function(err) {
      vnode.state.updateError(vnode, err.message)
    })
    .then(function() {
      event.target.value = null
      vnode.state.loading = false
      m.redraw()
    })
  },

  updateError: function(vnode, error) {
    if (vnode.attrs.onerror) {
      vnode.attrs.onerror(error)
    } else {
      vnode.state.error = error
    }
  },

  oninit: function(vnode) {
    vnode.state.loading = false
    vnode.state.error = ''
  },

  view: function(vnode) {
    let media = vnode.attrs.media

    return m('fileupload', {
      class: vnode.attrs.class || null,
    }, [
      m('div.error', {
        hidden: !vnode.state.error,
      }, vnode.state.error),
      (media
        ? vnode.attrs.useimg
          ? [ m('img', { src: media.large_url }), m('div.showicon')]
          : m('a.display.inside', {
              href: media.large_url,
              style: {
                'background-image': 'url("' + media.large_url + '")',
              },
            }, m('div.showicon'))
        : m('div.inside.showbordericon')
      ),
      m('input', {
        accept: 'image/*',
        type: 'file',
        onchange: this.uploadFile.bind(this, vnode),
      }),
      (media && vnode.attrs.ondelete ? m('button.remove', { onclick: vnode.attrs.ondelete }) : null),
      (vnode.state.loading ? m('div.loading-spinner') : null),
    ])
  },
}

module.exports = FileUpload

},{"../api/media":12}],20:[function(require,module,exports){
const Pages = {
  oninit: function(vnode) {
    this.onpage = vnode.attrs.onpage || function() {}
  },

  view: function(vnode) {
    if (!vnode.attrs.links) return null
    return m('pages', [
      vnode.attrs.links.first
        ? m(m.route.Link, {
            href: vnode.attrs.base + '?page=' + vnode.attrs.links.first.page,
            onclick: function() { vnode.state.onpage(vnode.attrs.links.first.page) },
          }, 'First')
        : m('div'),
      vnode.attrs.links.previous
        ? m(m.route.Link, {
            href: vnode.attrs.base + '?page=' + vnode.attrs.links.previous.page,
            onclick: function() { vnode.state.onpage(vnode.attrs.links.previous.page) },
          }, vnode.attrs.links.previous.title)
        : m('div'),
      m('div', vnode.attrs.links.current && vnode.attrs.links.current.title || 'Current page'),
      vnode.attrs.links.next
        ? m(m.route.Link, {
            href: vnode.attrs.base + '?page=' + vnode.attrs.links.next.page,
            onclick: function() { vnode.state.onpage(vnode.attrs.links.next.page) },
          }, vnode.attrs.links.next.title)
        : m('div'),
      vnode.attrs.links.last
        ? m(m.route.Link, {
            href: vnode.attrs.base + '?page=' + vnode.attrs.links.last.page,
            onclick: function() { vnode.state.onpage(vnode.attrs.links.last.page) },
          }, 'Last')
        : m('div'),
    ])
  },
}

module.exports = Pages

},{}],21:[function(require,module,exports){
'use strict';

var qs = require('querystring')
  , url = require('url')
  , xtend = require('xtend');

function hasRel(x) {
  return x && x.rel;
}

function intoRels (acc, x) {
  function splitRel (rel) {
    acc[rel] = xtend(x, { rel: rel });
  }

  x.rel.split(/\s+/).forEach(splitRel);

  return acc;
}

function createObjects (acc, p) {
  // rel="next" => 1: rel 2: next
  var m = p.match(/\s*(.+)\s*=\s*"?([^"]+)"?/)
  if (m) acc[m[1]] = m[2];
  return acc;
}

function parseLink(link) {
  try {
    var m         =  link.match(/<?([^>]*)>(.*)/)
      , linkUrl   =  m[1]
      , parts     =  m[2].split(';')
      , parsedUrl =  url.parse(linkUrl)
      , qry       =  qs.parse(parsedUrl.query);

    parts.shift();

    var info = parts
      .reduce(createObjects, {});
    
    info = xtend(qry, info);
    info.url = linkUrl;
    return info;
  } catch (e) {
    return null;
  }
}

module.exports = function (linkHeader) {
  if (!linkHeader) return null;

  return linkHeader.split(/,\s*</)
   .map(parseLink)
   .filter(hasRel)
   .reduce(intoRels, {});
};

},{"querystring":25,"url":26,"xtend":28}],22:[function(require,module,exports){
(function (global){
/*! https://mths.be/punycode v1.4.1 by @mathias */
;(function(root) {

	/** Detect free variables */
	var freeExports = typeof exports == 'object' && exports &&
		!exports.nodeType && exports;
	var freeModule = typeof module == 'object' && module &&
		!module.nodeType && module;
	var freeGlobal = typeof global == 'object' && global;
	if (
		freeGlobal.global === freeGlobal ||
		freeGlobal.window === freeGlobal ||
		freeGlobal.self === freeGlobal
	) {
		root = freeGlobal;
	}

	/**
	 * The `punycode` object.
	 * @name punycode
	 * @type Object
	 */
	var punycode,

	/** Highest positive signed 32-bit float value */
	maxInt = 2147483647, // aka. 0x7FFFFFFF or 2^31-1

	/** Bootstring parameters */
	base = 36,
	tMin = 1,
	tMax = 26,
	skew = 38,
	damp = 700,
	initialBias = 72,
	initialN = 128, // 0x80
	delimiter = '-', // '\x2D'

	/** Regular expressions */
	regexPunycode = /^xn--/,
	regexNonASCII = /[^\x20-\x7E]/, // unprintable ASCII chars + non-ASCII chars
	regexSeparators = /[\x2E\u3002\uFF0E\uFF61]/g, // RFC 3490 separators

	/** Error messages */
	errors = {
		'overflow': 'Overflow: input needs wider integers to process',
		'not-basic': 'Illegal input >= 0x80 (not a basic code point)',
		'invalid-input': 'Invalid input'
	},

	/** Convenience shortcuts */
	baseMinusTMin = base - tMin,
	floor = Math.floor,
	stringFromCharCode = String.fromCharCode,

	/** Temporary variable */
	key;

	/*--------------------------------------------------------------------------*/

	/**
	 * A generic error utility function.
	 * @private
	 * @param {String} type The error type.
	 * @returns {Error} Throws a `RangeError` with the applicable error message.
	 */
	function error(type) {
		throw new RangeError(errors[type]);
	}

	/**
	 * A generic `Array#map` utility function.
	 * @private
	 * @param {Array} array The array to iterate over.
	 * @param {Function} callback The function that gets called for every array
	 * item.
	 * @returns {Array} A new array of values returned by the callback function.
	 */
	function map(array, fn) {
		var length = array.length;
		var result = [];
		while (length--) {
			result[length] = fn(array[length]);
		}
		return result;
	}

	/**
	 * A simple `Array#map`-like wrapper to work with domain name strings or email
	 * addresses.
	 * @private
	 * @param {String} domain The domain name or email address.
	 * @param {Function} callback The function that gets called for every
	 * character.
	 * @returns {Array} A new string of characters returned by the callback
	 * function.
	 */
	function mapDomain(string, fn) {
		var parts = string.split('@');
		var result = '';
		if (parts.length > 1) {
			// In email addresses, only the domain name should be punycoded. Leave
			// the local part (i.e. everything up to `@`) intact.
			result = parts[0] + '@';
			string = parts[1];
		}
		// Avoid `split(regex)` for IE8 compatibility. See #17.
		string = string.replace(regexSeparators, '\x2E');
		var labels = string.split('.');
		var encoded = map(labels, fn).join('.');
		return result + encoded;
	}

	/**
	 * Creates an array containing the numeric code points of each Unicode
	 * character in the string. While JavaScript uses UCS-2 internally,
	 * this function will convert a pair of surrogate halves (each of which
	 * UCS-2 exposes as separate characters) into a single code point,
	 * matching UTF-16.
	 * @see `punycode.ucs2.encode`
	 * @see <https://mathiasbynens.be/notes/javascript-encoding>
	 * @memberOf punycode.ucs2
	 * @name decode
	 * @param {String} string The Unicode input string (UCS-2).
	 * @returns {Array} The new array of code points.
	 */
	function ucs2decode(string) {
		var output = [],
		    counter = 0,
		    length = string.length,
		    value,
		    extra;
		while (counter < length) {
			value = string.charCodeAt(counter++);
			if (value >= 0xD800 && value <= 0xDBFF && counter < length) {
				// high surrogate, and there is a next character
				extra = string.charCodeAt(counter++);
				if ((extra & 0xFC00) == 0xDC00) { // low surrogate
					output.push(((value & 0x3FF) << 10) + (extra & 0x3FF) + 0x10000);
				} else {
					// unmatched surrogate; only append this code unit, in case the next
					// code unit is the high surrogate of a surrogate pair
					output.push(value);
					counter--;
				}
			} else {
				output.push(value);
			}
		}
		return output;
	}

	/**
	 * Creates a string based on an array of numeric code points.
	 * @see `punycode.ucs2.decode`
	 * @memberOf punycode.ucs2
	 * @name encode
	 * @param {Array} codePoints The array of numeric code points.
	 * @returns {String} The new Unicode string (UCS-2).
	 */
	function ucs2encode(array) {
		return map(array, function(value) {
			var output = '';
			if (value > 0xFFFF) {
				value -= 0x10000;
				output += stringFromCharCode(value >>> 10 & 0x3FF | 0xD800);
				value = 0xDC00 | value & 0x3FF;
			}
			output += stringFromCharCode(value);
			return output;
		}).join('');
	}

	/**
	 * Converts a basic code point into a digit/integer.
	 * @see `digitToBasic()`
	 * @private
	 * @param {Number} codePoint The basic numeric code point value.
	 * @returns {Number} The numeric value of a basic code point (for use in
	 * representing integers) in the range `0` to `base - 1`, or `base` if
	 * the code point does not represent a value.
	 */
	function basicToDigit(codePoint) {
		if (codePoint - 48 < 10) {
			return codePoint - 22;
		}
		if (codePoint - 65 < 26) {
			return codePoint - 65;
		}
		if (codePoint - 97 < 26) {
			return codePoint - 97;
		}
		return base;
	}

	/**
	 * Converts a digit/integer into a basic code point.
	 * @see `basicToDigit()`
	 * @private
	 * @param {Number} digit The numeric value of a basic code point.
	 * @returns {Number} The basic code point whose value (when used for
	 * representing integers) is `digit`, which needs to be in the range
	 * `0` to `base - 1`. If `flag` is non-zero, the uppercase form is
	 * used; else, the lowercase form is used. The behavior is undefined
	 * if `flag` is non-zero and `digit` has no uppercase form.
	 */
	function digitToBasic(digit, flag) {
		//  0..25 map to ASCII a..z or A..Z
		// 26..35 map to ASCII 0..9
		return digit + 22 + 75 * (digit < 26) - ((flag != 0) << 5);
	}

	/**
	 * Bias adaptation function as per section 3.4 of RFC 3492.
	 * https://tools.ietf.org/html/rfc3492#section-3.4
	 * @private
	 */
	function adapt(delta, numPoints, firstTime) {
		var k = 0;
		delta = firstTime ? floor(delta / damp) : delta >> 1;
		delta += floor(delta / numPoints);
		for (/* no initialization */; delta > baseMinusTMin * tMax >> 1; k += base) {
			delta = floor(delta / baseMinusTMin);
		}
		return floor(k + (baseMinusTMin + 1) * delta / (delta + skew));
	}

	/**
	 * Converts a Punycode string of ASCII-only symbols to a string of Unicode
	 * symbols.
	 * @memberOf punycode
	 * @param {String} input The Punycode string of ASCII-only symbols.
	 * @returns {String} The resulting string of Unicode symbols.
	 */
	function decode(input) {
		// Don't use UCS-2
		var output = [],
		    inputLength = input.length,
		    out,
		    i = 0,
		    n = initialN,
		    bias = initialBias,
		    basic,
		    j,
		    index,
		    oldi,
		    w,
		    k,
		    digit,
		    t,
		    /** Cached calculation results */
		    baseMinusT;

		// Handle the basic code points: let `basic` be the number of input code
		// points before the last delimiter, or `0` if there is none, then copy
		// the first basic code points to the output.

		basic = input.lastIndexOf(delimiter);
		if (basic < 0) {
			basic = 0;
		}

		for (j = 0; j < basic; ++j) {
			// if it's not a basic code point
			if (input.charCodeAt(j) >= 0x80) {
				error('not-basic');
			}
			output.push(input.charCodeAt(j));
		}

		// Main decoding loop: start just after the last delimiter if any basic code
		// points were copied; start at the beginning otherwise.

		for (index = basic > 0 ? basic + 1 : 0; index < inputLength; /* no final expression */) {

			// `index` is the index of the next character to be consumed.
			// Decode a generalized variable-length integer into `delta`,
			// which gets added to `i`. The overflow checking is easier
			// if we increase `i` as we go, then subtract off its starting
			// value at the end to obtain `delta`.
			for (oldi = i, w = 1, k = base; /* no condition */; k += base) {

				if (index >= inputLength) {
					error('invalid-input');
				}

				digit = basicToDigit(input.charCodeAt(index++));

				if (digit >= base || digit > floor((maxInt - i) / w)) {
					error('overflow');
				}

				i += digit * w;
				t = k <= bias ? tMin : (k >= bias + tMax ? tMax : k - bias);

				if (digit < t) {
					break;
				}

				baseMinusT = base - t;
				if (w > floor(maxInt / baseMinusT)) {
					error('overflow');
				}

				w *= baseMinusT;

			}

			out = output.length + 1;
			bias = adapt(i - oldi, out, oldi == 0);

			// `i` was supposed to wrap around from `out` to `0`,
			// incrementing `n` each time, so we'll fix that now:
			if (floor(i / out) > maxInt - n) {
				error('overflow');
			}

			n += floor(i / out);
			i %= out;

			// Insert `n` at position `i` of the output
			output.splice(i++, 0, n);

		}

		return ucs2encode(output);
	}

	/**
	 * Converts a string of Unicode symbols (e.g. a domain name label) to a
	 * Punycode string of ASCII-only symbols.
	 * @memberOf punycode
	 * @param {String} input The string of Unicode symbols.
	 * @returns {String} The resulting Punycode string of ASCII-only symbols.
	 */
	function encode(input) {
		var n,
		    delta,
		    handledCPCount,
		    basicLength,
		    bias,
		    j,
		    m,
		    q,
		    k,
		    t,
		    currentValue,
		    output = [],
		    /** `inputLength` will hold the number of code points in `input`. */
		    inputLength,
		    /** Cached calculation results */
		    handledCPCountPlusOne,
		    baseMinusT,
		    qMinusT;

		// Convert the input in UCS-2 to Unicode
		input = ucs2decode(input);

		// Cache the length
		inputLength = input.length;

		// Initialize the state
		n = initialN;
		delta = 0;
		bias = initialBias;

		// Handle the basic code points
		for (j = 0; j < inputLength; ++j) {
			currentValue = input[j];
			if (currentValue < 0x80) {
				output.push(stringFromCharCode(currentValue));
			}
		}

		handledCPCount = basicLength = output.length;

		// `handledCPCount` is the number of code points that have been handled;
		// `basicLength` is the number of basic code points.

		// Finish the basic string - if it is not empty - with a delimiter
		if (basicLength) {
			output.push(delimiter);
		}

		// Main encoding loop:
		while (handledCPCount < inputLength) {

			// All non-basic code points < n have been handled already. Find the next
			// larger one:
			for (m = maxInt, j = 0; j < inputLength; ++j) {
				currentValue = input[j];
				if (currentValue >= n && currentValue < m) {
					m = currentValue;
				}
			}

			// Increase `delta` enough to advance the decoder's <n,i> state to <m,0>,
			// but guard against overflow
			handledCPCountPlusOne = handledCPCount + 1;
			if (m - n > floor((maxInt - delta) / handledCPCountPlusOne)) {
				error('overflow');
			}

			delta += (m - n) * handledCPCountPlusOne;
			n = m;

			for (j = 0; j < inputLength; ++j) {
				currentValue = input[j];

				if (currentValue < n && ++delta > maxInt) {
					error('overflow');
				}

				if (currentValue == n) {
					// Represent delta as a generalized variable-length integer
					for (q = delta, k = base; /* no condition */; k += base) {
						t = k <= bias ? tMin : (k >= bias + tMax ? tMax : k - bias);
						if (q < t) {
							break;
						}
						qMinusT = q - t;
						baseMinusT = base - t;
						output.push(
							stringFromCharCode(digitToBasic(t + qMinusT % baseMinusT, 0))
						);
						q = floor(qMinusT / baseMinusT);
					}

					output.push(stringFromCharCode(digitToBasic(q, 0)));
					bias = adapt(delta, handledCPCountPlusOne, handledCPCount == basicLength);
					delta = 0;
					++handledCPCount;
				}
			}

			++delta;
			++n;

		}
		return output.join('');
	}

	/**
	 * Converts a Punycode string representing a domain name or an email address
	 * to Unicode. Only the Punycoded parts of the input will be converted, i.e.
	 * it doesn't matter if you call it on a string that has already been
	 * converted to Unicode.
	 * @memberOf punycode
	 * @param {String} input The Punycoded domain name or email address to
	 * convert to Unicode.
	 * @returns {String} The Unicode representation of the given Punycode
	 * string.
	 */
	function toUnicode(input) {
		return mapDomain(input, function(string) {
			return regexPunycode.test(string)
				? decode(string.slice(4).toLowerCase())
				: string;
		});
	}

	/**
	 * Converts a Unicode string representing a domain name or an email address to
	 * Punycode. Only the non-ASCII parts of the domain name will be converted,
	 * i.e. it doesn't matter if you call it with a domain that's already in
	 * ASCII.
	 * @memberOf punycode
	 * @param {String} input The domain name or email address to convert, as a
	 * Unicode string.
	 * @returns {String} The Punycode representation of the given domain name or
	 * email address.
	 */
	function toASCII(input) {
		return mapDomain(input, function(string) {
			return regexNonASCII.test(string)
				? 'xn--' + encode(string)
				: string;
		});
	}

	/*--------------------------------------------------------------------------*/

	/** Define the public API */
	punycode = {
		/**
		 * A string representing the current Punycode.js version number.
		 * @memberOf punycode
		 * @type String
		 */
		'version': '1.4.1',
		/**
		 * An object of methods to convert from JavaScript's internal character
		 * representation (UCS-2) to Unicode code points, and back.
		 * @see <https://mathiasbynens.be/notes/javascript-encoding>
		 * @memberOf punycode
		 * @type Object
		 */
		'ucs2': {
			'decode': ucs2decode,
			'encode': ucs2encode
		},
		'decode': decode,
		'encode': encode,
		'toASCII': toASCII,
		'toUnicode': toUnicode
	};

	/** Expose `punycode` */
	// Some AMD build optimizers, like r.js, check for specific condition patterns
	// like the following:
	if (
		typeof define == 'function' &&
		typeof define.amd == 'object' &&
		define.amd
	) {
		define('punycode', function() {
			return punycode;
		});
	} else if (freeExports && freeModule) {
		if (module.exports == freeExports) {
			// in Node.js, io.js, or RingoJS v0.8.0+
			freeModule.exports = punycode;
		} else {
			// in Narwhal or RingoJS v0.7.0-
			for (key in punycode) {
				punycode.hasOwnProperty(key) && (freeExports[key] = punycode[key]);
			}
		}
	} else {
		// in Rhino or a web browser
		root.punycode = punycode;
	}

}(this));

}).call(this,typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})

},{}],23:[function(require,module,exports){
// Copyright Joyent, Inc. and other Node contributors.
//
// Permission is hereby granted, free of charge, to any person obtaining a
// copy of this software and associated documentation files (the
// "Software"), to deal in the Software without restriction, including
// without limitation the rights to use, copy, modify, merge, publish,
// distribute, sublicense, and/or sell copies of the Software, and to permit
// persons to whom the Software is furnished to do so, subject to the
// following conditions:
//
// The above copyright notice and this permission notice shall be included
// in all copies or substantial portions of the Software.
//
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS
// OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
// MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN
// NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM,
// DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR
// OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE
// USE OR OTHER DEALINGS IN THE SOFTWARE.

'use strict';

// If obj.hasOwnProperty has been overridden, then calling
// obj.hasOwnProperty(prop) will break.
// See: https://github.com/joyent/node/issues/1707
function hasOwnProperty(obj, prop) {
  return Object.prototype.hasOwnProperty.call(obj, prop);
}

module.exports = function(qs, sep, eq, options) {
  sep = sep || '&';
  eq = eq || '=';
  var obj = {};

  if (typeof qs !== 'string' || qs.length === 0) {
    return obj;
  }

  var regexp = /\+/g;
  qs = qs.split(sep);

  var maxKeys = 1000;
  if (options && typeof options.maxKeys === 'number') {
    maxKeys = options.maxKeys;
  }

  var len = qs.length;
  // maxKeys <= 0 means that we should not limit keys count
  if (maxKeys > 0 && len > maxKeys) {
    len = maxKeys;
  }

  for (var i = 0; i < len; ++i) {
    var x = qs[i].replace(regexp, '%20'),
        idx = x.indexOf(eq),
        kstr, vstr, k, v;

    if (idx >= 0) {
      kstr = x.substr(0, idx);
      vstr = x.substr(idx + 1);
    } else {
      kstr = x;
      vstr = '';
    }

    k = decodeURIComponent(kstr);
    v = decodeURIComponent(vstr);

    if (!hasOwnProperty(obj, k)) {
      obj[k] = v;
    } else if (isArray(obj[k])) {
      obj[k].push(v);
    } else {
      obj[k] = [obj[k], v];
    }
  }

  return obj;
};

var isArray = Array.isArray || function (xs) {
  return Object.prototype.toString.call(xs) === '[object Array]';
};

},{}],24:[function(require,module,exports){
// Copyright Joyent, Inc. and other Node contributors.
//
// Permission is hereby granted, free of charge, to any person obtaining a
// copy of this software and associated documentation files (the
// "Software"), to deal in the Software without restriction, including
// without limitation the rights to use, copy, modify, merge, publish,
// distribute, sublicense, and/or sell copies of the Software, and to permit
// persons to whom the Software is furnished to do so, subject to the
// following conditions:
//
// The above copyright notice and this permission notice shall be included
// in all copies or substantial portions of the Software.
//
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS
// OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
// MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN
// NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM,
// DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR
// OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE
// USE OR OTHER DEALINGS IN THE SOFTWARE.

'use strict';

var stringifyPrimitive = function(v) {
  switch (typeof v) {
    case 'string':
      return v;

    case 'boolean':
      return v ? 'true' : 'false';

    case 'number':
      return isFinite(v) ? v : '';

    default:
      return '';
  }
};

module.exports = function(obj, sep, eq, name) {
  sep = sep || '&';
  eq = eq || '=';
  if (obj === null) {
    obj = undefined;
  }

  if (typeof obj === 'object') {
    return map(objectKeys(obj), function(k) {
      var ks = encodeURIComponent(stringifyPrimitive(k)) + eq;
      if (isArray(obj[k])) {
        return map(obj[k], function(v) {
          return ks + encodeURIComponent(stringifyPrimitive(v));
        }).join(sep);
      } else {
        return ks + encodeURIComponent(stringifyPrimitive(obj[k]));
      }
    }).join(sep);

  }

  if (!name) return '';
  return encodeURIComponent(stringifyPrimitive(name)) + eq +
         encodeURIComponent(stringifyPrimitive(obj));
};

var isArray = Array.isArray || function (xs) {
  return Object.prototype.toString.call(xs) === '[object Array]';
};

function map (xs, f) {
  if (xs.map) return xs.map(f);
  var res = [];
  for (var i = 0; i < xs.length; i++) {
    res.push(f(xs[i], i));
  }
  return res;
}

var objectKeys = Object.keys || function (obj) {
  var res = [];
  for (var key in obj) {
    if (Object.prototype.hasOwnProperty.call(obj, key)) res.push(key);
  }
  return res;
};

},{}],25:[function(require,module,exports){
'use strict';

exports.decode = exports.parse = require('./decode');
exports.encode = exports.stringify = require('./encode');

},{"./decode":23,"./encode":24}],26:[function(require,module,exports){
// Copyright Joyent, Inc. and other Node contributors.
//
// Permission is hereby granted, free of charge, to any person obtaining a
// copy of this software and associated documentation files (the
// "Software"), to deal in the Software without restriction, including
// without limitation the rights to use, copy, modify, merge, publish,
// distribute, sublicense, and/or sell copies of the Software, and to permit
// persons to whom the Software is furnished to do so, subject to the
// following conditions:
//
// The above copyright notice and this permission notice shall be included
// in all copies or substantial portions of the Software.
//
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS
// OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
// MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN
// NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM,
// DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR
// OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE
// USE OR OTHER DEALINGS IN THE SOFTWARE.

'use strict';

var punycode = require('punycode');
var util = require('./util');

exports.parse = urlParse;
exports.resolve = urlResolve;
exports.resolveObject = urlResolveObject;
exports.format = urlFormat;

exports.Url = Url;

function Url() {
  this.protocol = null;
  this.slashes = null;
  this.auth = null;
  this.host = null;
  this.port = null;
  this.hostname = null;
  this.hash = null;
  this.search = null;
  this.query = null;
  this.pathname = null;
  this.path = null;
  this.href = null;
}

// Reference: RFC 3986, RFC 1808, RFC 2396

// define these here so at least they only have to be
// compiled once on the first module load.
var protocolPattern = /^([a-z0-9.+-]+:)/i,
    portPattern = /:[0-9]*$/,

    // Special case for a simple path URL
    simplePathPattern = /^(\/\/?(?!\/)[^\?\s]*)(\?[^\s]*)?$/,

    // RFC 2396: characters reserved for delimiting URLs.
    // We actually just auto-escape these.
    delims = ['<', '>', '"', '`', ' ', '\r', '\n', '\t'],

    // RFC 2396: characters not allowed for various reasons.
    unwise = ['{', '}', '|', '\\', '^', '`'].concat(delims),

    // Allowed by RFCs, but cause of XSS attacks.  Always escape these.
    autoEscape = ['\''].concat(unwise),
    // Characters that are never ever allowed in a hostname.
    // Note that any invalid chars are also handled, but these
    // are the ones that are *expected* to be seen, so we fast-path
    // them.
    nonHostChars = ['%', '/', '?', ';', '#'].concat(autoEscape),
    hostEndingChars = ['/', '?', '#'],
    hostnameMaxLen = 255,
    hostnamePartPattern = /^[+a-z0-9A-Z_-]{0,63}$/,
    hostnamePartStart = /^([+a-z0-9A-Z_-]{0,63})(.*)$/,
    // protocols that can allow "unsafe" and "unwise" chars.
    unsafeProtocol = {
      'javascript': true,
      'javascript:': true
    },
    // protocols that never have a hostname.
    hostlessProtocol = {
      'javascript': true,
      'javascript:': true
    },
    // protocols that always contain a // bit.
    slashedProtocol = {
      'http': true,
      'https': true,
      'ftp': true,
      'gopher': true,
      'file': true,
      'http:': true,
      'https:': true,
      'ftp:': true,
      'gopher:': true,
      'file:': true
    },
    querystring = require('querystring');

function urlParse(url, parseQueryString, slashesDenoteHost) {
  if (url && util.isObject(url) && url instanceof Url) return url;

  var u = new Url;
  u.parse(url, parseQueryString, slashesDenoteHost);
  return u;
}

Url.prototype.parse = function(url, parseQueryString, slashesDenoteHost) {
  if (!util.isString(url)) {
    throw new TypeError("Parameter 'url' must be a string, not " + typeof url);
  }

  // Copy chrome, IE, opera backslash-handling behavior.
  // Back slashes before the query string get converted to forward slashes
  // See: https://code.google.com/p/chromium/issues/detail?id=25916
  var queryIndex = url.indexOf('?'),
      splitter =
          (queryIndex !== -1 && queryIndex < url.indexOf('#')) ? '?' : '#',
      uSplit = url.split(splitter),
      slashRegex = /\\/g;
  uSplit[0] = uSplit[0].replace(slashRegex, '/');
  url = uSplit.join(splitter);

  var rest = url;

  // trim before proceeding.
  // This is to support parse stuff like "  http://foo.com  \n"
  rest = rest.trim();

  if (!slashesDenoteHost && url.split('#').length === 1) {
    // Try fast path regexp
    var simplePath = simplePathPattern.exec(rest);
    if (simplePath) {
      this.path = rest;
      this.href = rest;
      this.pathname = simplePath[1];
      if (simplePath[2]) {
        this.search = simplePath[2];
        if (parseQueryString) {
          this.query = querystring.parse(this.search.substr(1));
        } else {
          this.query = this.search.substr(1);
        }
      } else if (parseQueryString) {
        this.search = '';
        this.query = {};
      }
      return this;
    }
  }

  var proto = protocolPattern.exec(rest);
  if (proto) {
    proto = proto[0];
    var lowerProto = proto.toLowerCase();
    this.protocol = lowerProto;
    rest = rest.substr(proto.length);
  }

  // figure out if it's got a host
  // user@server is *always* interpreted as a hostname, and url
  // resolution will treat //foo/bar as host=foo,path=bar because that's
  // how the browser resolves relative URLs.
  if (slashesDenoteHost || proto || rest.match(/^\/\/[^@\/]+@[^@\/]+/)) {
    var slashes = rest.substr(0, 2) === '//';
    if (slashes && !(proto && hostlessProtocol[proto])) {
      rest = rest.substr(2);
      this.slashes = true;
    }
  }

  if (!hostlessProtocol[proto] &&
      (slashes || (proto && !slashedProtocol[proto]))) {

    // there's a hostname.
    // the first instance of /, ?, ;, or # ends the host.
    //
    // If there is an @ in the hostname, then non-host chars *are* allowed
    // to the left of the last @ sign, unless some host-ending character
    // comes *before* the @-sign.
    // URLs are obnoxious.
    //
    // ex:
    // http://a@b@c/ => user:a@b host:c
    // http://a@b?@c => user:a host:c path:/?@c

    // v0.12 TODO(isaacs): This is not quite how Chrome does things.
    // Review our test case against browsers more comprehensively.

    // find the first instance of any hostEndingChars
    var hostEnd = -1;
    for (var i = 0; i < hostEndingChars.length; i++) {
      var hec = rest.indexOf(hostEndingChars[i]);
      if (hec !== -1 && (hostEnd === -1 || hec < hostEnd))
        hostEnd = hec;
    }

    // at this point, either we have an explicit point where the
    // auth portion cannot go past, or the last @ char is the decider.
    var auth, atSign;
    if (hostEnd === -1) {
      // atSign can be anywhere.
      atSign = rest.lastIndexOf('@');
    } else {
      // atSign must be in auth portion.
      // http://a@b/c@d => host:b auth:a path:/c@d
      atSign = rest.lastIndexOf('@', hostEnd);
    }

    // Now we have a portion which is definitely the auth.
    // Pull that off.
    if (atSign !== -1) {
      auth = rest.slice(0, atSign);
      rest = rest.slice(atSign + 1);
      this.auth = decodeURIComponent(auth);
    }

    // the host is the remaining to the left of the first non-host char
    hostEnd = -1;
    for (var i = 0; i < nonHostChars.length; i++) {
      var hec = rest.indexOf(nonHostChars[i]);
      if (hec !== -1 && (hostEnd === -1 || hec < hostEnd))
        hostEnd = hec;
    }
    // if we still have not hit it, then the entire thing is a host.
    if (hostEnd === -1)
      hostEnd = rest.length;

    this.host = rest.slice(0, hostEnd);
    rest = rest.slice(hostEnd);

    // pull out port.
    this.parseHost();

    // we've indicated that there is a hostname,
    // so even if it's empty, it has to be present.
    this.hostname = this.hostname || '';

    // if hostname begins with [ and ends with ]
    // assume that it's an IPv6 address.
    var ipv6Hostname = this.hostname[0] === '[' &&
        this.hostname[this.hostname.length - 1] === ']';

    // validate a little.
    if (!ipv6Hostname) {
      var hostparts = this.hostname.split(/\./);
      for (var i = 0, l = hostparts.length; i < l; i++) {
        var part = hostparts[i];
        if (!part) continue;
        if (!part.match(hostnamePartPattern)) {
          var newpart = '';
          for (var j = 0, k = part.length; j < k; j++) {
            if (part.charCodeAt(j) > 127) {
              // we replace non-ASCII char with a temporary placeholder
              // we need this to make sure size of hostname is not
              // broken by replacing non-ASCII by nothing
              newpart += 'x';
            } else {
              newpart += part[j];
            }
          }
          // we test again with ASCII char only
          if (!newpart.match(hostnamePartPattern)) {
            var validParts = hostparts.slice(0, i);
            var notHost = hostparts.slice(i + 1);
            var bit = part.match(hostnamePartStart);
            if (bit) {
              validParts.push(bit[1]);
              notHost.unshift(bit[2]);
            }
            if (notHost.length) {
              rest = '/' + notHost.join('.') + rest;
            }
            this.hostname = validParts.join('.');
            break;
          }
        }
      }
    }

    if (this.hostname.length > hostnameMaxLen) {
      this.hostname = '';
    } else {
      // hostnames are always lower case.
      this.hostname = this.hostname.toLowerCase();
    }

    if (!ipv6Hostname) {
      // IDNA Support: Returns a punycoded representation of "domain".
      // It only converts parts of the domain name that
      // have non-ASCII characters, i.e. it doesn't matter if
      // you call it with a domain that already is ASCII-only.
      this.hostname = punycode.toASCII(this.hostname);
    }

    var p = this.port ? ':' + this.port : '';
    var h = this.hostname || '';
    this.host = h + p;
    this.href += this.host;

    // strip [ and ] from the hostname
    // the host field still retains them, though
    if (ipv6Hostname) {
      this.hostname = this.hostname.substr(1, this.hostname.length - 2);
      if (rest[0] !== '/') {
        rest = '/' + rest;
      }
    }
  }

  // now rest is set to the post-host stuff.
  // chop off any delim chars.
  if (!unsafeProtocol[lowerProto]) {

    // First, make 100% sure that any "autoEscape" chars get
    // escaped, even if encodeURIComponent doesn't think they
    // need to be.
    for (var i = 0, l = autoEscape.length; i < l; i++) {
      var ae = autoEscape[i];
      if (rest.indexOf(ae) === -1)
        continue;
      var esc = encodeURIComponent(ae);
      if (esc === ae) {
        esc = escape(ae);
      }
      rest = rest.split(ae).join(esc);
    }
  }


  // chop off from the tail first.
  var hash = rest.indexOf('#');
  if (hash !== -1) {
    // got a fragment string.
    this.hash = rest.substr(hash);
    rest = rest.slice(0, hash);
  }
  var qm = rest.indexOf('?');
  if (qm !== -1) {
    this.search = rest.substr(qm);
    this.query = rest.substr(qm + 1);
    if (parseQueryString) {
      this.query = querystring.parse(this.query);
    }
    rest = rest.slice(0, qm);
  } else if (parseQueryString) {
    // no query string, but parseQueryString still requested
    this.search = '';
    this.query = {};
  }
  if (rest) this.pathname = rest;
  if (slashedProtocol[lowerProto] &&
      this.hostname && !this.pathname) {
    this.pathname = '/';
  }

  //to support http.request
  if (this.pathname || this.search) {
    var p = this.pathname || '';
    var s = this.search || '';
    this.path = p + s;
  }

  // finally, reconstruct the href based on what has been validated.
  this.href = this.format();
  return this;
};

// format a parsed object into a url string
function urlFormat(obj) {
  // ensure it's an object, and not a string url.
  // If it's an obj, this is a no-op.
  // this way, you can call url_format() on strings
  // to clean up potentially wonky urls.
  if (util.isString(obj)) obj = urlParse(obj);
  if (!(obj instanceof Url)) return Url.prototype.format.call(obj);
  return obj.format();
}

Url.prototype.format = function() {
  var auth = this.auth || '';
  if (auth) {
    auth = encodeURIComponent(auth);
    auth = auth.replace(/%3A/i, ':');
    auth += '@';
  }

  var protocol = this.protocol || '',
      pathname = this.pathname || '',
      hash = this.hash || '',
      host = false,
      query = '';

  if (this.host) {
    host = auth + this.host;
  } else if (this.hostname) {
    host = auth + (this.hostname.indexOf(':') === -1 ?
        this.hostname :
        '[' + this.hostname + ']');
    if (this.port) {
      host += ':' + this.port;
    }
  }

  if (this.query &&
      util.isObject(this.query) &&
      Object.keys(this.query).length) {
    query = querystring.stringify(this.query);
  }

  var search = this.search || (query && ('?' + query)) || '';

  if (protocol && protocol.substr(-1) !== ':') protocol += ':';

  // only the slashedProtocols get the //.  Not mailto:, xmpp:, etc.
  // unless they had them to begin with.
  if (this.slashes ||
      (!protocol || slashedProtocol[protocol]) && host !== false) {
    host = '//' + (host || '');
    if (pathname && pathname.charAt(0) !== '/') pathname = '/' + pathname;
  } else if (!host) {
    host = '';
  }

  if (hash && hash.charAt(0) !== '#') hash = '#' + hash;
  if (search && search.charAt(0) !== '?') search = '?' + search;

  pathname = pathname.replace(/[?#]/g, function(match) {
    return encodeURIComponent(match);
  });
  search = search.replace('#', '%23');

  return protocol + host + pathname + search + hash;
};

function urlResolve(source, relative) {
  return urlParse(source, false, true).resolve(relative);
}

Url.prototype.resolve = function(relative) {
  return this.resolveObject(urlParse(relative, false, true)).format();
};

function urlResolveObject(source, relative) {
  if (!source) return relative;
  return urlParse(source, false, true).resolveObject(relative);
}

Url.prototype.resolveObject = function(relative) {
  if (util.isString(relative)) {
    var rel = new Url();
    rel.parse(relative, false, true);
    relative = rel;
  }

  var result = new Url();
  var tkeys = Object.keys(this);
  for (var tk = 0; tk < tkeys.length; tk++) {
    var tkey = tkeys[tk];
    result[tkey] = this[tkey];
  }

  // hash is always overridden, no matter what.
  // even href="" will remove it.
  result.hash = relative.hash;

  // if the relative url is empty, then there's nothing left to do here.
  if (relative.href === '') {
    result.href = result.format();
    return result;
  }

  // hrefs like //foo/bar always cut to the protocol.
  if (relative.slashes && !relative.protocol) {
    // take everything except the protocol from relative
    var rkeys = Object.keys(relative);
    for (var rk = 0; rk < rkeys.length; rk++) {
      var rkey = rkeys[rk];
      if (rkey !== 'protocol')
        result[rkey] = relative[rkey];
    }

    //urlParse appends trailing / to urls like http://www.example.com
    if (slashedProtocol[result.protocol] &&
        result.hostname && !result.pathname) {
      result.path = result.pathname = '/';
    }

    result.href = result.format();
    return result;
  }

  if (relative.protocol && relative.protocol !== result.protocol) {
    // if it's a known url protocol, then changing
    // the protocol does weird things
    // first, if it's not file:, then we MUST have a host,
    // and if there was a path
    // to begin with, then we MUST have a path.
    // if it is file:, then the host is dropped,
    // because that's known to be hostless.
    // anything else is assumed to be absolute.
    if (!slashedProtocol[relative.protocol]) {
      var keys = Object.keys(relative);
      for (var v = 0; v < keys.length; v++) {
        var k = keys[v];
        result[k] = relative[k];
      }
      result.href = result.format();
      return result;
    }

    result.protocol = relative.protocol;
    if (!relative.host && !hostlessProtocol[relative.protocol]) {
      var relPath = (relative.pathname || '').split('/');
      while (relPath.length && !(relative.host = relPath.shift()));
      if (!relative.host) relative.host = '';
      if (!relative.hostname) relative.hostname = '';
      if (relPath[0] !== '') relPath.unshift('');
      if (relPath.length < 2) relPath.unshift('');
      result.pathname = relPath.join('/');
    } else {
      result.pathname = relative.pathname;
    }
    result.search = relative.search;
    result.query = relative.query;
    result.host = relative.host || '';
    result.auth = relative.auth;
    result.hostname = relative.hostname || relative.host;
    result.port = relative.port;
    // to support http.request
    if (result.pathname || result.search) {
      var p = result.pathname || '';
      var s = result.search || '';
      result.path = p + s;
    }
    result.slashes = result.slashes || relative.slashes;
    result.href = result.format();
    return result;
  }

  var isSourceAbs = (result.pathname && result.pathname.charAt(0) === '/'),
      isRelAbs = (
          relative.host ||
          relative.pathname && relative.pathname.charAt(0) === '/'
      ),
      mustEndAbs = (isRelAbs || isSourceAbs ||
                    (result.host && relative.pathname)),
      removeAllDots = mustEndAbs,
      srcPath = result.pathname && result.pathname.split('/') || [],
      relPath = relative.pathname && relative.pathname.split('/') || [],
      psychotic = result.protocol && !slashedProtocol[result.protocol];

  // if the url is a non-slashed url, then relative
  // links like ../.. should be able
  // to crawl up to the hostname, as well.  This is strange.
  // result.protocol has already been set by now.
  // Later on, put the first path part into the host field.
  if (psychotic) {
    result.hostname = '';
    result.port = null;
    if (result.host) {
      if (srcPath[0] === '') srcPath[0] = result.host;
      else srcPath.unshift(result.host);
    }
    result.host = '';
    if (relative.protocol) {
      relative.hostname = null;
      relative.port = null;
      if (relative.host) {
        if (relPath[0] === '') relPath[0] = relative.host;
        else relPath.unshift(relative.host);
      }
      relative.host = null;
    }
    mustEndAbs = mustEndAbs && (relPath[0] === '' || srcPath[0] === '');
  }

  if (isRelAbs) {
    // it's absolute.
    result.host = (relative.host || relative.host === '') ?
                  relative.host : result.host;
    result.hostname = (relative.hostname || relative.hostname === '') ?
                      relative.hostname : result.hostname;
    result.search = relative.search;
    result.query = relative.query;
    srcPath = relPath;
    // fall through to the dot-handling below.
  } else if (relPath.length) {
    // it's relative
    // throw away the existing file, and take the new path instead.
    if (!srcPath) srcPath = [];
    srcPath.pop();
    srcPath = srcPath.concat(relPath);
    result.search = relative.search;
    result.query = relative.query;
  } else if (!util.isNullOrUndefined(relative.search)) {
    // just pull out the search.
    // like href='?foo'.
    // Put this after the other two cases because it simplifies the booleans
    if (psychotic) {
      result.hostname = result.host = srcPath.shift();
      //occationaly the auth can get stuck only in host
      //this especially happens in cases like
      //url.resolveObject('mailto:local1@domain1', 'local2@domain2')
      var authInHost = result.host && result.host.indexOf('@') > 0 ?
                       result.host.split('@') : false;
      if (authInHost) {
        result.auth = authInHost.shift();
        result.host = result.hostname = authInHost.shift();
      }
    }
    result.search = relative.search;
    result.query = relative.query;
    //to support http.request
    if (!util.isNull(result.pathname) || !util.isNull(result.search)) {
      result.path = (result.pathname ? result.pathname : '') +
                    (result.search ? result.search : '');
    }
    result.href = result.format();
    return result;
  }

  if (!srcPath.length) {
    // no path at all.  easy.
    // we've already handled the other stuff above.
    result.pathname = null;
    //to support http.request
    if (result.search) {
      result.path = '/' + result.search;
    } else {
      result.path = null;
    }
    result.href = result.format();
    return result;
  }

  // if a url ENDs in . or .., then it must get a trailing slash.
  // however, if it ends in anything else non-slashy,
  // then it must NOT get a trailing slash.
  var last = srcPath.slice(-1)[0];
  var hasTrailingSlash = (
      (result.host || relative.host || srcPath.length > 1) &&
      (last === '.' || last === '..') || last === '');

  // strip single dots, resolve double dots to parent dir
  // if the path tries to go above the root, `up` ends up > 0
  var up = 0;
  for (var i = srcPath.length; i >= 0; i--) {
    last = srcPath[i];
    if (last === '.') {
      srcPath.splice(i, 1);
    } else if (last === '..') {
      srcPath.splice(i, 1);
      up++;
    } else if (up) {
      srcPath.splice(i, 1);
      up--;
    }
  }

  // if the path is allowed to go above the root, restore leading ..s
  if (!mustEndAbs && !removeAllDots) {
    for (; up--; up) {
      srcPath.unshift('..');
    }
  }

  if (mustEndAbs && srcPath[0] !== '' &&
      (!srcPath[0] || srcPath[0].charAt(0) !== '/')) {
    srcPath.unshift('');
  }

  if (hasTrailingSlash && (srcPath.join('/').substr(-1) !== '/')) {
    srcPath.push('');
  }

  var isAbsolute = srcPath[0] === '' ||
      (srcPath[0] && srcPath[0].charAt(0) === '/');

  // put the host back
  if (psychotic) {
    result.hostname = result.host = isAbsolute ? '' :
                                    srcPath.length ? srcPath.shift() : '';
    //occationaly the auth can get stuck only in host
    //this especially happens in cases like
    //url.resolveObject('mailto:local1@domain1', 'local2@domain2')
    var authInHost = result.host && result.host.indexOf('@') > 0 ?
                     result.host.split('@') : false;
    if (authInHost) {
      result.auth = authInHost.shift();
      result.host = result.hostname = authInHost.shift();
    }
  }

  mustEndAbs = mustEndAbs || (result.host && srcPath.length);

  if (mustEndAbs && !isAbsolute) {
    srcPath.unshift('');
  }

  if (!srcPath.length) {
    result.pathname = null;
    result.path = null;
  } else {
    result.pathname = srcPath.join('/');
  }

  //to support request.http
  if (!util.isNull(result.pathname) || !util.isNull(result.search)) {
    result.path = (result.pathname ? result.pathname : '') +
                  (result.search ? result.search : '');
  }
  result.auth = relative.auth || result.auth;
  result.slashes = result.slashes || relative.slashes;
  result.href = result.format();
  return result;
};

Url.prototype.parseHost = function() {
  var host = this.host;
  var port = portPattern.exec(host);
  if (port) {
    port = port[0];
    if (port !== ':') {
      this.port = port.substr(1);
    }
    host = host.substr(0, host.length - port.length);
  }
  if (host) this.hostname = host;
};

},{"./util":27,"punycode":22,"querystring":25}],27:[function(require,module,exports){
'use strict';

module.exports = {
  isString: function(arg) {
    return typeof(arg) === 'string';
  },
  isObject: function(arg) {
    return typeof(arg) === 'object' && arg !== null;
  },
  isNull: function(arg) {
    return arg === null;
  },
  isNullOrUndefined: function(arg) {
    return arg == null;
  }
};

},{}],28:[function(require,module,exports){
module.exports = extend

var hasOwnProperty = Object.prototype.hasOwnProperty;

function extend() {
    var target = {}

    for (var i = 0; i < arguments.length; i++) {
        var source = arguments[i]

        for (var key in source) {
            if (hasOwnProperty.call(source, key)) {
                target[key] = source[key]
            }
        }
    }

    return target
}

},{}]},{},[1])
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm5vZGVfbW9kdWxlcy9icm93c2VyLXBhY2svX3ByZWx1ZGUuanMiLCJhcHAvYWRtaW4uanMiLCJhcHAvYWRtaW4vYXJ0aWNsZXMuanMiLCJhcHAvYWRtaW4vZWRpdGFydGljbGUuanMiLCJhcHAvYWRtaW4vZWRpdHBhZ2UuanMiLCJhcHAvYWRtaW4vZWRpdHN0YWZmLmpzIiwiYXBwL2FkbWluL2Zyb2FsYS5qcyIsImFwcC9hZG1pbi9wYWdlcy5qcyIsImFwcC9hZG1pbi9zdGFmZmxpc3QuanMiLCJhcHAvYXBpL2FydGljbGUuanMiLCJhcHAvYXBpL2NvbW1vbi5qcyIsImFwcC9hcGkvZmlsZS5qcyIsImFwcC9hcGkvbWVkaWEuanMiLCJhcHAvYXBpL3BhZ2UuanMiLCJhcHAvYXBpL3BhZ2luYXRpb24uanMiLCJhcHAvYXBpL3N0YWZmLmpzIiwiYXBwL2F1dGhlbnRpY2F0aW9uLmpzIiwiYXBwL3dpZGdldHMvZGlhbG9ndWUuanMiLCJhcHAvd2lkZ2V0cy9maWxlaW5mby5qcyIsImFwcC93aWRnZXRzL2ZpbGV1cGxvYWQuanMiLCJhcHAvd2lkZ2V0cy9wYWdlcy5qcyIsIm5vZGVfbW9kdWxlcy9wYXJzZS1saW5rLWhlYWRlci9pbmRleC5qcyIsIm5vZGVfbW9kdWxlcy9wdW55Y29kZS9wdW55Y29kZS5qcyIsIm5vZGVfbW9kdWxlcy9xdWVyeXN0cmluZy1lczMvZGVjb2RlLmpzIiwibm9kZV9tb2R1bGVzL3F1ZXJ5c3RyaW5nLWVzMy9lbmNvZGUuanMiLCJub2RlX21vZHVsZXMvcXVlcnlzdHJpbmctZXMzL2luZGV4LmpzIiwibm9kZV9tb2R1bGVzL3VybC91cmwuanMiLCJub2RlX21vZHVsZXMvdXJsL3V0aWwuanMiLCJub2RlX21vZHVsZXMveHRlbmQvaW1tdXRhYmxlLmpzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBO0FDQUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDZkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ25JQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3BTQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNqT0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3JKQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzlDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUMvR0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDNUdBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNuRkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ2xEQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNaQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNaQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNuR0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNoQkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3RDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNyRUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ2pCQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN4RUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDckVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN0Q0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOzs7QUN4REE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOzs7O0FDcmhCQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNwRkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNyRkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNKQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUM1dEJBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDaEJBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EiLCJmaWxlIjoiZ2VuZXJhdGVkLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXNDb250ZW50IjpbIihmdW5jdGlvbigpe2Z1bmN0aW9uIHIoZSxuLHQpe2Z1bmN0aW9uIG8oaSxmKXtpZighbltpXSl7aWYoIWVbaV0pe3ZhciBjPVwiZnVuY3Rpb25cIj09dHlwZW9mIHJlcXVpcmUmJnJlcXVpcmU7aWYoIWYmJmMpcmV0dXJuIGMoaSwhMCk7aWYodSlyZXR1cm4gdShpLCEwKTt2YXIgYT1uZXcgRXJyb3IoXCJDYW5ub3QgZmluZCBtb2R1bGUgJ1wiK2krXCInXCIpO3Rocm93IGEuY29kZT1cIk1PRFVMRV9OT1RfRk9VTkRcIixhfXZhciBwPW5baV09e2V4cG9ydHM6e319O2VbaV1bMF0uY2FsbChwLmV4cG9ydHMsZnVuY3Rpb24ocil7dmFyIG49ZVtpXVsxXVtyXTtyZXR1cm4gbyhufHxyKX0scCxwLmV4cG9ydHMscixlLG4sdCl9cmV0dXJuIG5baV0uZXhwb3J0c31mb3IodmFyIHU9XCJmdW5jdGlvblwiPT10eXBlb2YgcmVxdWlyZSYmcmVxdWlyZSxpPTA7aTx0Lmxlbmd0aDtpKyspbyh0W2ldKTtyZXR1cm4gb31yZXR1cm4gcn0pKCkiLCJjb25zdCBFZGl0UGFnZSA9IHJlcXVpcmUoJy4vYWRtaW4vZWRpdHBhZ2UnKVxyXG5jb25zdCBBZG1pblBhZ2VzID0gcmVxdWlyZSgnLi9hZG1pbi9wYWdlcycpXHJcbmNvbnN0IEFkbWluQXJ0aWNsZXMgPSByZXF1aXJlKCcuL2FkbWluL2FydGljbGVzJylcclxuY29uc3QgRWRpdEFydGljbGUgPSByZXF1aXJlKCcuL2FkbWluL2VkaXRhcnRpY2xlJylcclxuY29uc3QgQWRtaW5TdGFmZkxpc3QgPSByZXF1aXJlKCcuL2FkbWluL3N0YWZmbGlzdCcpXHJcbmNvbnN0IEVkaXRTdGFmZiA9IHJlcXVpcmUoJy4vYWRtaW4vZWRpdHN0YWZmJylcclxuXHJcbndpbmRvdy5hZGRBZG1pblJvdXRlcyA9IFtcclxuICBbJy9hZG1pbi9wYWdlcycsIEFkbWluUGFnZXNdLFxyXG4gIFsnL2FkbWluL3BhZ2VzLzprZXknLCBFZGl0UGFnZV0sXHJcbiAgWycvYWRtaW4vYXJ0aWNsZXMnLCBBZG1pbkFydGljbGVzXSxcclxuICBbJy9hZG1pbi9hcnRpY2xlcy86aWQnLCBFZGl0QXJ0aWNsZV0sXHJcbiAgWycvYWRtaW4vc3RhZmYnLCBBZG1pblN0YWZmTGlzdF0sXHJcbiAgWycvYWRtaW4vc3RhZmYvOmlkJywgRWRpdFN0YWZmXSxcclxuXVxyXG4iLCJjb25zdCBBcnRpY2xlID0gcmVxdWlyZSgnLi4vYXBpL2FydGljbGUnKVxyXG5jb25zdCBwYWdpbmF0aW9uID0gcmVxdWlyZSgnLi4vYXBpL3BhZ2luYXRpb24nKVxyXG5jb25zdCBEaWFsb2d1ZSA9IHJlcXVpcmUoJy4uL3dpZGdldHMvZGlhbG9ndWUnKVxyXG5jb25zdCBQYWdlcyA9IHJlcXVpcmUoJy4uL3dpZGdldHMvcGFnZXMnKVxyXG5cclxuY29uc3QgQWRtaW5BcnRpY2xlcyA9IHtcclxuICBvbmluaXQ6IGZ1bmN0aW9uKHZub2RlKSB7XHJcbiAgICB0aGlzLmVycm9yID0gJydcclxuICAgIHRoaXMubGFzdHBhZ2UgPSBtLnJvdXRlLnBhcmFtKCdwYWdlJykgfHwgJzEnXHJcbiAgICB0aGlzLmFydGljbGVzID0gW11cclxuICAgIHRoaXMucmVtb3ZlQXJ0aWNsZSA9IG51bGxcclxuXHJcbiAgICB0aGlzLmZldGNoQXJ0aWNsZXModm5vZGUpXHJcbiAgfSxcclxuXHJcbiAgb251cGRhdGU6IGZ1bmN0aW9uKHZub2RlKSB7XHJcbiAgICBpZiAobS5yb3V0ZS5wYXJhbSgncGFnZScpICYmIG0ucm91dGUucGFyYW0oJ3BhZ2UnKSAhPT0gdGhpcy5sYXN0cGFnZSkge1xyXG4gICAgICB0aGlzLmZldGNoQXJ0aWNsZXModm5vZGUpXHJcbiAgICB9XHJcbiAgfSxcclxuXHJcbiAgZmV0Y2hBcnRpY2xlczogZnVuY3Rpb24odm5vZGUpIHtcclxuICAgIHRoaXMubG9hZGluZyA9IHRydWVcclxuICAgIHRoaXMubGlua3MgPSBudWxsXHJcbiAgICB0aGlzLmxhc3RwYWdlID0gbS5yb3V0ZS5wYXJhbSgncGFnZScpIHx8ICcxJ1xyXG5cclxuICAgIHJldHVybiBwYWdpbmF0aW9uLmZldGNoUGFnZShBcnRpY2xlLmdldEFsbEFydGljbGVzUGFnaW5hdGlvbih7XHJcbiAgICAgIHBlcl9wYWdlOiAxMCxcclxuICAgICAgcGFnZTogdGhpcy5sYXN0cGFnZSxcclxuICAgICAgaW5jbHVkZXM6IFsncGFyZW50J10sXHJcbiAgICB9KSlcclxuICAgIC50aGVuKGZ1bmN0aW9uKHJlc3VsdCkge1xyXG4gICAgICB2bm9kZS5zdGF0ZS5hcnRpY2xlcyA9IHJlc3VsdC5kYXRhXHJcbiAgICAgIHZub2RlLnN0YXRlLmxpbmtzID0gcmVzdWx0LmxpbmtzXHJcbiAgICB9KVxyXG4gICAgLmNhdGNoKGZ1bmN0aW9uKGVycikge1xyXG4gICAgICB2bm9kZS5zdGF0ZS5lcnJvciA9IGVyci5tZXNzYWdlXHJcbiAgICB9KVxyXG4gICAgLnRoZW4oZnVuY3Rpb24oKSB7XHJcbiAgICAgIHZub2RlLnN0YXRlLmxvYWRpbmcgPSBmYWxzZVxyXG4gICAgICBtLnJlZHJhdygpXHJcbiAgICB9KVxyXG4gIH0sXHJcblxyXG4gIGNvbmZpcm1SZW1vdmVBcnRpY2xlOiBmdW5jdGlvbih2bm9kZSkge1xyXG4gICAgbGV0IHJlbW92aW5nQXJ0aWNsZSA9IHRoaXMucmVtb3ZlQXJ0aWNsZVxyXG4gICAgdGhpcy5yZW1vdmVBcnRpY2xlID0gbnVsbFxyXG4gICAgdGhpcy5sb2FkaW5nID0gdHJ1ZVxyXG4gICAgQXJ0aWNsZS5yZW1vdmVBcnRpY2xlKHJlbW92aW5nQXJ0aWNsZSwgcmVtb3ZpbmdBcnRpY2xlLmlkKVxyXG4gICAgICAudGhlbih0aGlzLm9uaW5pdC5iaW5kKHRoaXMsIHZub2RlKSlcclxuICAgICAgLmNhdGNoKGZ1bmN0aW9uKGVycikge1xyXG4gICAgICAgIHZub2RlLnN0YXRlLmVycm9yID0gZXJyLm1lc3NhZ2VcclxuICAgICAgICB2bm9kZS5zdGF0ZS5sb2FkaW5nID0gZmFsc2VcclxuICAgICAgICBtLnJlZHJhdygpXHJcbiAgICAgIH0pXHJcbiAgfSxcclxuXHJcbiAgZHJhd0FydGljbGU6IGZ1bmN0aW9uKHZub2RlLCBhcnRpY2xlKSB7XHJcbiAgICBsZXQgcGFyZW50XHJcbiAgICBpZiAoYXJ0aWNsZS5wYXJlbnQpIHtcclxuICAgICAgcGFyZW50ID0ge1xyXG4gICAgICAgIHBhdGg6ICcvcGFnZS8nICsgYXJ0aWNsZS5wYXJlbnQucGF0aCxcclxuICAgICAgICBuYW1lOiBhcnRpY2xlLnBhcmVudC5uYW1lLFxyXG4gICAgICB9XHJcbiAgICB9IGVsc2Uge1xyXG4gICAgICBwYXJlbnQgPSB7XHJcbiAgICAgICAgcGF0aDogJy8nLFxyXG4gICAgICAgIG5hbWU6ICctLSBGcm9udHBhZ2UgLS0nLFxyXG4gICAgICB9XHJcbiAgICB9XHJcbiAgICByZXR1cm4gW1xyXG4gICAgICBtKCd0cicsIFtcclxuICAgICAgICBtKCd0ZCcsIG0obS5yb3V0ZS5MaW5rLCB7IGhyZWY6ICcvYWRtaW4vYXJ0aWNsZXMvJyArIGFydGljbGUuaWQgfSwgYXJ0aWNsZS5uYW1lKSksXHJcbiAgICAgICAgbSgndGQnLCBtKG0ucm91dGUuTGluaywgeyBocmVmOiBwYXJlbnQucGF0aCB9LCBwYXJlbnQubmFtZSkpLFxyXG4gICAgICAgIG0oJ3RkJywgbShtLnJvdXRlLkxpbmssIHsgaHJlZjogJy9hcnRpY2xlLycgKyBhcnRpY2xlLnBhdGggfSwgJy9hcnRpY2xlLycgKyBhcnRpY2xlLnBhdGgpKSxcclxuICAgICAgICBtKCd0ZC5yaWdodCcsIGFydGljbGUudXBkYXRlZF9hdC5yZXBsYWNlKCdUJywgJyAnKS5zcGxpdCgnLicpWzBdKSxcclxuICAgICAgICBtKCd0ZC5yaWdodCcsIG0oJ2J1dHRvbicsIHsgb25jbGljazogZnVuY3Rpb24oKSB7IHZub2RlLnN0YXRlLnJlbW92ZUFydGljbGUgPSBhcnRpY2xlIH0gfSwgJ1JlbW92ZScpKSxcclxuICAgICAgXSksXHJcbiAgICBdXHJcbiAgfSxcclxuXHJcbiAgdmlldzogZnVuY3Rpb24odm5vZGUpIHtcclxuICAgIHJldHVybiBbXHJcbiAgICAgIG0oJ2Rpdi5hZG1pbi13cmFwcGVyJywgW1xyXG4gICAgICAgIG0oJ2Rpdi5hZG1pbi1hY3Rpb25zJywgW1xyXG4gICAgICAgICAgICBtKCdzcGFuJywgJ0FjdGlvbnM6JyksXHJcbiAgICAgICAgICAgIG0obS5yb3V0ZS5MaW5rLCB7IGhyZWY6ICcvYWRtaW4vYXJ0aWNsZXMvYWRkJyB9LCAnQ3JlYXRlIG5ldyBhcnRpY2xlJyksXHJcbiAgICAgICAgICBdKSxcclxuICAgICAgICBtKCdhcnRpY2xlLmVkaXRhcnRpY2xlJywgW1xyXG4gICAgICAgICAgbSgnaGVhZGVyJywgbSgnaDEnLCAnQWxsIGFydGljbGVzJykpLFxyXG4gICAgICAgICAgbSgnZGl2LmVycm9yJywge1xyXG4gICAgICAgICAgICBoaWRkZW46ICF0aGlzLmVycm9yLFxyXG4gICAgICAgICAgICBvbmNsaWNrOiBmdW5jdGlvbigpIHsgdm5vZGUuc3RhdGUuZXJyb3IgPSAnJyB9LFxyXG4gICAgICAgICAgfSwgdGhpcy5lcnJvciksXHJcbiAgICAgICAgICAodGhpcy5sb2FkaW5nXHJcbiAgICAgICAgICAgID8gbSgnZGl2LmxvYWRpbmctc3Bpbm5lci5mdWxsJylcclxuICAgICAgICAgICAgOiBtKCd0YWJsZScsIFtcclxuICAgICAgICAgICAgICBtKCd0aGVhZCcsIFxyXG4gICAgICAgICAgICAgICAgbSgndHInLCBbXHJcbiAgICAgICAgICAgICAgICAgIG0oJ3RoJywgJ1RpdGxlJyksXHJcbiAgICAgICAgICAgICAgICAgIG0oJ3RoJywgJ1BhZ2UnKSxcclxuICAgICAgICAgICAgICAgICAgbSgndGgnLCAnUGF0aCcpLFxyXG4gICAgICAgICAgICAgICAgICBtKCd0aC5yaWdodCcsICdVcGRhdGVkJyksXHJcbiAgICAgICAgICAgICAgICAgIG0oJ3RoLnJpZ2h0JywgJ0FjdGlvbnMnKSxcclxuICAgICAgICAgICAgICAgIF0pXHJcbiAgICAgICAgICAgICAgKSxcclxuICAgICAgICAgICAgICBtKCd0Ym9keScsIHRoaXMuYXJ0aWNsZXMubWFwKEFkbWluQXJ0aWNsZXMuZHJhd0FydGljbGUuYmluZCh0aGlzLCB2bm9kZSkpKSxcclxuICAgICAgICAgICAgXSlcclxuICAgICAgICAgICksXHJcbiAgICAgICAgICBtKFBhZ2VzLCB7XHJcbiAgICAgICAgICAgIGJhc2U6ICcvYWRtaW4vYXJ0aWNsZXMnLFxyXG4gICAgICAgICAgICBsaW5rczogdGhpcy5saW5rcyxcclxuICAgICAgICAgIH0pLFxyXG4gICAgICAgIF0pLFxyXG4gICAgICBdKSxcclxuICAgICAgbShEaWFsb2d1ZSwge1xyXG4gICAgICAgIGhpZGRlbjogdm5vZGUuc3RhdGUucmVtb3ZlQXJ0aWNsZSA9PT0gbnVsbCxcclxuICAgICAgICB0aXRsZTogJ0RlbGV0ZSAnICsgKHZub2RlLnN0YXRlLnJlbW92ZUFydGljbGUgPyB2bm9kZS5zdGF0ZS5yZW1vdmVBcnRpY2xlLm5hbWUgOiAnJyksXHJcbiAgICAgICAgbWVzc2FnZTogJ0FyZSB5b3Ugc3VyZSB5b3Ugd2FudCB0byByZW1vdmUgXCInICsgKHZub2RlLnN0YXRlLnJlbW92ZUFydGljbGUgPyB2bm9kZS5zdGF0ZS5yZW1vdmVBcnRpY2xlLm5hbWUgOiAnJykgKyAnXCIgKCcgKyAodm5vZGUuc3RhdGUucmVtb3ZlQXJ0aWNsZSA/IHZub2RlLnN0YXRlLnJlbW92ZUFydGljbGUucGF0aCA6ICcnKSArICcpJyxcclxuICAgICAgICB5ZXM6ICdSZW1vdmUnLFxyXG4gICAgICAgIHllc2NsYXNzOiAnYWxlcnQnLFxyXG4gICAgICAgIG5vOiAnQ2FuY2VsJyxcclxuICAgICAgICBub2NsYXNzOiAnY2FuY2VsJyxcclxuICAgICAgICBvbnllczogdGhpcy5jb25maXJtUmVtb3ZlQXJ0aWNsZS5iaW5kKHRoaXMsIHZub2RlKSxcclxuICAgICAgICBvbm5vOiBmdW5jdGlvbigpIHsgdm5vZGUuc3RhdGUucmVtb3ZlQXJ0aWNsZSA9IG51bGwgfSxcclxuICAgICAgfSksXHJcbiAgICBdXHJcbiAgfSxcclxufVxyXG5cclxubW9kdWxlLmV4cG9ydHMgPSBBZG1pbkFydGljbGVzXHJcbiIsImNvbnN0IEF1dGhlbnRpY2F0aW9uID0gcmVxdWlyZSgnLi4vYXV0aGVudGljYXRpb24nKVxyXG5jb25zdCBGaWxlVXBsb2FkID0gcmVxdWlyZSgnLi4vd2lkZ2V0cy9maWxldXBsb2FkJylcclxuY29uc3QgRnJvYWxhID0gcmVxdWlyZSgnLi9mcm9hbGEnKVxyXG5jb25zdCBQYWdlID0gcmVxdWlyZSgnLi4vYXBpL3BhZ2UnKVxyXG5jb25zdCBGaWxlID0gcmVxdWlyZSgnLi4vYXBpL2ZpbGUnKVxyXG5jb25zdCBGaWxlaW5mbyA9IHJlcXVpcmUoJy4uL3dpZGdldHMvZmlsZWluZm8nKVxyXG5jb25zdCBBcnRpY2xlID0gcmVxdWlyZSgnLi4vYXBpL2FydGljbGUnKVxyXG5cclxuY29uc3QgRWRpdEFydGljbGUgPSB7XHJcbiAgZ2V0RnJvYWxhT3B0aW9uczogZnVuY3Rpb24oKSB7XHJcbiAgICByZXR1cm4ge1xyXG4gICAgICB0aGVtZTogJ2dyYXknLFxyXG4gICAgICBoZWlnaHRNaW46IDE1MCxcclxuICAgICAgdmlkZW9VcGxvYWQ6IGZhbHNlLFxyXG4gICAgICBpbWFnZVVwbG9hZFVSTDogJy9hcGkvbWVkaWEnLFxyXG4gICAgICBpbWFnZU1hbmFnZXJMb2FkVVJMOiAnL2FwaS9tZWRpYScsXHJcbiAgICAgIGltYWdlTWFuYWdlckRlbGV0ZU1ldGhvZDogJ0RFTEVURScsXHJcbiAgICAgIGltYWdlTWFuYWdlckRlbGV0ZVVSTDogJy9hcGkvbWVkaWEnLFxyXG4gICAgICBldmVudHM6IHtcclxuICAgICAgICAnaW1hZ2VNYW5hZ2VyLmJlZm9yZURlbGV0ZUltYWdlJzogZnVuY3Rpb24oaW1nKSB7XHJcbiAgICAgICAgICB0aGlzLm9wdHMuaW1hZ2VNYW5hZ2VyRGVsZXRlVVJMID0gJy9hcGkvbWVkaWEvJyArIGltZy5kYXRhKCdpZCcpXHJcbiAgICAgICAgfSxcclxuICAgICAgfSxcclxuICAgICAgcmVxdWVzdEhlYWRlcnM6IHtcclxuICAgICAgICAnQXV0aG9yaXphdGlvbic6ICdCZWFyZXIgJyArIEF1dGhlbnRpY2F0aW9uLmdldFRva2VuKCksXHJcbiAgICAgIH0sXHJcbiAgICB9XHJcbiAgfSxcclxuXHJcbiAgb25pbml0OiBmdW5jdGlvbih2bm9kZSkge1xyXG4gICAgdGhpcy5mcm9hbGEgPSBudWxsXHJcbiAgICB0aGlzLmxvYWRlZEZyb2FsYSA9IEZyb2FsYS5sb2FkZWRGcm9hbGFcclxuXHJcbiAgICBpZiAoIXRoaXMubG9hZGVkRnJvYWxhKSB7XHJcbiAgICAgIEZyb2FsYS5jcmVhdGVGcm9hbGFTY3JpcHQoKVxyXG4gICAgICAudGhlbihmdW5jdGlvbigpIHtcclxuICAgICAgICB2bm9kZS5zdGF0ZS5sb2FkZWRGcm9hbGEgPSB0cnVlXHJcbiAgICAgICAgbS5yZWRyYXcoKVxyXG4gICAgICB9KVxyXG4gICAgfVxyXG5cclxuICAgIHRoaXMuZmV0Y2hBcnRpY2xlKHZub2RlKVxyXG4gIH0sXHJcblxyXG4gIG9udXBkYXRlOiBmdW5jdGlvbih2bm9kZSkge1xyXG4gICAgaWYgKHRoaXMubGFzdGlkICE9PSBtLnJvdXRlLnBhcmFtKCdpZCcpKSB7XHJcbiAgICAgIHRoaXMuZmV0Y2hBcnRpY2xlKHZub2RlKVxyXG4gICAgfVxyXG4gIH0sXHJcblxyXG4gIGZldGNoQXJ0aWNsZTogZnVuY3Rpb24odm5vZGUpIHtcclxuICAgIHRoaXMubGFzdGlkID0gbS5yb3V0ZS5wYXJhbSgnaWQnKVxyXG4gICAgdGhpcy5sb2FkaW5nID0gdGhpcy5sYXN0aWQgIT09ICdhZGQnXHJcbiAgICB0aGlzLmNyZWF0aW5nID0gdGhpcy5sYXN0aWQgPT09ICdhZGQnXHJcbiAgICB0aGlzLmxvYWRpbmdGaWxlID0gZmFsc2VcclxuICAgIHRoaXMuZXJyb3IgPSAnJ1xyXG4gICAgdGhpcy5hcnRpY2xlID0ge1xyXG4gICAgICBuYW1lOiAnJyxcclxuICAgICAgcGF0aDogJycsXHJcbiAgICAgIGRlc2NyaXB0aW9uOiAnJyxcclxuICAgICAgbWVkaWE6IG51bGwsXHJcbiAgICAgIGJhbm5lcjogbnVsbCxcclxuICAgICAgZmlsZXM6IFtdLFxyXG4gICAgfVxyXG4gICAgdGhpcy5lZGl0ZWRQYXRoID0gZmFsc2VcclxuICAgIHRoaXMuZnJvYWxhID0gbnVsbFxyXG4gICAgdGhpcy5sb2FkZWRGcm9hbGEgPSBGcm9hbGEubG9hZGVkRnJvYWxhXHJcblxyXG4gICAgaWYgKHRoaXMubGFzdGlkICE9PSAnYWRkJykge1xyXG4gICAgICBBcnRpY2xlLmdldEFydGljbGUodGhpcy5sYXN0aWQpXHJcbiAgICAgIC50aGVuKGZ1bmN0aW9uKHJlc3VsdCkge1xyXG4gICAgICAgIHZub2RlLnN0YXRlLmVkaXRlZFBhdGggPSB0cnVlXHJcbiAgICAgICAgdm5vZGUuc3RhdGUuYXJ0aWNsZSA9IHJlc3VsdFxyXG4gICAgICB9KVxyXG4gICAgICAuY2F0Y2goZnVuY3Rpb24oZXJyKSB7XHJcbiAgICAgICAgdm5vZGUuc3RhdGUuZXJyb3IgPSBlcnIubWVzc2FnZVxyXG4gICAgICB9KVxyXG4gICAgICAudGhlbihmdW5jdGlvbigpIHtcclxuICAgICAgICB2bm9kZS5zdGF0ZS5sb2FkaW5nID0gZmFsc2VcclxuICAgICAgICBtLnJlZHJhdygpXHJcbiAgICAgIH0pXHJcbiAgICB9XHJcbiAgfSxcclxuXHJcbiAgdXBkYXRlVmFsdWU6IGZ1bmN0aW9uKG5hbWUsIGUpIHtcclxuICAgIHRoaXMuYXJ0aWNsZVtuYW1lXSA9IGUuY3VycmVudFRhcmdldC52YWx1ZVxyXG4gICAgaWYgKG5hbWUgPT09ICdwYXRoJykge1xyXG4gICAgICB0aGlzLmVkaXRlZFBhdGggPSB0cnVlXHJcbiAgICB9IGVsc2UgaWYgKG5hbWUgPT09ICduYW1lJyAmJiAhdGhpcy5lZGl0ZWRQYXRoKSB7XHJcbiAgICAgIHRoaXMuYXJ0aWNsZS5wYXRoID0gdGhpcy5hcnRpY2xlLm5hbWUudG9Mb3dlckNhc2UoKS5yZXBsYWNlKC8gL2csICctJylcclxuICAgIH1cclxuICB9LFxyXG5cclxuICB1cGRhdGVQYXJlbnQ6IGZ1bmN0aW9uKGUpIHtcclxuICAgIHRoaXMuYXJ0aWNsZS5wYXJlbnRfaWQgPSBOdW1iZXIoZS5jdXJyZW50VGFyZ2V0LnZhbHVlKVxyXG4gICAgaWYgKHRoaXMuYXJ0aWNsZS5wYXJlbnRfaWQgPT09IC0xKSB7XHJcbiAgICAgIHRoaXMuYXJ0aWNsZS5wYXJlbnRfaWQgPSBudWxsXHJcbiAgICB9XHJcbiAgfSxcclxuXHJcbiAgbWVkaWFVcGxvYWRlZDogZnVuY3Rpb24odHlwZSwgbWVkaWEpIHtcclxuICAgIHRoaXMuYXJ0aWNsZVt0eXBlXSA9IG1lZGlhXHJcbiAgfSxcclxuXHJcbiAgbWVkaWFSZW1vdmVkOiBmdW5jdGlvbih0eXBlKSB7XHJcbiAgICB0aGlzLmFydGljbGVbdHlwZV0gPSBudWxsXHJcbiAgfSxcclxuXHJcbiAgc2F2ZTogZnVuY3Rpb24odm5vZGUsIGUpIHtcclxuICAgIGUucHJldmVudERlZmF1bHQoKVxyXG4gICAgaWYgKCF0aGlzLmFydGljbGUubmFtZSkge1xyXG4gICAgICB0aGlzLmVycm9yID0gJ05hbWUgaXMgbWlzc2luZydcclxuICAgIH0gZWxzZSBpZiAoIXRoaXMuYXJ0aWNsZS5wYXRoKSB7XHJcbiAgICAgIHRoaXMuZXJyb3IgPSAnUGF0aCBpcyBtaXNzaW5nJ1xyXG4gICAgfSBlbHNlIHtcclxuICAgICAgdGhpcy5lcnJvciA9ICcnXHJcbiAgICB9XHJcbiAgICBpZiAodGhpcy5lcnJvcikgcmV0dXJuXHJcblxyXG4gICAgdGhpcy5hcnRpY2xlLmRlc2NyaXB0aW9uID0gdm5vZGUuc3RhdGUuZnJvYWxhICYmIHZub2RlLnN0YXRlLmZyb2FsYS5odG1sLmdldCgpIHx8IHRoaXMuYXJ0aWNsZS5kZXNjcmlwdGlvblxyXG4gICAgaWYgKHRoaXMuYXJ0aWNsZS5kZXNjcmlwdGlvbikge1xyXG4gICAgICB0aGlzLmFydGljbGUuZGVzY3JpcHRpb24gPSB0aGlzLmFydGljbGUuZGVzY3JpcHRpb24ucmVwbGFjZSgvPHBbXj5dK2RhdGEtZi1pZD1cInBiZlwiW14+XSs+W14+XSs+W14+XSs+W14+XSs+LywgJycpXHJcbiAgICB9XHJcblxyXG4gICAgdGhpcy5sb2FkaW5nID0gdHJ1ZVxyXG5cclxuICAgIGxldCBwcm9taXNlXHJcblxyXG4gICAgaWYgKHRoaXMuYXJ0aWNsZS5pZCkge1xyXG4gICAgICBwcm9taXNlID0gQXJ0aWNsZS51cGRhdGVBcnRpY2xlKHRoaXMuYXJ0aWNsZS5pZCwge1xyXG4gICAgICAgIG5hbWU6IHRoaXMuYXJ0aWNsZS5uYW1lLFxyXG4gICAgICAgIHBhdGg6IHRoaXMuYXJ0aWNsZS5wYXRoLFxyXG4gICAgICAgIHBhcmVudF9pZDogdGhpcy5hcnRpY2xlLnBhcmVudF9pZCxcclxuICAgICAgICBkZXNjcmlwdGlvbjogdGhpcy5hcnRpY2xlLmRlc2NyaXB0aW9uLFxyXG4gICAgICAgIGJhbm5lcl9pZDogdGhpcy5hcnRpY2xlLmJhbm5lciAmJiB0aGlzLmFydGljbGUuYmFubmVyLmlkLFxyXG4gICAgICAgIG1lZGlhX2lkOiB0aGlzLmFydGljbGUubWVkaWEgJiYgdGhpcy5hcnRpY2xlLm1lZGlhLmlkLFxyXG4gICAgICB9KVxyXG4gICAgfSBlbHNlIHtcclxuICAgICAgcHJvbWlzZSA9IEFydGljbGUuY3JlYXRlQXJ0aWNsZSh7XHJcbiAgICAgICAgbmFtZTogdGhpcy5hcnRpY2xlLm5hbWUsXHJcbiAgICAgICAgcGF0aDogdGhpcy5hcnRpY2xlLnBhdGgsXHJcbiAgICAgICAgcGFyZW50X2lkOiB0aGlzLmFydGljbGUucGFyZW50X2lkLFxyXG4gICAgICAgIGRlc2NyaXB0aW9uOiB0aGlzLmFydGljbGUuZGVzY3JpcHRpb24sXHJcbiAgICAgICAgYmFubmVyX2lkOiB0aGlzLmFydGljbGUuYmFubmVyICYmIHRoaXMuYXJ0aWNsZS5iYW5uZXIuaWQsXHJcbiAgICAgICAgbWVkaWFfaWQ6IHRoaXMuYXJ0aWNsZS5tZWRpYSAmJiB0aGlzLmFydGljbGUubWVkaWEuaWQsXHJcbiAgICAgIH0pXHJcbiAgICB9XHJcblxyXG4gICAgcHJvbWlzZS50aGVuKGZ1bmN0aW9uKHJlcykge1xyXG4gICAgICBpZiAodm5vZGUuc3RhdGUuYXJ0aWNsZS5pZCkge1xyXG4gICAgICAgIHJlcy5tZWRpYSA9IHZub2RlLnN0YXRlLmFydGljbGUubWVkaWFcclxuICAgICAgICByZXMuYmFubmVyID0gdm5vZGUuc3RhdGUuYXJ0aWNsZS5iYW5uZXJcclxuICAgICAgICByZXMuZmlsZXMgPSB2bm9kZS5zdGF0ZS5hcnRpY2xlLmZpbGVzXHJcbiAgICAgICAgdm5vZGUuc3RhdGUuYXJ0aWNsZSA9IHJlc1xyXG4gICAgICB9IGVsc2Uge1xyXG4gICAgICAgIG0ucm91dGUuc2V0KCcvYWRtaW4vYXJ0aWNsZXMvJyArIHJlcy5pZClcclxuICAgICAgfVxyXG4gICAgfSlcclxuICAgIC5jYXRjaChmdW5jdGlvbihlcnIpIHtcclxuICAgICAgdm5vZGUuc3RhdGUuZXJyb3IgPSBlcnIubWVzc2FnZVxyXG4gICAgfSlcclxuICAgIC50aGVuKGZ1bmN0aW9uKCkge1xyXG4gICAgICB2bm9kZS5zdGF0ZS5sb2FkaW5nID0gZmFsc2VcclxuICAgICAgbS5yZWRyYXcoKVxyXG4gICAgfSlcclxuICB9LFxyXG5cclxuICB1cGxvYWRGaWxlOiBmdW5jdGlvbih2bm9kZSwgZXZlbnQpIHtcclxuICAgIGlmICghZXZlbnQudGFyZ2V0LmZpbGVzWzBdKSByZXR1cm5cclxuICAgIHZub2RlLnN0YXRlLmVycm9yID0gJydcclxuICAgIHZub2RlLnN0YXRlLmxvYWRpbmdGaWxlID0gdHJ1ZVxyXG5cclxuICAgIEZpbGUudXBsb2FkRmlsZSh0aGlzLmFydGljbGUuaWQsIGV2ZW50LnRhcmdldC5maWxlc1swXSlcclxuICAgIC50aGVuKGZ1bmN0aW9uKHJlcykge1xyXG4gICAgICB2bm9kZS5zdGF0ZS5hcnRpY2xlLmZpbGVzLnB1c2gocmVzKVxyXG4gICAgfSlcclxuICAgIC5jYXRjaChmdW5jdGlvbihlcnIpIHtcclxuICAgICAgdm5vZGUuc3RhdGUuZXJyb3IgPSBlcnIubWVzc2FnZVxyXG4gICAgfSlcclxuICAgIC50aGVuKGZ1bmN0aW9uKCkge1xyXG4gICAgICBldmVudC50YXJnZXQudmFsdWUgPSBudWxsXHJcbiAgICAgIHZub2RlLnN0YXRlLmxvYWRpbmdGaWxlID0gZmFsc2VcclxuICAgICAgbS5yZWRyYXcoKVxyXG4gICAgfSlcclxuICB9LFxyXG5cclxuICBnZXRGbGF0VHJlZTogZnVuY3Rpb24oKSB7XHJcbiAgICBsZXQgb3V0ID0gW3tpZDogbnVsbCwgbmFtZTogJy0tIEZyb250cGFnZSAtLSd9XVxyXG4gICAgUGFnZS5UcmVlLmZvckVhY2goZnVuY3Rpb24ocGFnZSkge1xyXG4gICAgICBvdXQucHVzaCh7IGlkOiBwYWdlLmlkLCBuYW1lOiBwYWdlLm5hbWUgfSlcclxuICAgICAgaWYgKHBhZ2UuY2hpbGRyZW4ubGVuZ3RoKSB7XHJcbiAgICAgICAgcGFnZS5jaGlsZHJlbi5mb3JFYWNoKGZ1bmN0aW9uKHN1Yikge1xyXG4gICAgICAgICAgb3V0LnB1c2goeyBpZDogc3ViLmlkLCBuYW1lOiBwYWdlLm5hbWUgKyAnIC0+ICcgKyBzdWIubmFtZSB9KVxyXG4gICAgICAgIH0pXHJcbiAgICAgIH1cclxuICAgIH0pXHJcbiAgICByZXR1cm4gb3V0XHJcbiAgfSxcclxuXHJcbiAgdmlldzogZnVuY3Rpb24odm5vZGUpIHtcclxuICAgIGNvbnN0IHBhcmVudHMgPSB0aGlzLmdldEZsYXRUcmVlKClcclxuICAgIHJldHVybiAoXHJcbiAgICAgIHRoaXMubG9hZGluZyA/XHJcbiAgICAgICAgbSgnZGl2LmxvYWRpbmctc3Bpbm5lcicpXHJcbiAgICAgIDogbSgnZGl2LmFkbWluLXdyYXBwZXInLCBbXHJcbiAgICAgICAgICBtKCdkaXYuYWRtaW4tYWN0aW9ucycsIHRoaXMuYXJ0aWNsZS5pZFxyXG4gICAgICAgICAgICA/IFtcclxuICAgICAgICAgICAgICBtKCdzcGFuJywgJ0FjdGlvbnM6JyksXHJcbiAgICAgICAgICAgICAgbShtLnJvdXRlLkxpbmssIHsgaHJlZjogJy9hcnRpY2xlLycgKyB0aGlzLmFydGljbGUucGF0aCB9LCAnVmlldyBhcnRpY2xlJyksXHJcbiAgICAgICAgICAgIF1cclxuICAgICAgICAgICAgOiBudWxsKSxcclxuICAgICAgICAgIG0oJ2FydGljbGUuZWRpdGFydGljbGUnLCBbXHJcbiAgICAgICAgICAgIG0oJ2hlYWRlcicsIG0oJ2gxJywgdGhpcy5jcmVhdGluZyA/ICdDcmVhdGUgQXJ0aWNsZScgOiAnRWRpdCAnICsgKHRoaXMuYXJ0aWNsZS5uYW1lIHx8ICcodW50aXRsZWQpJykpKSxcclxuICAgICAgICAgICAgbSgnZGl2LmVycm9yJywge1xyXG4gICAgICAgICAgICAgIGhpZGRlbjogIXRoaXMuZXJyb3IsXHJcbiAgICAgICAgICAgICAgb25jbGljazogZnVuY3Rpb24oKSB7IHZub2RlLnN0YXRlLmVycm9yID0gJycgfSxcclxuICAgICAgICAgICAgfSwgdGhpcy5lcnJvciksXHJcbiAgICAgICAgICAgIG0oRmlsZVVwbG9hZCwge1xyXG4gICAgICAgICAgICAgIG9udXBsb2FkOiB0aGlzLm1lZGlhVXBsb2FkZWQuYmluZCh0aGlzLCAnYmFubmVyJyksXHJcbiAgICAgICAgICAgICAgb25lcnJvcjogZnVuY3Rpb24oZSkgeyB2bm9kZS5zdGF0ZS5lcnJvciA9IGUgfSxcclxuICAgICAgICAgICAgICBvbmRlbGV0ZTogdGhpcy5tZWRpYVJlbW92ZWQuYmluZCh0aGlzLCAnYmFubmVyJyksXHJcbiAgICAgICAgICAgICAgbWVkaWE6IHRoaXMuYXJ0aWNsZSAmJiB0aGlzLmFydGljbGUuYmFubmVyLFxyXG4gICAgICAgICAgICB9KSxcclxuICAgICAgICAgICAgbShGaWxlVXBsb2FkLCB7XHJcbiAgICAgICAgICAgICAgY2xhc3M6ICdjb3ZlcicsXHJcbiAgICAgICAgICAgICAgdXNlaW1nOiB0cnVlLFxyXG4gICAgICAgICAgICAgIG9udXBsb2FkOiB0aGlzLm1lZGlhVXBsb2FkZWQuYmluZCh0aGlzLCAnbWVkaWEnKSxcclxuICAgICAgICAgICAgICBvbmRlbGV0ZTogdGhpcy5tZWRpYVJlbW92ZWQuYmluZCh0aGlzLCAnbWVkaWEnKSxcclxuICAgICAgICAgICAgICBvbmVycm9yOiBmdW5jdGlvbihlKSB7IHZub2RlLnN0YXRlLmVycm9yID0gZSB9LFxyXG4gICAgICAgICAgICAgIG1lZGlhOiB0aGlzLmFydGljbGUgJiYgdGhpcy5hcnRpY2xlLm1lZGlhLFxyXG4gICAgICAgICAgICB9KSxcclxuICAgICAgICAgICAgbSgnZm9ybS5lZGl0YXJ0aWNsZS5jb250ZW50Jywge1xyXG4gICAgICAgICAgICAgIG9uc3VibWl0OiB0aGlzLnNhdmUuYmluZCh0aGlzLCB2bm9kZSksXHJcbiAgICAgICAgICAgIH0sIFtcclxuICAgICAgICAgICAgICBtKCdsYWJlbCcsICdQYXJlbnQnKSxcclxuICAgICAgICAgICAgICBtKCdzZWxlY3QnLCB7XHJcbiAgICAgICAgICAgICAgICBvbmNoYW5nZTogdGhpcy51cGRhdGVQYXJlbnQuYmluZCh0aGlzKSxcclxuICAgICAgICAgICAgICB9LCBwYXJlbnRzLm1hcChmdW5jdGlvbihpdGVtKSB7IHJldHVybiBtKCdvcHRpb24nLCB7IHZhbHVlOiBpdGVtLmlkIHx8IC0xLCBzZWxlY3RlZDogaXRlbS5pZCA9PT0gdm5vZGUuc3RhdGUuYXJ0aWNsZS5wYXJlbnRfaWQgfSwgaXRlbS5uYW1lKSB9KSksXHJcbiAgICAgICAgICAgICAgbSgnbGFiZWwnLCAnTmFtZScpLFxyXG4gICAgICAgICAgICAgIG0oJ2lucHV0Jywge1xyXG4gICAgICAgICAgICAgICAgdHlwZTogJ3RleHQnLFxyXG4gICAgICAgICAgICAgICAgdmFsdWU6IHRoaXMuYXJ0aWNsZS5uYW1lLFxyXG4gICAgICAgICAgICAgICAgb25pbnB1dDogdGhpcy51cGRhdGVWYWx1ZS5iaW5kKHRoaXMsICduYW1lJyksXHJcbiAgICAgICAgICAgICAgfSksXHJcbiAgICAgICAgICAgICAgbSgnbGFiZWwnLCAnRGVzY3JpcHRpb24nKSxcclxuICAgICAgICAgICAgICAoXHJcbiAgICAgICAgICAgICAgICB0aGlzLmxvYWRlZEZyb2FsYSA/XHJcbiAgICAgICAgICAgICAgICAgIG0oJ2RpdicsIHtcclxuICAgICAgICAgICAgICAgICAgICBvbmNyZWF0ZTogZnVuY3Rpb24oZGl2KSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICB2bm9kZS5zdGF0ZS5mcm9hbGEgPSBuZXcgRnJvYWxhRWRpdG9yKGRpdi5kb20sIEVkaXRBcnRpY2xlLmdldEZyb2FsYU9wdGlvbnMoKSwgZnVuY3Rpb24oKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHZub2RlLnN0YXRlLmZyb2FsYS5odG1sLnNldCh2bm9kZS5zdGF0ZS5hcnRpY2xlLmRlc2NyaXB0aW9uKVxyXG4gICAgICAgICAgICAgICAgICAgICAgfSlcclxuICAgICAgICAgICAgICAgICAgICB9LFxyXG4gICAgICAgICAgICAgICAgICB9KVxyXG4gICAgICAgICAgICAgICAgICA6IG51bGxcclxuICAgICAgICAgICAgICApLFxyXG4gICAgICAgICAgICAgIG0oJ2xhYmVsJywgJ1BhdGgnKSxcclxuICAgICAgICAgICAgICBtKCdpbnB1dCcsIHtcclxuICAgICAgICAgICAgICAgIHR5cGU6ICd0ZXh0JyxcclxuICAgICAgICAgICAgICAgIHZhbHVlOiB0aGlzLmFydGljbGUucGF0aCxcclxuICAgICAgICAgICAgICAgIG9uaW5wdXQ6IHRoaXMudXBkYXRlVmFsdWUuYmluZCh0aGlzLCAncGF0aCcpLFxyXG4gICAgICAgICAgICAgIH0pLFxyXG4gICAgICAgICAgICAgIG0oJ2Rpdi5sb2FkaW5nLXNwaW5uZXInLCB7IGhpZGRlbjogdGhpcy5sb2FkZWRGcm9hbGEgfSksXHJcbiAgICAgICAgICAgICAgbSgnaW5wdXQnLCB7XHJcbiAgICAgICAgICAgICAgICB0eXBlOiAnc3VibWl0JyxcclxuICAgICAgICAgICAgICAgIHZhbHVlOiAnU2F2ZScsXHJcbiAgICAgICAgICAgICAgfSksXHJcbiAgICAgICAgICAgIF0pLFxyXG4gICAgICAgICAgICB0aGlzLmFydGljbGUuZmlsZXMubGVuZ3RoXHJcbiAgICAgICAgICAgICAgPyBtKCdmaWxlcycsIFtcclxuICAgICAgICAgICAgICAgICAgbSgnaDQnLCAnRmlsZXMnKSxcclxuICAgICAgICAgICAgICAgICAgdGhpcy5hcnRpY2xlLmZpbGVzLm1hcChmdW5jdGlvbihpdGVtKSB7IHJldHVybiBtKEZpbGVpbmZvLCB7IGZpbGU6IGl0ZW0gfSkgfSksXHJcbiAgICAgICAgICAgICAgICBdKVxyXG4gICAgICAgICAgICAgIDogbnVsbCxcclxuICAgICAgICAgICAgdGhpcy5hcnRpY2xlLmlkXHJcbiAgICAgICAgICAgICAgPyBtKCdkaXYuZmlsZXVwbG9hZCcsIFtcclxuICAgICAgICAgICAgICAgICdBZGQgZmlsZScsXHJcbiAgICAgICAgICAgICAgICBtKCdpbnB1dCcsIHtcclxuICAgICAgICAgICAgICAgICAgYWNjZXB0OiAnKicsXHJcbiAgICAgICAgICAgICAgICAgIHR5cGU6ICdmaWxlJyxcclxuICAgICAgICAgICAgICAgICAgb25jaGFuZ2U6IHRoaXMudXBsb2FkRmlsZS5iaW5kKHRoaXMsIHZub2RlKSxcclxuICAgICAgICAgICAgICAgIH0pLFxyXG4gICAgICAgICAgICAgICAgKHZub2RlLnN0YXRlLmxvYWRpbmdGaWxlID8gbSgnZGl2LmxvYWRpbmctc3Bpbm5lcicpIDogbnVsbCksXHJcbiAgICAgICAgICAgICAgXSlcclxuICAgICAgICAgICAgICA6IG51bGwsXHJcbiAgICAgICAgICBdKSxcclxuICAgICAgICBdKVxyXG4gICAgKVxyXG4gIH0sXHJcbn1cclxuXHJcbm1vZHVsZS5leHBvcnRzID0gRWRpdEFydGljbGVcclxuIiwiY29uc3QgQXV0aGVudGljYXRpb24gPSByZXF1aXJlKCcuLi9hdXRoZW50aWNhdGlvbicpXHJcbmNvbnN0IEZpbGVVcGxvYWQgPSByZXF1aXJlKCcuLi93aWRnZXRzL2ZpbGV1cGxvYWQnKVxyXG5jb25zdCBGcm9hbGEgPSByZXF1aXJlKCcuL2Zyb2FsYScpXHJcbmNvbnN0IFBhZ2UgPSByZXF1aXJlKCcuLi9hcGkvcGFnZScpXHJcblxyXG5jb25zdCBFZGl0UGFnZSA9IHtcclxuICBnZXRGcm9hbGFPcHRpb25zOiBmdW5jdGlvbigpIHtcclxuICAgIHJldHVybiB7XHJcbiAgICAgIHRoZW1lOiAnZ3JheScsXHJcbiAgICAgIGhlaWdodE1pbjogMTUwLFxyXG4gICAgICB2aWRlb1VwbG9hZDogZmFsc2UsXHJcbiAgICAgIGltYWdlVXBsb2FkVVJMOiAnL2FwaS9tZWRpYScsXHJcbiAgICAgIGltYWdlTWFuYWdlckxvYWRVUkw6ICcvYXBpL21lZGlhJyxcclxuICAgICAgaW1hZ2VNYW5hZ2VyRGVsZXRlTWV0aG9kOiAnREVMRVRFJyxcclxuICAgICAgaW1hZ2VNYW5hZ2VyRGVsZXRlVVJMOiAnL2FwaS9tZWRpYScsXHJcbiAgICAgIGV2ZW50czoge1xyXG4gICAgICAgICdpbWFnZU1hbmFnZXIuYmVmb3JlRGVsZXRlSW1hZ2UnOiBmdW5jdGlvbihpbWcpIHtcclxuICAgICAgICAgIHRoaXMub3B0cy5pbWFnZU1hbmFnZXJEZWxldGVVUkwgPSAnL2FwaS9tZWRpYS8nICsgaW1nLmRhdGEoJ2lkJylcclxuICAgICAgICB9LFxyXG4gICAgICB9LFxyXG4gICAgICByZXF1ZXN0SGVhZGVyczoge1xyXG4gICAgICAgICdBdXRob3JpemF0aW9uJzogJ0JlYXJlciAnICsgQXV0aGVudGljYXRpb24uZ2V0VG9rZW4oKSxcclxuICAgICAgfSxcclxuICAgIH1cclxuICB9LFxyXG5cclxuICBvbmluaXQ6IGZ1bmN0aW9uKHZub2RlKSB7XHJcbiAgICB0aGlzLmxvYWRpbmcgPSBtLnJvdXRlLnBhcmFtKCdrZXknKSAhPT0gJ2FkZCdcclxuICAgIHRoaXMuY3JlYXRpbmcgPSBtLnJvdXRlLnBhcmFtKCdrZXknKSA9PT0gJ2FkZCdcclxuICAgIHRoaXMuZXJyb3IgPSAnJ1xyXG4gICAgdGhpcy5wYWdlID0ge1xyXG4gICAgICBuYW1lOiAnJyxcclxuICAgICAgcGF0aDogJycsXHJcbiAgICAgIGRlc2NyaXB0aW9uOiAnJyxcclxuICAgICAgbWVkaWE6IG51bGwsXHJcbiAgICB9XHJcbiAgICB0aGlzLmVkaXRlZFBhdGggPSBmYWxzZVxyXG4gICAgdGhpcy5mcm9hbGEgPSBudWxsXHJcbiAgICB0aGlzLmxvYWRlZEZyb2FsYSA9IEZyb2FsYS5sb2FkZWRGcm9hbGFcclxuXHJcbiAgICBpZiAobS5yb3V0ZS5wYXJhbSgna2V5JykgIT09ICdhZGQnKSB7XHJcbiAgICAgIFBhZ2UuZ2V0UGFnZShtLnJvdXRlLnBhcmFtKCdrZXknKSlcclxuICAgICAgLnRoZW4oZnVuY3Rpb24ocmVzdWx0KSB7XHJcbiAgICAgICAgdm5vZGUuc3RhdGUuZWRpdGVkUGF0aCA9IHRydWVcclxuICAgICAgICB2bm9kZS5zdGF0ZS5wYWdlID0gcmVzdWx0XHJcbiAgICAgIH0pXHJcbiAgICAgIC5jYXRjaChmdW5jdGlvbihlcnIpIHtcclxuICAgICAgICB2bm9kZS5zdGF0ZS5lcnJvciA9IGVyci5tZXNzYWdlXHJcbiAgICAgIH0pXHJcbiAgICAgIC50aGVuKGZ1bmN0aW9uKCkge1xyXG4gICAgICAgIHZub2RlLnN0YXRlLmxvYWRpbmcgPSBmYWxzZVxyXG4gICAgICAgIG0ucmVkcmF3KClcclxuICAgICAgfSlcclxuICAgIH1cclxuXHJcbiAgICBpZiAoIXRoaXMubG9hZGVkRnJvYWxhKSB7XHJcbiAgICAgIEZyb2FsYS5jcmVhdGVGcm9hbGFTY3JpcHQoKVxyXG4gICAgICAudGhlbihmdW5jdGlvbigpIHtcclxuICAgICAgICB2bm9kZS5zdGF0ZS5sb2FkZWRGcm9hbGEgPSB0cnVlXHJcbiAgICAgICAgbS5yZWRyYXcoKVxyXG4gICAgICB9KVxyXG4gICAgfVxyXG4gIH0sXHJcblxyXG4gIHVwZGF0ZVZhbHVlOiBmdW5jdGlvbihuYW1lLCBlKSB7XHJcbiAgICB0aGlzLnBhZ2VbbmFtZV0gPSBlLmN1cnJlbnRUYXJnZXQudmFsdWVcclxuICAgIGlmIChuYW1lID09PSAncGF0aCcpIHtcclxuICAgICAgdGhpcy5lZGl0ZWRQYXRoID0gdHJ1ZVxyXG4gICAgfSBlbHNlIGlmIChuYW1lID09PSAnbmFtZScgJiYgIXRoaXMuZWRpdGVkUGF0aCkge1xyXG4gICAgICB0aGlzLnBhZ2UucGF0aCA9IHRoaXMucGFnZS5uYW1lLnRvTG93ZXJDYXNlKCkucmVwbGFjZSgvIC9nLCAnLScpXHJcbiAgICB9XHJcbiAgfSxcclxuXHJcbiAgdXBkYXRlUGFyZW50OiBmdW5jdGlvbihlKSB7XHJcbiAgICB0aGlzLnBhZ2UucGFyZW50X2lkID0gTnVtYmVyKGUuY3VycmVudFRhcmdldC52YWx1ZSlcclxuICAgIGlmICh0aGlzLnBhZ2UucGFyZW50X2lkID09PSAtMSkge1xyXG4gICAgICB0aGlzLnBhZ2UucGFyZW50X2lkID0gbnVsbFxyXG4gICAgfVxyXG4gIH0sXHJcblxyXG4gIGZpbGVVcGxvYWRlZDogZnVuY3Rpb24odHlwZSwgbWVkaWEpIHtcclxuICAgIHRoaXMucGFnZVt0eXBlXSA9IG1lZGlhXHJcbiAgfSxcclxuXHJcbiAgZmlsZVJlbW92ZWQ6IGZ1bmN0aW9uKHR5cGUpIHtcclxuICAgIHRoaXMucGFnZVt0eXBlXSA9IG51bGxcclxuICB9LFxyXG5cclxuICBzYXZlOiBmdW5jdGlvbih2bm9kZSwgZSkge1xyXG4gICAgZS5wcmV2ZW50RGVmYXVsdCgpXHJcbiAgICBpZiAoIXRoaXMucGFnZS5uYW1lKSB7XHJcbiAgICAgIHRoaXMuZXJyb3IgPSAnTmFtZSBpcyBtaXNzaW5nJ1xyXG4gICAgfSBlbHNlIGlmICghdGhpcy5wYWdlLnBhdGgpIHtcclxuICAgICAgdGhpcy5lcnJvciA9ICdQYXRoIGlzIG1pc3NpbmcnXHJcbiAgICB9XHJcbiAgICBpZiAodGhpcy5lcnJvcikgcmV0dXJuXHJcblxyXG4gICAgdGhpcy5wYWdlLmRlc2NyaXB0aW9uID0gdm5vZGUuc3RhdGUuZnJvYWxhID8gdm5vZGUuc3RhdGUuZnJvYWxhLmh0bWwuZ2V0KCkgOiB0aGlzLnBhZ2UuZGVzY3JpcHRpb25cclxuICAgIGlmICh0aGlzLnBhZ2UuZGVzY3JpcHRpb24pIHtcclxuICAgICAgdGhpcy5wYWdlLmRlc2NyaXB0aW9uID0gdGhpcy5wYWdlLmRlc2NyaXB0aW9uLnJlcGxhY2UoLzxwW14+XStkYXRhLWYtaWQ9XCJwYmZcIltePl0rPltePl0rPltePl0rPltePl0rPi8sICcnKVxyXG4gICAgfVxyXG5cclxuICAgIHRoaXMubG9hZGluZyA9IHRydWVcclxuXHJcbiAgICBsZXQgcHJvbWlzZVxyXG5cclxuICAgIGlmICh0aGlzLnBhZ2UuaWQpIHtcclxuICAgICAgcHJvbWlzZSA9IFBhZ2UudXBkYXRlUGFnZSh0aGlzLnBhZ2UuaWQsIHtcclxuICAgICAgICBuYW1lOiB0aGlzLnBhZ2UubmFtZSxcclxuICAgICAgICBwYXRoOiB0aGlzLnBhZ2UucGF0aCxcclxuICAgICAgICBwYXJlbnRfaWQ6IHRoaXMucGFnZS5wYXJlbnRfaWQsXHJcbiAgICAgICAgZGVzY3JpcHRpb246IHRoaXMucGFnZS5kZXNjcmlwdGlvbixcclxuICAgICAgICBiYW5uZXJfaWQ6IHRoaXMucGFnZS5iYW5uZXIgJiYgdGhpcy5wYWdlLmJhbm5lci5pZCB8fCBudWxsLFxyXG4gICAgICAgIG1lZGlhX2lkOiB0aGlzLnBhZ2UubWVkaWEgJiYgdGhpcy5wYWdlLm1lZGlhLmlkIHx8IG51bGwsXHJcbiAgICAgIH0pXHJcbiAgICB9IGVsc2Uge1xyXG4gICAgICBwcm9taXNlID0gUGFnZS5jcmVhdGVQYWdlKHtcclxuICAgICAgICBuYW1lOiB0aGlzLnBhZ2UubmFtZSxcclxuICAgICAgICBwYXRoOiB0aGlzLnBhZ2UucGF0aCxcclxuICAgICAgICBwYXJlbnRfaWQ6IHRoaXMucGFnZS5wYXJlbnRfaWQsXHJcbiAgICAgICAgZGVzY3JpcHRpb246IHRoaXMucGFnZS5kZXNjcmlwdGlvbixcclxuICAgICAgICBiYW5uZXJfaWQ6IHRoaXMucGFnZS5iYW5uZXIgJiYgdGhpcy5wYWdlLmJhbm5lci5pZCB8fCBudWxsLFxyXG4gICAgICAgIG1lZGlhX2lkOiB0aGlzLnBhZ2UubWVkaWEgJiYgdGhpcy5wYWdlLm1lZGlhLmlkIHx8IG51bGwsXHJcbiAgICAgIH0pXHJcbiAgICB9XHJcblxyXG4gICAgcHJvbWlzZS50aGVuKGZ1bmN0aW9uKHJlcykge1xyXG4gICAgICBpZiAodm5vZGUuc3RhdGUucGFnZS5pZCkge1xyXG4gICAgICAgIHJlcy5tZWRpYSA9IHZub2RlLnN0YXRlLnBhZ2UubWVkaWFcclxuICAgICAgICByZXMuYmFubmVyID0gdm5vZGUuc3RhdGUucGFnZS5iYW5uZXJcclxuICAgICAgICB2bm9kZS5zdGF0ZS5wYWdlID0gcmVzXHJcbiAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgbS5yb3V0ZS5zZXQoJy9hZG1pbi9wYWdlcy8nICsgcmVzLmlkKVxyXG4gICAgICB9XHJcbiAgICB9KVxyXG4gICAgLmNhdGNoKGZ1bmN0aW9uKGVycikge1xyXG4gICAgICB2bm9kZS5zdGF0ZS5lcnJvciA9IGVyci5tZXNzYWdlXHJcbiAgICB9KVxyXG4gICAgLnRoZW4oZnVuY3Rpb24oKSB7XHJcbiAgICAgIHZub2RlLnN0YXRlLmxvYWRpbmcgPSBmYWxzZVxyXG4gICAgICBtLnJlZHJhdygpXHJcbiAgICB9KVxyXG5cclxuICAgIHJldHVybiBmYWxzZVxyXG4gIH0sXHJcblxyXG4gIHZpZXc6IGZ1bmN0aW9uKHZub2RlKSB7XHJcbiAgICBjb25zdCBwYXJlbnRzID0gW3tpZDogbnVsbCwgbmFtZTogJy0tIEZyb250cGFnZSAtLSd9XS5jb25jYXQoUGFnZS5UcmVlKS5maWx0ZXIoZnVuY3Rpb24gKHBhZ2UpIHsgcmV0dXJuICF2bm9kZS5zdGF0ZS5wYWdlIHx8IHBhZ2UuaWQgIT09IHZub2RlLnN0YXRlLnBhZ2UuaWR9KVxyXG4gICAgcmV0dXJuIChcclxuICAgICAgdGhpcy5sb2FkaW5nID9cclxuICAgICAgICBtKCdkaXYubG9hZGluZy1zcGlubmVyJylcclxuICAgICAgOiBtKCdkaXYuYWRtaW4td3JhcHBlcicsIFtcclxuICAgICAgICAgIG0oJ2Rpdi5hZG1pbi1hY3Rpb25zJywgdGhpcy5wYWdlLmlkXHJcbiAgICAgICAgICAgID8gW1xyXG4gICAgICAgICAgICAgIG0oJ3NwYW4nLCAnQWN0aW9uczonKSxcclxuICAgICAgICAgICAgICBtKG0ucm91dGUuTGluaywgeyBocmVmOiAnL3BhZ2UvJyArIHRoaXMucGFnZS5wYXRoIH0sICdWaWV3IHBhZ2UnKSxcclxuICAgICAgICAgICAgICBtKG0ucm91dGUuTGluaywgeyBocmVmOiAnL2FkbWluL3BhZ2VzL2FkZCcgfSwgJ0NyZWF0ZSBuZXcgcGFnZScpLFxyXG4gICAgICAgICAgICBdXHJcbiAgICAgICAgICAgIDogbnVsbCksXHJcbiAgICAgICAgICBtKCdhcnRpY2xlLmVkaXRwYWdlJywgW1xyXG4gICAgICAgICAgICBtKCdoZWFkZXInLCBtKCdoMScsIHRoaXMuY3JlYXRpbmcgPyAnQ3JlYXRlIFBhZ2UnIDogJ0VkaXQgJyArICh0aGlzLnBhZ2UubmFtZSB8fCAnKHVudGl0bGVkKScpKSksXHJcbiAgICAgICAgICAgIG0oJ2Rpdi5lcnJvcicsIHtcclxuICAgICAgICAgICAgICBoaWRkZW46ICF0aGlzLmVycm9yLFxyXG4gICAgICAgICAgICAgIG9uY2xpY2s6IGZ1bmN0aW9uKCkgeyB2bm9kZS5zdGF0ZS5lcnJvciA9ICcnIH0sXHJcbiAgICAgICAgICAgIH0sIHRoaXMuZXJyb3IpLFxyXG4gICAgICAgICAgICBtKEZpbGVVcGxvYWQsIHtcclxuICAgICAgICAgICAgICBvbnVwbG9hZDogdGhpcy5maWxlVXBsb2FkZWQuYmluZCh0aGlzLCAnYmFubmVyJyksXHJcbiAgICAgICAgICAgICAgb25kZWxldGU6IHRoaXMuZmlsZVJlbW92ZWQuYmluZCh0aGlzLCAnYmFubmVyJyksXHJcbiAgICAgICAgICAgICAgb25lcnJvcjogZnVuY3Rpb24oZSkgeyB2bm9kZS5zdGF0ZS5lcnJvciA9IGUgfSxcclxuICAgICAgICAgICAgICBtZWRpYTogdGhpcy5wYWdlICYmIHRoaXMucGFnZS5iYW5uZXIsXHJcbiAgICAgICAgICAgIH0pLFxyXG4gICAgICAgICAgICBtKEZpbGVVcGxvYWQsIHtcclxuICAgICAgICAgICAgICBjbGFzczogJ2NvdmVyJyxcclxuICAgICAgICAgICAgICB1c2VpbWc6IHRydWUsXHJcbiAgICAgICAgICAgICAgb251cGxvYWQ6IHRoaXMuZmlsZVVwbG9hZGVkLmJpbmQodGhpcywgJ21lZGlhJyksXHJcbiAgICAgICAgICAgICAgb25kZWxldGU6IHRoaXMuZmlsZVJlbW92ZWQuYmluZCh0aGlzLCAnbWVkaWEnKSxcclxuICAgICAgICAgICAgICBvbmVycm9yOiBmdW5jdGlvbihlKSB7IHZub2RlLnN0YXRlLmVycm9yID0gZSB9LFxyXG4gICAgICAgICAgICAgIG1lZGlhOiB0aGlzLnBhZ2UgJiYgdGhpcy5wYWdlLm1lZGlhLFxyXG4gICAgICAgICAgICB9KSxcclxuICAgICAgICAgICAgbSgnZm9ybS5lZGl0cGFnZS5jb250ZW50Jywge1xyXG4gICAgICAgICAgICAgIG9uc3VibWl0OiB0aGlzLnNhdmUuYmluZCh0aGlzLCB2bm9kZSksXHJcbiAgICAgICAgICAgIH0sIFtcclxuICAgICAgICAgICAgICBtKCdsYWJlbCcsICdQYXJlbnQnKSxcclxuICAgICAgICAgICAgICBtKCdzZWxlY3QnLCB7XHJcbiAgICAgICAgICAgICAgICBvbmNoYW5nZTogdGhpcy51cGRhdGVQYXJlbnQuYmluZCh0aGlzKSxcclxuICAgICAgICAgICAgICB9LCBwYXJlbnRzLm1hcChmdW5jdGlvbihpdGVtKSB7XHJcbiAgICAgICAgICAgICAgICByZXR1cm4gbSgnb3B0aW9uJywgeyB2YWx1ZTogaXRlbS5pZCB8fCAtMSwgc2VsZWN0ZWQ6IGl0ZW0uaWQgPT09IHZub2RlLnN0YXRlLnBhZ2UucGFyZW50X2lkIH0sIGl0ZW0ubmFtZSlcclxuICAgICAgICAgICAgICB9KSksXHJcbiAgICAgICAgICAgICAgbSgnbGFiZWwnLCAnTmFtZScpLFxyXG4gICAgICAgICAgICAgIG0oJ2lucHV0Jywge1xyXG4gICAgICAgICAgICAgICAgdHlwZTogJ3RleHQnLFxyXG4gICAgICAgICAgICAgICAgdmFsdWU6IHRoaXMucGFnZS5uYW1lLFxyXG4gICAgICAgICAgICAgICAgb25pbnB1dDogdGhpcy51cGRhdGVWYWx1ZS5iaW5kKHRoaXMsICduYW1lJyksXHJcbiAgICAgICAgICAgICAgfSksXHJcbiAgICAgICAgICAgICAgbSgnbGFiZWwnLCAnRGVzY3JpcHRpb24nKSxcclxuICAgICAgICAgICAgICAoXHJcbiAgICAgICAgICAgICAgICB0aGlzLmxvYWRlZEZyb2FsYSA/XHJcbiAgICAgICAgICAgICAgICAgIG0oJ2RpdicsIHtcclxuICAgICAgICAgICAgICAgICAgICBvbmNyZWF0ZTogZnVuY3Rpb24oZGl2KSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICB2bm9kZS5zdGF0ZS5mcm9hbGEgPSBuZXcgRnJvYWxhRWRpdG9yKGRpdi5kb20sIEVkaXRQYWdlLmdldEZyb2FsYU9wdGlvbnMoKSwgZnVuY3Rpb24oKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHZub2RlLnN0YXRlLmZyb2FsYS5odG1sLnNldCh2bm9kZS5zdGF0ZS5wYWdlLmRlc2NyaXB0aW9uKVxyXG4gICAgICAgICAgICAgICAgICAgICAgfSlcclxuICAgICAgICAgICAgICAgICAgICB9LFxyXG4gICAgICAgICAgICAgICAgICB9KVxyXG4gICAgICAgICAgICAgICAgICA6IG51bGxcclxuICAgICAgICAgICAgICApLFxyXG4gICAgICAgICAgICAgIG0oJ2xhYmVsJywgJ1BhdGgnKSxcclxuICAgICAgICAgICAgICBtKCdpbnB1dCcsIHtcclxuICAgICAgICAgICAgICAgIHR5cGU6ICd0ZXh0JyxcclxuICAgICAgICAgICAgICAgIHZhbHVlOiB0aGlzLnBhZ2UucGF0aCxcclxuICAgICAgICAgICAgICAgIG9uaW5wdXQ6IHRoaXMudXBkYXRlVmFsdWUuYmluZCh0aGlzLCAncGF0aCcpLFxyXG4gICAgICAgICAgICAgIH0pLFxyXG4gICAgICAgICAgICAgIG0oJ2Rpdi5sb2FkaW5nLXNwaW5uZXInLCB7IGhpZGRlbjogdGhpcy5sb2FkZWRGcm9hbGEgfSksXHJcbiAgICAgICAgICAgICAgbSgnaW5wdXQnLCB7XHJcbiAgICAgICAgICAgICAgICB0eXBlOiAnc3VibWl0JyxcclxuICAgICAgICAgICAgICAgIHZhbHVlOiAnU2F2ZScsXHJcbiAgICAgICAgICAgICAgfSksXHJcbiAgICAgICAgICAgIF0pLFxyXG4gICAgICAgICAgXSksXHJcbiAgICAgICAgXSlcclxuICAgIClcclxuICB9LFxyXG59XHJcblxyXG5tb2R1bGUuZXhwb3J0cyA9IEVkaXRQYWdlXHJcbiIsImNvbnN0IFN0YWZmID0gcmVxdWlyZSgnLi4vYXBpL3N0YWZmJylcclxuXHJcbmNvbnN0IEVkaXRTdGFmZiA9IHtcclxuICBvbmluaXQ6IGZ1bmN0aW9uKHZub2RlKSB7XHJcbiAgICB0aGlzLmZldGNoU3RhZmYodm5vZGUpXHJcbiAgfSxcclxuXHJcbiAgb251cGRhdGU6IGZ1bmN0aW9uKHZub2RlKSB7XHJcbiAgICBpZiAodGhpcy5sYXN0aWQgIT09IG0ucm91dGUucGFyYW0oJ2lkJykpIHtcclxuICAgICAgdGhpcy5mZXRjaFN0YWZmKHZub2RlKVxyXG4gICAgfVxyXG4gIH0sXHJcblxyXG4gIGZldGNoU3RhZmY6IGZ1bmN0aW9uKHZub2RlKSB7XHJcbiAgICB0aGlzLmxhc3RpZCA9IG0ucm91dGUucGFyYW0oJ2lkJylcclxuICAgIHRoaXMubG9hZGluZyA9IHRoaXMubGFzdGlkICE9PSAnYWRkJ1xyXG4gICAgdGhpcy5jcmVhdGluZyA9IHRoaXMubGFzdGlkID09PSAnYWRkJ1xyXG4gICAgdGhpcy5lcnJvciA9ICcnXHJcbiAgICB0aGlzLnN0YWZmID0ge1xyXG4gICAgICBmdWxsbmFtZTogJycsXHJcbiAgICAgIGVtYWlsOiAnJyxcclxuICAgICAgcGFzc3dvcmQ6ICcnLFxyXG4gICAgICBsZXZlbDogMTAsXHJcbiAgICB9XHJcblxyXG4gICAgaWYgKHRoaXMubGFzdGlkICE9PSAnYWRkJykge1xyXG4gICAgICBTdGFmZi5nZXRTdGFmZih0aGlzLmxhc3RpZClcclxuICAgICAgLnRoZW4oZnVuY3Rpb24ocmVzdWx0KSB7XHJcbiAgICAgICAgdm5vZGUuc3RhdGUuZWRpdGVkUGF0aCA9IHRydWVcclxuICAgICAgICB2bm9kZS5zdGF0ZS5zdGFmZiA9IHJlc3VsdFxyXG4gICAgICB9KVxyXG4gICAgICAuY2F0Y2goZnVuY3Rpb24oZXJyKSB7XHJcbiAgICAgICAgdm5vZGUuc3RhdGUuZXJyb3IgPSBlcnIubWVzc2FnZVxyXG4gICAgICB9KVxyXG4gICAgICAudGhlbihmdW5jdGlvbigpIHtcclxuICAgICAgICB2bm9kZS5zdGF0ZS5sb2FkaW5nID0gZmFsc2VcclxuICAgICAgICBtLnJlZHJhdygpXHJcbiAgICAgIH0pXHJcbiAgICB9XHJcbiAgfSxcclxuXHJcbiAgdXBkYXRlVmFsdWU6IGZ1bmN0aW9uKGZ1bGxuYW1lLCBlKSB7XHJcbiAgICB0aGlzLnN0YWZmW2Z1bGxuYW1lXSA9IGUuY3VycmVudFRhcmdldC52YWx1ZVxyXG4gIH0sXHJcblxyXG4gIHNhdmU6IGZ1bmN0aW9uKHZub2RlLCBlKSB7XHJcbiAgICBlLnByZXZlbnREZWZhdWx0KClcclxuICAgIGlmICghdGhpcy5zdGFmZi5mdWxsbmFtZSkge1xyXG4gICAgICB0aGlzLmVycm9yID0gJ0Z1bGxuYW1lIGlzIG1pc3NpbmcnXHJcbiAgICB9IGVsc2UgaWYgKCF0aGlzLnN0YWZmLmVtYWlsKSB7XHJcbiAgICAgIHRoaXMuZXJyb3IgPSAnRW1haWwgaXMgbWlzc2luZydcclxuICAgIH0gZWxzZSB7XHJcbiAgICAgIHRoaXMuZXJyb3IgPSAnJ1xyXG4gICAgfVxyXG4gICAgaWYgKHRoaXMuZXJyb3IpIHJldHVyblxyXG5cclxuICAgIHRoaXMuc3RhZmYuZGVzY3JpcHRpb24gPSB2bm9kZS5zdGF0ZS5mcm9hbGEgJiYgdm5vZGUuc3RhdGUuZnJvYWxhLmh0bWwuZ2V0KCkgfHwgdGhpcy5zdGFmZi5kZXNjcmlwdGlvblxyXG5cclxuICAgIHRoaXMubG9hZGluZyA9IHRydWVcclxuXHJcbiAgICBsZXQgcHJvbWlzZVxyXG5cclxuICAgIGlmICh0aGlzLnN0YWZmLmlkKSB7XHJcbiAgICAgIHByb21pc2UgPSBTdGFmZi51cGRhdGVTdGFmZih0aGlzLnN0YWZmLmlkLCB7XHJcbiAgICAgICAgZnVsbG5hbWU6IHRoaXMuc3RhZmYuZnVsbG5hbWUsXHJcbiAgICAgICAgZW1haWw6IHRoaXMuc3RhZmYuZW1haWwsXHJcbiAgICAgICAgbGV2ZWw6IHRoaXMuc3RhZmYubGV2ZWwsXHJcbiAgICAgICAgcGFzc3dvcmQ6IHRoaXMuc3RhZmYucGFzc3dvcmQsXHJcbiAgICAgIH0pXHJcbiAgICB9IGVsc2Uge1xyXG4gICAgICBwcm9taXNlID0gU3RhZmYuY3JlYXRlU3RhZmYoe1xyXG4gICAgICAgIGZ1bGxuYW1lOiB0aGlzLnN0YWZmLmZ1bGxuYW1lLFxyXG4gICAgICAgIGVtYWlsOiB0aGlzLnN0YWZmLmVtYWlsLFxyXG4gICAgICAgIGxldmVsOiB0aGlzLnN0YWZmLmxldmVsLFxyXG4gICAgICAgIHBhc3N3b3JkOiB0aGlzLnN0YWZmLnBhc3N3b3JkLFxyXG4gICAgICB9KVxyXG4gICAgfVxyXG5cclxuICAgIHByb21pc2UudGhlbihmdW5jdGlvbihyZXMpIHtcclxuICAgICAgbS5yb3V0ZS5zZXQoJy9hZG1pbi9zdGFmZicpXHJcbiAgICB9KVxyXG4gICAgLmNhdGNoKGZ1bmN0aW9uKGVycikge1xyXG4gICAgICB2bm9kZS5zdGF0ZS5lcnJvciA9IGVyci5tZXNzYWdlXHJcbiAgICB9KVxyXG4gICAgLnRoZW4oZnVuY3Rpb24oKSB7XHJcbiAgICAgIHZub2RlLnN0YXRlLmxvYWRpbmcgPSBmYWxzZVxyXG4gICAgICBtLnJlZHJhdygpXHJcbiAgICB9KVxyXG4gIH0sXHJcblxyXG4gIHVwZGF0ZUxldmVsOiBmdW5jdGlvbihlKSB7XHJcbiAgICB0aGlzLnN0YWZmLmxldmVsID0gTnVtYmVyKGUuY3VycmVudFRhcmdldC52YWx1ZSlcclxuICB9LFxyXG5cclxuICB2aWV3OiBmdW5jdGlvbih2bm9kZSkge1xyXG4gICAgY29uc3QgbGV2ZWxzID0gW1sxMCwgJ01hbmFnZXInXSwgWzEwMCwgJ0FkbWluJ11dXHJcbiAgICByZXR1cm4gKFxyXG4gICAgICB0aGlzLmxvYWRpbmcgP1xyXG4gICAgICAgIG0oJ2Rpdi5sb2FkaW5nLXNwaW5uZXInKVxyXG4gICAgICA6IG0oJ2Rpdi5hZG1pbi13cmFwcGVyJywgW1xyXG4gICAgICAgICAgbSgnZGl2LmFkbWluLWFjdGlvbnMnLCB0aGlzLnN0YWZmLmlkXHJcbiAgICAgICAgICAgID8gW1xyXG4gICAgICAgICAgICAgIG0oJ3NwYW4nLCAnQWN0aW9uczonKSxcclxuICAgICAgICAgICAgICBtKG0ucm91dGUuTGluaywgeyBocmVmOiAnL2FkbWluL3N0YWZmJyB9LCAnU3RhZmYgbGlzdCcpLFxyXG4gICAgICAgICAgICBdXHJcbiAgICAgICAgICAgIDogbnVsbCksXHJcbiAgICAgICAgICBtKCdhcnRpY2xlLmVkaXRzdGFmZicsIFtcclxuICAgICAgICAgICAgbSgnaGVhZGVyJywgbSgnaDEnLCB0aGlzLmNyZWF0aW5nID8gJ0NyZWF0ZSBTdGFmZicgOiAnRWRpdCAnICsgKHRoaXMuc3RhZmYuZnVsbG5hbWUgfHwgJyh1bnRpdGxlZCknKSkpLFxyXG4gICAgICAgICAgICBtKCdkaXYuZXJyb3InLCB7XHJcbiAgICAgICAgICAgICAgaGlkZGVuOiAhdGhpcy5lcnJvcixcclxuICAgICAgICAgICAgICBvbmNsaWNrOiBmdW5jdGlvbigpIHsgdm5vZGUuc3RhdGUuZXJyb3IgPSAnJyB9LFxyXG4gICAgICAgICAgICB9LCB0aGlzLmVycm9yKSxcclxuICAgICAgICAgICAgbSgnZm9ybS5lZGl0c3RhZmYuY29udGVudCcsIHtcclxuICAgICAgICAgICAgICBvbnN1Ym1pdDogdGhpcy5zYXZlLmJpbmQodGhpcywgdm5vZGUpLFxyXG4gICAgICAgICAgICB9LCBbXHJcbiAgICAgICAgICAgICAgbSgnbGFiZWwnLCAnTGV2ZWwnKSxcclxuICAgICAgICAgICAgICBtKCdzZWxlY3QnLCB7XHJcbiAgICAgICAgICAgICAgICBvbmNoYW5nZTogdGhpcy51cGRhdGVMZXZlbC5iaW5kKHRoaXMpLFxyXG4gICAgICAgICAgICAgIH0sIGxldmVscy5tYXAoZnVuY3Rpb24obGV2ZWwpIHsgcmV0dXJuIG0oJ29wdGlvbicsIHsgdmFsdWU6IGxldmVsWzBdLCBzZWxlY3RlZDogbGV2ZWxbMF0gPT09IHZub2RlLnN0YXRlLnN0YWZmLmxldmVsIH0sIGxldmVsWzFdKSB9KSksXHJcbiAgICAgICAgICAgICAgbSgnbGFiZWwnLCAnRnVsbG5hbWUnKSxcclxuICAgICAgICAgICAgICBtKCdpbnB1dCcsIHtcclxuICAgICAgICAgICAgICAgIHR5cGU6ICd0ZXh0JyxcclxuICAgICAgICAgICAgICAgIHZhbHVlOiB0aGlzLnN0YWZmLmZ1bGxuYW1lLFxyXG4gICAgICAgICAgICAgICAgb25pbnB1dDogdGhpcy51cGRhdGVWYWx1ZS5iaW5kKHRoaXMsICdmdWxsbmFtZScpLFxyXG4gICAgICAgICAgICAgIH0pLFxyXG4gICAgICAgICAgICAgIG0oJ2xhYmVsJywgJ0VtYWlsJyksXHJcbiAgICAgICAgICAgICAgbSgnaW5wdXQnLCB7XHJcbiAgICAgICAgICAgICAgICB0eXBlOiAndGV4dCcsXHJcbiAgICAgICAgICAgICAgICB2YWx1ZTogdGhpcy5zdGFmZi5lbWFpbCxcclxuICAgICAgICAgICAgICAgIG9uaW5wdXQ6IHRoaXMudXBkYXRlVmFsdWUuYmluZCh0aGlzLCAnZW1haWwnKSxcclxuICAgICAgICAgICAgICB9KSxcclxuICAgICAgICAgICAgICBtKCdsYWJlbCcsICdQYXNzd29yZCAob3B0aW9uYWwpJyksXHJcbiAgICAgICAgICAgICAgbSgnaW5wdXQnLCB7XHJcbiAgICAgICAgICAgICAgICB0eXBlOiAndGV4dCcsXHJcbiAgICAgICAgICAgICAgICB2YWx1ZTogdGhpcy5zdGFmZi5wYXNzd29yZCxcclxuICAgICAgICAgICAgICAgIG9uaW5wdXQ6IHRoaXMudXBkYXRlVmFsdWUuYmluZCh0aGlzLCAncGFzc3dvcmQnKSxcclxuICAgICAgICAgICAgICB9KSxcclxuICAgICAgICAgICAgICBtKCdpbnB1dCcsIHtcclxuICAgICAgICAgICAgICAgIHR5cGU6ICdzdWJtaXQnLFxyXG4gICAgICAgICAgICAgICAgdmFsdWU6ICdTYXZlJyxcclxuICAgICAgICAgICAgICB9KSxcclxuICAgICAgICAgICAgXSksXHJcbiAgICAgICAgICBdKSxcclxuICAgICAgICBdKVxyXG4gICAgKVxyXG4gIH0sXHJcbn1cclxuXHJcbm1vZHVsZS5leHBvcnRzID0gRWRpdFN0YWZmXHJcbiIsImNvbnN0IEZyb2FsYSA9IHtcclxuICBmaWxlczogW1xyXG4gICAgeyB0eXBlOiAnY3NzJywgdXJsOiAnaHR0cHM6Ly9jZG4uanNkZWxpdnIubmV0L25wbS9mcm9hbGEtZWRpdG9yQDMuMC40L2Nzcy9mcm9hbGFfZWRpdG9yLnBrZ2QubWluLmNzcycgfSxcclxuICAgIHsgdHlwZTogJ2NzcycsIHVybDogJ2h0dHBzOi8vY2RuLmpzZGVsaXZyLm5ldC9ucG0vZnJvYWxhLWVkaXRvckAzLjAuNC9jc3MvdGhlbWVzL2dyYXkubWluLmNzcycgfSxcclxuICAgIHsgdHlwZTogJ2pzJywgdXJsOiAnaHR0cHM6Ly9jZG4uanNkZWxpdnIubmV0L25wbS9mcm9hbGEtZWRpdG9yQDMuMC40L2pzL2Zyb2FsYV9lZGl0b3IucGtnZC5taW4uanMnIH0sXHJcbiAgXSxcclxuICBsb2FkZWRGaWxlczogMCxcclxuICBsb2FkZWRGcm9hbGE6IGZhbHNlLFxyXG5cclxuICBjaGVja0xvYWRlZEFsbDogZnVuY3Rpb24ocmVzKSB7XHJcbiAgICBpZiAoRnJvYWxhLmxvYWRlZEZpbGVzIDwgRnJvYWxhLmZpbGVzLmxlbmd0aCkge1xyXG4gICAgICByZXR1cm5cclxuICAgIH1cclxuICAgIEZyb2FsYS5sb2FkZWRGcm9hbGEgPSB0cnVlXHJcbiAgICByZXMoKVxyXG4gIH0sXHJcblxyXG4gIGNyZWF0ZUZyb2FsYVNjcmlwdDogZnVuY3Rpb24oKSB7XHJcbiAgICBpZiAoRnJvYWxhLmxvYWRlZEZyb2FsYSkgcmV0dXJuIFByb21pc2UucmVzb2x2ZSgpXHJcbiAgICByZXR1cm4gbmV3IFByb21pc2UoZnVuY3Rpb24ocmVzKSB7XHJcbiAgICAgIGxldCBvbmxvYWQgPSBmdW5jdGlvbigpIHtcclxuICAgICAgICBGcm9hbGEubG9hZGVkRmlsZXMrK1xyXG4gICAgICAgIEZyb2FsYS5jaGVja0xvYWRlZEFsbChyZXMpXHJcbiAgICAgIH1cclxuICAgICAgbGV0IGhlYWQgPSBkb2N1bWVudC5nZXRFbGVtZW50c0J5VGFnTmFtZSgnaGVhZCcpWzBdXHJcblxyXG4gICAgICBmb3IgKHZhciBpID0gMDsgaSA8IEZyb2FsYS5maWxlcy5sZW5ndGg7IGkrKykge1xyXG4gICAgICAgIGxldCBlbGVtZW50XHJcbiAgICAgICAgaWYgKEZyb2FsYS5maWxlc1tpXS50eXBlID09PSAnY3NzJykge1xyXG4gICAgICAgICAgZWxlbWVudCA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ2xpbmsnKVxyXG4gICAgICAgICAgZWxlbWVudC5zZXRBdHRyaWJ1dGUoJ3JlbCcsICdzdHlsZXNoZWV0JylcclxuICAgICAgICAgIGVsZW1lbnQuc2V0QXR0cmlidXRlKCd0eXBlJywgJ3RleHQvY3NzJylcclxuICAgICAgICAgIGVsZW1lbnQuc2V0QXR0cmlidXRlKCdocmVmJywgRnJvYWxhLmZpbGVzW2ldLnVybClcclxuICAgICAgICB9IGVsc2Uge1xyXG4gICAgICAgICAgZWxlbWVudCA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ3NjcmlwdCcpXHJcbiAgICAgICAgICBlbGVtZW50LnNldEF0dHJpYnV0ZSgndHlwZScsICd0ZXh0L2phdmFzY3JpcHQnKVxyXG4gICAgICAgICAgZWxlbWVudC5zZXRBdHRyaWJ1dGUoJ3NyYycsIEZyb2FsYS5maWxlc1tpXS51cmwpXHJcbiAgICAgICAgfVxyXG4gICAgICAgIGVsZW1lbnQub25sb2FkID0gb25sb2FkXHJcbiAgICAgICAgaGVhZC5pbnNlcnRCZWZvcmUoZWxlbWVudCwgaGVhZC5maXJzdENoaWxkKVxyXG4gICAgICB9XHJcbiAgICB9KVxyXG4gIH0sXHJcbn1cclxuXHJcbm1vZHVsZS5leHBvcnRzID0gRnJvYWxhXHJcbiIsImNvbnN0IFBhZ2UgPSByZXF1aXJlKCcuLi9hcGkvcGFnZScpXHJcbmNvbnN0IERpYWxvZ3VlID0gcmVxdWlyZSgnLi4vd2lkZ2V0cy9kaWFsb2d1ZScpXHJcblxyXG5jb25zdCBBZG1pblBhZ2VzID0ge1xyXG4gIHBhcnNlVHJlZTogZnVuY3Rpb24ocGFnZXMpIHtcclxuICAgIGxldCBtYXAgPSBuZXcgTWFwKClcclxuICAgIGZvciAobGV0IGkgPSAwOyBpIDwgcGFnZXMubGVuZ3RoOyBpKyspIHtcclxuICAgICAgcGFnZXNbaV0uY2hpbGRyZW4gPSBbXVxyXG4gICAgICBtYXAuc2V0KHBhZ2VzW2ldLmlkLCBwYWdlc1tpXSlcclxuICAgIH1cclxuICAgIGZvciAobGV0IGkgPSAwOyBpIDwgcGFnZXMubGVuZ3RoOyBpKyspIHtcclxuICAgICAgaWYgKHBhZ2VzW2ldLnBhcmVudF9pZCAmJiBtYXAuaGFzKHBhZ2VzW2ldLnBhcmVudF9pZCkpIHtcclxuICAgICAgICBtYXAuZ2V0KHBhZ2VzW2ldLnBhcmVudF9pZCkuY2hpbGRyZW4ucHVzaChwYWdlc1tpXSlcclxuICAgICAgICBwYWdlcy5zcGxpY2UoaSwgMSlcclxuICAgICAgICBpLS1cclxuICAgICAgfVxyXG4gICAgfVxyXG4gICAgcmV0dXJuIHBhZ2VzXHJcbiAgfSxcclxuXHJcbiAgb25pbml0OiBmdW5jdGlvbih2bm9kZSkge1xyXG4gICAgdGhpcy5sb2FkaW5nID0gdHJ1ZVxyXG4gICAgdGhpcy5lcnJvciA9ICcnXHJcbiAgICB0aGlzLnBhZ2VzID0gW11cclxuICAgIHRoaXMucmVtb3ZlUGFnZSA9IG51bGxcclxuXHJcbiAgICBQYWdlLmdldEFsbFBhZ2VzKClcclxuICAgIC50aGVuKGZ1bmN0aW9uKHJlc3VsdCkge1xyXG4gICAgICB2bm9kZS5zdGF0ZS5wYWdlcyA9IEFkbWluUGFnZXMucGFyc2VUcmVlKHJlc3VsdClcclxuICAgIH0pXHJcbiAgICAuY2F0Y2goZnVuY3Rpb24oZXJyKSB7XHJcbiAgICAgIHZub2RlLnN0YXRlLmVycm9yID0gZXJyLm1lc3NhZ2VcclxuICAgIH0pXHJcbiAgICAudGhlbihmdW5jdGlvbigpIHtcclxuICAgICAgdm5vZGUuc3RhdGUubG9hZGluZyA9IGZhbHNlXHJcbiAgICAgIG0ucmVkcmF3KClcclxuICAgIH0pXHJcbiAgfSxcclxuXHJcbiAgY29uZmlybVJlbW92ZVBhZ2U6IGZ1bmN0aW9uKHZub2RlKSB7XHJcbiAgICBsZXQgcmVtb3ZpbmdQYWdlID0gdGhpcy5yZW1vdmVQYWdlXHJcbiAgICB0aGlzLnJlbW92ZVBhZ2UgPSBudWxsXHJcbiAgICB0aGlzLmxvYWRpbmcgPSB0cnVlXHJcbiAgICBQYWdlLnJlbW92ZVBhZ2UocmVtb3ZpbmdQYWdlLCByZW1vdmluZ1BhZ2UuaWQpXHJcbiAgICAgIC50aGVuKHRoaXMub25pbml0LmJpbmQodGhpcywgdm5vZGUpKVxyXG4gICAgICAuY2F0Y2goZnVuY3Rpb24oZXJyKSB7XHJcbiAgICAgICAgdm5vZGUuc3RhdGUuZXJyb3IgPSBlcnIubWVzc2FnZVxyXG4gICAgICAgIHZub2RlLnN0YXRlLmxvYWRpbmcgPSBmYWxzZVxyXG4gICAgICAgIG0ucmVkcmF3KClcclxuICAgICAgfSlcclxuICB9LFxyXG5cclxuICBkcmF3UGFnZTogZnVuY3Rpb24odm5vZGUsIHBhZ2UpIHtcclxuICAgIHJldHVybiBbXHJcbiAgICAgIG0oJ3RyJywgW1xyXG4gICAgICAgIG0oJ3RkJywgW1xyXG4gICAgICAgICAgcGFnZS5wYXJlbnRfaWQgPyBtKCdzcGFuLnN1YnBhZ2UnLCAnfCA+JykgOiBudWxsLFxyXG4gICAgICAgICAgbShtLnJvdXRlLkxpbmssIHsgaHJlZjogJy9hZG1pbi9wYWdlcy8nICsgcGFnZS5pZCB9LCBwYWdlLm5hbWUpLFxyXG4gICAgICAgIF0pLFxyXG4gICAgICAgIG0oJ3RkJywgbShtLnJvdXRlLkxpbmssIHsgaHJlZjogJy9wYWdlLycgKyBwYWdlLnBhdGggfSwgJy9wYWdlLycgKyBwYWdlLnBhdGgpKSxcclxuICAgICAgICBtKCd0ZC5yaWdodCcsIHBhZ2UudXBkYXRlZF9hdC5yZXBsYWNlKCdUJywgJyAnKS5zcGxpdCgnLicpWzBdKSxcclxuICAgICAgICBtKCd0ZC5yaWdodCcsIG0oJ2J1dHRvbicsIHsgb25jbGljazogZnVuY3Rpb24oKSB7IHZub2RlLnN0YXRlLnJlbW92ZVBhZ2UgPSBwYWdlIH0gfSwgJ1JlbW92ZScpKSxcclxuICAgICAgXSksXHJcbiAgICBdLmNvbmNhdChwYWdlLmNoaWxkcmVuLm1hcChBZG1pblBhZ2VzLmRyYXdQYWdlLmJpbmQodGhpcywgdm5vZGUpKSlcclxuICB9LFxyXG5cclxuICB2aWV3OiBmdW5jdGlvbih2bm9kZSkge1xyXG4gICAgcmV0dXJuIFtcclxuICAgICAgKHRoaXMubG9hZGluZyA/XHJcbiAgICAgICAgbSgnZGl2LmxvYWRpbmctc3Bpbm5lcicpXHJcbiAgICAgIDogbSgnZGl2LmFkbWluLXdyYXBwZXInLCBbXHJcbiAgICAgICAgICBtKCdkaXYuYWRtaW4tYWN0aW9ucycsIFtcclxuICAgICAgICAgICAgICBtKCdzcGFuJywgJ0FjdGlvbnM6JyksXHJcbiAgICAgICAgICAgICAgbShtLnJvdXRlLkxpbmssIHsgaHJlZjogJy9hZG1pbi9wYWdlcy9hZGQnIH0sICdDcmVhdGUgbmV3IHBhZ2UnKSxcclxuICAgICAgICAgICAgXSksXHJcbiAgICAgICAgICBtKCdhcnRpY2xlLmVkaXRwYWdlJywgW1xyXG4gICAgICAgICAgICBtKCdoZWFkZXInLCBtKCdoMScsICdBbGwgcGFnZXMnKSksXHJcbiAgICAgICAgICAgIG0oJ2Rpdi5lcnJvcicsIHtcclxuICAgICAgICAgICAgICBoaWRkZW46ICF0aGlzLmVycm9yLFxyXG4gICAgICAgICAgICAgIG9uY2xpY2s6IGZ1bmN0aW9uKCkgeyB2bm9kZS5zdGF0ZS5lcnJvciA9ICcnIH0sXHJcbiAgICAgICAgICAgIH0sIHRoaXMuZXJyb3IpLFxyXG4gICAgICAgICAgICBtKCd0YWJsZScsIFtcclxuICAgICAgICAgICAgICBtKCd0aGVhZCcsIFxyXG4gICAgICAgICAgICAgICAgbSgndHInLCBbXHJcbiAgICAgICAgICAgICAgICAgIG0oJ3RoJywgJ1RpdGxlJyksXHJcbiAgICAgICAgICAgICAgICAgIG0oJ3RoJywgJ1BhdGgnKSxcclxuICAgICAgICAgICAgICAgICAgbSgndGgucmlnaHQnLCAnVXBkYXRlZCcpLFxyXG4gICAgICAgICAgICAgICAgICBtKCd0aC5yaWdodCcsICdBY3Rpb25zJyksXHJcbiAgICAgICAgICAgICAgICBdKVxyXG4gICAgICAgICAgICAgICksXHJcbiAgICAgICAgICAgICAgbSgndGJvZHknLCB0aGlzLnBhZ2VzLm1hcChBZG1pblBhZ2VzLmRyYXdQYWdlLmJpbmQodGhpcywgdm5vZGUpKSksXHJcbiAgICAgICAgICAgIF0pLFxyXG4gICAgICAgICAgXSksXHJcbiAgICAgICAgXSlcclxuICAgICAgKSxcclxuICAgICAgbShEaWFsb2d1ZSwge1xyXG4gICAgICAgIGhpZGRlbjogdm5vZGUuc3RhdGUucmVtb3ZlUGFnZSA9PT0gbnVsbCxcclxuICAgICAgICB0aXRsZTogJ0RlbGV0ZSAnICsgKHZub2RlLnN0YXRlLnJlbW92ZVBhZ2UgPyB2bm9kZS5zdGF0ZS5yZW1vdmVQYWdlLm5hbWUgOiAnJyksXHJcbiAgICAgICAgbWVzc2FnZTogJ0FyZSB5b3Ugc3VyZSB5b3Ugd2FudCB0byByZW1vdmUgXCInICsgKHZub2RlLnN0YXRlLnJlbW92ZVBhZ2UgPyB2bm9kZS5zdGF0ZS5yZW1vdmVQYWdlLm5hbWUgOiAnJykgKyAnXCIgKCcgKyAodm5vZGUuc3RhdGUucmVtb3ZlUGFnZSA/IHZub2RlLnN0YXRlLnJlbW92ZVBhZ2UucGF0aCA6ICcnKSArICcpJyxcclxuICAgICAgICB5ZXM6ICdSZW1vdmUnLFxyXG4gICAgICAgIHllc2NsYXNzOiAnYWxlcnQnLFxyXG4gICAgICAgIG5vOiAnQ2FuY2VsJyxcclxuICAgICAgICBub2NsYXNzOiAnY2FuY2VsJyxcclxuICAgICAgICBvbnllczogdGhpcy5jb25maXJtUmVtb3ZlUGFnZS5iaW5kKHRoaXMsIHZub2RlKSxcclxuICAgICAgICBvbm5vOiBmdW5jdGlvbigpIHsgdm5vZGUuc3RhdGUucmVtb3ZlUGFnZSA9IG51bGwgfSxcclxuICAgICAgfSksXHJcbiAgICBdXHJcbiAgfSxcclxufVxyXG5cclxubW9kdWxlLmV4cG9ydHMgPSBBZG1pblBhZ2VzXHJcbiIsImNvbnN0IFN0YWZmID0gcmVxdWlyZSgnLi4vYXBpL3N0YWZmJylcclxuY29uc3QgRGlhbG9ndWUgPSByZXF1aXJlKCcuLi93aWRnZXRzL2RpYWxvZ3VlJylcclxuY29uc3QgUGFnZXMgPSByZXF1aXJlKCcuLi93aWRnZXRzL3BhZ2VzJylcclxuXHJcbmNvbnN0IEFkbWluU3RhZmZMaXN0ID0ge1xyXG4gIG9uaW5pdDogZnVuY3Rpb24odm5vZGUpIHtcclxuICAgIHRoaXMuZXJyb3IgPSAnJ1xyXG4gICAgdGhpcy5sYXN0cGFnZSA9IG0ucm91dGUucGFyYW0oJ3BhZ2UnKSB8fCAnMSdcclxuICAgIHRoaXMuc3RhZmYgPSBbXVxyXG4gICAgdGhpcy5yZW1vdmVTdGFmZiA9IG51bGxcclxuXHJcbiAgICB0aGlzLmZldGNoU3RhZmZzKHZub2RlKVxyXG4gIH0sXHJcblxyXG4gIGZldGNoU3RhZmZzOiBmdW5jdGlvbih2bm9kZSkge1xyXG4gICAgdGhpcy5sb2FkaW5nID0gdHJ1ZVxyXG5cclxuICAgIHJldHVybiBTdGFmZi5nZXRBbGxTdGFmZigpXHJcbiAgICAudGhlbihmdW5jdGlvbihyZXN1bHQpIHtcclxuICAgICAgdm5vZGUuc3RhdGUuc3RhZmYgPSByZXN1bHRcclxuICAgIH0pXHJcbiAgICAuY2F0Y2goZnVuY3Rpb24oZXJyKSB7XHJcbiAgICAgIHZub2RlLnN0YXRlLmVycm9yID0gZXJyLm1lc3NhZ2VcclxuICAgIH0pXHJcbiAgICAudGhlbihmdW5jdGlvbigpIHtcclxuICAgICAgdm5vZGUuc3RhdGUubG9hZGluZyA9IGZhbHNlXHJcbiAgICAgIG0ucmVkcmF3KClcclxuICAgIH0pXHJcbiAgfSxcclxuXHJcbiAgY29uZmlybVJlbW92ZVN0YWZmOiBmdW5jdGlvbih2bm9kZSkge1xyXG4gICAgbGV0IHJlbW92aW5nU3RhZmYgPSB0aGlzLnJlbW92ZVN0YWZmXHJcbiAgICB0aGlzLnJlbW92ZVN0YWZmID0gbnVsbFxyXG4gICAgdGhpcy5sb2FkaW5nID0gdHJ1ZVxyXG4gICAgU3RhZmYucmVtb3ZlU3RhZmYocmVtb3ZpbmdTdGFmZi5pZClcclxuICAgICAgLnRoZW4odGhpcy5vbmluaXQuYmluZCh0aGlzLCB2bm9kZSkpXHJcbiAgICAgIC5jYXRjaChmdW5jdGlvbihlcnIpIHtcclxuICAgICAgICB2bm9kZS5zdGF0ZS5lcnJvciA9IGVyci5tZXNzYWdlXHJcbiAgICAgICAgdm5vZGUuc3RhdGUubG9hZGluZyA9IGZhbHNlXHJcbiAgICAgICAgbS5yZWRyYXcoKVxyXG4gICAgICB9KVxyXG4gIH0sXHJcblxyXG4gIGdldExldmVsOiBmdW5jdGlvbihsZXZlbCkge1xyXG4gICAgaWYgKGxldmVsID09PSAxMDApIHtcclxuICAgICAgcmV0dXJuICdBZG1pbidcclxuICAgIH1cclxuICAgIHJldHVybiAnTWFuYWdlcidcclxuICB9LFxyXG5cclxuICB2aWV3OiBmdW5jdGlvbih2bm9kZSkge1xyXG4gICAgcmV0dXJuIFtcclxuICAgICAgbSgnZGl2LmFkbWluLXdyYXBwZXInLCBbXHJcbiAgICAgICAgbSgnZGl2LmFkbWluLWFjdGlvbnMnLCBbXHJcbiAgICAgICAgICAgIG0oJ3NwYW4nLCAnQWN0aW9uczonKSxcclxuICAgICAgICAgICAgbShtLnJvdXRlLkxpbmssIHsgaHJlZjogJy9hZG1pbi9zdGFmZi9hZGQnIH0sICdDcmVhdGUgbmV3IHN0YWZmJyksXHJcbiAgICAgICAgICBdKSxcclxuICAgICAgICBtKCdhcnRpY2xlLmVkaXRhcnRpY2xlJywgW1xyXG4gICAgICAgICAgbSgnaGVhZGVyJywgbSgnaDEnLCAnQWxsIHN0YWZmJykpLFxyXG4gICAgICAgICAgbSgnZGl2LmVycm9yJywge1xyXG4gICAgICAgICAgICBoaWRkZW46ICF0aGlzLmVycm9yLFxyXG4gICAgICAgICAgICBvbmNsaWNrOiBmdW5jdGlvbigpIHsgdm5vZGUuc3RhdGUuZXJyb3IgPSAnJyB9LFxyXG4gICAgICAgICAgfSwgdGhpcy5lcnJvciksXHJcbiAgICAgICAgICAodGhpcy5sb2FkaW5nXHJcbiAgICAgICAgICAgID8gbSgnZGl2LmxvYWRpbmctc3Bpbm5lci5mdWxsJylcclxuICAgICAgICAgICAgOiBtKCd0YWJsZScsIFtcclxuICAgICAgICAgICAgICAgIG0oJ3RoZWFkJywgXHJcbiAgICAgICAgICAgICAgICAgIG0oJ3RyJywgW1xyXG4gICAgICAgICAgICAgICAgICAgIG0oJ3RoJywgJ0Z1bGxuYW1lJyksXHJcbiAgICAgICAgICAgICAgICAgICAgbSgndGgnLCAnRW1haWwnKSxcclxuICAgICAgICAgICAgICAgICAgICBtKCd0aCcsICdMZXZlbCcpLFxyXG4gICAgICAgICAgICAgICAgICAgIG0oJ3RoLnJpZ2h0JywgJ1VwZGF0ZWQnKSxcclxuICAgICAgICAgICAgICAgICAgICBtKCd0aC5yaWdodCcsICdBY3Rpb25zJyksXHJcbiAgICAgICAgICAgICAgICAgIF0pXHJcbiAgICAgICAgICAgICAgICApLFxyXG4gICAgICAgICAgICAgICAgbSgndGJvZHknLCB0aGlzLnN0YWZmLm1hcChmdW5jdGlvbihpdGVtKSB7XHJcbiAgICAgICAgICAgICAgICAgIHJldHVybiBtKCd0cicsIFtcclxuICAgICAgICAgICAgICAgICAgICBtKCd0ZCcsIG0obS5yb3V0ZS5MaW5rLCB7IGhyZWY6ICcvYWRtaW4vc3RhZmYvJyArIGl0ZW0uaWQgfSwgaXRlbS5mdWxsbmFtZSkpLFxyXG4gICAgICAgICAgICAgICAgICAgIG0oJ3RkJywgaXRlbS5lbWFpbCksXHJcbiAgICAgICAgICAgICAgICAgICAgbSgndGQucmlnaHQnLCBBZG1pblN0YWZmTGlzdC5nZXRMZXZlbChpdGVtLmxldmVsKSksXHJcbiAgICAgICAgICAgICAgICAgICAgbSgndGQucmlnaHQnLCAoaXRlbS51cGRhdGVkX2F0IHx8ICctLS0nKS5yZXBsYWNlKCdUJywgJyAnKS5zcGxpdCgnLicpWzBdKSxcclxuICAgICAgICAgICAgICAgICAgICBtKCd0ZC5yaWdodCcsIG0oJ2J1dHRvbicsIHsgb25jbGljazogZnVuY3Rpb24oKSB7IHZub2RlLnN0YXRlLnJlbW92ZVN0YWZmID0gaXRlbSB9IH0sICdSZW1vdmUnKSksXHJcbiAgICAgICAgICAgICAgICAgIF0pXHJcbiAgICAgICAgICAgICAgICB9KSksXHJcbiAgICAgICAgICAgICAgXSlcclxuICAgICAgICAgICksXHJcbiAgICAgICAgICBtKFBhZ2VzLCB7XHJcbiAgICAgICAgICAgIGJhc2U6ICcvYWRtaW4vc3RhZmYnLFxyXG4gICAgICAgICAgICBsaW5rczogdGhpcy5saW5rcyxcclxuICAgICAgICAgIH0pLFxyXG4gICAgICAgIF0pLFxyXG4gICAgICBdKSxcclxuICAgICAgbShEaWFsb2d1ZSwge1xyXG4gICAgICAgIGhpZGRlbjogdm5vZGUuc3RhdGUucmVtb3ZlU3RhZmYgPT09IG51bGwsXHJcbiAgICAgICAgdGl0bGU6ICdEZWxldGUgJyArICh2bm9kZS5zdGF0ZS5yZW1vdmVTdGFmZiA/IHZub2RlLnN0YXRlLnJlbW92ZVN0YWZmLm5hbWUgOiAnJyksXHJcbiAgICAgICAgbWVzc2FnZTogJ0FyZSB5b3Ugc3VyZSB5b3Ugd2FudCB0byByZW1vdmUgXCInICsgKHZub2RlLnN0YXRlLnJlbW92ZVN0YWZmID8gdm5vZGUuc3RhdGUucmVtb3ZlU3RhZmYuZnVsbG5hbWUgOiAnJykgKyAnXCIgKCcgKyAodm5vZGUuc3RhdGUucmVtb3ZlU3RhZmYgPyB2bm9kZS5zdGF0ZS5yZW1vdmVTdGFmZi5lbWFpbCA6ICcnKSArICcpJyxcclxuICAgICAgICB5ZXM6ICdSZW1vdmUnLFxyXG4gICAgICAgIHllc2NsYXNzOiAnYWxlcnQnLFxyXG4gICAgICAgIG5vOiAnQ2FuY2VsJyxcclxuICAgICAgICBub2NsYXNzOiAnY2FuY2VsJyxcclxuICAgICAgICBvbnllczogdGhpcy5jb25maXJtUmVtb3ZlU3RhZmYuYmluZCh0aGlzLCB2bm9kZSksXHJcbiAgICAgICAgb25ubzogZnVuY3Rpb24oKSB7IHZub2RlLnN0YXRlLnJlbW92ZVN0YWZmID0gbnVsbCB9LFxyXG4gICAgICB9KSxcclxuICAgIF1cclxuICB9LFxyXG59XHJcblxyXG5tb2R1bGUuZXhwb3J0cyA9IEFkbWluU3RhZmZMaXN0XHJcbiIsImNvbnN0IGNvbW1vbiA9IHJlcXVpcmUoJy4vY29tbW9uJylcclxuXHJcbmV4cG9ydHMuY3JlYXRlQXJ0aWNsZSA9IGZ1bmN0aW9uKGJvZHkpIHtcclxuICByZXR1cm4gY29tbW9uLnNlbmRSZXF1ZXN0KHtcclxuICAgIG1ldGhvZDogJ1BPU1QnLFxyXG4gICAgdXJsOiAnL2FwaS9hcnRpY2xlcycsXHJcbiAgICBib2R5OiBib2R5LFxyXG4gIH0pXHJcbn1cclxuXHJcbmV4cG9ydHMudXBkYXRlQXJ0aWNsZSA9IGZ1bmN0aW9uKGlkLCBib2R5KSB7XHJcbiAgcmV0dXJuIGNvbW1vbi5zZW5kUmVxdWVzdCh7XHJcbiAgICBtZXRob2Q6ICdQVVQnLFxyXG4gICAgdXJsOiAnL2FwaS9hcnRpY2xlcy8nICsgaWQsXHJcbiAgICBib2R5OiBib2R5LFxyXG4gIH0pXHJcbn1cclxuXHJcbmV4cG9ydHMuZ2V0QWxsQXJ0aWNsZXMgPSBmdW5jdGlvbigpIHtcclxuICByZXR1cm4gY29tbW9uLnNlbmRSZXF1ZXN0KHtcclxuICAgIG1ldGhvZDogJ0dFVCcsXHJcbiAgICB1cmw6ICcvYXBpL2FydGljbGVzP2luY2x1ZGVzPXBhcmVudCcsXHJcbiAgfSlcclxufVxyXG5cclxuZXhwb3J0cy5nZXRBbGxBcnRpY2xlc1BhZ2luYXRpb24gPSBmdW5jdGlvbihvcHRpb25zKSB7XHJcbiAgbGV0IGV4dHJhID0gJydcclxuXHJcbiAgaWYgKG9wdGlvbnMuc29ydCkge1xyXG4gICAgZXh0cmEgKz0gJyZzb3J0PScgKyBvcHRpb25zLnNvcnRcclxuICB9XHJcbiAgaWYgKG9wdGlvbnMucGVyX3BhZ2UpIHtcclxuICAgIGV4dHJhICs9ICcmcGVyUGFnZT0nICsgb3B0aW9ucy5wZXJfcGFnZVxyXG4gIH1cclxuICBpZiAob3B0aW9ucy5wYWdlKSB7XHJcbiAgICBleHRyYSArPSAnJnBhZ2U9JyArIG9wdGlvbnMucGFnZVxyXG4gIH1cclxuICBpZiAob3B0aW9ucy5pbmNsdWRlcykge1xyXG4gICAgZXh0cmEgKz0gJyZpbmNsdWRlcz0nICsgb3B0aW9ucy5pbmNsdWRlcy5qb2luKCcsJylcclxuICB9XHJcblxyXG4gIHJldHVybiAnL2FwaS9hcnRpY2xlcz8nICsgZXh0cmFcclxufVxyXG5cclxuZXhwb3J0cy5nZXRBbGxQYWdlQXJ0aWNsZXMgPSBmdW5jdGlvbihwYWdlSWQsIGluY2x1ZGVzKSB7XHJcbiAgcmV0dXJuIGNvbW1vbi5zZW5kUmVxdWVzdCh7XHJcbiAgICBtZXRob2Q6ICdHRVQnLFxyXG4gICAgdXJsOiAnL2FwaS9wYWdlcy8nICsgcGFnZUlkICsgJy9hcnRpY2xlcz9pbmNsdWRlcz0nICsgaW5jbHVkZXMuam9pbignLCcpLFxyXG4gIH0pXHJcbn1cclxuXHJcbmV4cG9ydHMuZ2V0QWxsUGFnZUFydGljbGVzUGFnaW5hdGlvbiA9IGZ1bmN0aW9uKHBhZ2VJZCwgb3B0aW9ucykge1xyXG4gIGxldCBleHRyYSA9ICcnXHJcblxyXG4gIGlmIChvcHRpb25zLnNvcnQpIHtcclxuICAgIGV4dHJhICs9ICcmc29ydD0nICsgb3B0aW9ucy5zb3J0XHJcbiAgfVxyXG4gIGlmIChvcHRpb25zLnBlcl9wYWdlKSB7XHJcbiAgICBleHRyYSArPSAnJnBlclBhZ2U9JyArIG9wdGlvbnMucGVyX3BhZ2VcclxuICB9XHJcbiAgaWYgKG9wdGlvbnMucGFnZSkge1xyXG4gICAgZXh0cmEgKz0gJyZwYWdlPScgKyBvcHRpb25zLnBhZ2VcclxuICB9XHJcbiAgaWYgKG9wdGlvbnMuaW5jbHVkZXMpIHtcclxuICAgIGV4dHJhICs9ICcmaW5jbHVkZXM9JyArIG9wdGlvbnMuaW5jbHVkZXMuam9pbignLCcpXHJcbiAgfVxyXG5cclxuICByZXR1cm4gJy9hcGkvcGFnZXMvJyArIHBhZ2VJZCArICcvYXJ0aWNsZXM/JyArIGV4dHJhXHJcbn1cclxuXHJcbmV4cG9ydHMuZ2V0QXJ0aWNsZSA9IGZ1bmN0aW9uKGlkKSB7XHJcbiAgcmV0dXJuIGNvbW1vbi5zZW5kUmVxdWVzdCh7XHJcbiAgICBtZXRob2Q6ICdHRVQnLFxyXG4gICAgdXJsOiAnL2FwaS9hcnRpY2xlcy8nICsgaWQgKyAnP2luY2x1ZGVzPW1lZGlhLHBhcmVudCxiYW5uZXIsZmlsZXMnLFxyXG4gIH0pXHJcbn1cclxuXHJcbmV4cG9ydHMucmVtb3ZlQXJ0aWNsZSA9IGZ1bmN0aW9uKGFydGljbGUsIGlkKSB7XHJcbiAgcmV0dXJuIGNvbW1vbi5zZW5kUmVxdWVzdCh7XHJcbiAgICBtZXRob2Q6ICdERUxFVEUnLFxyXG4gICAgdXJsOiAnL2FwaS9hcnRpY2xlcy8nICsgaWQsXHJcbiAgfSlcclxufVxyXG4iLCJjb25zdCBBdXRoZW50aWNhdGlvbiA9IHJlcXVpcmUoJy4uL2F1dGhlbnRpY2F0aW9uJylcclxuXHJcbmV4cG9ydHMuc2VuZFJlcXVlc3QgPSBmdW5jdGlvbihvcHRpb25zLCBpc1BhZ2luYXRpb24pIHtcclxuICBsZXQgdG9rZW4gPSBBdXRoZW50aWNhdGlvbi5nZXRUb2tlbigpXHJcbiAgbGV0IHBhZ2luYXRpb24gPSBpc1BhZ2luYXRpb25cclxuXHJcbiAgaWYgKHRva2VuKSB7XHJcbiAgICBvcHRpb25zLmhlYWRlcnMgPSBvcHRpb25zLmhlYWRlcnMgfHwge31cclxuICAgIG9wdGlvbnMuaGVhZGVyc1snQXV0aG9yaXphdGlvbiddID0gJ0JlYXJlciAnICsgdG9rZW5cclxuICB9XHJcblxyXG4gIG9wdGlvbnMuZXh0cmFjdCA9IGZ1bmN0aW9uKHhocikge1xyXG4gICAgbGV0IG91dCA9IG51bGxcclxuICAgIGlmIChwYWdpbmF0aW9uICYmIHhoci5zdGF0dXMgPCAzMDApIHtcclxuICAgICAgbGV0IGhlYWRlcnMgPSB7fVxyXG5cclxuICAgICAgeGhyLmdldEFsbFJlc3BvbnNlSGVhZGVycygpLnNwbGl0KCdcXHJcXG4nKS5mb3JFYWNoKGZ1bmN0aW9uKGl0ZW0pIHtcclxuICAgICAgICB2YXIgc3BsaXR0ZWQgPSBpdGVtLnNwbGl0KCc6ICcpXHJcbiAgICAgICAgaGVhZGVyc1tzcGxpdHRlZFswXV0gPSBzcGxpdHRlZFsxXVxyXG4gICAgICB9KVxyXG5cclxuICAgICAgb3V0ID0ge1xyXG4gICAgICAgIGhlYWRlcnM6IGhlYWRlcnMgfHwge30sXHJcbiAgICAgICAgZGF0YTogSlNPTi5wYXJzZSh4aHIucmVzcG9uc2VUZXh0KSxcclxuICAgICAgfVxyXG4gICAgfSBlbHNlIHtcclxuICAgICAgaWYgKHhoci5yZXNwb25zZVRleHQpIHtcclxuICAgICAgICBvdXQgPSBKU09OLnBhcnNlKHhoci5yZXNwb25zZVRleHQpXHJcbiAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgb3V0ID0ge31cclxuICAgICAgfVxyXG4gICAgfVxyXG4gICAgaWYgKHhoci5zdGF0dXMgPj0gMzAwKSB7XHJcbiAgICAgIHRocm93IG91dFxyXG4gICAgfVxyXG4gICAgcmV0dXJuIG91dFxyXG4gIH1cclxuXHJcbiAgcmV0dXJuIG0ucmVxdWVzdChvcHRpb25zKVxyXG4gICAgLmNhdGNoKGZ1bmN0aW9uIChlcnJvcikge1xyXG4gICAgICBpZiAoZXJyb3IuY29kZSA9PT0gNDAzKSB7XHJcbiAgICAgICAgQXV0aGVudGljYXRpb24uY2xlYXJUb2tlbigpXHJcbiAgICAgICAgbS5yb3V0ZS5zZXQoJy9sb2dpbicsIHsgcmVkaXJlY3Q6IG0ucm91dGUuZ2V0KCkgfSlcclxuICAgICAgfVxyXG4gICAgICBpZiAoZXJyb3IucmVzcG9uc2UgJiYgZXJyb3IucmVzcG9uc2Uuc3RhdHVzKSB7XHJcbiAgICAgICAgcmV0dXJuIFByb21pc2UucmVqZWN0KGVycm9yLnJlc3BvbnNlKVxyXG4gICAgICB9XHJcbiAgICAgIHJldHVybiBQcm9taXNlLnJlamVjdChlcnJvcilcclxuICAgIH0pXHJcbn1cclxuIiwiY29uc3QgY29tbW9uID0gcmVxdWlyZSgnLi9jb21tb24nKVxyXG5cclxuZXhwb3J0cy51cGxvYWRGaWxlID0gZnVuY3Rpb24oYXJ0aWNsZUlkLCBmaWxlKSB7XHJcbiAgbGV0IGZvcm1EYXRhID0gbmV3IEZvcm1EYXRhKClcclxuICBmb3JtRGF0YS5hcHBlbmQoJ2ZpbGUnLCBmaWxlKVxyXG5cclxuICByZXR1cm4gY29tbW9uLnNlbmRSZXF1ZXN0KHtcclxuICAgIG1ldGhvZDogJ1BPU1QnLFxyXG4gICAgdXJsOiAnL2FwaS9hcnRpY2xlcy8nICsgYXJ0aWNsZUlkICsgJy9maWxlJyxcclxuICAgIGJvZHk6IGZvcm1EYXRhLFxyXG4gIH0pXHJcbn1cclxuIiwiY29uc3QgY29tbW9uID0gcmVxdWlyZSgnLi9jb21tb24nKVxyXG5cclxuZXhwb3J0cy51cGxvYWRNZWRpYSA9IGZ1bmN0aW9uKGZpbGUpIHtcclxuICBsZXQgZm9ybURhdGEgPSBuZXcgRm9ybURhdGEoKVxyXG4gIGZvcm1EYXRhLmFwcGVuZCgnZmlsZScsIGZpbGUpXHJcblxyXG4gIHJldHVybiBjb21tb24uc2VuZFJlcXVlc3Qoe1xyXG4gICAgbWV0aG9kOiAnUE9TVCcsXHJcbiAgICB1cmw6ICcvYXBpL21lZGlhJyxcclxuICAgIGJvZHk6IGZvcm1EYXRhLFxyXG4gIH0pXHJcbn1cclxuIiwiY29uc3QgY29tbW9uID0gcmVxdWlyZSgnLi9jb21tb24nKVxyXG5cclxuY29uc3QgVHJlZSA9IHdpbmRvdy5fX25mcHRyZWUgfHwgW11cclxuXHJcbmV4cG9ydHMuVHJlZSA9IFRyZWVcclxuXHJcbmV4cG9ydHMuY3JlYXRlUGFnZSA9IGZ1bmN0aW9uKGJvZHkpIHtcclxuICByZXR1cm4gY29tbW9uLnNlbmRSZXF1ZXN0KHtcclxuICAgIG1ldGhvZDogJ1BPU1QnLFxyXG4gICAgdXJsOiAnL2FwaS9wYWdlcycsXHJcbiAgICBib2R5OiBib2R5LFxyXG4gIH0pLnRoZW4oZnVuY3Rpb24ocmVzKSB7XHJcbiAgICByZXMuY2hpbGRyZW4gPSBbXVxyXG4gICAgaWYgKCFyZXMucGFyZW50X2lkKSB7XHJcbiAgICAgIFRyZWUucHVzaChyZXMpXHJcbiAgICB9IGVsc2Uge1xyXG4gICAgICBmb3IgKGxldCBpID0gMDsgaSA8IFRyZWUubGVuZ3RoOyBpKyspIHtcclxuICAgICAgICBpZiAoVHJlZVtpXS5pZCA9PT0gcmVzLnBhcmVudF9pZCkge1xyXG4gICAgICAgICAgVHJlZVtpXS5jaGlsZHJlbi5wdXNoKHJlcylcclxuICAgICAgICAgIGJyZWFrXHJcbiAgICAgICAgfVxyXG4gICAgICB9XHJcbiAgICB9XHJcbiAgICByZXR1cm4gcmVzXHJcbiAgfSlcclxufVxyXG5cclxuZXhwb3J0cy5nZXRUcmVlID0gZnVuY3Rpb24oKSB7XHJcbiAgcmV0dXJuIGNvbW1vbi5zZW5kUmVxdWVzdCh7XHJcbiAgICBtZXRob2Q6ICdHRVQnLFxyXG4gICAgdXJsOiAnL2FwaS9wYWdlcz90cmVlPXRydWUmaW5jbHVkZXM9Y2hpbGRyZW4mZmllbGRzPWlkLG5hbWUscGF0aCxjaGlsZHJlbihpZCxuYW1lLHBhdGgpJyxcclxuICB9KVxyXG59XHJcblxyXG5leHBvcnRzLnVwZGF0ZVBhZ2UgPSBmdW5jdGlvbihpZCwgYm9keSkge1xyXG4gIHJldHVybiBjb21tb24uc2VuZFJlcXVlc3Qoe1xyXG4gICAgbWV0aG9kOiAnUFVUJyxcclxuICAgIHVybDogJy9hcGkvcGFnZXMvJyArIGlkLFxyXG4gICAgYm9keTogYm9keSxcclxuICB9KS50aGVuKGZ1bmN0aW9uKHJlcykge1xyXG4gICAgZm9yIChsZXQgaSA9IDA7IGkgPCBUcmVlLmxlbmd0aDsgaSsrKSB7XHJcbiAgICAgIGlmIChUcmVlW2ldLmlkID09PSByZXMuaWQpIHtcclxuICAgICAgICByZXMuY2hpbGRyZW4gPSBUcmVlW2ldLmNoaWxkcmVuXHJcbiAgICAgICAgVHJlZVtpXSA9IHJlc1xyXG4gICAgICAgIGJyZWFrXHJcbiAgICAgIH0gZWxzZSBpZiAoVHJlZVtpXS5pZCA9PT0gcmVzLnBhcmVudF9pZCkge1xyXG4gICAgICAgIGZvciAobGV0IHggPSAwOyB4IDwgVHJlZVtpXS5jaGlsZHJlbi5sZW5ndGg7IHgrKykge1xyXG4gICAgICAgICAgaWYgKFRyZWVbaV0uY2hpbGRyZW5beF0uaWQgPT09IHJlcy5pZCkge1xyXG4gICAgICAgICAgICByZXMuY2hpbGRyZW4gPSBUcmVlW2ldLmNoaWxkcmVuW3hdLmNoaWxkcmVuXHJcbiAgICAgICAgICAgIFRyZWVbaV0uY2hpbGRyZW5beF0gPSByZXNcclxuICAgICAgICAgICAgYnJlYWtcclxuICAgICAgICAgIH1cclxuICAgICAgICB9XHJcbiAgICAgICAgYnJlYWtcclxuICAgICAgfVxyXG4gICAgfVxyXG4gICAgaWYgKCFyZXMuY2hpbGRyZW4pIHtcclxuICAgICAgcmVzLmNoaWxkcmVuID0gW11cclxuICAgIH1cclxuICAgIHJldHVybiByZXNcclxuICB9KVxyXG59XHJcblxyXG5leHBvcnRzLmdldEFsbFBhZ2VzID0gZnVuY3Rpb24oKSB7XHJcbiAgcmV0dXJuIGNvbW1vbi5zZW5kUmVxdWVzdCh7XHJcbiAgICBtZXRob2Q6ICdHRVQnLFxyXG4gICAgdXJsOiAnL2FwaS9wYWdlcycsXHJcbiAgfSlcclxufVxyXG5cclxuZXhwb3J0cy5nZXRQYWdlID0gZnVuY3Rpb24oaWQpIHtcclxuICByZXR1cm4gY29tbW9uLnNlbmRSZXF1ZXN0KHtcclxuICAgIG1ldGhvZDogJ0dFVCcsXHJcbiAgICB1cmw6ICcvYXBpL3BhZ2VzLycgKyBpZCArICc/aW5jbHVkZXM9bWVkaWEsYmFubmVyLGNoaWxkcmVuLG5ld3MsbmV3cy5tZWRpYScsXHJcbiAgfSlcclxufVxyXG5cclxuZXhwb3J0cy5yZW1vdmVQYWdlID0gZnVuY3Rpb24ocGFnZSwgaWQpIHtcclxuICByZXR1cm4gY29tbW9uLnNlbmRSZXF1ZXN0KHtcclxuICAgIG1ldGhvZDogJ0RFTEVURScsXHJcbiAgICB1cmw6ICcvYXBpL3BhZ2VzLycgKyBpZCxcclxuICB9KS50aGVuKGZ1bmN0aW9uKCkge1xyXG4gICAgZm9yIChsZXQgaSA9IDA7IGkgPCBUcmVlLmxlbmd0aDsgaSsrKSB7XHJcbiAgICAgIGlmIChUcmVlW2ldLmlkID09PSBwYWdlLmlkKSB7XHJcbiAgICAgICAgVHJlZS5zcGxpY2UoaSwgMSlcclxuICAgICAgICBicmVha1xyXG4gICAgICB9IGVsc2UgaWYgKFRyZWVbaV0uaWQgPT09IHBhZ2UucGFyZW50X2lkKSB7XHJcbiAgICAgICAgZm9yIChsZXQgeCA9IDA7IHggPCBUcmVlW2ldLmNoaWxkcmVuLmxlbmd0aDsgeCsrKSB7XHJcbiAgICAgICAgICBpZiAoVHJlZVtpXS5jaGlsZHJlblt4XS5pZCA9PT0gcGFnZS5pZCkge1xyXG4gICAgICAgICAgICBUcmVlW2ldLmNoaWxkcmVuLnNwbGljZSh4LCAxKVxyXG4gICAgICAgICAgICBicmVha1xyXG4gICAgICAgICAgfVxyXG4gICAgICAgIH1cclxuICAgICAgICBicmVha1xyXG4gICAgICB9XHJcbiAgICB9XHJcbiAgICByZXR1cm4gbnVsbFxyXG4gIH0pXHJcbn1cclxuIiwiY29uc3QgcGFyc2UgPSByZXF1aXJlKCdwYXJzZS1saW5rLWhlYWRlcicpXHJcbmNvbnN0IGNvbW1vbiA9IHJlcXVpcmUoJy4vY29tbW9uJylcclxuXHJcbmV4cG9ydHMuZmV0Y2hQYWdlID0gZnVuY3Rpb24odXJsKSB7XHJcbiAgcmV0dXJuIGNvbW1vbi5zZW5kUmVxdWVzdCh7XHJcbiAgICBtZXRob2Q6ICdHRVQnLFxyXG4gICAgdXJsOiB1cmwsXHJcbiAgfSwgdHJ1ZSlcclxuICAudGhlbihmdW5jdGlvbihyZXN1bHQpIHtcclxuICAgIHJldHVybiB7XHJcbiAgICAgIGRhdGE6IHJlc3VsdC5kYXRhLFxyXG4gICAgICBsaW5rczogcGFyc2UocmVzdWx0LmhlYWRlcnMubGluayB8fCAnJyksXHJcbiAgICAgIHRvdGFsOiBOdW1iZXIocmVzdWx0LmhlYWRlcnMucGFnaW5hdGlvbl90b3RhbCB8fCAnMCcpLFxyXG4gICAgfVxyXG4gIH0pXHJcbn1cclxuIiwiY29uc3QgY29tbW9uID0gcmVxdWlyZSgnLi9jb21tb24nKVxyXG5cclxuZXhwb3J0cy5jcmVhdGVTdGFmZiA9IGZ1bmN0aW9uKGJvZHkpIHtcclxuICByZXR1cm4gY29tbW9uLnNlbmRSZXF1ZXN0KHtcclxuICAgIG1ldGhvZDogJ1BPU1QnLFxyXG4gICAgdXJsOiAnL2FwaS9zdGFmZicsXHJcbiAgICBib2R5OiBib2R5LFxyXG4gIH0pXHJcbn1cclxuXHJcbmV4cG9ydHMudXBkYXRlU3RhZmYgPSBmdW5jdGlvbihpZCwgYm9keSkge1xyXG4gIHJldHVybiBjb21tb24uc2VuZFJlcXVlc3Qoe1xyXG4gICAgbWV0aG9kOiAnUFVUJyxcclxuICAgIHVybDogJy9hcGkvc3RhZmYvJyArIGlkLFxyXG4gICAgYm9keTogYm9keSxcclxuICB9KVxyXG59XHJcblxyXG5leHBvcnRzLmdldEFsbFN0YWZmID0gZnVuY3Rpb24oKSB7XHJcbiAgcmV0dXJuIGNvbW1vbi5zZW5kUmVxdWVzdCh7XHJcbiAgICBtZXRob2Q6ICdHRVQnLFxyXG4gICAgdXJsOiAnL2FwaS9zdGFmZicsXHJcbiAgfSlcclxufVxyXG5cclxuZXhwb3J0cy5nZXRTdGFmZiA9IGZ1bmN0aW9uKGlkKSB7XHJcbiAgcmV0dXJuIGNvbW1vbi5zZW5kUmVxdWVzdCh7XHJcbiAgICBtZXRob2Q6ICdHRVQnLFxyXG4gICAgdXJsOiAnL2FwaS9zdGFmZi8nICsgaWQsXHJcbiAgfSlcclxufVxyXG5cclxuZXhwb3J0cy5yZW1vdmVTdGFmZiA9IGZ1bmN0aW9uKGlkKSB7XHJcbiAgcmV0dXJuIGNvbW1vbi5zZW5kUmVxdWVzdCh7XHJcbiAgICBtZXRob2Q6ICdERUxFVEUnLFxyXG4gICAgdXJsOiAnL2FwaS9zdGFmZi8nICsgaWQsXHJcbiAgfSlcclxufVxyXG4iLCJjb25zdCBzdG9yYWdlTmFtZSA9ICdsb2dpbnRva2VuJ1xyXG5cclxuY29uc3QgQXV0aGVudGljYXRpb24gPSB7XHJcbiAgY3VycmVudFVzZXI6IG51bGwsXHJcbiAgaXNBZG1pbjogZmFsc2UsXHJcbiAgbG9hZGVkR29vZ2xlOiBmYWxzZSxcclxuICBsb2FkaW5nR29vZ2xlOiBmYWxzZSxcclxuICBsb2FkaW5nTGlzdGVuZXJzOiBbXSxcclxuICBhdXRoTGlzdGVuZXJzOiBbXSxcclxuXHJcbiAgdXBkYXRlVG9rZW46IGZ1bmN0aW9uKHRva2VuKSB7XHJcbiAgICBpZiAoIXRva2VuKSByZXR1cm4gQXV0aGVudGljYXRpb24uY2xlYXJUb2tlbigpXHJcbiAgICBsb2NhbFN0b3JhZ2Uuc2V0SXRlbShzdG9yYWdlTmFtZSwgdG9rZW4pXHJcbiAgICBBdXRoZW50aWNhdGlvbi5jdXJyZW50VXNlciA9IEpTT04ucGFyc2UoYXRvYih0b2tlbi5zcGxpdCgnLicpWzFdKSlcclxuXHJcbiAgICBpZiAoQXV0aGVudGljYXRpb24uYXV0aExpc3RlbmVycy5sZW5ndGgpIHtcclxuICAgICAgQXV0aGVudGljYXRpb24uYXV0aExpc3RlbmVycy5mb3JFYWNoKGZ1bmN0aW9uKHgpIHsgeChBdXRoZW50aWNhdGlvbi5jdXJyZW50VXNlcikgfSlcclxuICAgIH1cclxuICB9LFxyXG5cclxuICBjbGVhclRva2VuOiBmdW5jdGlvbigpIHtcclxuICAgIEF1dGhlbnRpY2F0aW9uLmN1cnJlbnRVc2VyID0gbnVsbFxyXG4gICAgbG9jYWxTdG9yYWdlLnJlbW92ZUl0ZW0oc3RvcmFnZU5hbWUpXHJcbiAgICBBdXRoZW50aWNhdGlvbi5pc0FkbWluID0gZmFsc2VcclxuICB9LFxyXG5cclxuICBhZGRFdmVudDogZnVuY3Rpb24oZXZlbnQpIHtcclxuICAgIEF1dGhlbnRpY2F0aW9uLmF1dGhMaXN0ZW5lcnMucHVzaChldmVudClcclxuICB9LFxyXG5cclxuICBzZXRBZG1pbjogZnVuY3Rpb24oaXRlbSkge1xyXG4gICAgQXV0aGVudGljYXRpb24uaXNBZG1pbiA9IGl0ZW1cclxuICB9LFxyXG5cclxuICBjcmVhdGVHb29nbGVTY3JpcHQ6IGZ1bmN0aW9uKCkge1xyXG4gICAgaWYgKEF1dGhlbnRpY2F0aW9uLmxvYWRlZEdvb2dsZSkgcmV0dXJuIFByb21pc2UucmVzb2x2ZSgpXHJcbiAgICByZXR1cm4gbmV3IFByb21pc2UoZnVuY3Rpb24gKHJlcykge1xyXG4gICAgICBpZiAoQXV0aGVudGljYXRpb24ubG9hZGVkR29vZ2xlKSByZXR1cm4gcmVzKClcclxuICAgICAgQXV0aGVudGljYXRpb24ubG9hZGluZ0xpc3RlbmVycy5wdXNoKHJlcylcclxuXHJcbiAgICAgIGlmIChBdXRoZW50aWNhdGlvbi5sb2FkaW5nR29vZ2xlKSByZXR1cm5cclxuICAgICAgQXV0aGVudGljYXRpb24ubG9hZGluZ0dvb2dsZSA9IHRydWVcclxuXHJcbiAgICAgIGxldCBnc2NyaXB0ID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudCgnc2NyaXB0JylcclxuICAgICAgZ3NjcmlwdC50eXBlID0gJ3RleHQvamF2YXNjcmlwdCdcclxuICAgICAgZ3NjcmlwdC5hc3luYyA9IHRydWVcclxuICAgICAgZ3NjcmlwdC5kZWZlciA9IHRydWVcclxuICAgICAgZ3NjcmlwdC5zcmMgPSAnaHR0cHM6Ly9hcGlzLmdvb2dsZS5jb20vanMvcGxhdGZvcm0uanM/b25sb2FkPWdvb2dsZUxvYWRlZCdcclxuICAgICAgZG9jdW1lbnQuYm9keS5hcHBlbmRDaGlsZChnc2NyaXB0KVxyXG4gICAgfSlcclxuICB9LFxyXG5cclxuICBnZXRUb2tlbjogZnVuY3Rpb24oKSB7XHJcbiAgICByZXR1cm4gbG9jYWxTdG9yYWdlLmdldEl0ZW0oc3RvcmFnZU5hbWUpXHJcbiAgfSxcclxufVxyXG5cclxuaWYgKCF3aW5kb3cuZ29vZ2xlTG9hZGVkKSB7XHJcbiAgd2luZG93Lmdvb2dsZUxvYWRlZCA9IGZ1bmN0aW9uKCkge1xyXG4gICAgQXV0aGVudGljYXRpb24ubG9hZGVkR29vZ2xlID0gdHJ1ZVxyXG4gICAgd2hpbGUgKEF1dGhlbnRpY2F0aW9uLmxvYWRpbmdMaXN0ZW5lcnMubGVuZ3RoKSB7XHJcbiAgICAgIEF1dGhlbnRpY2F0aW9uLmxvYWRpbmdMaXN0ZW5lcnMucG9wKCkoKVxyXG4gICAgfVxyXG4gIH1cclxufVxyXG5cclxuQXV0aGVudGljYXRpb24udXBkYXRlVG9rZW4obG9jYWxTdG9yYWdlLmdldEl0ZW0oc3RvcmFnZU5hbWUpKVxyXG5cclxubW9kdWxlLmV4cG9ydHMgPSBBdXRoZW50aWNhdGlvblxyXG4iLCJjb25zdCBEaWFsb2d1ZSA9IHtcclxuICB2aWV3OiBmdW5jdGlvbih2bm9kZSkge1xyXG4gICAgcmV0dXJuIG0oJ2Rpdi5mbG9hdGluZy1jb250YWluZXInLCB7XHJcbiAgICAgICAgaGlkZGVuOiB2bm9kZS5hdHRycy5oaWRkZW4sXHJcbiAgICAgIH0sIG0oJ2RpYWxvZ3VlJywgW1xyXG4gICAgICAgICAgbSgnaDInLCB2bm9kZS5hdHRycy50aXRsZSksXHJcbiAgICAgICAgICBtKCdwJywgdm5vZGUuYXR0cnMubWVzc2FnZSksXHJcbiAgICAgICAgICBtKCdkaXYuYnV0dG9ucycsIFtcclxuICAgICAgICAgICAgbSgnYnV0dG9uJywgeyBjbGFzczogdm5vZGUuYXR0cnMueWVzY2xhc3MgfHwgJycsIG9uY2xpY2s6IHZub2RlLmF0dHJzLm9ueWVzIH0sIHZub2RlLmF0dHJzLnllcyksXHJcbiAgICAgICAgICAgIG0oJ2J1dHRvbicsIHsgY2xhc3M6IHZub2RlLmF0dHJzLm5vY2xhc3MgfHwgJycsIG9uY2xpY2s6IHZub2RlLmF0dHJzLm9ubm8gfSwgdm5vZGUuYXR0cnMubm8pLFxyXG4gICAgICAgICAgXSksXHJcbiAgICAgICAgXSlcclxuICAgICAgKVxyXG4gIH0sXHJcbn1cclxuXHJcbm1vZHVsZS5leHBvcnRzID0gRGlhbG9ndWVcclxuIiwiY29uc3QgRmlsZWluZm8gPSB7XHJcbiAgZ2V0UHJlZml4OiBmdW5jdGlvbih2bm9kZSkge1xyXG4gICAgaWYgKCF2bm9kZS5hdHRycy5maWxlLmZpbGVuYW1lLmVuZHNXaXRoKCcudG9ycmVudCcpKSB7XHJcbiAgICAgIHJldHVybiB2bm9kZS5hdHRycy5maWxlLmZpbGVuYW1lLnNwbGl0KCcuJykuc2xpY2UoLTEpXHJcbiAgICB9XHJcbiAgICBpZiAodm5vZGUuYXR0cnMuZmlsZS5maWxlbmFtZS5pbmRleE9mKCc3MjAgJykgPj0gMCkge1xyXG4gICAgICByZXR1cm4gJzcyMHAnXHJcbiAgICB9XHJcbiAgICBpZiAodm5vZGUuYXR0cnMuZmlsZS5maWxlbmFtZS5pbmRleE9mKCcxMDgwICcpID49IDApIHtcclxuICAgICAgcmV0dXJuICcxMDgwcCdcclxuICAgIH1cclxuICAgIGlmICh2bm9kZS5hdHRycy5maWxlLmZpbGVuYW1lLmluZGV4T2YoJzQ4MCAnKSA+PSAwKSB7XHJcbiAgICAgIHJldHVybiAnNDgwcCdcclxuICAgIH1cclxuICAgIHJldHVybiAnT3RoZXInXHJcbiAgfSxcclxuXHJcbiAgZ2V0VGl0bGU6IGZ1bmN0aW9uKHZub2RlKSB7XHJcbiAgICBpZiAodm5vZGUuYXR0cnMuZmlsZS5tZXRhLnRvcnJlbnQpIHtcclxuICAgICAgcmV0dXJuIHZub2RlLmF0dHJzLmZpbGUubWV0YS50b3JyZW50Lm5hbWVcclxuICAgIH1cclxuICAgIHJldHVybiB2bm9kZS5hdHRycy5maWxlLmZpbGVuYW1lXHJcbiAgfSxcclxuXHJcbiAgZ2V0RG93bmxvYWROYW1lOiBmdW5jdGlvbih2bm9kZSkge1xyXG4gICAgaWYgKHZub2RlLmF0dHJzLmZpbGUubWV0YS50b3JyZW50KSB7XHJcbiAgICAgIHJldHVybiAnVG9ycmVudCdcclxuICAgIH1cclxuICAgIHJldHVybiAnRG93bmxvYWQnXHJcbiAgfSxcclxuXHJcbiAgZ2V0U2l6ZTogZnVuY3Rpb24ob3JnU2l6ZSkge1xyXG4gICAgdmFyIHNpemUgPSBvcmdTaXplXHJcbiAgICB2YXIgaSA9IC0xXHJcbiAgICB2YXIgYnl0ZVVuaXRzID0gWycga0InLCAnIE1CJywgJyBHQicsICcgVEInLCAnUEInLCAnRUInLCAnWkInLCAnWUInXVxyXG4gICAgZG8ge1xyXG4gICAgICBzaXplID0gc2l6ZSAvIDEwMjRcclxuICAgICAgaSsrXHJcbiAgICB9IHdoaWxlIChzaXplID4gMTAyNClcclxuXHJcbiAgICByZXR1cm4gTWF0aC5tYXgoc2l6ZSwgMC4xKS50b0ZpeGVkKDEpICsgYnl0ZVVuaXRzW2ldXHJcbiAgfSxcclxuXHJcbiAgdmlldzogZnVuY3Rpb24odm5vZGUpIHtcclxuICAgIHJldHVybiBtKCdmaWxlaW5mbycsIHsgY2xhc3M6IHZub2RlLmF0dHJzLnNsaW0gPyAnc2xpbScgOiAnJ30sIFtcclxuICAgICAgbSgnZGl2LmZpbGV0aXRsZScsIFtcclxuICAgICAgICBtKCdzcGFuLnByZWZpeCcsIHRoaXMuZ2V0UHJlZml4KHZub2RlKSArICc6JyksXHJcbiAgICAgICAgbSgnYScsIHtcclxuICAgICAgICAgIHRhcmdldDogJ19ibGFuaycsXHJcbiAgICAgICAgICByZWw6ICdub29wZW5lcicsXHJcbiAgICAgICAgICBocmVmOiB2bm9kZS5hdHRycy5maWxlLnVybCxcclxuICAgICAgICB9LCB0aGlzLmdldERvd25sb2FkTmFtZSh2bm9kZSkpLFxyXG4gICAgICAgIHZub2RlLmF0dHJzLmZpbGUubWFnbmV0XHJcbiAgICAgICAgICA/IG0oJ2EnLCB7XHJcbiAgICAgICAgICAgICAgaHJlZjogdm5vZGUuYXR0cnMuZmlsZS5tYWduZXQsXHJcbiAgICAgICAgICAgIH0sICdNYWduZXQnKVxyXG4gICAgICAgICAgOiBudWxsLFxyXG4gICAgICAgIG0oJ3NwYW4nLCB0aGlzLmdldFRpdGxlKHZub2RlKSksXHJcbiAgICAgIF0pLFxyXG4gICAgICB2bm9kZS5hdHRycy5maWxlLm1ldGEudG9ycmVudCAmJiAhdm5vZGUuYXR0cnMuc2xpbVxyXG4gICAgICAgID8gbSgndWwnLCB2bm9kZS5hdHRycy5maWxlLm1ldGEudG9ycmVudC5maWxlcy5tYXAoZnVuY3Rpb24oZmlsZSkge1xyXG4gICAgICAgICAgICByZXR1cm4gbSgnbGknLCBbXHJcbiAgICAgICAgICAgICAgZmlsZS5uYW1lICsgJyAnLFxyXG4gICAgICAgICAgICAgIG0oJ3NwYW4ubWV0YScsICcoJyArIEZpbGVpbmZvLmdldFNpemUoZmlsZS5zaXplKSArICcpJyksXHJcbiAgICAgICAgICAgIF0pXHJcbiAgICAgICAgICB9KSlcclxuICAgICAgICA6IG51bGwsXHJcbiAgICBdKVxyXG4gIH0sXHJcbn1cclxuXHJcbm1vZHVsZS5leHBvcnRzID0gRmlsZWluZm9cclxuIiwiY29uc3QgTWVkaWEgPSByZXF1aXJlKCcuLi9hcGkvbWVkaWEnKVxyXG5cclxuY29uc3QgRmlsZVVwbG9hZCA9IHtcclxuICB1cGxvYWRGaWxlOiBmdW5jdGlvbih2bm9kZSwgZXZlbnQpIHtcclxuICAgIGlmICghZXZlbnQudGFyZ2V0LmZpbGVzWzBdKSByZXR1cm5cclxuICAgIHZub2RlLnN0YXRlLnVwZGF0ZUVycm9yKHZub2RlLCAnJylcclxuICAgIHZub2RlLnN0YXRlLmxvYWRpbmcgPSB0cnVlXHJcblxyXG4gICAgTWVkaWEudXBsb2FkTWVkaWEoZXZlbnQudGFyZ2V0LmZpbGVzWzBdKVxyXG4gICAgLnRoZW4oZnVuY3Rpb24ocmVzKSB7XHJcbiAgICAgIGlmICh2bm9kZS5hdHRycy5vbnVwbG9hZCkge1xyXG4gICAgICAgIHZub2RlLmF0dHJzLm9udXBsb2FkKHJlcylcclxuICAgICAgfVxyXG4gICAgfSlcclxuICAgIC5jYXRjaChmdW5jdGlvbihlcnIpIHtcclxuICAgICAgdm5vZGUuc3RhdGUudXBkYXRlRXJyb3Iodm5vZGUsIGVyci5tZXNzYWdlKVxyXG4gICAgfSlcclxuICAgIC50aGVuKGZ1bmN0aW9uKCkge1xyXG4gICAgICBldmVudC50YXJnZXQudmFsdWUgPSBudWxsXHJcbiAgICAgIHZub2RlLnN0YXRlLmxvYWRpbmcgPSBmYWxzZVxyXG4gICAgICBtLnJlZHJhdygpXHJcbiAgICB9KVxyXG4gIH0sXHJcblxyXG4gIHVwZGF0ZUVycm9yOiBmdW5jdGlvbih2bm9kZSwgZXJyb3IpIHtcclxuICAgIGlmICh2bm9kZS5hdHRycy5vbmVycm9yKSB7XHJcbiAgICAgIHZub2RlLmF0dHJzLm9uZXJyb3IoZXJyb3IpXHJcbiAgICB9IGVsc2Uge1xyXG4gICAgICB2bm9kZS5zdGF0ZS5lcnJvciA9IGVycm9yXHJcbiAgICB9XHJcbiAgfSxcclxuXHJcbiAgb25pbml0OiBmdW5jdGlvbih2bm9kZSkge1xyXG4gICAgdm5vZGUuc3RhdGUubG9hZGluZyA9IGZhbHNlXHJcbiAgICB2bm9kZS5zdGF0ZS5lcnJvciA9ICcnXHJcbiAgfSxcclxuXHJcbiAgdmlldzogZnVuY3Rpb24odm5vZGUpIHtcclxuICAgIGxldCBtZWRpYSA9IHZub2RlLmF0dHJzLm1lZGlhXHJcblxyXG4gICAgcmV0dXJuIG0oJ2ZpbGV1cGxvYWQnLCB7XHJcbiAgICAgIGNsYXNzOiB2bm9kZS5hdHRycy5jbGFzcyB8fCBudWxsLFxyXG4gICAgfSwgW1xyXG4gICAgICBtKCdkaXYuZXJyb3InLCB7XHJcbiAgICAgICAgaGlkZGVuOiAhdm5vZGUuc3RhdGUuZXJyb3IsXHJcbiAgICAgIH0sIHZub2RlLnN0YXRlLmVycm9yKSxcclxuICAgICAgKG1lZGlhXHJcbiAgICAgICAgPyB2bm9kZS5hdHRycy51c2VpbWdcclxuICAgICAgICAgID8gWyBtKCdpbWcnLCB7IHNyYzogbWVkaWEubGFyZ2VfdXJsIH0pLCBtKCdkaXYuc2hvd2ljb24nKV1cclxuICAgICAgICAgIDogbSgnYS5kaXNwbGF5Lmluc2lkZScsIHtcclxuICAgICAgICAgICAgICBocmVmOiBtZWRpYS5sYXJnZV91cmwsXHJcbiAgICAgICAgICAgICAgc3R5bGU6IHtcclxuICAgICAgICAgICAgICAgICdiYWNrZ3JvdW5kLWltYWdlJzogJ3VybChcIicgKyBtZWRpYS5sYXJnZV91cmwgKyAnXCIpJyxcclxuICAgICAgICAgICAgICB9LFxyXG4gICAgICAgICAgICB9LCBtKCdkaXYuc2hvd2ljb24nKSlcclxuICAgICAgICA6IG0oJ2Rpdi5pbnNpZGUuc2hvd2JvcmRlcmljb24nKVxyXG4gICAgICApLFxyXG4gICAgICBtKCdpbnB1dCcsIHtcclxuICAgICAgICBhY2NlcHQ6ICdpbWFnZS8qJyxcclxuICAgICAgICB0eXBlOiAnZmlsZScsXHJcbiAgICAgICAgb25jaGFuZ2U6IHRoaXMudXBsb2FkRmlsZS5iaW5kKHRoaXMsIHZub2RlKSxcclxuICAgICAgfSksXHJcbiAgICAgIChtZWRpYSAmJiB2bm9kZS5hdHRycy5vbmRlbGV0ZSA/IG0oJ2J1dHRvbi5yZW1vdmUnLCB7IG9uY2xpY2s6IHZub2RlLmF0dHJzLm9uZGVsZXRlIH0pIDogbnVsbCksXHJcbiAgICAgICh2bm9kZS5zdGF0ZS5sb2FkaW5nID8gbSgnZGl2LmxvYWRpbmctc3Bpbm5lcicpIDogbnVsbCksXHJcbiAgICBdKVxyXG4gIH0sXHJcbn1cclxuXHJcbm1vZHVsZS5leHBvcnRzID0gRmlsZVVwbG9hZFxyXG4iLCJjb25zdCBQYWdlcyA9IHtcclxuICBvbmluaXQ6IGZ1bmN0aW9uKHZub2RlKSB7XHJcbiAgICB0aGlzLm9ucGFnZSA9IHZub2RlLmF0dHJzLm9ucGFnZSB8fCBmdW5jdGlvbigpIHt9XHJcbiAgfSxcclxuXHJcbiAgdmlldzogZnVuY3Rpb24odm5vZGUpIHtcclxuICAgIGlmICghdm5vZGUuYXR0cnMubGlua3MpIHJldHVybiBudWxsXHJcbiAgICByZXR1cm4gbSgncGFnZXMnLCBbXHJcbiAgICAgIHZub2RlLmF0dHJzLmxpbmtzLmZpcnN0XHJcbiAgICAgICAgPyBtKG0ucm91dGUuTGluaywge1xyXG4gICAgICAgICAgICBocmVmOiB2bm9kZS5hdHRycy5iYXNlICsgJz9wYWdlPScgKyB2bm9kZS5hdHRycy5saW5rcy5maXJzdC5wYWdlLFxyXG4gICAgICAgICAgICBvbmNsaWNrOiBmdW5jdGlvbigpIHsgdm5vZGUuc3RhdGUub25wYWdlKHZub2RlLmF0dHJzLmxpbmtzLmZpcnN0LnBhZ2UpIH0sXHJcbiAgICAgICAgICB9LCAnRmlyc3QnKVxyXG4gICAgICAgIDogbSgnZGl2JyksXHJcbiAgICAgIHZub2RlLmF0dHJzLmxpbmtzLnByZXZpb3VzXHJcbiAgICAgICAgPyBtKG0ucm91dGUuTGluaywge1xyXG4gICAgICAgICAgICBocmVmOiB2bm9kZS5hdHRycy5iYXNlICsgJz9wYWdlPScgKyB2bm9kZS5hdHRycy5saW5rcy5wcmV2aW91cy5wYWdlLFxyXG4gICAgICAgICAgICBvbmNsaWNrOiBmdW5jdGlvbigpIHsgdm5vZGUuc3RhdGUub25wYWdlKHZub2RlLmF0dHJzLmxpbmtzLnByZXZpb3VzLnBhZ2UpIH0sXHJcbiAgICAgICAgICB9LCB2bm9kZS5hdHRycy5saW5rcy5wcmV2aW91cy50aXRsZSlcclxuICAgICAgICA6IG0oJ2RpdicpLFxyXG4gICAgICBtKCdkaXYnLCB2bm9kZS5hdHRycy5saW5rcy5jdXJyZW50ICYmIHZub2RlLmF0dHJzLmxpbmtzLmN1cnJlbnQudGl0bGUgfHwgJ0N1cnJlbnQgcGFnZScpLFxyXG4gICAgICB2bm9kZS5hdHRycy5saW5rcy5uZXh0XHJcbiAgICAgICAgPyBtKG0ucm91dGUuTGluaywge1xyXG4gICAgICAgICAgICBocmVmOiB2bm9kZS5hdHRycy5iYXNlICsgJz9wYWdlPScgKyB2bm9kZS5hdHRycy5saW5rcy5uZXh0LnBhZ2UsXHJcbiAgICAgICAgICAgIG9uY2xpY2s6IGZ1bmN0aW9uKCkgeyB2bm9kZS5zdGF0ZS5vbnBhZ2Uodm5vZGUuYXR0cnMubGlua3MubmV4dC5wYWdlKSB9LFxyXG4gICAgICAgICAgfSwgdm5vZGUuYXR0cnMubGlua3MubmV4dC50aXRsZSlcclxuICAgICAgICA6IG0oJ2RpdicpLFxyXG4gICAgICB2bm9kZS5hdHRycy5saW5rcy5sYXN0XHJcbiAgICAgICAgPyBtKG0ucm91dGUuTGluaywge1xyXG4gICAgICAgICAgICBocmVmOiB2bm9kZS5hdHRycy5iYXNlICsgJz9wYWdlPScgKyB2bm9kZS5hdHRycy5saW5rcy5sYXN0LnBhZ2UsXHJcbiAgICAgICAgICAgIG9uY2xpY2s6IGZ1bmN0aW9uKCkgeyB2bm9kZS5zdGF0ZS5vbnBhZ2Uodm5vZGUuYXR0cnMubGlua3MubGFzdC5wYWdlKSB9LFxyXG4gICAgICAgICAgfSwgJ0xhc3QnKVxyXG4gICAgICAgIDogbSgnZGl2JyksXHJcbiAgICBdKVxyXG4gIH0sXHJcbn1cclxuXHJcbm1vZHVsZS5leHBvcnRzID0gUGFnZXNcclxuIiwiJ3VzZSBzdHJpY3QnO1xuXG52YXIgcXMgPSByZXF1aXJlKCdxdWVyeXN0cmluZycpXG4gICwgdXJsID0gcmVxdWlyZSgndXJsJylcbiAgLCB4dGVuZCA9IHJlcXVpcmUoJ3h0ZW5kJyk7XG5cbmZ1bmN0aW9uIGhhc1JlbCh4KSB7XG4gIHJldHVybiB4ICYmIHgucmVsO1xufVxuXG5mdW5jdGlvbiBpbnRvUmVscyAoYWNjLCB4KSB7XG4gIGZ1bmN0aW9uIHNwbGl0UmVsIChyZWwpIHtcbiAgICBhY2NbcmVsXSA9IHh0ZW5kKHgsIHsgcmVsOiByZWwgfSk7XG4gIH1cblxuICB4LnJlbC5zcGxpdCgvXFxzKy8pLmZvckVhY2goc3BsaXRSZWwpO1xuXG4gIHJldHVybiBhY2M7XG59XG5cbmZ1bmN0aW9uIGNyZWF0ZU9iamVjdHMgKGFjYywgcCkge1xuICAvLyByZWw9XCJuZXh0XCIgPT4gMTogcmVsIDI6IG5leHRcbiAgdmFyIG0gPSBwLm1hdGNoKC9cXHMqKC4rKVxccyo9XFxzKlwiPyhbXlwiXSspXCI/LylcbiAgaWYgKG0pIGFjY1ttWzFdXSA9IG1bMl07XG4gIHJldHVybiBhY2M7XG59XG5cbmZ1bmN0aW9uIHBhcnNlTGluayhsaW5rKSB7XG4gIHRyeSB7XG4gICAgdmFyIG0gICAgICAgICA9ICBsaW5rLm1hdGNoKC88PyhbXj5dKik+KC4qKS8pXG4gICAgICAsIGxpbmtVcmwgICA9ICBtWzFdXG4gICAgICAsIHBhcnRzICAgICA9ICBtWzJdLnNwbGl0KCc7JylcbiAgICAgICwgcGFyc2VkVXJsID0gIHVybC5wYXJzZShsaW5rVXJsKVxuICAgICAgLCBxcnkgICAgICAgPSAgcXMucGFyc2UocGFyc2VkVXJsLnF1ZXJ5KTtcblxuICAgIHBhcnRzLnNoaWZ0KCk7XG5cbiAgICB2YXIgaW5mbyA9IHBhcnRzXG4gICAgICAucmVkdWNlKGNyZWF0ZU9iamVjdHMsIHt9KTtcbiAgICBcbiAgICBpbmZvID0geHRlbmQocXJ5LCBpbmZvKTtcbiAgICBpbmZvLnVybCA9IGxpbmtVcmw7XG4gICAgcmV0dXJuIGluZm87XG4gIH0gY2F0Y2ggKGUpIHtcbiAgICByZXR1cm4gbnVsbDtcbiAgfVxufVxuXG5tb2R1bGUuZXhwb3J0cyA9IGZ1bmN0aW9uIChsaW5rSGVhZGVyKSB7XG4gIGlmICghbGlua0hlYWRlcikgcmV0dXJuIG51bGw7XG5cbiAgcmV0dXJuIGxpbmtIZWFkZXIuc3BsaXQoLyxcXHMqPC8pXG4gICAubWFwKHBhcnNlTGluaylcbiAgIC5maWx0ZXIoaGFzUmVsKVxuICAgLnJlZHVjZShpbnRvUmVscywge30pO1xufTtcbiIsIi8qISBodHRwczovL210aHMuYmUvcHVueWNvZGUgdjEuNC4xIGJ5IEBtYXRoaWFzICovXG47KGZ1bmN0aW9uKHJvb3QpIHtcblxuXHQvKiogRGV0ZWN0IGZyZWUgdmFyaWFibGVzICovXG5cdHZhciBmcmVlRXhwb3J0cyA9IHR5cGVvZiBleHBvcnRzID09ICdvYmplY3QnICYmIGV4cG9ydHMgJiZcblx0XHQhZXhwb3J0cy5ub2RlVHlwZSAmJiBleHBvcnRzO1xuXHR2YXIgZnJlZU1vZHVsZSA9IHR5cGVvZiBtb2R1bGUgPT0gJ29iamVjdCcgJiYgbW9kdWxlICYmXG5cdFx0IW1vZHVsZS5ub2RlVHlwZSAmJiBtb2R1bGU7XG5cdHZhciBmcmVlR2xvYmFsID0gdHlwZW9mIGdsb2JhbCA9PSAnb2JqZWN0JyAmJiBnbG9iYWw7XG5cdGlmIChcblx0XHRmcmVlR2xvYmFsLmdsb2JhbCA9PT0gZnJlZUdsb2JhbCB8fFxuXHRcdGZyZWVHbG9iYWwud2luZG93ID09PSBmcmVlR2xvYmFsIHx8XG5cdFx0ZnJlZUdsb2JhbC5zZWxmID09PSBmcmVlR2xvYmFsXG5cdCkge1xuXHRcdHJvb3QgPSBmcmVlR2xvYmFsO1xuXHR9XG5cblx0LyoqXG5cdCAqIFRoZSBgcHVueWNvZGVgIG9iamVjdC5cblx0ICogQG5hbWUgcHVueWNvZGVcblx0ICogQHR5cGUgT2JqZWN0XG5cdCAqL1xuXHR2YXIgcHVueWNvZGUsXG5cblx0LyoqIEhpZ2hlc3QgcG9zaXRpdmUgc2lnbmVkIDMyLWJpdCBmbG9hdCB2YWx1ZSAqL1xuXHRtYXhJbnQgPSAyMTQ3NDgzNjQ3LCAvLyBha2EuIDB4N0ZGRkZGRkYgb3IgMl4zMS0xXG5cblx0LyoqIEJvb3RzdHJpbmcgcGFyYW1ldGVycyAqL1xuXHRiYXNlID0gMzYsXG5cdHRNaW4gPSAxLFxuXHR0TWF4ID0gMjYsXG5cdHNrZXcgPSAzOCxcblx0ZGFtcCA9IDcwMCxcblx0aW5pdGlhbEJpYXMgPSA3Mixcblx0aW5pdGlhbE4gPSAxMjgsIC8vIDB4ODBcblx0ZGVsaW1pdGVyID0gJy0nLCAvLyAnXFx4MkQnXG5cblx0LyoqIFJlZ3VsYXIgZXhwcmVzc2lvbnMgKi9cblx0cmVnZXhQdW55Y29kZSA9IC9eeG4tLS8sXG5cdHJlZ2V4Tm9uQVNDSUkgPSAvW15cXHgyMC1cXHg3RV0vLCAvLyB1bnByaW50YWJsZSBBU0NJSSBjaGFycyArIG5vbi1BU0NJSSBjaGFyc1xuXHRyZWdleFNlcGFyYXRvcnMgPSAvW1xceDJFXFx1MzAwMlxcdUZGMEVcXHVGRjYxXS9nLCAvLyBSRkMgMzQ5MCBzZXBhcmF0b3JzXG5cblx0LyoqIEVycm9yIG1lc3NhZ2VzICovXG5cdGVycm9ycyA9IHtcblx0XHQnb3ZlcmZsb3cnOiAnT3ZlcmZsb3c6IGlucHV0IG5lZWRzIHdpZGVyIGludGVnZXJzIHRvIHByb2Nlc3MnLFxuXHRcdCdub3QtYmFzaWMnOiAnSWxsZWdhbCBpbnB1dCA+PSAweDgwIChub3QgYSBiYXNpYyBjb2RlIHBvaW50KScsXG5cdFx0J2ludmFsaWQtaW5wdXQnOiAnSW52YWxpZCBpbnB1dCdcblx0fSxcblxuXHQvKiogQ29udmVuaWVuY2Ugc2hvcnRjdXRzICovXG5cdGJhc2VNaW51c1RNaW4gPSBiYXNlIC0gdE1pbixcblx0Zmxvb3IgPSBNYXRoLmZsb29yLFxuXHRzdHJpbmdGcm9tQ2hhckNvZGUgPSBTdHJpbmcuZnJvbUNoYXJDb2RlLFxuXG5cdC8qKiBUZW1wb3JhcnkgdmFyaWFibGUgKi9cblx0a2V5O1xuXG5cdC8qLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0qL1xuXG5cdC8qKlxuXHQgKiBBIGdlbmVyaWMgZXJyb3IgdXRpbGl0eSBmdW5jdGlvbi5cblx0ICogQHByaXZhdGVcblx0ICogQHBhcmFtIHtTdHJpbmd9IHR5cGUgVGhlIGVycm9yIHR5cGUuXG5cdCAqIEByZXR1cm5zIHtFcnJvcn0gVGhyb3dzIGEgYFJhbmdlRXJyb3JgIHdpdGggdGhlIGFwcGxpY2FibGUgZXJyb3IgbWVzc2FnZS5cblx0ICovXG5cdGZ1bmN0aW9uIGVycm9yKHR5cGUpIHtcblx0XHR0aHJvdyBuZXcgUmFuZ2VFcnJvcihlcnJvcnNbdHlwZV0pO1xuXHR9XG5cblx0LyoqXG5cdCAqIEEgZ2VuZXJpYyBgQXJyYXkjbWFwYCB1dGlsaXR5IGZ1bmN0aW9uLlxuXHQgKiBAcHJpdmF0ZVxuXHQgKiBAcGFyYW0ge0FycmF5fSBhcnJheSBUaGUgYXJyYXkgdG8gaXRlcmF0ZSBvdmVyLlxuXHQgKiBAcGFyYW0ge0Z1bmN0aW9ufSBjYWxsYmFjayBUaGUgZnVuY3Rpb24gdGhhdCBnZXRzIGNhbGxlZCBmb3IgZXZlcnkgYXJyYXlcblx0ICogaXRlbS5cblx0ICogQHJldHVybnMge0FycmF5fSBBIG5ldyBhcnJheSBvZiB2YWx1ZXMgcmV0dXJuZWQgYnkgdGhlIGNhbGxiYWNrIGZ1bmN0aW9uLlxuXHQgKi9cblx0ZnVuY3Rpb24gbWFwKGFycmF5LCBmbikge1xuXHRcdHZhciBsZW5ndGggPSBhcnJheS5sZW5ndGg7XG5cdFx0dmFyIHJlc3VsdCA9IFtdO1xuXHRcdHdoaWxlIChsZW5ndGgtLSkge1xuXHRcdFx0cmVzdWx0W2xlbmd0aF0gPSBmbihhcnJheVtsZW5ndGhdKTtcblx0XHR9XG5cdFx0cmV0dXJuIHJlc3VsdDtcblx0fVxuXG5cdC8qKlxuXHQgKiBBIHNpbXBsZSBgQXJyYXkjbWFwYC1saWtlIHdyYXBwZXIgdG8gd29yayB3aXRoIGRvbWFpbiBuYW1lIHN0cmluZ3Mgb3IgZW1haWxcblx0ICogYWRkcmVzc2VzLlxuXHQgKiBAcHJpdmF0ZVxuXHQgKiBAcGFyYW0ge1N0cmluZ30gZG9tYWluIFRoZSBkb21haW4gbmFtZSBvciBlbWFpbCBhZGRyZXNzLlxuXHQgKiBAcGFyYW0ge0Z1bmN0aW9ufSBjYWxsYmFjayBUaGUgZnVuY3Rpb24gdGhhdCBnZXRzIGNhbGxlZCBmb3IgZXZlcnlcblx0ICogY2hhcmFjdGVyLlxuXHQgKiBAcmV0dXJucyB7QXJyYXl9IEEgbmV3IHN0cmluZyBvZiBjaGFyYWN0ZXJzIHJldHVybmVkIGJ5IHRoZSBjYWxsYmFja1xuXHQgKiBmdW5jdGlvbi5cblx0ICovXG5cdGZ1bmN0aW9uIG1hcERvbWFpbihzdHJpbmcsIGZuKSB7XG5cdFx0dmFyIHBhcnRzID0gc3RyaW5nLnNwbGl0KCdAJyk7XG5cdFx0dmFyIHJlc3VsdCA9ICcnO1xuXHRcdGlmIChwYXJ0cy5sZW5ndGggPiAxKSB7XG5cdFx0XHQvLyBJbiBlbWFpbCBhZGRyZXNzZXMsIG9ubHkgdGhlIGRvbWFpbiBuYW1lIHNob3VsZCBiZSBwdW55Y29kZWQuIExlYXZlXG5cdFx0XHQvLyB0aGUgbG9jYWwgcGFydCAoaS5lLiBldmVyeXRoaW5nIHVwIHRvIGBAYCkgaW50YWN0LlxuXHRcdFx0cmVzdWx0ID0gcGFydHNbMF0gKyAnQCc7XG5cdFx0XHRzdHJpbmcgPSBwYXJ0c1sxXTtcblx0XHR9XG5cdFx0Ly8gQXZvaWQgYHNwbGl0KHJlZ2V4KWAgZm9yIElFOCBjb21wYXRpYmlsaXR5LiBTZWUgIzE3LlxuXHRcdHN0cmluZyA9IHN0cmluZy5yZXBsYWNlKHJlZ2V4U2VwYXJhdG9ycywgJ1xceDJFJyk7XG5cdFx0dmFyIGxhYmVscyA9IHN0cmluZy5zcGxpdCgnLicpO1xuXHRcdHZhciBlbmNvZGVkID0gbWFwKGxhYmVscywgZm4pLmpvaW4oJy4nKTtcblx0XHRyZXR1cm4gcmVzdWx0ICsgZW5jb2RlZDtcblx0fVxuXG5cdC8qKlxuXHQgKiBDcmVhdGVzIGFuIGFycmF5IGNvbnRhaW5pbmcgdGhlIG51bWVyaWMgY29kZSBwb2ludHMgb2YgZWFjaCBVbmljb2RlXG5cdCAqIGNoYXJhY3RlciBpbiB0aGUgc3RyaW5nLiBXaGlsZSBKYXZhU2NyaXB0IHVzZXMgVUNTLTIgaW50ZXJuYWxseSxcblx0ICogdGhpcyBmdW5jdGlvbiB3aWxsIGNvbnZlcnQgYSBwYWlyIG9mIHN1cnJvZ2F0ZSBoYWx2ZXMgKGVhY2ggb2Ygd2hpY2hcblx0ICogVUNTLTIgZXhwb3NlcyBhcyBzZXBhcmF0ZSBjaGFyYWN0ZXJzKSBpbnRvIGEgc2luZ2xlIGNvZGUgcG9pbnQsXG5cdCAqIG1hdGNoaW5nIFVURi0xNi5cblx0ICogQHNlZSBgcHVueWNvZGUudWNzMi5lbmNvZGVgXG5cdCAqIEBzZWUgPGh0dHBzOi8vbWF0aGlhc2J5bmVucy5iZS9ub3Rlcy9qYXZhc2NyaXB0LWVuY29kaW5nPlxuXHQgKiBAbWVtYmVyT2YgcHVueWNvZGUudWNzMlxuXHQgKiBAbmFtZSBkZWNvZGVcblx0ICogQHBhcmFtIHtTdHJpbmd9IHN0cmluZyBUaGUgVW5pY29kZSBpbnB1dCBzdHJpbmcgKFVDUy0yKS5cblx0ICogQHJldHVybnMge0FycmF5fSBUaGUgbmV3IGFycmF5IG9mIGNvZGUgcG9pbnRzLlxuXHQgKi9cblx0ZnVuY3Rpb24gdWNzMmRlY29kZShzdHJpbmcpIHtcblx0XHR2YXIgb3V0cHV0ID0gW10sXG5cdFx0ICAgIGNvdW50ZXIgPSAwLFxuXHRcdCAgICBsZW5ndGggPSBzdHJpbmcubGVuZ3RoLFxuXHRcdCAgICB2YWx1ZSxcblx0XHQgICAgZXh0cmE7XG5cdFx0d2hpbGUgKGNvdW50ZXIgPCBsZW5ndGgpIHtcblx0XHRcdHZhbHVlID0gc3RyaW5nLmNoYXJDb2RlQXQoY291bnRlcisrKTtcblx0XHRcdGlmICh2YWx1ZSA+PSAweEQ4MDAgJiYgdmFsdWUgPD0gMHhEQkZGICYmIGNvdW50ZXIgPCBsZW5ndGgpIHtcblx0XHRcdFx0Ly8gaGlnaCBzdXJyb2dhdGUsIGFuZCB0aGVyZSBpcyBhIG5leHQgY2hhcmFjdGVyXG5cdFx0XHRcdGV4dHJhID0gc3RyaW5nLmNoYXJDb2RlQXQoY291bnRlcisrKTtcblx0XHRcdFx0aWYgKChleHRyYSAmIDB4RkMwMCkgPT0gMHhEQzAwKSB7IC8vIGxvdyBzdXJyb2dhdGVcblx0XHRcdFx0XHRvdXRwdXQucHVzaCgoKHZhbHVlICYgMHgzRkYpIDw8IDEwKSArIChleHRyYSAmIDB4M0ZGKSArIDB4MTAwMDApO1xuXHRcdFx0XHR9IGVsc2Uge1xuXHRcdFx0XHRcdC8vIHVubWF0Y2hlZCBzdXJyb2dhdGU7IG9ubHkgYXBwZW5kIHRoaXMgY29kZSB1bml0LCBpbiBjYXNlIHRoZSBuZXh0XG5cdFx0XHRcdFx0Ly8gY29kZSB1bml0IGlzIHRoZSBoaWdoIHN1cnJvZ2F0ZSBvZiBhIHN1cnJvZ2F0ZSBwYWlyXG5cdFx0XHRcdFx0b3V0cHV0LnB1c2godmFsdWUpO1xuXHRcdFx0XHRcdGNvdW50ZXItLTtcblx0XHRcdFx0fVxuXHRcdFx0fSBlbHNlIHtcblx0XHRcdFx0b3V0cHV0LnB1c2godmFsdWUpO1xuXHRcdFx0fVxuXHRcdH1cblx0XHRyZXR1cm4gb3V0cHV0O1xuXHR9XG5cblx0LyoqXG5cdCAqIENyZWF0ZXMgYSBzdHJpbmcgYmFzZWQgb24gYW4gYXJyYXkgb2YgbnVtZXJpYyBjb2RlIHBvaW50cy5cblx0ICogQHNlZSBgcHVueWNvZGUudWNzMi5kZWNvZGVgXG5cdCAqIEBtZW1iZXJPZiBwdW55Y29kZS51Y3MyXG5cdCAqIEBuYW1lIGVuY29kZVxuXHQgKiBAcGFyYW0ge0FycmF5fSBjb2RlUG9pbnRzIFRoZSBhcnJheSBvZiBudW1lcmljIGNvZGUgcG9pbnRzLlxuXHQgKiBAcmV0dXJucyB7U3RyaW5nfSBUaGUgbmV3IFVuaWNvZGUgc3RyaW5nIChVQ1MtMikuXG5cdCAqL1xuXHRmdW5jdGlvbiB1Y3MyZW5jb2RlKGFycmF5KSB7XG5cdFx0cmV0dXJuIG1hcChhcnJheSwgZnVuY3Rpb24odmFsdWUpIHtcblx0XHRcdHZhciBvdXRwdXQgPSAnJztcblx0XHRcdGlmICh2YWx1ZSA+IDB4RkZGRikge1xuXHRcdFx0XHR2YWx1ZSAtPSAweDEwMDAwO1xuXHRcdFx0XHRvdXRwdXQgKz0gc3RyaW5nRnJvbUNoYXJDb2RlKHZhbHVlID4+PiAxMCAmIDB4M0ZGIHwgMHhEODAwKTtcblx0XHRcdFx0dmFsdWUgPSAweERDMDAgfCB2YWx1ZSAmIDB4M0ZGO1xuXHRcdFx0fVxuXHRcdFx0b3V0cHV0ICs9IHN0cmluZ0Zyb21DaGFyQ29kZSh2YWx1ZSk7XG5cdFx0XHRyZXR1cm4gb3V0cHV0O1xuXHRcdH0pLmpvaW4oJycpO1xuXHR9XG5cblx0LyoqXG5cdCAqIENvbnZlcnRzIGEgYmFzaWMgY29kZSBwb2ludCBpbnRvIGEgZGlnaXQvaW50ZWdlci5cblx0ICogQHNlZSBgZGlnaXRUb0Jhc2ljKClgXG5cdCAqIEBwcml2YXRlXG5cdCAqIEBwYXJhbSB7TnVtYmVyfSBjb2RlUG9pbnQgVGhlIGJhc2ljIG51bWVyaWMgY29kZSBwb2ludCB2YWx1ZS5cblx0ICogQHJldHVybnMge051bWJlcn0gVGhlIG51bWVyaWMgdmFsdWUgb2YgYSBiYXNpYyBjb2RlIHBvaW50IChmb3IgdXNlIGluXG5cdCAqIHJlcHJlc2VudGluZyBpbnRlZ2VycykgaW4gdGhlIHJhbmdlIGAwYCB0byBgYmFzZSAtIDFgLCBvciBgYmFzZWAgaWZcblx0ICogdGhlIGNvZGUgcG9pbnQgZG9lcyBub3QgcmVwcmVzZW50IGEgdmFsdWUuXG5cdCAqL1xuXHRmdW5jdGlvbiBiYXNpY1RvRGlnaXQoY29kZVBvaW50KSB7XG5cdFx0aWYgKGNvZGVQb2ludCAtIDQ4IDwgMTApIHtcblx0XHRcdHJldHVybiBjb2RlUG9pbnQgLSAyMjtcblx0XHR9XG5cdFx0aWYgKGNvZGVQb2ludCAtIDY1IDwgMjYpIHtcblx0XHRcdHJldHVybiBjb2RlUG9pbnQgLSA2NTtcblx0XHR9XG5cdFx0aWYgKGNvZGVQb2ludCAtIDk3IDwgMjYpIHtcblx0XHRcdHJldHVybiBjb2RlUG9pbnQgLSA5Nztcblx0XHR9XG5cdFx0cmV0dXJuIGJhc2U7XG5cdH1cblxuXHQvKipcblx0ICogQ29udmVydHMgYSBkaWdpdC9pbnRlZ2VyIGludG8gYSBiYXNpYyBjb2RlIHBvaW50LlxuXHQgKiBAc2VlIGBiYXNpY1RvRGlnaXQoKWBcblx0ICogQHByaXZhdGVcblx0ICogQHBhcmFtIHtOdW1iZXJ9IGRpZ2l0IFRoZSBudW1lcmljIHZhbHVlIG9mIGEgYmFzaWMgY29kZSBwb2ludC5cblx0ICogQHJldHVybnMge051bWJlcn0gVGhlIGJhc2ljIGNvZGUgcG9pbnQgd2hvc2UgdmFsdWUgKHdoZW4gdXNlZCBmb3Jcblx0ICogcmVwcmVzZW50aW5nIGludGVnZXJzKSBpcyBgZGlnaXRgLCB3aGljaCBuZWVkcyB0byBiZSBpbiB0aGUgcmFuZ2Vcblx0ICogYDBgIHRvIGBiYXNlIC0gMWAuIElmIGBmbGFnYCBpcyBub24temVybywgdGhlIHVwcGVyY2FzZSBmb3JtIGlzXG5cdCAqIHVzZWQ7IGVsc2UsIHRoZSBsb3dlcmNhc2UgZm9ybSBpcyB1c2VkLiBUaGUgYmVoYXZpb3IgaXMgdW5kZWZpbmVkXG5cdCAqIGlmIGBmbGFnYCBpcyBub24temVybyBhbmQgYGRpZ2l0YCBoYXMgbm8gdXBwZXJjYXNlIGZvcm0uXG5cdCAqL1xuXHRmdW5jdGlvbiBkaWdpdFRvQmFzaWMoZGlnaXQsIGZsYWcpIHtcblx0XHQvLyAgMC4uMjUgbWFwIHRvIEFTQ0lJIGEuLnogb3IgQS4uWlxuXHRcdC8vIDI2Li4zNSBtYXAgdG8gQVNDSUkgMC4uOVxuXHRcdHJldHVybiBkaWdpdCArIDIyICsgNzUgKiAoZGlnaXQgPCAyNikgLSAoKGZsYWcgIT0gMCkgPDwgNSk7XG5cdH1cblxuXHQvKipcblx0ICogQmlhcyBhZGFwdGF0aW9uIGZ1bmN0aW9uIGFzIHBlciBzZWN0aW9uIDMuNCBvZiBSRkMgMzQ5Mi5cblx0ICogaHR0cHM6Ly90b29scy5pZXRmLm9yZy9odG1sL3JmYzM0OTIjc2VjdGlvbi0zLjRcblx0ICogQHByaXZhdGVcblx0ICovXG5cdGZ1bmN0aW9uIGFkYXB0KGRlbHRhLCBudW1Qb2ludHMsIGZpcnN0VGltZSkge1xuXHRcdHZhciBrID0gMDtcblx0XHRkZWx0YSA9IGZpcnN0VGltZSA/IGZsb29yKGRlbHRhIC8gZGFtcCkgOiBkZWx0YSA+PiAxO1xuXHRcdGRlbHRhICs9IGZsb29yKGRlbHRhIC8gbnVtUG9pbnRzKTtcblx0XHRmb3IgKC8qIG5vIGluaXRpYWxpemF0aW9uICovOyBkZWx0YSA+IGJhc2VNaW51c1RNaW4gKiB0TWF4ID4+IDE7IGsgKz0gYmFzZSkge1xuXHRcdFx0ZGVsdGEgPSBmbG9vcihkZWx0YSAvIGJhc2VNaW51c1RNaW4pO1xuXHRcdH1cblx0XHRyZXR1cm4gZmxvb3IoayArIChiYXNlTWludXNUTWluICsgMSkgKiBkZWx0YSAvIChkZWx0YSArIHNrZXcpKTtcblx0fVxuXG5cdC8qKlxuXHQgKiBDb252ZXJ0cyBhIFB1bnljb2RlIHN0cmluZyBvZiBBU0NJSS1vbmx5IHN5bWJvbHMgdG8gYSBzdHJpbmcgb2YgVW5pY29kZVxuXHQgKiBzeW1ib2xzLlxuXHQgKiBAbWVtYmVyT2YgcHVueWNvZGVcblx0ICogQHBhcmFtIHtTdHJpbmd9IGlucHV0IFRoZSBQdW55Y29kZSBzdHJpbmcgb2YgQVNDSUktb25seSBzeW1ib2xzLlxuXHQgKiBAcmV0dXJucyB7U3RyaW5nfSBUaGUgcmVzdWx0aW5nIHN0cmluZyBvZiBVbmljb2RlIHN5bWJvbHMuXG5cdCAqL1xuXHRmdW5jdGlvbiBkZWNvZGUoaW5wdXQpIHtcblx0XHQvLyBEb24ndCB1c2UgVUNTLTJcblx0XHR2YXIgb3V0cHV0ID0gW10sXG5cdFx0ICAgIGlucHV0TGVuZ3RoID0gaW5wdXQubGVuZ3RoLFxuXHRcdCAgICBvdXQsXG5cdFx0ICAgIGkgPSAwLFxuXHRcdCAgICBuID0gaW5pdGlhbE4sXG5cdFx0ICAgIGJpYXMgPSBpbml0aWFsQmlhcyxcblx0XHQgICAgYmFzaWMsXG5cdFx0ICAgIGosXG5cdFx0ICAgIGluZGV4LFxuXHRcdCAgICBvbGRpLFxuXHRcdCAgICB3LFxuXHRcdCAgICBrLFxuXHRcdCAgICBkaWdpdCxcblx0XHQgICAgdCxcblx0XHQgICAgLyoqIENhY2hlZCBjYWxjdWxhdGlvbiByZXN1bHRzICovXG5cdFx0ICAgIGJhc2VNaW51c1Q7XG5cblx0XHQvLyBIYW5kbGUgdGhlIGJhc2ljIGNvZGUgcG9pbnRzOiBsZXQgYGJhc2ljYCBiZSB0aGUgbnVtYmVyIG9mIGlucHV0IGNvZGVcblx0XHQvLyBwb2ludHMgYmVmb3JlIHRoZSBsYXN0IGRlbGltaXRlciwgb3IgYDBgIGlmIHRoZXJlIGlzIG5vbmUsIHRoZW4gY29weVxuXHRcdC8vIHRoZSBmaXJzdCBiYXNpYyBjb2RlIHBvaW50cyB0byB0aGUgb3V0cHV0LlxuXG5cdFx0YmFzaWMgPSBpbnB1dC5sYXN0SW5kZXhPZihkZWxpbWl0ZXIpO1xuXHRcdGlmIChiYXNpYyA8IDApIHtcblx0XHRcdGJhc2ljID0gMDtcblx0XHR9XG5cblx0XHRmb3IgKGogPSAwOyBqIDwgYmFzaWM7ICsraikge1xuXHRcdFx0Ly8gaWYgaXQncyBub3QgYSBiYXNpYyBjb2RlIHBvaW50XG5cdFx0XHRpZiAoaW5wdXQuY2hhckNvZGVBdChqKSA+PSAweDgwKSB7XG5cdFx0XHRcdGVycm9yKCdub3QtYmFzaWMnKTtcblx0XHRcdH1cblx0XHRcdG91dHB1dC5wdXNoKGlucHV0LmNoYXJDb2RlQXQoaikpO1xuXHRcdH1cblxuXHRcdC8vIE1haW4gZGVjb2RpbmcgbG9vcDogc3RhcnQganVzdCBhZnRlciB0aGUgbGFzdCBkZWxpbWl0ZXIgaWYgYW55IGJhc2ljIGNvZGVcblx0XHQvLyBwb2ludHMgd2VyZSBjb3BpZWQ7IHN0YXJ0IGF0IHRoZSBiZWdpbm5pbmcgb3RoZXJ3aXNlLlxuXG5cdFx0Zm9yIChpbmRleCA9IGJhc2ljID4gMCA/IGJhc2ljICsgMSA6IDA7IGluZGV4IDwgaW5wdXRMZW5ndGg7IC8qIG5vIGZpbmFsIGV4cHJlc3Npb24gKi8pIHtcblxuXHRcdFx0Ly8gYGluZGV4YCBpcyB0aGUgaW5kZXggb2YgdGhlIG5leHQgY2hhcmFjdGVyIHRvIGJlIGNvbnN1bWVkLlxuXHRcdFx0Ly8gRGVjb2RlIGEgZ2VuZXJhbGl6ZWQgdmFyaWFibGUtbGVuZ3RoIGludGVnZXIgaW50byBgZGVsdGFgLFxuXHRcdFx0Ly8gd2hpY2ggZ2V0cyBhZGRlZCB0byBgaWAuIFRoZSBvdmVyZmxvdyBjaGVja2luZyBpcyBlYXNpZXJcblx0XHRcdC8vIGlmIHdlIGluY3JlYXNlIGBpYCBhcyB3ZSBnbywgdGhlbiBzdWJ0cmFjdCBvZmYgaXRzIHN0YXJ0aW5nXG5cdFx0XHQvLyB2YWx1ZSBhdCB0aGUgZW5kIHRvIG9idGFpbiBgZGVsdGFgLlxuXHRcdFx0Zm9yIChvbGRpID0gaSwgdyA9IDEsIGsgPSBiYXNlOyAvKiBubyBjb25kaXRpb24gKi87IGsgKz0gYmFzZSkge1xuXG5cdFx0XHRcdGlmIChpbmRleCA+PSBpbnB1dExlbmd0aCkge1xuXHRcdFx0XHRcdGVycm9yKCdpbnZhbGlkLWlucHV0Jyk7XG5cdFx0XHRcdH1cblxuXHRcdFx0XHRkaWdpdCA9IGJhc2ljVG9EaWdpdChpbnB1dC5jaGFyQ29kZUF0KGluZGV4KyspKTtcblxuXHRcdFx0XHRpZiAoZGlnaXQgPj0gYmFzZSB8fCBkaWdpdCA+IGZsb29yKChtYXhJbnQgLSBpKSAvIHcpKSB7XG5cdFx0XHRcdFx0ZXJyb3IoJ292ZXJmbG93Jyk7XG5cdFx0XHRcdH1cblxuXHRcdFx0XHRpICs9IGRpZ2l0ICogdztcblx0XHRcdFx0dCA9IGsgPD0gYmlhcyA/IHRNaW4gOiAoayA+PSBiaWFzICsgdE1heCA/IHRNYXggOiBrIC0gYmlhcyk7XG5cblx0XHRcdFx0aWYgKGRpZ2l0IDwgdCkge1xuXHRcdFx0XHRcdGJyZWFrO1xuXHRcdFx0XHR9XG5cblx0XHRcdFx0YmFzZU1pbnVzVCA9IGJhc2UgLSB0O1xuXHRcdFx0XHRpZiAodyA+IGZsb29yKG1heEludCAvIGJhc2VNaW51c1QpKSB7XG5cdFx0XHRcdFx0ZXJyb3IoJ292ZXJmbG93Jyk7XG5cdFx0XHRcdH1cblxuXHRcdFx0XHR3ICo9IGJhc2VNaW51c1Q7XG5cblx0XHRcdH1cblxuXHRcdFx0b3V0ID0gb3V0cHV0Lmxlbmd0aCArIDE7XG5cdFx0XHRiaWFzID0gYWRhcHQoaSAtIG9sZGksIG91dCwgb2xkaSA9PSAwKTtcblxuXHRcdFx0Ly8gYGlgIHdhcyBzdXBwb3NlZCB0byB3cmFwIGFyb3VuZCBmcm9tIGBvdXRgIHRvIGAwYCxcblx0XHRcdC8vIGluY3JlbWVudGluZyBgbmAgZWFjaCB0aW1lLCBzbyB3ZSdsbCBmaXggdGhhdCBub3c6XG5cdFx0XHRpZiAoZmxvb3IoaSAvIG91dCkgPiBtYXhJbnQgLSBuKSB7XG5cdFx0XHRcdGVycm9yKCdvdmVyZmxvdycpO1xuXHRcdFx0fVxuXG5cdFx0XHRuICs9IGZsb29yKGkgLyBvdXQpO1xuXHRcdFx0aSAlPSBvdXQ7XG5cblx0XHRcdC8vIEluc2VydCBgbmAgYXQgcG9zaXRpb24gYGlgIG9mIHRoZSBvdXRwdXRcblx0XHRcdG91dHB1dC5zcGxpY2UoaSsrLCAwLCBuKTtcblxuXHRcdH1cblxuXHRcdHJldHVybiB1Y3MyZW5jb2RlKG91dHB1dCk7XG5cdH1cblxuXHQvKipcblx0ICogQ29udmVydHMgYSBzdHJpbmcgb2YgVW5pY29kZSBzeW1ib2xzIChlLmcuIGEgZG9tYWluIG5hbWUgbGFiZWwpIHRvIGFcblx0ICogUHVueWNvZGUgc3RyaW5nIG9mIEFTQ0lJLW9ubHkgc3ltYm9scy5cblx0ICogQG1lbWJlck9mIHB1bnljb2RlXG5cdCAqIEBwYXJhbSB7U3RyaW5nfSBpbnB1dCBUaGUgc3RyaW5nIG9mIFVuaWNvZGUgc3ltYm9scy5cblx0ICogQHJldHVybnMge1N0cmluZ30gVGhlIHJlc3VsdGluZyBQdW55Y29kZSBzdHJpbmcgb2YgQVNDSUktb25seSBzeW1ib2xzLlxuXHQgKi9cblx0ZnVuY3Rpb24gZW5jb2RlKGlucHV0KSB7XG5cdFx0dmFyIG4sXG5cdFx0ICAgIGRlbHRhLFxuXHRcdCAgICBoYW5kbGVkQ1BDb3VudCxcblx0XHQgICAgYmFzaWNMZW5ndGgsXG5cdFx0ICAgIGJpYXMsXG5cdFx0ICAgIGosXG5cdFx0ICAgIG0sXG5cdFx0ICAgIHEsXG5cdFx0ICAgIGssXG5cdFx0ICAgIHQsXG5cdFx0ICAgIGN1cnJlbnRWYWx1ZSxcblx0XHQgICAgb3V0cHV0ID0gW10sXG5cdFx0ICAgIC8qKiBgaW5wdXRMZW5ndGhgIHdpbGwgaG9sZCB0aGUgbnVtYmVyIG9mIGNvZGUgcG9pbnRzIGluIGBpbnB1dGAuICovXG5cdFx0ICAgIGlucHV0TGVuZ3RoLFxuXHRcdCAgICAvKiogQ2FjaGVkIGNhbGN1bGF0aW9uIHJlc3VsdHMgKi9cblx0XHQgICAgaGFuZGxlZENQQ291bnRQbHVzT25lLFxuXHRcdCAgICBiYXNlTWludXNULFxuXHRcdCAgICBxTWludXNUO1xuXG5cdFx0Ly8gQ29udmVydCB0aGUgaW5wdXQgaW4gVUNTLTIgdG8gVW5pY29kZVxuXHRcdGlucHV0ID0gdWNzMmRlY29kZShpbnB1dCk7XG5cblx0XHQvLyBDYWNoZSB0aGUgbGVuZ3RoXG5cdFx0aW5wdXRMZW5ndGggPSBpbnB1dC5sZW5ndGg7XG5cblx0XHQvLyBJbml0aWFsaXplIHRoZSBzdGF0ZVxuXHRcdG4gPSBpbml0aWFsTjtcblx0XHRkZWx0YSA9IDA7XG5cdFx0YmlhcyA9IGluaXRpYWxCaWFzO1xuXG5cdFx0Ly8gSGFuZGxlIHRoZSBiYXNpYyBjb2RlIHBvaW50c1xuXHRcdGZvciAoaiA9IDA7IGogPCBpbnB1dExlbmd0aDsgKytqKSB7XG5cdFx0XHRjdXJyZW50VmFsdWUgPSBpbnB1dFtqXTtcblx0XHRcdGlmIChjdXJyZW50VmFsdWUgPCAweDgwKSB7XG5cdFx0XHRcdG91dHB1dC5wdXNoKHN0cmluZ0Zyb21DaGFyQ29kZShjdXJyZW50VmFsdWUpKTtcblx0XHRcdH1cblx0XHR9XG5cblx0XHRoYW5kbGVkQ1BDb3VudCA9IGJhc2ljTGVuZ3RoID0gb3V0cHV0Lmxlbmd0aDtcblxuXHRcdC8vIGBoYW5kbGVkQ1BDb3VudGAgaXMgdGhlIG51bWJlciBvZiBjb2RlIHBvaW50cyB0aGF0IGhhdmUgYmVlbiBoYW5kbGVkO1xuXHRcdC8vIGBiYXNpY0xlbmd0aGAgaXMgdGhlIG51bWJlciBvZiBiYXNpYyBjb2RlIHBvaW50cy5cblxuXHRcdC8vIEZpbmlzaCB0aGUgYmFzaWMgc3RyaW5nIC0gaWYgaXQgaXMgbm90IGVtcHR5IC0gd2l0aCBhIGRlbGltaXRlclxuXHRcdGlmIChiYXNpY0xlbmd0aCkge1xuXHRcdFx0b3V0cHV0LnB1c2goZGVsaW1pdGVyKTtcblx0XHR9XG5cblx0XHQvLyBNYWluIGVuY29kaW5nIGxvb3A6XG5cdFx0d2hpbGUgKGhhbmRsZWRDUENvdW50IDwgaW5wdXRMZW5ndGgpIHtcblxuXHRcdFx0Ly8gQWxsIG5vbi1iYXNpYyBjb2RlIHBvaW50cyA8IG4gaGF2ZSBiZWVuIGhhbmRsZWQgYWxyZWFkeS4gRmluZCB0aGUgbmV4dFxuXHRcdFx0Ly8gbGFyZ2VyIG9uZTpcblx0XHRcdGZvciAobSA9IG1heEludCwgaiA9IDA7IGogPCBpbnB1dExlbmd0aDsgKytqKSB7XG5cdFx0XHRcdGN1cnJlbnRWYWx1ZSA9IGlucHV0W2pdO1xuXHRcdFx0XHRpZiAoY3VycmVudFZhbHVlID49IG4gJiYgY3VycmVudFZhbHVlIDwgbSkge1xuXHRcdFx0XHRcdG0gPSBjdXJyZW50VmFsdWU7XG5cdFx0XHRcdH1cblx0XHRcdH1cblxuXHRcdFx0Ly8gSW5jcmVhc2UgYGRlbHRhYCBlbm91Z2ggdG8gYWR2YW5jZSB0aGUgZGVjb2RlcidzIDxuLGk+IHN0YXRlIHRvIDxtLDA+LFxuXHRcdFx0Ly8gYnV0IGd1YXJkIGFnYWluc3Qgb3ZlcmZsb3dcblx0XHRcdGhhbmRsZWRDUENvdW50UGx1c09uZSA9IGhhbmRsZWRDUENvdW50ICsgMTtcblx0XHRcdGlmIChtIC0gbiA+IGZsb29yKChtYXhJbnQgLSBkZWx0YSkgLyBoYW5kbGVkQ1BDb3VudFBsdXNPbmUpKSB7XG5cdFx0XHRcdGVycm9yKCdvdmVyZmxvdycpO1xuXHRcdFx0fVxuXG5cdFx0XHRkZWx0YSArPSAobSAtIG4pICogaGFuZGxlZENQQ291bnRQbHVzT25lO1xuXHRcdFx0biA9IG07XG5cblx0XHRcdGZvciAoaiA9IDA7IGogPCBpbnB1dExlbmd0aDsgKytqKSB7XG5cdFx0XHRcdGN1cnJlbnRWYWx1ZSA9IGlucHV0W2pdO1xuXG5cdFx0XHRcdGlmIChjdXJyZW50VmFsdWUgPCBuICYmICsrZGVsdGEgPiBtYXhJbnQpIHtcblx0XHRcdFx0XHRlcnJvcignb3ZlcmZsb3cnKTtcblx0XHRcdFx0fVxuXG5cdFx0XHRcdGlmIChjdXJyZW50VmFsdWUgPT0gbikge1xuXHRcdFx0XHRcdC8vIFJlcHJlc2VudCBkZWx0YSBhcyBhIGdlbmVyYWxpemVkIHZhcmlhYmxlLWxlbmd0aCBpbnRlZ2VyXG5cdFx0XHRcdFx0Zm9yIChxID0gZGVsdGEsIGsgPSBiYXNlOyAvKiBubyBjb25kaXRpb24gKi87IGsgKz0gYmFzZSkge1xuXHRcdFx0XHRcdFx0dCA9IGsgPD0gYmlhcyA/IHRNaW4gOiAoayA+PSBiaWFzICsgdE1heCA/IHRNYXggOiBrIC0gYmlhcyk7XG5cdFx0XHRcdFx0XHRpZiAocSA8IHQpIHtcblx0XHRcdFx0XHRcdFx0YnJlYWs7XG5cdFx0XHRcdFx0XHR9XG5cdFx0XHRcdFx0XHRxTWludXNUID0gcSAtIHQ7XG5cdFx0XHRcdFx0XHRiYXNlTWludXNUID0gYmFzZSAtIHQ7XG5cdFx0XHRcdFx0XHRvdXRwdXQucHVzaChcblx0XHRcdFx0XHRcdFx0c3RyaW5nRnJvbUNoYXJDb2RlKGRpZ2l0VG9CYXNpYyh0ICsgcU1pbnVzVCAlIGJhc2VNaW51c1QsIDApKVxuXHRcdFx0XHRcdFx0KTtcblx0XHRcdFx0XHRcdHEgPSBmbG9vcihxTWludXNUIC8gYmFzZU1pbnVzVCk7XG5cdFx0XHRcdFx0fVxuXG5cdFx0XHRcdFx0b3V0cHV0LnB1c2goc3RyaW5nRnJvbUNoYXJDb2RlKGRpZ2l0VG9CYXNpYyhxLCAwKSkpO1xuXHRcdFx0XHRcdGJpYXMgPSBhZGFwdChkZWx0YSwgaGFuZGxlZENQQ291bnRQbHVzT25lLCBoYW5kbGVkQ1BDb3VudCA9PSBiYXNpY0xlbmd0aCk7XG5cdFx0XHRcdFx0ZGVsdGEgPSAwO1xuXHRcdFx0XHRcdCsraGFuZGxlZENQQ291bnQ7XG5cdFx0XHRcdH1cblx0XHRcdH1cblxuXHRcdFx0KytkZWx0YTtcblx0XHRcdCsrbjtcblxuXHRcdH1cblx0XHRyZXR1cm4gb3V0cHV0LmpvaW4oJycpO1xuXHR9XG5cblx0LyoqXG5cdCAqIENvbnZlcnRzIGEgUHVueWNvZGUgc3RyaW5nIHJlcHJlc2VudGluZyBhIGRvbWFpbiBuYW1lIG9yIGFuIGVtYWlsIGFkZHJlc3Ncblx0ICogdG8gVW5pY29kZS4gT25seSB0aGUgUHVueWNvZGVkIHBhcnRzIG9mIHRoZSBpbnB1dCB3aWxsIGJlIGNvbnZlcnRlZCwgaS5lLlxuXHQgKiBpdCBkb2Vzbid0IG1hdHRlciBpZiB5b3UgY2FsbCBpdCBvbiBhIHN0cmluZyB0aGF0IGhhcyBhbHJlYWR5IGJlZW5cblx0ICogY29udmVydGVkIHRvIFVuaWNvZGUuXG5cdCAqIEBtZW1iZXJPZiBwdW55Y29kZVxuXHQgKiBAcGFyYW0ge1N0cmluZ30gaW5wdXQgVGhlIFB1bnljb2RlZCBkb21haW4gbmFtZSBvciBlbWFpbCBhZGRyZXNzIHRvXG5cdCAqIGNvbnZlcnQgdG8gVW5pY29kZS5cblx0ICogQHJldHVybnMge1N0cmluZ30gVGhlIFVuaWNvZGUgcmVwcmVzZW50YXRpb24gb2YgdGhlIGdpdmVuIFB1bnljb2RlXG5cdCAqIHN0cmluZy5cblx0ICovXG5cdGZ1bmN0aW9uIHRvVW5pY29kZShpbnB1dCkge1xuXHRcdHJldHVybiBtYXBEb21haW4oaW5wdXQsIGZ1bmN0aW9uKHN0cmluZykge1xuXHRcdFx0cmV0dXJuIHJlZ2V4UHVueWNvZGUudGVzdChzdHJpbmcpXG5cdFx0XHRcdD8gZGVjb2RlKHN0cmluZy5zbGljZSg0KS50b0xvd2VyQ2FzZSgpKVxuXHRcdFx0XHQ6IHN0cmluZztcblx0XHR9KTtcblx0fVxuXG5cdC8qKlxuXHQgKiBDb252ZXJ0cyBhIFVuaWNvZGUgc3RyaW5nIHJlcHJlc2VudGluZyBhIGRvbWFpbiBuYW1lIG9yIGFuIGVtYWlsIGFkZHJlc3MgdG9cblx0ICogUHVueWNvZGUuIE9ubHkgdGhlIG5vbi1BU0NJSSBwYXJ0cyBvZiB0aGUgZG9tYWluIG5hbWUgd2lsbCBiZSBjb252ZXJ0ZWQsXG5cdCAqIGkuZS4gaXQgZG9lc24ndCBtYXR0ZXIgaWYgeW91IGNhbGwgaXQgd2l0aCBhIGRvbWFpbiB0aGF0J3MgYWxyZWFkeSBpblxuXHQgKiBBU0NJSS5cblx0ICogQG1lbWJlck9mIHB1bnljb2RlXG5cdCAqIEBwYXJhbSB7U3RyaW5nfSBpbnB1dCBUaGUgZG9tYWluIG5hbWUgb3IgZW1haWwgYWRkcmVzcyB0byBjb252ZXJ0LCBhcyBhXG5cdCAqIFVuaWNvZGUgc3RyaW5nLlxuXHQgKiBAcmV0dXJucyB7U3RyaW5nfSBUaGUgUHVueWNvZGUgcmVwcmVzZW50YXRpb24gb2YgdGhlIGdpdmVuIGRvbWFpbiBuYW1lIG9yXG5cdCAqIGVtYWlsIGFkZHJlc3MuXG5cdCAqL1xuXHRmdW5jdGlvbiB0b0FTQ0lJKGlucHV0KSB7XG5cdFx0cmV0dXJuIG1hcERvbWFpbihpbnB1dCwgZnVuY3Rpb24oc3RyaW5nKSB7XG5cdFx0XHRyZXR1cm4gcmVnZXhOb25BU0NJSS50ZXN0KHN0cmluZylcblx0XHRcdFx0PyAneG4tLScgKyBlbmNvZGUoc3RyaW5nKVxuXHRcdFx0XHQ6IHN0cmluZztcblx0XHR9KTtcblx0fVxuXG5cdC8qLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0qL1xuXG5cdC8qKiBEZWZpbmUgdGhlIHB1YmxpYyBBUEkgKi9cblx0cHVueWNvZGUgPSB7XG5cdFx0LyoqXG5cdFx0ICogQSBzdHJpbmcgcmVwcmVzZW50aW5nIHRoZSBjdXJyZW50IFB1bnljb2RlLmpzIHZlcnNpb24gbnVtYmVyLlxuXHRcdCAqIEBtZW1iZXJPZiBwdW55Y29kZVxuXHRcdCAqIEB0eXBlIFN0cmluZ1xuXHRcdCAqL1xuXHRcdCd2ZXJzaW9uJzogJzEuNC4xJyxcblx0XHQvKipcblx0XHQgKiBBbiBvYmplY3Qgb2YgbWV0aG9kcyB0byBjb252ZXJ0IGZyb20gSmF2YVNjcmlwdCdzIGludGVybmFsIGNoYXJhY3RlclxuXHRcdCAqIHJlcHJlc2VudGF0aW9uIChVQ1MtMikgdG8gVW5pY29kZSBjb2RlIHBvaW50cywgYW5kIGJhY2suXG5cdFx0ICogQHNlZSA8aHR0cHM6Ly9tYXRoaWFzYnluZW5zLmJlL25vdGVzL2phdmFzY3JpcHQtZW5jb2Rpbmc+XG5cdFx0ICogQG1lbWJlck9mIHB1bnljb2RlXG5cdFx0ICogQHR5cGUgT2JqZWN0XG5cdFx0ICovXG5cdFx0J3VjczInOiB7XG5cdFx0XHQnZGVjb2RlJzogdWNzMmRlY29kZSxcblx0XHRcdCdlbmNvZGUnOiB1Y3MyZW5jb2RlXG5cdFx0fSxcblx0XHQnZGVjb2RlJzogZGVjb2RlLFxuXHRcdCdlbmNvZGUnOiBlbmNvZGUsXG5cdFx0J3RvQVNDSUknOiB0b0FTQ0lJLFxuXHRcdCd0b1VuaWNvZGUnOiB0b1VuaWNvZGVcblx0fTtcblxuXHQvKiogRXhwb3NlIGBwdW55Y29kZWAgKi9cblx0Ly8gU29tZSBBTUQgYnVpbGQgb3B0aW1pemVycywgbGlrZSByLmpzLCBjaGVjayBmb3Igc3BlY2lmaWMgY29uZGl0aW9uIHBhdHRlcm5zXG5cdC8vIGxpa2UgdGhlIGZvbGxvd2luZzpcblx0aWYgKFxuXHRcdHR5cGVvZiBkZWZpbmUgPT0gJ2Z1bmN0aW9uJyAmJlxuXHRcdHR5cGVvZiBkZWZpbmUuYW1kID09ICdvYmplY3QnICYmXG5cdFx0ZGVmaW5lLmFtZFxuXHQpIHtcblx0XHRkZWZpbmUoJ3B1bnljb2RlJywgZnVuY3Rpb24oKSB7XG5cdFx0XHRyZXR1cm4gcHVueWNvZGU7XG5cdFx0fSk7XG5cdH0gZWxzZSBpZiAoZnJlZUV4cG9ydHMgJiYgZnJlZU1vZHVsZSkge1xuXHRcdGlmIChtb2R1bGUuZXhwb3J0cyA9PSBmcmVlRXhwb3J0cykge1xuXHRcdFx0Ly8gaW4gTm9kZS5qcywgaW8uanMsIG9yIFJpbmdvSlMgdjAuOC4wK1xuXHRcdFx0ZnJlZU1vZHVsZS5leHBvcnRzID0gcHVueWNvZGU7XG5cdFx0fSBlbHNlIHtcblx0XHRcdC8vIGluIE5hcndoYWwgb3IgUmluZ29KUyB2MC43LjAtXG5cdFx0XHRmb3IgKGtleSBpbiBwdW55Y29kZSkge1xuXHRcdFx0XHRwdW55Y29kZS5oYXNPd25Qcm9wZXJ0eShrZXkpICYmIChmcmVlRXhwb3J0c1trZXldID0gcHVueWNvZGVba2V5XSk7XG5cdFx0XHR9XG5cdFx0fVxuXHR9IGVsc2Uge1xuXHRcdC8vIGluIFJoaW5vIG9yIGEgd2ViIGJyb3dzZXJcblx0XHRyb290LnB1bnljb2RlID0gcHVueWNvZGU7XG5cdH1cblxufSh0aGlzKSk7XG4iLCIvLyBDb3B5cmlnaHQgSm95ZW50LCBJbmMuIGFuZCBvdGhlciBOb2RlIGNvbnRyaWJ1dG9ycy5cbi8vXG4vLyBQZXJtaXNzaW9uIGlzIGhlcmVieSBncmFudGVkLCBmcmVlIG9mIGNoYXJnZSwgdG8gYW55IHBlcnNvbiBvYnRhaW5pbmcgYVxuLy8gY29weSBvZiB0aGlzIHNvZnR3YXJlIGFuZCBhc3NvY2lhdGVkIGRvY3VtZW50YXRpb24gZmlsZXMgKHRoZVxuLy8gXCJTb2Z0d2FyZVwiKSwgdG8gZGVhbCBpbiB0aGUgU29mdHdhcmUgd2l0aG91dCByZXN0cmljdGlvbiwgaW5jbHVkaW5nXG4vLyB3aXRob3V0IGxpbWl0YXRpb24gdGhlIHJpZ2h0cyB0byB1c2UsIGNvcHksIG1vZGlmeSwgbWVyZ2UsIHB1Ymxpc2gsXG4vLyBkaXN0cmlidXRlLCBzdWJsaWNlbnNlLCBhbmQvb3Igc2VsbCBjb3BpZXMgb2YgdGhlIFNvZnR3YXJlLCBhbmQgdG8gcGVybWl0XG4vLyBwZXJzb25zIHRvIHdob20gdGhlIFNvZnR3YXJlIGlzIGZ1cm5pc2hlZCB0byBkbyBzbywgc3ViamVjdCB0byB0aGVcbi8vIGZvbGxvd2luZyBjb25kaXRpb25zOlxuLy9cbi8vIFRoZSBhYm92ZSBjb3B5cmlnaHQgbm90aWNlIGFuZCB0aGlzIHBlcm1pc3Npb24gbm90aWNlIHNoYWxsIGJlIGluY2x1ZGVkXG4vLyBpbiBhbGwgY29waWVzIG9yIHN1YnN0YW50aWFsIHBvcnRpb25zIG9mIHRoZSBTb2Z0d2FyZS5cbi8vXG4vLyBUSEUgU09GVFdBUkUgSVMgUFJPVklERUQgXCJBUyBJU1wiLCBXSVRIT1VUIFdBUlJBTlRZIE9GIEFOWSBLSU5ELCBFWFBSRVNTXG4vLyBPUiBJTVBMSUVELCBJTkNMVURJTkcgQlVUIE5PVCBMSU1JVEVEIFRPIFRIRSBXQVJSQU5USUVTIE9GXG4vLyBNRVJDSEFOVEFCSUxJVFksIEZJVE5FU1MgRk9SIEEgUEFSVElDVUxBUiBQVVJQT1NFIEFORCBOT05JTkZSSU5HRU1FTlQuIElOXG4vLyBOTyBFVkVOVCBTSEFMTCBUSEUgQVVUSE9SUyBPUiBDT1BZUklHSFQgSE9MREVSUyBCRSBMSUFCTEUgRk9SIEFOWSBDTEFJTSxcbi8vIERBTUFHRVMgT1IgT1RIRVIgTElBQklMSVRZLCBXSEVUSEVSIElOIEFOIEFDVElPTiBPRiBDT05UUkFDVCwgVE9SVCBPUlxuLy8gT1RIRVJXSVNFLCBBUklTSU5HIEZST00sIE9VVCBPRiBPUiBJTiBDT05ORUNUSU9OIFdJVEggVEhFIFNPRlRXQVJFIE9SIFRIRVxuLy8gVVNFIE9SIE9USEVSIERFQUxJTkdTIElOIFRIRSBTT0ZUV0FSRS5cblxuJ3VzZSBzdHJpY3QnO1xuXG4vLyBJZiBvYmouaGFzT3duUHJvcGVydHkgaGFzIGJlZW4gb3ZlcnJpZGRlbiwgdGhlbiBjYWxsaW5nXG4vLyBvYmouaGFzT3duUHJvcGVydHkocHJvcCkgd2lsbCBicmVhay5cbi8vIFNlZTogaHR0cHM6Ly9naXRodWIuY29tL2pveWVudC9ub2RlL2lzc3Vlcy8xNzA3XG5mdW5jdGlvbiBoYXNPd25Qcm9wZXJ0eShvYmosIHByb3ApIHtcbiAgcmV0dXJuIE9iamVjdC5wcm90b3R5cGUuaGFzT3duUHJvcGVydHkuY2FsbChvYmosIHByb3ApO1xufVxuXG5tb2R1bGUuZXhwb3J0cyA9IGZ1bmN0aW9uKHFzLCBzZXAsIGVxLCBvcHRpb25zKSB7XG4gIHNlcCA9IHNlcCB8fCAnJic7XG4gIGVxID0gZXEgfHwgJz0nO1xuICB2YXIgb2JqID0ge307XG5cbiAgaWYgKHR5cGVvZiBxcyAhPT0gJ3N0cmluZycgfHwgcXMubGVuZ3RoID09PSAwKSB7XG4gICAgcmV0dXJuIG9iajtcbiAgfVxuXG4gIHZhciByZWdleHAgPSAvXFwrL2c7XG4gIHFzID0gcXMuc3BsaXQoc2VwKTtcblxuICB2YXIgbWF4S2V5cyA9IDEwMDA7XG4gIGlmIChvcHRpb25zICYmIHR5cGVvZiBvcHRpb25zLm1heEtleXMgPT09ICdudW1iZXInKSB7XG4gICAgbWF4S2V5cyA9IG9wdGlvbnMubWF4S2V5cztcbiAgfVxuXG4gIHZhciBsZW4gPSBxcy5sZW5ndGg7XG4gIC8vIG1heEtleXMgPD0gMCBtZWFucyB0aGF0IHdlIHNob3VsZCBub3QgbGltaXQga2V5cyBjb3VudFxuICBpZiAobWF4S2V5cyA+IDAgJiYgbGVuID4gbWF4S2V5cykge1xuICAgIGxlbiA9IG1heEtleXM7XG4gIH1cblxuICBmb3IgKHZhciBpID0gMDsgaSA8IGxlbjsgKytpKSB7XG4gICAgdmFyIHggPSBxc1tpXS5yZXBsYWNlKHJlZ2V4cCwgJyUyMCcpLFxuICAgICAgICBpZHggPSB4LmluZGV4T2YoZXEpLFxuICAgICAgICBrc3RyLCB2c3RyLCBrLCB2O1xuXG4gICAgaWYgKGlkeCA+PSAwKSB7XG4gICAgICBrc3RyID0geC5zdWJzdHIoMCwgaWR4KTtcbiAgICAgIHZzdHIgPSB4LnN1YnN0cihpZHggKyAxKTtcbiAgICB9IGVsc2Uge1xuICAgICAga3N0ciA9IHg7XG4gICAgICB2c3RyID0gJyc7XG4gICAgfVxuXG4gICAgayA9IGRlY29kZVVSSUNvbXBvbmVudChrc3RyKTtcbiAgICB2ID0gZGVjb2RlVVJJQ29tcG9uZW50KHZzdHIpO1xuXG4gICAgaWYgKCFoYXNPd25Qcm9wZXJ0eShvYmosIGspKSB7XG4gICAgICBvYmpba10gPSB2O1xuICAgIH0gZWxzZSBpZiAoaXNBcnJheShvYmpba10pKSB7XG4gICAgICBvYmpba10ucHVzaCh2KTtcbiAgICB9IGVsc2Uge1xuICAgICAgb2JqW2tdID0gW29ialtrXSwgdl07XG4gICAgfVxuICB9XG5cbiAgcmV0dXJuIG9iajtcbn07XG5cbnZhciBpc0FycmF5ID0gQXJyYXkuaXNBcnJheSB8fCBmdW5jdGlvbiAoeHMpIHtcbiAgcmV0dXJuIE9iamVjdC5wcm90b3R5cGUudG9TdHJpbmcuY2FsbCh4cykgPT09ICdbb2JqZWN0IEFycmF5XSc7XG59O1xuIiwiLy8gQ29weXJpZ2h0IEpveWVudCwgSW5jLiBhbmQgb3RoZXIgTm9kZSBjb250cmlidXRvcnMuXG4vL1xuLy8gUGVybWlzc2lvbiBpcyBoZXJlYnkgZ3JhbnRlZCwgZnJlZSBvZiBjaGFyZ2UsIHRvIGFueSBwZXJzb24gb2J0YWluaW5nIGFcbi8vIGNvcHkgb2YgdGhpcyBzb2Z0d2FyZSBhbmQgYXNzb2NpYXRlZCBkb2N1bWVudGF0aW9uIGZpbGVzICh0aGVcbi8vIFwiU29mdHdhcmVcIiksIHRvIGRlYWwgaW4gdGhlIFNvZnR3YXJlIHdpdGhvdXQgcmVzdHJpY3Rpb24sIGluY2x1ZGluZ1xuLy8gd2l0aG91dCBsaW1pdGF0aW9uIHRoZSByaWdodHMgdG8gdXNlLCBjb3B5LCBtb2RpZnksIG1lcmdlLCBwdWJsaXNoLFxuLy8gZGlzdHJpYnV0ZSwgc3VibGljZW5zZSwgYW5kL29yIHNlbGwgY29waWVzIG9mIHRoZSBTb2Z0d2FyZSwgYW5kIHRvIHBlcm1pdFxuLy8gcGVyc29ucyB0byB3aG9tIHRoZSBTb2Z0d2FyZSBpcyBmdXJuaXNoZWQgdG8gZG8gc28sIHN1YmplY3QgdG8gdGhlXG4vLyBmb2xsb3dpbmcgY29uZGl0aW9uczpcbi8vXG4vLyBUaGUgYWJvdmUgY29weXJpZ2h0IG5vdGljZSBhbmQgdGhpcyBwZXJtaXNzaW9uIG5vdGljZSBzaGFsbCBiZSBpbmNsdWRlZFxuLy8gaW4gYWxsIGNvcGllcyBvciBzdWJzdGFudGlhbCBwb3J0aW9ucyBvZiB0aGUgU29mdHdhcmUuXG4vL1xuLy8gVEhFIFNPRlRXQVJFIElTIFBST1ZJREVEIFwiQVMgSVNcIiwgV0lUSE9VVCBXQVJSQU5UWSBPRiBBTlkgS0lORCwgRVhQUkVTU1xuLy8gT1IgSU1QTElFRCwgSU5DTFVESU5HIEJVVCBOT1QgTElNSVRFRCBUTyBUSEUgV0FSUkFOVElFUyBPRlxuLy8gTUVSQ0hBTlRBQklMSVRZLCBGSVRORVNTIEZPUiBBIFBBUlRJQ1VMQVIgUFVSUE9TRSBBTkQgTk9OSU5GUklOR0VNRU5ULiBJTlxuLy8gTk8gRVZFTlQgU0hBTEwgVEhFIEFVVEhPUlMgT1IgQ09QWVJJR0hUIEhPTERFUlMgQkUgTElBQkxFIEZPUiBBTlkgQ0xBSU0sXG4vLyBEQU1BR0VTIE9SIE9USEVSIExJQUJJTElUWSwgV0hFVEhFUiBJTiBBTiBBQ1RJT04gT0YgQ09OVFJBQ1QsIFRPUlQgT1Jcbi8vIE9USEVSV0lTRSwgQVJJU0lORyBGUk9NLCBPVVQgT0YgT1IgSU4gQ09OTkVDVElPTiBXSVRIIFRIRSBTT0ZUV0FSRSBPUiBUSEVcbi8vIFVTRSBPUiBPVEhFUiBERUFMSU5HUyBJTiBUSEUgU09GVFdBUkUuXG5cbid1c2Ugc3RyaWN0JztcblxudmFyIHN0cmluZ2lmeVByaW1pdGl2ZSA9IGZ1bmN0aW9uKHYpIHtcbiAgc3dpdGNoICh0eXBlb2Ygdikge1xuICAgIGNhc2UgJ3N0cmluZyc6XG4gICAgICByZXR1cm4gdjtcblxuICAgIGNhc2UgJ2Jvb2xlYW4nOlxuICAgICAgcmV0dXJuIHYgPyAndHJ1ZScgOiAnZmFsc2UnO1xuXG4gICAgY2FzZSAnbnVtYmVyJzpcbiAgICAgIHJldHVybiBpc0Zpbml0ZSh2KSA/IHYgOiAnJztcblxuICAgIGRlZmF1bHQ6XG4gICAgICByZXR1cm4gJyc7XG4gIH1cbn07XG5cbm1vZHVsZS5leHBvcnRzID0gZnVuY3Rpb24ob2JqLCBzZXAsIGVxLCBuYW1lKSB7XG4gIHNlcCA9IHNlcCB8fCAnJic7XG4gIGVxID0gZXEgfHwgJz0nO1xuICBpZiAob2JqID09PSBudWxsKSB7XG4gICAgb2JqID0gdW5kZWZpbmVkO1xuICB9XG5cbiAgaWYgKHR5cGVvZiBvYmogPT09ICdvYmplY3QnKSB7XG4gICAgcmV0dXJuIG1hcChvYmplY3RLZXlzKG9iaiksIGZ1bmN0aW9uKGspIHtcbiAgICAgIHZhciBrcyA9IGVuY29kZVVSSUNvbXBvbmVudChzdHJpbmdpZnlQcmltaXRpdmUoaykpICsgZXE7XG4gICAgICBpZiAoaXNBcnJheShvYmpba10pKSB7XG4gICAgICAgIHJldHVybiBtYXAob2JqW2tdLCBmdW5jdGlvbih2KSB7XG4gICAgICAgICAgcmV0dXJuIGtzICsgZW5jb2RlVVJJQ29tcG9uZW50KHN0cmluZ2lmeVByaW1pdGl2ZSh2KSk7XG4gICAgICAgIH0pLmpvaW4oc2VwKTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIHJldHVybiBrcyArIGVuY29kZVVSSUNvbXBvbmVudChzdHJpbmdpZnlQcmltaXRpdmUob2JqW2tdKSk7XG4gICAgICB9XG4gICAgfSkuam9pbihzZXApO1xuXG4gIH1cblxuICBpZiAoIW5hbWUpIHJldHVybiAnJztcbiAgcmV0dXJuIGVuY29kZVVSSUNvbXBvbmVudChzdHJpbmdpZnlQcmltaXRpdmUobmFtZSkpICsgZXEgK1xuICAgICAgICAgZW5jb2RlVVJJQ29tcG9uZW50KHN0cmluZ2lmeVByaW1pdGl2ZShvYmopKTtcbn07XG5cbnZhciBpc0FycmF5ID0gQXJyYXkuaXNBcnJheSB8fCBmdW5jdGlvbiAoeHMpIHtcbiAgcmV0dXJuIE9iamVjdC5wcm90b3R5cGUudG9TdHJpbmcuY2FsbCh4cykgPT09ICdbb2JqZWN0IEFycmF5XSc7XG59O1xuXG5mdW5jdGlvbiBtYXAgKHhzLCBmKSB7XG4gIGlmICh4cy5tYXApIHJldHVybiB4cy5tYXAoZik7XG4gIHZhciByZXMgPSBbXTtcbiAgZm9yICh2YXIgaSA9IDA7IGkgPCB4cy5sZW5ndGg7IGkrKykge1xuICAgIHJlcy5wdXNoKGYoeHNbaV0sIGkpKTtcbiAgfVxuICByZXR1cm4gcmVzO1xufVxuXG52YXIgb2JqZWN0S2V5cyA9IE9iamVjdC5rZXlzIHx8IGZ1bmN0aW9uIChvYmopIHtcbiAgdmFyIHJlcyA9IFtdO1xuICBmb3IgKHZhciBrZXkgaW4gb2JqKSB7XG4gICAgaWYgKE9iamVjdC5wcm90b3R5cGUuaGFzT3duUHJvcGVydHkuY2FsbChvYmosIGtleSkpIHJlcy5wdXNoKGtleSk7XG4gIH1cbiAgcmV0dXJuIHJlcztcbn07XG4iLCIndXNlIHN0cmljdCc7XG5cbmV4cG9ydHMuZGVjb2RlID0gZXhwb3J0cy5wYXJzZSA9IHJlcXVpcmUoJy4vZGVjb2RlJyk7XG5leHBvcnRzLmVuY29kZSA9IGV4cG9ydHMuc3RyaW5naWZ5ID0gcmVxdWlyZSgnLi9lbmNvZGUnKTtcbiIsIi8vIENvcHlyaWdodCBKb3llbnQsIEluYy4gYW5kIG90aGVyIE5vZGUgY29udHJpYnV0b3JzLlxuLy9cbi8vIFBlcm1pc3Npb24gaXMgaGVyZWJ5IGdyYW50ZWQsIGZyZWUgb2YgY2hhcmdlLCB0byBhbnkgcGVyc29uIG9idGFpbmluZyBhXG4vLyBjb3B5IG9mIHRoaXMgc29mdHdhcmUgYW5kIGFzc29jaWF0ZWQgZG9jdW1lbnRhdGlvbiBmaWxlcyAodGhlXG4vLyBcIlNvZnR3YXJlXCIpLCB0byBkZWFsIGluIHRoZSBTb2Z0d2FyZSB3aXRob3V0IHJlc3RyaWN0aW9uLCBpbmNsdWRpbmdcbi8vIHdpdGhvdXQgbGltaXRhdGlvbiB0aGUgcmlnaHRzIHRvIHVzZSwgY29weSwgbW9kaWZ5LCBtZXJnZSwgcHVibGlzaCxcbi8vIGRpc3RyaWJ1dGUsIHN1YmxpY2Vuc2UsIGFuZC9vciBzZWxsIGNvcGllcyBvZiB0aGUgU29mdHdhcmUsIGFuZCB0byBwZXJtaXRcbi8vIHBlcnNvbnMgdG8gd2hvbSB0aGUgU29mdHdhcmUgaXMgZnVybmlzaGVkIHRvIGRvIHNvLCBzdWJqZWN0IHRvIHRoZVxuLy8gZm9sbG93aW5nIGNvbmRpdGlvbnM6XG4vL1xuLy8gVGhlIGFib3ZlIGNvcHlyaWdodCBub3RpY2UgYW5kIHRoaXMgcGVybWlzc2lvbiBub3RpY2Ugc2hhbGwgYmUgaW5jbHVkZWRcbi8vIGluIGFsbCBjb3BpZXMgb3Igc3Vic3RhbnRpYWwgcG9ydGlvbnMgb2YgdGhlIFNvZnR3YXJlLlxuLy9cbi8vIFRIRSBTT0ZUV0FSRSBJUyBQUk9WSURFRCBcIkFTIElTXCIsIFdJVEhPVVQgV0FSUkFOVFkgT0YgQU5ZIEtJTkQsIEVYUFJFU1Ncbi8vIE9SIElNUExJRUQsIElOQ0xVRElORyBCVVQgTk9UIExJTUlURUQgVE8gVEhFIFdBUlJBTlRJRVMgT0Zcbi8vIE1FUkNIQU5UQUJJTElUWSwgRklUTkVTUyBGT1IgQSBQQVJUSUNVTEFSIFBVUlBPU0UgQU5EIE5PTklORlJJTkdFTUVOVC4gSU5cbi8vIE5PIEVWRU5UIFNIQUxMIFRIRSBBVVRIT1JTIE9SIENPUFlSSUdIVCBIT0xERVJTIEJFIExJQUJMRSBGT1IgQU5ZIENMQUlNLFxuLy8gREFNQUdFUyBPUiBPVEhFUiBMSUFCSUxJVFksIFdIRVRIRVIgSU4gQU4gQUNUSU9OIE9GIENPTlRSQUNULCBUT1JUIE9SXG4vLyBPVEhFUldJU0UsIEFSSVNJTkcgRlJPTSwgT1VUIE9GIE9SIElOIENPTk5FQ1RJT04gV0lUSCBUSEUgU09GVFdBUkUgT1IgVEhFXG4vLyBVU0UgT1IgT1RIRVIgREVBTElOR1MgSU4gVEhFIFNPRlRXQVJFLlxuXG4ndXNlIHN0cmljdCc7XG5cbnZhciBwdW55Y29kZSA9IHJlcXVpcmUoJ3B1bnljb2RlJyk7XG52YXIgdXRpbCA9IHJlcXVpcmUoJy4vdXRpbCcpO1xuXG5leHBvcnRzLnBhcnNlID0gdXJsUGFyc2U7XG5leHBvcnRzLnJlc29sdmUgPSB1cmxSZXNvbHZlO1xuZXhwb3J0cy5yZXNvbHZlT2JqZWN0ID0gdXJsUmVzb2x2ZU9iamVjdDtcbmV4cG9ydHMuZm9ybWF0ID0gdXJsRm9ybWF0O1xuXG5leHBvcnRzLlVybCA9IFVybDtcblxuZnVuY3Rpb24gVXJsKCkge1xuICB0aGlzLnByb3RvY29sID0gbnVsbDtcbiAgdGhpcy5zbGFzaGVzID0gbnVsbDtcbiAgdGhpcy5hdXRoID0gbnVsbDtcbiAgdGhpcy5ob3N0ID0gbnVsbDtcbiAgdGhpcy5wb3J0ID0gbnVsbDtcbiAgdGhpcy5ob3N0bmFtZSA9IG51bGw7XG4gIHRoaXMuaGFzaCA9IG51bGw7XG4gIHRoaXMuc2VhcmNoID0gbnVsbDtcbiAgdGhpcy5xdWVyeSA9IG51bGw7XG4gIHRoaXMucGF0aG5hbWUgPSBudWxsO1xuICB0aGlzLnBhdGggPSBudWxsO1xuICB0aGlzLmhyZWYgPSBudWxsO1xufVxuXG4vLyBSZWZlcmVuY2U6IFJGQyAzOTg2LCBSRkMgMTgwOCwgUkZDIDIzOTZcblxuLy8gZGVmaW5lIHRoZXNlIGhlcmUgc28gYXQgbGVhc3QgdGhleSBvbmx5IGhhdmUgdG8gYmVcbi8vIGNvbXBpbGVkIG9uY2Ugb24gdGhlIGZpcnN0IG1vZHVsZSBsb2FkLlxudmFyIHByb3RvY29sUGF0dGVybiA9IC9eKFthLXowLTkuKy1dKzopL2ksXG4gICAgcG9ydFBhdHRlcm4gPSAvOlswLTldKiQvLFxuXG4gICAgLy8gU3BlY2lhbCBjYXNlIGZvciBhIHNpbXBsZSBwYXRoIFVSTFxuICAgIHNpbXBsZVBhdGhQYXR0ZXJuID0gL14oXFwvXFwvPyg/IVxcLylbXlxcP1xcc10qKShcXD9bXlxcc10qKT8kLyxcblxuICAgIC8vIFJGQyAyMzk2OiBjaGFyYWN0ZXJzIHJlc2VydmVkIGZvciBkZWxpbWl0aW5nIFVSTHMuXG4gICAgLy8gV2UgYWN0dWFsbHkganVzdCBhdXRvLWVzY2FwZSB0aGVzZS5cbiAgICBkZWxpbXMgPSBbJzwnLCAnPicsICdcIicsICdgJywgJyAnLCAnXFxyJywgJ1xcbicsICdcXHQnXSxcblxuICAgIC8vIFJGQyAyMzk2OiBjaGFyYWN0ZXJzIG5vdCBhbGxvd2VkIGZvciB2YXJpb3VzIHJlYXNvbnMuXG4gICAgdW53aXNlID0gWyd7JywgJ30nLCAnfCcsICdcXFxcJywgJ14nLCAnYCddLmNvbmNhdChkZWxpbXMpLFxuXG4gICAgLy8gQWxsb3dlZCBieSBSRkNzLCBidXQgY2F1c2Ugb2YgWFNTIGF0dGFja3MuICBBbHdheXMgZXNjYXBlIHRoZXNlLlxuICAgIGF1dG9Fc2NhcGUgPSBbJ1xcJyddLmNvbmNhdCh1bndpc2UpLFxuICAgIC8vIENoYXJhY3RlcnMgdGhhdCBhcmUgbmV2ZXIgZXZlciBhbGxvd2VkIGluIGEgaG9zdG5hbWUuXG4gICAgLy8gTm90ZSB0aGF0IGFueSBpbnZhbGlkIGNoYXJzIGFyZSBhbHNvIGhhbmRsZWQsIGJ1dCB0aGVzZVxuICAgIC8vIGFyZSB0aGUgb25lcyB0aGF0IGFyZSAqZXhwZWN0ZWQqIHRvIGJlIHNlZW4sIHNvIHdlIGZhc3QtcGF0aFxuICAgIC8vIHRoZW0uXG4gICAgbm9uSG9zdENoYXJzID0gWyclJywgJy8nLCAnPycsICc7JywgJyMnXS5jb25jYXQoYXV0b0VzY2FwZSksXG4gICAgaG9zdEVuZGluZ0NoYXJzID0gWycvJywgJz8nLCAnIyddLFxuICAgIGhvc3RuYW1lTWF4TGVuID0gMjU1LFxuICAgIGhvc3RuYW1lUGFydFBhdHRlcm4gPSAvXlsrYS16MC05QS1aXy1dezAsNjN9JC8sXG4gICAgaG9zdG5hbWVQYXJ0U3RhcnQgPSAvXihbK2EtejAtOUEtWl8tXXswLDYzfSkoLiopJC8sXG4gICAgLy8gcHJvdG9jb2xzIHRoYXQgY2FuIGFsbG93IFwidW5zYWZlXCIgYW5kIFwidW53aXNlXCIgY2hhcnMuXG4gICAgdW5zYWZlUHJvdG9jb2wgPSB7XG4gICAgICAnamF2YXNjcmlwdCc6IHRydWUsXG4gICAgICAnamF2YXNjcmlwdDonOiB0cnVlXG4gICAgfSxcbiAgICAvLyBwcm90b2NvbHMgdGhhdCBuZXZlciBoYXZlIGEgaG9zdG5hbWUuXG4gICAgaG9zdGxlc3NQcm90b2NvbCA9IHtcbiAgICAgICdqYXZhc2NyaXB0JzogdHJ1ZSxcbiAgICAgICdqYXZhc2NyaXB0Oic6IHRydWVcbiAgICB9LFxuICAgIC8vIHByb3RvY29scyB0aGF0IGFsd2F5cyBjb250YWluIGEgLy8gYml0LlxuICAgIHNsYXNoZWRQcm90b2NvbCA9IHtcbiAgICAgICdodHRwJzogdHJ1ZSxcbiAgICAgICdodHRwcyc6IHRydWUsXG4gICAgICAnZnRwJzogdHJ1ZSxcbiAgICAgICdnb3BoZXInOiB0cnVlLFxuICAgICAgJ2ZpbGUnOiB0cnVlLFxuICAgICAgJ2h0dHA6JzogdHJ1ZSxcbiAgICAgICdodHRwczonOiB0cnVlLFxuICAgICAgJ2Z0cDonOiB0cnVlLFxuICAgICAgJ2dvcGhlcjonOiB0cnVlLFxuICAgICAgJ2ZpbGU6JzogdHJ1ZVxuICAgIH0sXG4gICAgcXVlcnlzdHJpbmcgPSByZXF1aXJlKCdxdWVyeXN0cmluZycpO1xuXG5mdW5jdGlvbiB1cmxQYXJzZSh1cmwsIHBhcnNlUXVlcnlTdHJpbmcsIHNsYXNoZXNEZW5vdGVIb3N0KSB7XG4gIGlmICh1cmwgJiYgdXRpbC5pc09iamVjdCh1cmwpICYmIHVybCBpbnN0YW5jZW9mIFVybCkgcmV0dXJuIHVybDtcblxuICB2YXIgdSA9IG5ldyBVcmw7XG4gIHUucGFyc2UodXJsLCBwYXJzZVF1ZXJ5U3RyaW5nLCBzbGFzaGVzRGVub3RlSG9zdCk7XG4gIHJldHVybiB1O1xufVxuXG5VcmwucHJvdG90eXBlLnBhcnNlID0gZnVuY3Rpb24odXJsLCBwYXJzZVF1ZXJ5U3RyaW5nLCBzbGFzaGVzRGVub3RlSG9zdCkge1xuICBpZiAoIXV0aWwuaXNTdHJpbmcodXJsKSkge1xuICAgIHRocm93IG5ldyBUeXBlRXJyb3IoXCJQYXJhbWV0ZXIgJ3VybCcgbXVzdCBiZSBhIHN0cmluZywgbm90IFwiICsgdHlwZW9mIHVybCk7XG4gIH1cblxuICAvLyBDb3B5IGNocm9tZSwgSUUsIG9wZXJhIGJhY2tzbGFzaC1oYW5kbGluZyBiZWhhdmlvci5cbiAgLy8gQmFjayBzbGFzaGVzIGJlZm9yZSB0aGUgcXVlcnkgc3RyaW5nIGdldCBjb252ZXJ0ZWQgdG8gZm9yd2FyZCBzbGFzaGVzXG4gIC8vIFNlZTogaHR0cHM6Ly9jb2RlLmdvb2dsZS5jb20vcC9jaHJvbWl1bS9pc3N1ZXMvZGV0YWlsP2lkPTI1OTE2XG4gIHZhciBxdWVyeUluZGV4ID0gdXJsLmluZGV4T2YoJz8nKSxcbiAgICAgIHNwbGl0dGVyID1cbiAgICAgICAgICAocXVlcnlJbmRleCAhPT0gLTEgJiYgcXVlcnlJbmRleCA8IHVybC5pbmRleE9mKCcjJykpID8gJz8nIDogJyMnLFxuICAgICAgdVNwbGl0ID0gdXJsLnNwbGl0KHNwbGl0dGVyKSxcbiAgICAgIHNsYXNoUmVnZXggPSAvXFxcXC9nO1xuICB1U3BsaXRbMF0gPSB1U3BsaXRbMF0ucmVwbGFjZShzbGFzaFJlZ2V4LCAnLycpO1xuICB1cmwgPSB1U3BsaXQuam9pbihzcGxpdHRlcik7XG5cbiAgdmFyIHJlc3QgPSB1cmw7XG5cbiAgLy8gdHJpbSBiZWZvcmUgcHJvY2VlZGluZy5cbiAgLy8gVGhpcyBpcyB0byBzdXBwb3J0IHBhcnNlIHN0dWZmIGxpa2UgXCIgIGh0dHA6Ly9mb28uY29tICBcXG5cIlxuICByZXN0ID0gcmVzdC50cmltKCk7XG5cbiAgaWYgKCFzbGFzaGVzRGVub3RlSG9zdCAmJiB1cmwuc3BsaXQoJyMnKS5sZW5ndGggPT09IDEpIHtcbiAgICAvLyBUcnkgZmFzdCBwYXRoIHJlZ2V4cFxuICAgIHZhciBzaW1wbGVQYXRoID0gc2ltcGxlUGF0aFBhdHRlcm4uZXhlYyhyZXN0KTtcbiAgICBpZiAoc2ltcGxlUGF0aCkge1xuICAgICAgdGhpcy5wYXRoID0gcmVzdDtcbiAgICAgIHRoaXMuaHJlZiA9IHJlc3Q7XG4gICAgICB0aGlzLnBhdGhuYW1lID0gc2ltcGxlUGF0aFsxXTtcbiAgICAgIGlmIChzaW1wbGVQYXRoWzJdKSB7XG4gICAgICAgIHRoaXMuc2VhcmNoID0gc2ltcGxlUGF0aFsyXTtcbiAgICAgICAgaWYgKHBhcnNlUXVlcnlTdHJpbmcpIHtcbiAgICAgICAgICB0aGlzLnF1ZXJ5ID0gcXVlcnlzdHJpbmcucGFyc2UodGhpcy5zZWFyY2guc3Vic3RyKDEpKTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICB0aGlzLnF1ZXJ5ID0gdGhpcy5zZWFyY2guc3Vic3RyKDEpO1xuICAgICAgICB9XG4gICAgICB9IGVsc2UgaWYgKHBhcnNlUXVlcnlTdHJpbmcpIHtcbiAgICAgICAgdGhpcy5zZWFyY2ggPSAnJztcbiAgICAgICAgdGhpcy5xdWVyeSA9IHt9O1xuICAgICAgfVxuICAgICAgcmV0dXJuIHRoaXM7XG4gICAgfVxuICB9XG5cbiAgdmFyIHByb3RvID0gcHJvdG9jb2xQYXR0ZXJuLmV4ZWMocmVzdCk7XG4gIGlmIChwcm90bykge1xuICAgIHByb3RvID0gcHJvdG9bMF07XG4gICAgdmFyIGxvd2VyUHJvdG8gPSBwcm90by50b0xvd2VyQ2FzZSgpO1xuICAgIHRoaXMucHJvdG9jb2wgPSBsb3dlclByb3RvO1xuICAgIHJlc3QgPSByZXN0LnN1YnN0cihwcm90by5sZW5ndGgpO1xuICB9XG5cbiAgLy8gZmlndXJlIG91dCBpZiBpdCdzIGdvdCBhIGhvc3RcbiAgLy8gdXNlckBzZXJ2ZXIgaXMgKmFsd2F5cyogaW50ZXJwcmV0ZWQgYXMgYSBob3N0bmFtZSwgYW5kIHVybFxuICAvLyByZXNvbHV0aW9uIHdpbGwgdHJlYXQgLy9mb28vYmFyIGFzIGhvc3Q9Zm9vLHBhdGg9YmFyIGJlY2F1c2UgdGhhdCdzXG4gIC8vIGhvdyB0aGUgYnJvd3NlciByZXNvbHZlcyByZWxhdGl2ZSBVUkxzLlxuICBpZiAoc2xhc2hlc0Rlbm90ZUhvc3QgfHwgcHJvdG8gfHwgcmVzdC5tYXRjaCgvXlxcL1xcL1teQFxcL10rQFteQFxcL10rLykpIHtcbiAgICB2YXIgc2xhc2hlcyA9IHJlc3Quc3Vic3RyKDAsIDIpID09PSAnLy8nO1xuICAgIGlmIChzbGFzaGVzICYmICEocHJvdG8gJiYgaG9zdGxlc3NQcm90b2NvbFtwcm90b10pKSB7XG4gICAgICByZXN0ID0gcmVzdC5zdWJzdHIoMik7XG4gICAgICB0aGlzLnNsYXNoZXMgPSB0cnVlO1xuICAgIH1cbiAgfVxuXG4gIGlmICghaG9zdGxlc3NQcm90b2NvbFtwcm90b10gJiZcbiAgICAgIChzbGFzaGVzIHx8IChwcm90byAmJiAhc2xhc2hlZFByb3RvY29sW3Byb3RvXSkpKSB7XG5cbiAgICAvLyB0aGVyZSdzIGEgaG9zdG5hbWUuXG4gICAgLy8gdGhlIGZpcnN0IGluc3RhbmNlIG9mIC8sID8sIDssIG9yICMgZW5kcyB0aGUgaG9zdC5cbiAgICAvL1xuICAgIC8vIElmIHRoZXJlIGlzIGFuIEAgaW4gdGhlIGhvc3RuYW1lLCB0aGVuIG5vbi1ob3N0IGNoYXJzICphcmUqIGFsbG93ZWRcbiAgICAvLyB0byB0aGUgbGVmdCBvZiB0aGUgbGFzdCBAIHNpZ24sIHVubGVzcyBzb21lIGhvc3QtZW5kaW5nIGNoYXJhY3RlclxuICAgIC8vIGNvbWVzICpiZWZvcmUqIHRoZSBALXNpZ24uXG4gICAgLy8gVVJMcyBhcmUgb2Jub3hpb3VzLlxuICAgIC8vXG4gICAgLy8gZXg6XG4gICAgLy8gaHR0cDovL2FAYkBjLyA9PiB1c2VyOmFAYiBob3N0OmNcbiAgICAvLyBodHRwOi8vYUBiP0BjID0+IHVzZXI6YSBob3N0OmMgcGF0aDovP0BjXG5cbiAgICAvLyB2MC4xMiBUT0RPKGlzYWFjcyk6IFRoaXMgaXMgbm90IHF1aXRlIGhvdyBDaHJvbWUgZG9lcyB0aGluZ3MuXG4gICAgLy8gUmV2aWV3IG91ciB0ZXN0IGNhc2UgYWdhaW5zdCBicm93c2VycyBtb3JlIGNvbXByZWhlbnNpdmVseS5cblxuICAgIC8vIGZpbmQgdGhlIGZpcnN0IGluc3RhbmNlIG9mIGFueSBob3N0RW5kaW5nQ2hhcnNcbiAgICB2YXIgaG9zdEVuZCA9IC0xO1xuICAgIGZvciAodmFyIGkgPSAwOyBpIDwgaG9zdEVuZGluZ0NoYXJzLmxlbmd0aDsgaSsrKSB7XG4gICAgICB2YXIgaGVjID0gcmVzdC5pbmRleE9mKGhvc3RFbmRpbmdDaGFyc1tpXSk7XG4gICAgICBpZiAoaGVjICE9PSAtMSAmJiAoaG9zdEVuZCA9PT0gLTEgfHwgaGVjIDwgaG9zdEVuZCkpXG4gICAgICAgIGhvc3RFbmQgPSBoZWM7XG4gICAgfVxuXG4gICAgLy8gYXQgdGhpcyBwb2ludCwgZWl0aGVyIHdlIGhhdmUgYW4gZXhwbGljaXQgcG9pbnQgd2hlcmUgdGhlXG4gICAgLy8gYXV0aCBwb3J0aW9uIGNhbm5vdCBnbyBwYXN0LCBvciB0aGUgbGFzdCBAIGNoYXIgaXMgdGhlIGRlY2lkZXIuXG4gICAgdmFyIGF1dGgsIGF0U2lnbjtcbiAgICBpZiAoaG9zdEVuZCA9PT0gLTEpIHtcbiAgICAgIC8vIGF0U2lnbiBjYW4gYmUgYW55d2hlcmUuXG4gICAgICBhdFNpZ24gPSByZXN0Lmxhc3RJbmRleE9mKCdAJyk7XG4gICAgfSBlbHNlIHtcbiAgICAgIC8vIGF0U2lnbiBtdXN0IGJlIGluIGF1dGggcG9ydGlvbi5cbiAgICAgIC8vIGh0dHA6Ly9hQGIvY0BkID0+IGhvc3Q6YiBhdXRoOmEgcGF0aDovY0BkXG4gICAgICBhdFNpZ24gPSByZXN0Lmxhc3RJbmRleE9mKCdAJywgaG9zdEVuZCk7XG4gICAgfVxuXG4gICAgLy8gTm93IHdlIGhhdmUgYSBwb3J0aW9uIHdoaWNoIGlzIGRlZmluaXRlbHkgdGhlIGF1dGguXG4gICAgLy8gUHVsbCB0aGF0IG9mZi5cbiAgICBpZiAoYXRTaWduICE9PSAtMSkge1xuICAgICAgYXV0aCA9IHJlc3Quc2xpY2UoMCwgYXRTaWduKTtcbiAgICAgIHJlc3QgPSByZXN0LnNsaWNlKGF0U2lnbiArIDEpO1xuICAgICAgdGhpcy5hdXRoID0gZGVjb2RlVVJJQ29tcG9uZW50KGF1dGgpO1xuICAgIH1cblxuICAgIC8vIHRoZSBob3N0IGlzIHRoZSByZW1haW5pbmcgdG8gdGhlIGxlZnQgb2YgdGhlIGZpcnN0IG5vbi1ob3N0IGNoYXJcbiAgICBob3N0RW5kID0gLTE7XG4gICAgZm9yICh2YXIgaSA9IDA7IGkgPCBub25Ib3N0Q2hhcnMubGVuZ3RoOyBpKyspIHtcbiAgICAgIHZhciBoZWMgPSByZXN0LmluZGV4T2Yobm9uSG9zdENoYXJzW2ldKTtcbiAgICAgIGlmIChoZWMgIT09IC0xICYmIChob3N0RW5kID09PSAtMSB8fCBoZWMgPCBob3N0RW5kKSlcbiAgICAgICAgaG9zdEVuZCA9IGhlYztcbiAgICB9XG4gICAgLy8gaWYgd2Ugc3RpbGwgaGF2ZSBub3QgaGl0IGl0LCB0aGVuIHRoZSBlbnRpcmUgdGhpbmcgaXMgYSBob3N0LlxuICAgIGlmIChob3N0RW5kID09PSAtMSlcbiAgICAgIGhvc3RFbmQgPSByZXN0Lmxlbmd0aDtcblxuICAgIHRoaXMuaG9zdCA9IHJlc3Quc2xpY2UoMCwgaG9zdEVuZCk7XG4gICAgcmVzdCA9IHJlc3Quc2xpY2UoaG9zdEVuZCk7XG5cbiAgICAvLyBwdWxsIG91dCBwb3J0LlxuICAgIHRoaXMucGFyc2VIb3N0KCk7XG5cbiAgICAvLyB3ZSd2ZSBpbmRpY2F0ZWQgdGhhdCB0aGVyZSBpcyBhIGhvc3RuYW1lLFxuICAgIC8vIHNvIGV2ZW4gaWYgaXQncyBlbXB0eSwgaXQgaGFzIHRvIGJlIHByZXNlbnQuXG4gICAgdGhpcy5ob3N0bmFtZSA9IHRoaXMuaG9zdG5hbWUgfHwgJyc7XG5cbiAgICAvLyBpZiBob3N0bmFtZSBiZWdpbnMgd2l0aCBbIGFuZCBlbmRzIHdpdGggXVxuICAgIC8vIGFzc3VtZSB0aGF0IGl0J3MgYW4gSVB2NiBhZGRyZXNzLlxuICAgIHZhciBpcHY2SG9zdG5hbWUgPSB0aGlzLmhvc3RuYW1lWzBdID09PSAnWycgJiZcbiAgICAgICAgdGhpcy5ob3N0bmFtZVt0aGlzLmhvc3RuYW1lLmxlbmd0aCAtIDFdID09PSAnXSc7XG5cbiAgICAvLyB2YWxpZGF0ZSBhIGxpdHRsZS5cbiAgICBpZiAoIWlwdjZIb3N0bmFtZSkge1xuICAgICAgdmFyIGhvc3RwYXJ0cyA9IHRoaXMuaG9zdG5hbWUuc3BsaXQoL1xcLi8pO1xuICAgICAgZm9yICh2YXIgaSA9IDAsIGwgPSBob3N0cGFydHMubGVuZ3RoOyBpIDwgbDsgaSsrKSB7XG4gICAgICAgIHZhciBwYXJ0ID0gaG9zdHBhcnRzW2ldO1xuICAgICAgICBpZiAoIXBhcnQpIGNvbnRpbnVlO1xuICAgICAgICBpZiAoIXBhcnQubWF0Y2goaG9zdG5hbWVQYXJ0UGF0dGVybikpIHtcbiAgICAgICAgICB2YXIgbmV3cGFydCA9ICcnO1xuICAgICAgICAgIGZvciAodmFyIGogPSAwLCBrID0gcGFydC5sZW5ndGg7IGogPCBrOyBqKyspIHtcbiAgICAgICAgICAgIGlmIChwYXJ0LmNoYXJDb2RlQXQoaikgPiAxMjcpIHtcbiAgICAgICAgICAgICAgLy8gd2UgcmVwbGFjZSBub24tQVNDSUkgY2hhciB3aXRoIGEgdGVtcG9yYXJ5IHBsYWNlaG9sZGVyXG4gICAgICAgICAgICAgIC8vIHdlIG5lZWQgdGhpcyB0byBtYWtlIHN1cmUgc2l6ZSBvZiBob3N0bmFtZSBpcyBub3RcbiAgICAgICAgICAgICAgLy8gYnJva2VuIGJ5IHJlcGxhY2luZyBub24tQVNDSUkgYnkgbm90aGluZ1xuICAgICAgICAgICAgICBuZXdwYXJ0ICs9ICd4JztcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgIG5ld3BhcnQgKz0gcGFydFtqXTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICB9XG4gICAgICAgICAgLy8gd2UgdGVzdCBhZ2FpbiB3aXRoIEFTQ0lJIGNoYXIgb25seVxuICAgICAgICAgIGlmICghbmV3cGFydC5tYXRjaChob3N0bmFtZVBhcnRQYXR0ZXJuKSkge1xuICAgICAgICAgICAgdmFyIHZhbGlkUGFydHMgPSBob3N0cGFydHMuc2xpY2UoMCwgaSk7XG4gICAgICAgICAgICB2YXIgbm90SG9zdCA9IGhvc3RwYXJ0cy5zbGljZShpICsgMSk7XG4gICAgICAgICAgICB2YXIgYml0ID0gcGFydC5tYXRjaChob3N0bmFtZVBhcnRTdGFydCk7XG4gICAgICAgICAgICBpZiAoYml0KSB7XG4gICAgICAgICAgICAgIHZhbGlkUGFydHMucHVzaChiaXRbMV0pO1xuICAgICAgICAgICAgICBub3RIb3N0LnVuc2hpZnQoYml0WzJdKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGlmIChub3RIb3N0Lmxlbmd0aCkge1xuICAgICAgICAgICAgICByZXN0ID0gJy8nICsgbm90SG9zdC5qb2luKCcuJykgKyByZXN0O1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgdGhpcy5ob3N0bmFtZSA9IHZhbGlkUGFydHMuam9pbignLicpO1xuICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICB9XG4gICAgfVxuXG4gICAgaWYgKHRoaXMuaG9zdG5hbWUubGVuZ3RoID4gaG9zdG5hbWVNYXhMZW4pIHtcbiAgICAgIHRoaXMuaG9zdG5hbWUgPSAnJztcbiAgICB9IGVsc2Uge1xuICAgICAgLy8gaG9zdG5hbWVzIGFyZSBhbHdheXMgbG93ZXIgY2FzZS5cbiAgICAgIHRoaXMuaG9zdG5hbWUgPSB0aGlzLmhvc3RuYW1lLnRvTG93ZXJDYXNlKCk7XG4gICAgfVxuXG4gICAgaWYgKCFpcHY2SG9zdG5hbWUpIHtcbiAgICAgIC8vIElETkEgU3VwcG9ydDogUmV0dXJucyBhIHB1bnljb2RlZCByZXByZXNlbnRhdGlvbiBvZiBcImRvbWFpblwiLlxuICAgICAgLy8gSXQgb25seSBjb252ZXJ0cyBwYXJ0cyBvZiB0aGUgZG9tYWluIG5hbWUgdGhhdFxuICAgICAgLy8gaGF2ZSBub24tQVNDSUkgY2hhcmFjdGVycywgaS5lLiBpdCBkb2Vzbid0IG1hdHRlciBpZlxuICAgICAgLy8geW91IGNhbGwgaXQgd2l0aCBhIGRvbWFpbiB0aGF0IGFscmVhZHkgaXMgQVNDSUktb25seS5cbiAgICAgIHRoaXMuaG9zdG5hbWUgPSBwdW55Y29kZS50b0FTQ0lJKHRoaXMuaG9zdG5hbWUpO1xuICAgIH1cblxuICAgIHZhciBwID0gdGhpcy5wb3J0ID8gJzonICsgdGhpcy5wb3J0IDogJyc7XG4gICAgdmFyIGggPSB0aGlzLmhvc3RuYW1lIHx8ICcnO1xuICAgIHRoaXMuaG9zdCA9IGggKyBwO1xuICAgIHRoaXMuaHJlZiArPSB0aGlzLmhvc3Q7XG5cbiAgICAvLyBzdHJpcCBbIGFuZCBdIGZyb20gdGhlIGhvc3RuYW1lXG4gICAgLy8gdGhlIGhvc3QgZmllbGQgc3RpbGwgcmV0YWlucyB0aGVtLCB0aG91Z2hcbiAgICBpZiAoaXB2Nkhvc3RuYW1lKSB7XG4gICAgICB0aGlzLmhvc3RuYW1lID0gdGhpcy5ob3N0bmFtZS5zdWJzdHIoMSwgdGhpcy5ob3N0bmFtZS5sZW5ndGggLSAyKTtcbiAgICAgIGlmIChyZXN0WzBdICE9PSAnLycpIHtcbiAgICAgICAgcmVzdCA9ICcvJyArIHJlc3Q7XG4gICAgICB9XG4gICAgfVxuICB9XG5cbiAgLy8gbm93IHJlc3QgaXMgc2V0IHRvIHRoZSBwb3N0LWhvc3Qgc3R1ZmYuXG4gIC8vIGNob3Agb2ZmIGFueSBkZWxpbSBjaGFycy5cbiAgaWYgKCF1bnNhZmVQcm90b2NvbFtsb3dlclByb3RvXSkge1xuXG4gICAgLy8gRmlyc3QsIG1ha2UgMTAwJSBzdXJlIHRoYXQgYW55IFwiYXV0b0VzY2FwZVwiIGNoYXJzIGdldFxuICAgIC8vIGVzY2FwZWQsIGV2ZW4gaWYgZW5jb2RlVVJJQ29tcG9uZW50IGRvZXNuJ3QgdGhpbmsgdGhleVxuICAgIC8vIG5lZWQgdG8gYmUuXG4gICAgZm9yICh2YXIgaSA9IDAsIGwgPSBhdXRvRXNjYXBlLmxlbmd0aDsgaSA8IGw7IGkrKykge1xuICAgICAgdmFyIGFlID0gYXV0b0VzY2FwZVtpXTtcbiAgICAgIGlmIChyZXN0LmluZGV4T2YoYWUpID09PSAtMSlcbiAgICAgICAgY29udGludWU7XG4gICAgICB2YXIgZXNjID0gZW5jb2RlVVJJQ29tcG9uZW50KGFlKTtcbiAgICAgIGlmIChlc2MgPT09IGFlKSB7XG4gICAgICAgIGVzYyA9IGVzY2FwZShhZSk7XG4gICAgICB9XG4gICAgICByZXN0ID0gcmVzdC5zcGxpdChhZSkuam9pbihlc2MpO1xuICAgIH1cbiAgfVxuXG5cbiAgLy8gY2hvcCBvZmYgZnJvbSB0aGUgdGFpbCBmaXJzdC5cbiAgdmFyIGhhc2ggPSByZXN0LmluZGV4T2YoJyMnKTtcbiAgaWYgKGhhc2ggIT09IC0xKSB7XG4gICAgLy8gZ290IGEgZnJhZ21lbnQgc3RyaW5nLlxuICAgIHRoaXMuaGFzaCA9IHJlc3Quc3Vic3RyKGhhc2gpO1xuICAgIHJlc3QgPSByZXN0LnNsaWNlKDAsIGhhc2gpO1xuICB9XG4gIHZhciBxbSA9IHJlc3QuaW5kZXhPZignPycpO1xuICBpZiAocW0gIT09IC0xKSB7XG4gICAgdGhpcy5zZWFyY2ggPSByZXN0LnN1YnN0cihxbSk7XG4gICAgdGhpcy5xdWVyeSA9IHJlc3Quc3Vic3RyKHFtICsgMSk7XG4gICAgaWYgKHBhcnNlUXVlcnlTdHJpbmcpIHtcbiAgICAgIHRoaXMucXVlcnkgPSBxdWVyeXN0cmluZy5wYXJzZSh0aGlzLnF1ZXJ5KTtcbiAgICB9XG4gICAgcmVzdCA9IHJlc3Quc2xpY2UoMCwgcW0pO1xuICB9IGVsc2UgaWYgKHBhcnNlUXVlcnlTdHJpbmcpIHtcbiAgICAvLyBubyBxdWVyeSBzdHJpbmcsIGJ1dCBwYXJzZVF1ZXJ5U3RyaW5nIHN0aWxsIHJlcXVlc3RlZFxuICAgIHRoaXMuc2VhcmNoID0gJyc7XG4gICAgdGhpcy5xdWVyeSA9IHt9O1xuICB9XG4gIGlmIChyZXN0KSB0aGlzLnBhdGhuYW1lID0gcmVzdDtcbiAgaWYgKHNsYXNoZWRQcm90b2NvbFtsb3dlclByb3RvXSAmJlxuICAgICAgdGhpcy5ob3N0bmFtZSAmJiAhdGhpcy5wYXRobmFtZSkge1xuICAgIHRoaXMucGF0aG5hbWUgPSAnLyc7XG4gIH1cblxuICAvL3RvIHN1cHBvcnQgaHR0cC5yZXF1ZXN0XG4gIGlmICh0aGlzLnBhdGhuYW1lIHx8IHRoaXMuc2VhcmNoKSB7XG4gICAgdmFyIHAgPSB0aGlzLnBhdGhuYW1lIHx8ICcnO1xuICAgIHZhciBzID0gdGhpcy5zZWFyY2ggfHwgJyc7XG4gICAgdGhpcy5wYXRoID0gcCArIHM7XG4gIH1cblxuICAvLyBmaW5hbGx5LCByZWNvbnN0cnVjdCB0aGUgaHJlZiBiYXNlZCBvbiB3aGF0IGhhcyBiZWVuIHZhbGlkYXRlZC5cbiAgdGhpcy5ocmVmID0gdGhpcy5mb3JtYXQoKTtcbiAgcmV0dXJuIHRoaXM7XG59O1xuXG4vLyBmb3JtYXQgYSBwYXJzZWQgb2JqZWN0IGludG8gYSB1cmwgc3RyaW5nXG5mdW5jdGlvbiB1cmxGb3JtYXQob2JqKSB7XG4gIC8vIGVuc3VyZSBpdCdzIGFuIG9iamVjdCwgYW5kIG5vdCBhIHN0cmluZyB1cmwuXG4gIC8vIElmIGl0J3MgYW4gb2JqLCB0aGlzIGlzIGEgbm8tb3AuXG4gIC8vIHRoaXMgd2F5LCB5b3UgY2FuIGNhbGwgdXJsX2Zvcm1hdCgpIG9uIHN0cmluZ3NcbiAgLy8gdG8gY2xlYW4gdXAgcG90ZW50aWFsbHkgd29ua3kgdXJscy5cbiAgaWYgKHV0aWwuaXNTdHJpbmcob2JqKSkgb2JqID0gdXJsUGFyc2Uob2JqKTtcbiAgaWYgKCEob2JqIGluc3RhbmNlb2YgVXJsKSkgcmV0dXJuIFVybC5wcm90b3R5cGUuZm9ybWF0LmNhbGwob2JqKTtcbiAgcmV0dXJuIG9iai5mb3JtYXQoKTtcbn1cblxuVXJsLnByb3RvdHlwZS5mb3JtYXQgPSBmdW5jdGlvbigpIHtcbiAgdmFyIGF1dGggPSB0aGlzLmF1dGggfHwgJyc7XG4gIGlmIChhdXRoKSB7XG4gICAgYXV0aCA9IGVuY29kZVVSSUNvbXBvbmVudChhdXRoKTtcbiAgICBhdXRoID0gYXV0aC5yZXBsYWNlKC8lM0EvaSwgJzonKTtcbiAgICBhdXRoICs9ICdAJztcbiAgfVxuXG4gIHZhciBwcm90b2NvbCA9IHRoaXMucHJvdG9jb2wgfHwgJycsXG4gICAgICBwYXRobmFtZSA9IHRoaXMucGF0aG5hbWUgfHwgJycsXG4gICAgICBoYXNoID0gdGhpcy5oYXNoIHx8ICcnLFxuICAgICAgaG9zdCA9IGZhbHNlLFxuICAgICAgcXVlcnkgPSAnJztcblxuICBpZiAodGhpcy5ob3N0KSB7XG4gICAgaG9zdCA9IGF1dGggKyB0aGlzLmhvc3Q7XG4gIH0gZWxzZSBpZiAodGhpcy5ob3N0bmFtZSkge1xuICAgIGhvc3QgPSBhdXRoICsgKHRoaXMuaG9zdG5hbWUuaW5kZXhPZignOicpID09PSAtMSA/XG4gICAgICAgIHRoaXMuaG9zdG5hbWUgOlxuICAgICAgICAnWycgKyB0aGlzLmhvc3RuYW1lICsgJ10nKTtcbiAgICBpZiAodGhpcy5wb3J0KSB7XG4gICAgICBob3N0ICs9ICc6JyArIHRoaXMucG9ydDtcbiAgICB9XG4gIH1cblxuICBpZiAodGhpcy5xdWVyeSAmJlxuICAgICAgdXRpbC5pc09iamVjdCh0aGlzLnF1ZXJ5KSAmJlxuICAgICAgT2JqZWN0LmtleXModGhpcy5xdWVyeSkubGVuZ3RoKSB7XG4gICAgcXVlcnkgPSBxdWVyeXN0cmluZy5zdHJpbmdpZnkodGhpcy5xdWVyeSk7XG4gIH1cblxuICB2YXIgc2VhcmNoID0gdGhpcy5zZWFyY2ggfHwgKHF1ZXJ5ICYmICgnPycgKyBxdWVyeSkpIHx8ICcnO1xuXG4gIGlmIChwcm90b2NvbCAmJiBwcm90b2NvbC5zdWJzdHIoLTEpICE9PSAnOicpIHByb3RvY29sICs9ICc6JztcblxuICAvLyBvbmx5IHRoZSBzbGFzaGVkUHJvdG9jb2xzIGdldCB0aGUgLy8uICBOb3QgbWFpbHRvOiwgeG1wcDosIGV0Yy5cbiAgLy8gdW5sZXNzIHRoZXkgaGFkIHRoZW0gdG8gYmVnaW4gd2l0aC5cbiAgaWYgKHRoaXMuc2xhc2hlcyB8fFxuICAgICAgKCFwcm90b2NvbCB8fCBzbGFzaGVkUHJvdG9jb2xbcHJvdG9jb2xdKSAmJiBob3N0ICE9PSBmYWxzZSkge1xuICAgIGhvc3QgPSAnLy8nICsgKGhvc3QgfHwgJycpO1xuICAgIGlmIChwYXRobmFtZSAmJiBwYXRobmFtZS5jaGFyQXQoMCkgIT09ICcvJykgcGF0aG5hbWUgPSAnLycgKyBwYXRobmFtZTtcbiAgfSBlbHNlIGlmICghaG9zdCkge1xuICAgIGhvc3QgPSAnJztcbiAgfVxuXG4gIGlmIChoYXNoICYmIGhhc2guY2hhckF0KDApICE9PSAnIycpIGhhc2ggPSAnIycgKyBoYXNoO1xuICBpZiAoc2VhcmNoICYmIHNlYXJjaC5jaGFyQXQoMCkgIT09ICc/Jykgc2VhcmNoID0gJz8nICsgc2VhcmNoO1xuXG4gIHBhdGhuYW1lID0gcGF0aG5hbWUucmVwbGFjZSgvWz8jXS9nLCBmdW5jdGlvbihtYXRjaCkge1xuICAgIHJldHVybiBlbmNvZGVVUklDb21wb25lbnQobWF0Y2gpO1xuICB9KTtcbiAgc2VhcmNoID0gc2VhcmNoLnJlcGxhY2UoJyMnLCAnJTIzJyk7XG5cbiAgcmV0dXJuIHByb3RvY29sICsgaG9zdCArIHBhdGhuYW1lICsgc2VhcmNoICsgaGFzaDtcbn07XG5cbmZ1bmN0aW9uIHVybFJlc29sdmUoc291cmNlLCByZWxhdGl2ZSkge1xuICByZXR1cm4gdXJsUGFyc2Uoc291cmNlLCBmYWxzZSwgdHJ1ZSkucmVzb2x2ZShyZWxhdGl2ZSk7XG59XG5cblVybC5wcm90b3R5cGUucmVzb2x2ZSA9IGZ1bmN0aW9uKHJlbGF0aXZlKSB7XG4gIHJldHVybiB0aGlzLnJlc29sdmVPYmplY3QodXJsUGFyc2UocmVsYXRpdmUsIGZhbHNlLCB0cnVlKSkuZm9ybWF0KCk7XG59O1xuXG5mdW5jdGlvbiB1cmxSZXNvbHZlT2JqZWN0KHNvdXJjZSwgcmVsYXRpdmUpIHtcbiAgaWYgKCFzb3VyY2UpIHJldHVybiByZWxhdGl2ZTtcbiAgcmV0dXJuIHVybFBhcnNlKHNvdXJjZSwgZmFsc2UsIHRydWUpLnJlc29sdmVPYmplY3QocmVsYXRpdmUpO1xufVxuXG5VcmwucHJvdG90eXBlLnJlc29sdmVPYmplY3QgPSBmdW5jdGlvbihyZWxhdGl2ZSkge1xuICBpZiAodXRpbC5pc1N0cmluZyhyZWxhdGl2ZSkpIHtcbiAgICB2YXIgcmVsID0gbmV3IFVybCgpO1xuICAgIHJlbC5wYXJzZShyZWxhdGl2ZSwgZmFsc2UsIHRydWUpO1xuICAgIHJlbGF0aXZlID0gcmVsO1xuICB9XG5cbiAgdmFyIHJlc3VsdCA9IG5ldyBVcmwoKTtcbiAgdmFyIHRrZXlzID0gT2JqZWN0LmtleXModGhpcyk7XG4gIGZvciAodmFyIHRrID0gMDsgdGsgPCB0a2V5cy5sZW5ndGg7IHRrKyspIHtcbiAgICB2YXIgdGtleSA9IHRrZXlzW3RrXTtcbiAgICByZXN1bHRbdGtleV0gPSB0aGlzW3RrZXldO1xuICB9XG5cbiAgLy8gaGFzaCBpcyBhbHdheXMgb3ZlcnJpZGRlbiwgbm8gbWF0dGVyIHdoYXQuXG4gIC8vIGV2ZW4gaHJlZj1cIlwiIHdpbGwgcmVtb3ZlIGl0LlxuICByZXN1bHQuaGFzaCA9IHJlbGF0aXZlLmhhc2g7XG5cbiAgLy8gaWYgdGhlIHJlbGF0aXZlIHVybCBpcyBlbXB0eSwgdGhlbiB0aGVyZSdzIG5vdGhpbmcgbGVmdCB0byBkbyBoZXJlLlxuICBpZiAocmVsYXRpdmUuaHJlZiA9PT0gJycpIHtcbiAgICByZXN1bHQuaHJlZiA9IHJlc3VsdC5mb3JtYXQoKTtcbiAgICByZXR1cm4gcmVzdWx0O1xuICB9XG5cbiAgLy8gaHJlZnMgbGlrZSAvL2Zvby9iYXIgYWx3YXlzIGN1dCB0byB0aGUgcHJvdG9jb2wuXG4gIGlmIChyZWxhdGl2ZS5zbGFzaGVzICYmICFyZWxhdGl2ZS5wcm90b2NvbCkge1xuICAgIC8vIHRha2UgZXZlcnl0aGluZyBleGNlcHQgdGhlIHByb3RvY29sIGZyb20gcmVsYXRpdmVcbiAgICB2YXIgcmtleXMgPSBPYmplY3Qua2V5cyhyZWxhdGl2ZSk7XG4gICAgZm9yICh2YXIgcmsgPSAwOyByayA8IHJrZXlzLmxlbmd0aDsgcmsrKykge1xuICAgICAgdmFyIHJrZXkgPSBya2V5c1tya107XG4gICAgICBpZiAocmtleSAhPT0gJ3Byb3RvY29sJylcbiAgICAgICAgcmVzdWx0W3JrZXldID0gcmVsYXRpdmVbcmtleV07XG4gICAgfVxuXG4gICAgLy91cmxQYXJzZSBhcHBlbmRzIHRyYWlsaW5nIC8gdG8gdXJscyBsaWtlIGh0dHA6Ly93d3cuZXhhbXBsZS5jb21cbiAgICBpZiAoc2xhc2hlZFByb3RvY29sW3Jlc3VsdC5wcm90b2NvbF0gJiZcbiAgICAgICAgcmVzdWx0Lmhvc3RuYW1lICYmICFyZXN1bHQucGF0aG5hbWUpIHtcbiAgICAgIHJlc3VsdC5wYXRoID0gcmVzdWx0LnBhdGhuYW1lID0gJy8nO1xuICAgIH1cblxuICAgIHJlc3VsdC5ocmVmID0gcmVzdWx0LmZvcm1hdCgpO1xuICAgIHJldHVybiByZXN1bHQ7XG4gIH1cblxuICBpZiAocmVsYXRpdmUucHJvdG9jb2wgJiYgcmVsYXRpdmUucHJvdG9jb2wgIT09IHJlc3VsdC5wcm90b2NvbCkge1xuICAgIC8vIGlmIGl0J3MgYSBrbm93biB1cmwgcHJvdG9jb2wsIHRoZW4gY2hhbmdpbmdcbiAgICAvLyB0aGUgcHJvdG9jb2wgZG9lcyB3ZWlyZCB0aGluZ3NcbiAgICAvLyBmaXJzdCwgaWYgaXQncyBub3QgZmlsZTosIHRoZW4gd2UgTVVTVCBoYXZlIGEgaG9zdCxcbiAgICAvLyBhbmQgaWYgdGhlcmUgd2FzIGEgcGF0aFxuICAgIC8vIHRvIGJlZ2luIHdpdGgsIHRoZW4gd2UgTVVTVCBoYXZlIGEgcGF0aC5cbiAgICAvLyBpZiBpdCBpcyBmaWxlOiwgdGhlbiB0aGUgaG9zdCBpcyBkcm9wcGVkLFxuICAgIC8vIGJlY2F1c2UgdGhhdCdzIGtub3duIHRvIGJlIGhvc3RsZXNzLlxuICAgIC8vIGFueXRoaW5nIGVsc2UgaXMgYXNzdW1lZCB0byBiZSBhYnNvbHV0ZS5cbiAgICBpZiAoIXNsYXNoZWRQcm90b2NvbFtyZWxhdGl2ZS5wcm90b2NvbF0pIHtcbiAgICAgIHZhciBrZXlzID0gT2JqZWN0LmtleXMocmVsYXRpdmUpO1xuICAgICAgZm9yICh2YXIgdiA9IDA7IHYgPCBrZXlzLmxlbmd0aDsgdisrKSB7XG4gICAgICAgIHZhciBrID0ga2V5c1t2XTtcbiAgICAgICAgcmVzdWx0W2tdID0gcmVsYXRpdmVba107XG4gICAgICB9XG4gICAgICByZXN1bHQuaHJlZiA9IHJlc3VsdC5mb3JtYXQoKTtcbiAgICAgIHJldHVybiByZXN1bHQ7XG4gICAgfVxuXG4gICAgcmVzdWx0LnByb3RvY29sID0gcmVsYXRpdmUucHJvdG9jb2w7XG4gICAgaWYgKCFyZWxhdGl2ZS5ob3N0ICYmICFob3N0bGVzc1Byb3RvY29sW3JlbGF0aXZlLnByb3RvY29sXSkge1xuICAgICAgdmFyIHJlbFBhdGggPSAocmVsYXRpdmUucGF0aG5hbWUgfHwgJycpLnNwbGl0KCcvJyk7XG4gICAgICB3aGlsZSAocmVsUGF0aC5sZW5ndGggJiYgIShyZWxhdGl2ZS5ob3N0ID0gcmVsUGF0aC5zaGlmdCgpKSk7XG4gICAgICBpZiAoIXJlbGF0aXZlLmhvc3QpIHJlbGF0aXZlLmhvc3QgPSAnJztcbiAgICAgIGlmICghcmVsYXRpdmUuaG9zdG5hbWUpIHJlbGF0aXZlLmhvc3RuYW1lID0gJyc7XG4gICAgICBpZiAocmVsUGF0aFswXSAhPT0gJycpIHJlbFBhdGgudW5zaGlmdCgnJyk7XG4gICAgICBpZiAocmVsUGF0aC5sZW5ndGggPCAyKSByZWxQYXRoLnVuc2hpZnQoJycpO1xuICAgICAgcmVzdWx0LnBhdGhuYW1lID0gcmVsUGF0aC5qb2luKCcvJyk7XG4gICAgfSBlbHNlIHtcbiAgICAgIHJlc3VsdC5wYXRobmFtZSA9IHJlbGF0aXZlLnBhdGhuYW1lO1xuICAgIH1cbiAgICByZXN1bHQuc2VhcmNoID0gcmVsYXRpdmUuc2VhcmNoO1xuICAgIHJlc3VsdC5xdWVyeSA9IHJlbGF0aXZlLnF1ZXJ5O1xuICAgIHJlc3VsdC5ob3N0ID0gcmVsYXRpdmUuaG9zdCB8fCAnJztcbiAgICByZXN1bHQuYXV0aCA9IHJlbGF0aXZlLmF1dGg7XG4gICAgcmVzdWx0Lmhvc3RuYW1lID0gcmVsYXRpdmUuaG9zdG5hbWUgfHwgcmVsYXRpdmUuaG9zdDtcbiAgICByZXN1bHQucG9ydCA9IHJlbGF0aXZlLnBvcnQ7XG4gICAgLy8gdG8gc3VwcG9ydCBodHRwLnJlcXVlc3RcbiAgICBpZiAocmVzdWx0LnBhdGhuYW1lIHx8IHJlc3VsdC5zZWFyY2gpIHtcbiAgICAgIHZhciBwID0gcmVzdWx0LnBhdGhuYW1lIHx8ICcnO1xuICAgICAgdmFyIHMgPSByZXN1bHQuc2VhcmNoIHx8ICcnO1xuICAgICAgcmVzdWx0LnBhdGggPSBwICsgcztcbiAgICB9XG4gICAgcmVzdWx0LnNsYXNoZXMgPSByZXN1bHQuc2xhc2hlcyB8fCByZWxhdGl2ZS5zbGFzaGVzO1xuICAgIHJlc3VsdC5ocmVmID0gcmVzdWx0LmZvcm1hdCgpO1xuICAgIHJldHVybiByZXN1bHQ7XG4gIH1cblxuICB2YXIgaXNTb3VyY2VBYnMgPSAocmVzdWx0LnBhdGhuYW1lICYmIHJlc3VsdC5wYXRobmFtZS5jaGFyQXQoMCkgPT09ICcvJyksXG4gICAgICBpc1JlbEFicyA9IChcbiAgICAgICAgICByZWxhdGl2ZS5ob3N0IHx8XG4gICAgICAgICAgcmVsYXRpdmUucGF0aG5hbWUgJiYgcmVsYXRpdmUucGF0aG5hbWUuY2hhckF0KDApID09PSAnLydcbiAgICAgICksXG4gICAgICBtdXN0RW5kQWJzID0gKGlzUmVsQWJzIHx8IGlzU291cmNlQWJzIHx8XG4gICAgICAgICAgICAgICAgICAgIChyZXN1bHQuaG9zdCAmJiByZWxhdGl2ZS5wYXRobmFtZSkpLFxuICAgICAgcmVtb3ZlQWxsRG90cyA9IG11c3RFbmRBYnMsXG4gICAgICBzcmNQYXRoID0gcmVzdWx0LnBhdGhuYW1lICYmIHJlc3VsdC5wYXRobmFtZS5zcGxpdCgnLycpIHx8IFtdLFxuICAgICAgcmVsUGF0aCA9IHJlbGF0aXZlLnBhdGhuYW1lICYmIHJlbGF0aXZlLnBhdGhuYW1lLnNwbGl0KCcvJykgfHwgW10sXG4gICAgICBwc3ljaG90aWMgPSByZXN1bHQucHJvdG9jb2wgJiYgIXNsYXNoZWRQcm90b2NvbFtyZXN1bHQucHJvdG9jb2xdO1xuXG4gIC8vIGlmIHRoZSB1cmwgaXMgYSBub24tc2xhc2hlZCB1cmwsIHRoZW4gcmVsYXRpdmVcbiAgLy8gbGlua3MgbGlrZSAuLi8uLiBzaG91bGQgYmUgYWJsZVxuICAvLyB0byBjcmF3bCB1cCB0byB0aGUgaG9zdG5hbWUsIGFzIHdlbGwuICBUaGlzIGlzIHN0cmFuZ2UuXG4gIC8vIHJlc3VsdC5wcm90b2NvbCBoYXMgYWxyZWFkeSBiZWVuIHNldCBieSBub3cuXG4gIC8vIExhdGVyIG9uLCBwdXQgdGhlIGZpcnN0IHBhdGggcGFydCBpbnRvIHRoZSBob3N0IGZpZWxkLlxuICBpZiAocHN5Y2hvdGljKSB7XG4gICAgcmVzdWx0Lmhvc3RuYW1lID0gJyc7XG4gICAgcmVzdWx0LnBvcnQgPSBudWxsO1xuICAgIGlmIChyZXN1bHQuaG9zdCkge1xuICAgICAgaWYgKHNyY1BhdGhbMF0gPT09ICcnKSBzcmNQYXRoWzBdID0gcmVzdWx0Lmhvc3Q7XG4gICAgICBlbHNlIHNyY1BhdGgudW5zaGlmdChyZXN1bHQuaG9zdCk7XG4gICAgfVxuICAgIHJlc3VsdC5ob3N0ID0gJyc7XG4gICAgaWYgKHJlbGF0aXZlLnByb3RvY29sKSB7XG4gICAgICByZWxhdGl2ZS5ob3N0bmFtZSA9IG51bGw7XG4gICAgICByZWxhdGl2ZS5wb3J0ID0gbnVsbDtcbiAgICAgIGlmIChyZWxhdGl2ZS5ob3N0KSB7XG4gICAgICAgIGlmIChyZWxQYXRoWzBdID09PSAnJykgcmVsUGF0aFswXSA9IHJlbGF0aXZlLmhvc3Q7XG4gICAgICAgIGVsc2UgcmVsUGF0aC51bnNoaWZ0KHJlbGF0aXZlLmhvc3QpO1xuICAgICAgfVxuICAgICAgcmVsYXRpdmUuaG9zdCA9IG51bGw7XG4gICAgfVxuICAgIG11c3RFbmRBYnMgPSBtdXN0RW5kQWJzICYmIChyZWxQYXRoWzBdID09PSAnJyB8fCBzcmNQYXRoWzBdID09PSAnJyk7XG4gIH1cblxuICBpZiAoaXNSZWxBYnMpIHtcbiAgICAvLyBpdCdzIGFic29sdXRlLlxuICAgIHJlc3VsdC5ob3N0ID0gKHJlbGF0aXZlLmhvc3QgfHwgcmVsYXRpdmUuaG9zdCA9PT0gJycpID9cbiAgICAgICAgICAgICAgICAgIHJlbGF0aXZlLmhvc3QgOiByZXN1bHQuaG9zdDtcbiAgICByZXN1bHQuaG9zdG5hbWUgPSAocmVsYXRpdmUuaG9zdG5hbWUgfHwgcmVsYXRpdmUuaG9zdG5hbWUgPT09ICcnKSA/XG4gICAgICAgICAgICAgICAgICAgICAgcmVsYXRpdmUuaG9zdG5hbWUgOiByZXN1bHQuaG9zdG5hbWU7XG4gICAgcmVzdWx0LnNlYXJjaCA9IHJlbGF0aXZlLnNlYXJjaDtcbiAgICByZXN1bHQucXVlcnkgPSByZWxhdGl2ZS5xdWVyeTtcbiAgICBzcmNQYXRoID0gcmVsUGF0aDtcbiAgICAvLyBmYWxsIHRocm91Z2ggdG8gdGhlIGRvdC1oYW5kbGluZyBiZWxvdy5cbiAgfSBlbHNlIGlmIChyZWxQYXRoLmxlbmd0aCkge1xuICAgIC8vIGl0J3MgcmVsYXRpdmVcbiAgICAvLyB0aHJvdyBhd2F5IHRoZSBleGlzdGluZyBmaWxlLCBhbmQgdGFrZSB0aGUgbmV3IHBhdGggaW5zdGVhZC5cbiAgICBpZiAoIXNyY1BhdGgpIHNyY1BhdGggPSBbXTtcbiAgICBzcmNQYXRoLnBvcCgpO1xuICAgIHNyY1BhdGggPSBzcmNQYXRoLmNvbmNhdChyZWxQYXRoKTtcbiAgICByZXN1bHQuc2VhcmNoID0gcmVsYXRpdmUuc2VhcmNoO1xuICAgIHJlc3VsdC5xdWVyeSA9IHJlbGF0aXZlLnF1ZXJ5O1xuICB9IGVsc2UgaWYgKCF1dGlsLmlzTnVsbE9yVW5kZWZpbmVkKHJlbGF0aXZlLnNlYXJjaCkpIHtcbiAgICAvLyBqdXN0IHB1bGwgb3V0IHRoZSBzZWFyY2guXG4gICAgLy8gbGlrZSBocmVmPSc/Zm9vJy5cbiAgICAvLyBQdXQgdGhpcyBhZnRlciB0aGUgb3RoZXIgdHdvIGNhc2VzIGJlY2F1c2UgaXQgc2ltcGxpZmllcyB0aGUgYm9vbGVhbnNcbiAgICBpZiAocHN5Y2hvdGljKSB7XG4gICAgICByZXN1bHQuaG9zdG5hbWUgPSByZXN1bHQuaG9zdCA9IHNyY1BhdGguc2hpZnQoKTtcbiAgICAgIC8vb2NjYXRpb25hbHkgdGhlIGF1dGggY2FuIGdldCBzdHVjayBvbmx5IGluIGhvc3RcbiAgICAgIC8vdGhpcyBlc3BlY2lhbGx5IGhhcHBlbnMgaW4gY2FzZXMgbGlrZVxuICAgICAgLy91cmwucmVzb2x2ZU9iamVjdCgnbWFpbHRvOmxvY2FsMUBkb21haW4xJywgJ2xvY2FsMkBkb21haW4yJylcbiAgICAgIHZhciBhdXRoSW5Ib3N0ID0gcmVzdWx0Lmhvc3QgJiYgcmVzdWx0Lmhvc3QuaW5kZXhPZignQCcpID4gMCA/XG4gICAgICAgICAgICAgICAgICAgICAgIHJlc3VsdC5ob3N0LnNwbGl0KCdAJykgOiBmYWxzZTtcbiAgICAgIGlmIChhdXRoSW5Ib3N0KSB7XG4gICAgICAgIHJlc3VsdC5hdXRoID0gYXV0aEluSG9zdC5zaGlmdCgpO1xuICAgICAgICByZXN1bHQuaG9zdCA9IHJlc3VsdC5ob3N0bmFtZSA9IGF1dGhJbkhvc3Quc2hpZnQoKTtcbiAgICAgIH1cbiAgICB9XG4gICAgcmVzdWx0LnNlYXJjaCA9IHJlbGF0aXZlLnNlYXJjaDtcbiAgICByZXN1bHQucXVlcnkgPSByZWxhdGl2ZS5xdWVyeTtcbiAgICAvL3RvIHN1cHBvcnQgaHR0cC5yZXF1ZXN0XG4gICAgaWYgKCF1dGlsLmlzTnVsbChyZXN1bHQucGF0aG5hbWUpIHx8ICF1dGlsLmlzTnVsbChyZXN1bHQuc2VhcmNoKSkge1xuICAgICAgcmVzdWx0LnBhdGggPSAocmVzdWx0LnBhdGhuYW1lID8gcmVzdWx0LnBhdGhuYW1lIDogJycpICtcbiAgICAgICAgICAgICAgICAgICAgKHJlc3VsdC5zZWFyY2ggPyByZXN1bHQuc2VhcmNoIDogJycpO1xuICAgIH1cbiAgICByZXN1bHQuaHJlZiA9IHJlc3VsdC5mb3JtYXQoKTtcbiAgICByZXR1cm4gcmVzdWx0O1xuICB9XG5cbiAgaWYgKCFzcmNQYXRoLmxlbmd0aCkge1xuICAgIC8vIG5vIHBhdGggYXQgYWxsLiAgZWFzeS5cbiAgICAvLyB3ZSd2ZSBhbHJlYWR5IGhhbmRsZWQgdGhlIG90aGVyIHN0dWZmIGFib3ZlLlxuICAgIHJlc3VsdC5wYXRobmFtZSA9IG51bGw7XG4gICAgLy90byBzdXBwb3J0IGh0dHAucmVxdWVzdFxuICAgIGlmIChyZXN1bHQuc2VhcmNoKSB7XG4gICAgICByZXN1bHQucGF0aCA9ICcvJyArIHJlc3VsdC5zZWFyY2g7XG4gICAgfSBlbHNlIHtcbiAgICAgIHJlc3VsdC5wYXRoID0gbnVsbDtcbiAgICB9XG4gICAgcmVzdWx0LmhyZWYgPSByZXN1bHQuZm9ybWF0KCk7XG4gICAgcmV0dXJuIHJlc3VsdDtcbiAgfVxuXG4gIC8vIGlmIGEgdXJsIEVORHMgaW4gLiBvciAuLiwgdGhlbiBpdCBtdXN0IGdldCBhIHRyYWlsaW5nIHNsYXNoLlxuICAvLyBob3dldmVyLCBpZiBpdCBlbmRzIGluIGFueXRoaW5nIGVsc2Ugbm9uLXNsYXNoeSxcbiAgLy8gdGhlbiBpdCBtdXN0IE5PVCBnZXQgYSB0cmFpbGluZyBzbGFzaC5cbiAgdmFyIGxhc3QgPSBzcmNQYXRoLnNsaWNlKC0xKVswXTtcbiAgdmFyIGhhc1RyYWlsaW5nU2xhc2ggPSAoXG4gICAgICAocmVzdWx0Lmhvc3QgfHwgcmVsYXRpdmUuaG9zdCB8fCBzcmNQYXRoLmxlbmd0aCA+IDEpICYmXG4gICAgICAobGFzdCA9PT0gJy4nIHx8IGxhc3QgPT09ICcuLicpIHx8IGxhc3QgPT09ICcnKTtcblxuICAvLyBzdHJpcCBzaW5nbGUgZG90cywgcmVzb2x2ZSBkb3VibGUgZG90cyB0byBwYXJlbnQgZGlyXG4gIC8vIGlmIHRoZSBwYXRoIHRyaWVzIHRvIGdvIGFib3ZlIHRoZSByb290LCBgdXBgIGVuZHMgdXAgPiAwXG4gIHZhciB1cCA9IDA7XG4gIGZvciAodmFyIGkgPSBzcmNQYXRoLmxlbmd0aDsgaSA+PSAwOyBpLS0pIHtcbiAgICBsYXN0ID0gc3JjUGF0aFtpXTtcbiAgICBpZiAobGFzdCA9PT0gJy4nKSB7XG4gICAgICBzcmNQYXRoLnNwbGljZShpLCAxKTtcbiAgICB9IGVsc2UgaWYgKGxhc3QgPT09ICcuLicpIHtcbiAgICAgIHNyY1BhdGguc3BsaWNlKGksIDEpO1xuICAgICAgdXArKztcbiAgICB9IGVsc2UgaWYgKHVwKSB7XG4gICAgICBzcmNQYXRoLnNwbGljZShpLCAxKTtcbiAgICAgIHVwLS07XG4gICAgfVxuICB9XG5cbiAgLy8gaWYgdGhlIHBhdGggaXMgYWxsb3dlZCB0byBnbyBhYm92ZSB0aGUgcm9vdCwgcmVzdG9yZSBsZWFkaW5nIC4uc1xuICBpZiAoIW11c3RFbmRBYnMgJiYgIXJlbW92ZUFsbERvdHMpIHtcbiAgICBmb3IgKDsgdXAtLTsgdXApIHtcbiAgICAgIHNyY1BhdGgudW5zaGlmdCgnLi4nKTtcbiAgICB9XG4gIH1cblxuICBpZiAobXVzdEVuZEFicyAmJiBzcmNQYXRoWzBdICE9PSAnJyAmJlxuICAgICAgKCFzcmNQYXRoWzBdIHx8IHNyY1BhdGhbMF0uY2hhckF0KDApICE9PSAnLycpKSB7XG4gICAgc3JjUGF0aC51bnNoaWZ0KCcnKTtcbiAgfVxuXG4gIGlmIChoYXNUcmFpbGluZ1NsYXNoICYmIChzcmNQYXRoLmpvaW4oJy8nKS5zdWJzdHIoLTEpICE9PSAnLycpKSB7XG4gICAgc3JjUGF0aC5wdXNoKCcnKTtcbiAgfVxuXG4gIHZhciBpc0Fic29sdXRlID0gc3JjUGF0aFswXSA9PT0gJycgfHxcbiAgICAgIChzcmNQYXRoWzBdICYmIHNyY1BhdGhbMF0uY2hhckF0KDApID09PSAnLycpO1xuXG4gIC8vIHB1dCB0aGUgaG9zdCBiYWNrXG4gIGlmIChwc3ljaG90aWMpIHtcbiAgICByZXN1bHQuaG9zdG5hbWUgPSByZXN1bHQuaG9zdCA9IGlzQWJzb2x1dGUgPyAnJyA6XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBzcmNQYXRoLmxlbmd0aCA/IHNyY1BhdGguc2hpZnQoKSA6ICcnO1xuICAgIC8vb2NjYXRpb25hbHkgdGhlIGF1dGggY2FuIGdldCBzdHVjayBvbmx5IGluIGhvc3RcbiAgICAvL3RoaXMgZXNwZWNpYWxseSBoYXBwZW5zIGluIGNhc2VzIGxpa2VcbiAgICAvL3VybC5yZXNvbHZlT2JqZWN0KCdtYWlsdG86bG9jYWwxQGRvbWFpbjEnLCAnbG9jYWwyQGRvbWFpbjInKVxuICAgIHZhciBhdXRoSW5Ib3N0ID0gcmVzdWx0Lmhvc3QgJiYgcmVzdWx0Lmhvc3QuaW5kZXhPZignQCcpID4gMCA/XG4gICAgICAgICAgICAgICAgICAgICByZXN1bHQuaG9zdC5zcGxpdCgnQCcpIDogZmFsc2U7XG4gICAgaWYgKGF1dGhJbkhvc3QpIHtcbiAgICAgIHJlc3VsdC5hdXRoID0gYXV0aEluSG9zdC5zaGlmdCgpO1xuICAgICAgcmVzdWx0Lmhvc3QgPSByZXN1bHQuaG9zdG5hbWUgPSBhdXRoSW5Ib3N0LnNoaWZ0KCk7XG4gICAgfVxuICB9XG5cbiAgbXVzdEVuZEFicyA9IG11c3RFbmRBYnMgfHwgKHJlc3VsdC5ob3N0ICYmIHNyY1BhdGgubGVuZ3RoKTtcblxuICBpZiAobXVzdEVuZEFicyAmJiAhaXNBYnNvbHV0ZSkge1xuICAgIHNyY1BhdGgudW5zaGlmdCgnJyk7XG4gIH1cblxuICBpZiAoIXNyY1BhdGgubGVuZ3RoKSB7XG4gICAgcmVzdWx0LnBhdGhuYW1lID0gbnVsbDtcbiAgICByZXN1bHQucGF0aCA9IG51bGw7XG4gIH0gZWxzZSB7XG4gICAgcmVzdWx0LnBhdGhuYW1lID0gc3JjUGF0aC5qb2luKCcvJyk7XG4gIH1cblxuICAvL3RvIHN1cHBvcnQgcmVxdWVzdC5odHRwXG4gIGlmICghdXRpbC5pc051bGwocmVzdWx0LnBhdGhuYW1lKSB8fCAhdXRpbC5pc051bGwocmVzdWx0LnNlYXJjaCkpIHtcbiAgICByZXN1bHQucGF0aCA9IChyZXN1bHQucGF0aG5hbWUgPyByZXN1bHQucGF0aG5hbWUgOiAnJykgK1xuICAgICAgICAgICAgICAgICAgKHJlc3VsdC5zZWFyY2ggPyByZXN1bHQuc2VhcmNoIDogJycpO1xuICB9XG4gIHJlc3VsdC5hdXRoID0gcmVsYXRpdmUuYXV0aCB8fCByZXN1bHQuYXV0aDtcbiAgcmVzdWx0LnNsYXNoZXMgPSByZXN1bHQuc2xhc2hlcyB8fCByZWxhdGl2ZS5zbGFzaGVzO1xuICByZXN1bHQuaHJlZiA9IHJlc3VsdC5mb3JtYXQoKTtcbiAgcmV0dXJuIHJlc3VsdDtcbn07XG5cblVybC5wcm90b3R5cGUucGFyc2VIb3N0ID0gZnVuY3Rpb24oKSB7XG4gIHZhciBob3N0ID0gdGhpcy5ob3N0O1xuICB2YXIgcG9ydCA9IHBvcnRQYXR0ZXJuLmV4ZWMoaG9zdCk7XG4gIGlmIChwb3J0KSB7XG4gICAgcG9ydCA9IHBvcnRbMF07XG4gICAgaWYgKHBvcnQgIT09ICc6Jykge1xuICAgICAgdGhpcy5wb3J0ID0gcG9ydC5zdWJzdHIoMSk7XG4gICAgfVxuICAgIGhvc3QgPSBob3N0LnN1YnN0cigwLCBob3N0Lmxlbmd0aCAtIHBvcnQubGVuZ3RoKTtcbiAgfVxuICBpZiAoaG9zdCkgdGhpcy5ob3N0bmFtZSA9IGhvc3Q7XG59O1xuIiwiJ3VzZSBzdHJpY3QnO1xuXG5tb2R1bGUuZXhwb3J0cyA9IHtcbiAgaXNTdHJpbmc6IGZ1bmN0aW9uKGFyZykge1xuICAgIHJldHVybiB0eXBlb2YoYXJnKSA9PT0gJ3N0cmluZyc7XG4gIH0sXG4gIGlzT2JqZWN0OiBmdW5jdGlvbihhcmcpIHtcbiAgICByZXR1cm4gdHlwZW9mKGFyZykgPT09ICdvYmplY3QnICYmIGFyZyAhPT0gbnVsbDtcbiAgfSxcbiAgaXNOdWxsOiBmdW5jdGlvbihhcmcpIHtcbiAgICByZXR1cm4gYXJnID09PSBudWxsO1xuICB9LFxuICBpc051bGxPclVuZGVmaW5lZDogZnVuY3Rpb24oYXJnKSB7XG4gICAgcmV0dXJuIGFyZyA9PSBudWxsO1xuICB9XG59O1xuIiwibW9kdWxlLmV4cG9ydHMgPSBleHRlbmRcblxudmFyIGhhc093blByb3BlcnR5ID0gT2JqZWN0LnByb3RvdHlwZS5oYXNPd25Qcm9wZXJ0eTtcblxuZnVuY3Rpb24gZXh0ZW5kKCkge1xuICAgIHZhciB0YXJnZXQgPSB7fVxuXG4gICAgZm9yICh2YXIgaSA9IDA7IGkgPCBhcmd1bWVudHMubGVuZ3RoOyBpKyspIHtcbiAgICAgICAgdmFyIHNvdXJjZSA9IGFyZ3VtZW50c1tpXVxuXG4gICAgICAgIGZvciAodmFyIGtleSBpbiBzb3VyY2UpIHtcbiAgICAgICAgICAgIGlmIChoYXNPd25Qcm9wZXJ0eS5jYWxsKHNvdXJjZSwga2V5KSkge1xuICAgICAgICAgICAgICAgIHRhcmdldFtrZXldID0gc291cmNlW2tleV1cbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgIH1cblxuICAgIHJldHVybiB0YXJnZXRcbn1cbiJdfQ==
