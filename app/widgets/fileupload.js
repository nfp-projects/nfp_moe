const m = require('mithril')
const { uploadMedia } = require('../api/media')

const FileUpload = {
  uploadFile(vnode, event) {
    if (!event.target.files[0]) return
    vnode.state.loading = true

    uploadMedia(event.target.files[0])
    .then(function(res) {
      vnode.state.media = res
      console.log(vnode.state.media)
    })
    .catch(function(err) {
      console.log(err)
    })
    .then(function() {
      vnode.state.loading = false
      m.redraw()
    })
  },

  oninit: function(vnode) {
    vnode.state.loading = false
    vnode.state.media = null
    vnode.state.error = ''
  },

  view: function(vnode) {
    let media = vnode.state.media

    return m('fileupload', [
      (media ?
        m('a.display', {
            href: media.large_url,
            style: {
              'background-image': 'url(' + media.medium_url + ')',
            }
          }) :
        m('div.showicon')
      ),
      m('input', {
        accept: 'image/*',
        type: 'file',
        onchange: FileUpload.uploadFile.bind(this, vnode),
      }),
      (vnode.state.loading ? m('div.loading-spinner') : null),
    ])
  }
}

module.exports = FileUpload
