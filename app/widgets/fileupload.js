const { uploadMedia } = require('../api/media')

const FileUpload = {
  uploadFile(vnode, event) {
    if (!event.target.files[0]) return
    vnode.state.updateError(vnode, '')
    vnode.state.loading = true

    uploadMedia(event.target.files[0])
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
