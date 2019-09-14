const m = require('mithril')

const Fileinfo = {
  getPrefix(vnode) {
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

  getTitle(vnode) {
    if (vnode.attrs.file.meta.torrent) {
      return vnode.attrs.file.meta.torrent.name
    }
    return vnode.attrs.file.filename
  },

  getDownloadName(vnode) {
    if (vnode.attrs.file.meta.torrent) {
      return 'Torrent'
    }
    return 'Download'
  },

  getSize(orgSize) {
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
