const m = require('mithril')

const Newsentry = {
  view: function(vnode) {
    return m('newsentry', [
      vnode.attrs.media
        ? m('a.cover', {
            href: vnode.attrs.media.large_url,
          }, m('img', { src: vnode.attrs.media.small_url }))
        : m('a.cover.nobg'),
      m('div.entrycontent', [
        m(m.route.Link,
          { href: '/article/' + vnode.attrs.path },
          m('h3', vnode.attrs.name)
        ),
        m('div.entrymeta', 'Posted ' + vnode.attrs.created_at.replace('T', ' ').split('.')[0])
      ])
    ])
  },
}

module.exports = Newsentry
