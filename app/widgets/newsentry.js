const Fileinfo = require('./fileinfo')

const Newsentry = {
  strip: function(html) {
   var doc = new DOMParser().parseFromString(html, 'text/html')
   var out = doc.body.textContent || ''
   var splitted = out.split('.')
   if (splitted.length > 2) {
    return splitted.slice(0, 2).join('.') + '...'
   }
   return out
  },

  view: function(vnode) {
    var deviceWidth = window.innerWidth
    var pixelRatio = window.devicePixelRatio || 1
    var imagePath = ''

    if (vnode.attrs.media) {
      if (deviceWidth > 440 || pixelRatio <= 1) {
        imagePath = vnode.attrs.media.small_url
      } else {
        imagePath = vnode.attrs.media.medium_url
      }
    }
    return m('newsentry', [
      imagePath
        ? m('a.cover', {
            href: '/article/' + vnode.attrs.path,
          }, m('img', { src: imagePath, alt: 'Article image for ' + vnode.attrs.name }))
        : m('a.cover.nobg'),
      m('div.entrycontent', [
        m('div.title', [
          m(m.route.Link,
            { href: '/article/' + vnode.attrs.path },
            m('h3', [vnode.attrs.name])
          ),
        ]),
        (vnode.attrs.files && vnode.attrs.files.length
          ? vnode.attrs.files.map(function(file) {
              return m(Fileinfo, { file: file, slim: true })
            })
          : vnode.attrs.description
            ? m('span.entrydescription', Newsentry.strip(vnode.attrs.description))
            : null),
      ]),
    ])
  },
}

module.exports = Newsentry
