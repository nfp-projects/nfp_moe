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
    return m('newsentry', [
      vnode.attrs.media
        ? m('a.cover', {
            href: '/article/' + vnode.attrs.path,
          }, m('img', { src: vnode.attrs.media.small_url, alt: 'Article image for ' + vnode.attrs.name }))
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
        m('span.entrymeta', 'Posted ' + vnode.attrs.created_at.replace('T', ' ').split('.')[0]),
      ]),
    ])
  },
}

module.exports = Newsentry
