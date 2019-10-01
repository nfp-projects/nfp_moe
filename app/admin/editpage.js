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
        document.title = 'Editing: ' + result.name + ' - Admin NFP Moe'
      })
      .catch(function(err) {
        vnode.state.error = err.message
      })
      .then(function() {
        vnode.state.loading = false
        m.redraw()
      })
    } else {
      document.title = 'Create Page - Admin NFP Moe'
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
