const m = require('mithril')

const Login = {
  oninit: function(vnode) {
    vnode.state.media = null
    vnode.state.error = ''
  },

  view: function(vnode) {
    let media = vnode.state.media

    return m('fileupload', [
      (media ?
        m('a', {
            href: media.large_url,
            style: {
              'background-image': 'url(' + media.medium_url + ')',
            }
          }) :
        m('div.empty')
      ),
    ])
  }
}

module.exports = Login
