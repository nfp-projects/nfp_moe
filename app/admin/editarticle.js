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
      if (this.lastid === 'add') {
        m.redraw()
      }
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
    this.loadedFroala = Froala.loadedFroala

    if (this.lastid !== 'add') {
      Article.getArticle(this.lastid)
      .then(function(result) {
        vnode.state.editedPath = true
        vnode.state.article = result
        document.title = 'Editing: ' + result.name + ' - Admin NFP Moe'
      })
      .catch(function(err) {
        vnode.state.error = err.message
      })
      .then(function() {
        vnode.state.loading = false
        if (vnode.state.froala) {
          vnode.state.froala.html.set(vnode.state.article.description)
        }
        m.redraw()
      })
    } else {
      document.title = 'Create Article - Admin NFP Moe'
      if (vnode.state.froala) {
        vnode.state.froala.html.set(this.article.description)
      }
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
              height: 300,
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
