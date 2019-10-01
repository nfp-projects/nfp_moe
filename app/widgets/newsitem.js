const Fileinfo = require('./fileinfo')

const Newsitem = {
  view: function(vnode) {
    var pixelRatio = window.devicePixelRatio || 1
    return m('newsitem', [
      m(m.route.Link,
        { href: '/article/' + vnode.attrs.path, class: 'title' },
        m('h3', [vnode.attrs.name])
      ),
      m('div.newsitemcontent', [
        vnode.attrs.media
          ? m('a.cover', {
              href: '/article/' + vnode.attrs.path,
            }, m('img', { alt: 'Image for news item ' + vnode.attrs.name, src: pixelRatio > 1 ? vnode.attrs.media.medium_url : vnode.attrs.media.small_url }))
          : null,
        m('div.entrycontent', {
          class: vnode.attrs.media ? '' : 'extrapadding',
        }, [
          (vnode.attrs.description
              ? m('.fr-view', m.trust(vnode.attrs.description))
              : null),
          (vnode.attrs.files && vnode.attrs.files.length
            ? vnode.attrs.files.map(function(file) {
                return m(Fileinfo, { file: file })
              })
            : null),
          m('span.entrymeta', 'Posted ' + vnode.attrs.created_at.replace('T', ' ').split('.')[0]),
        ]),
      ]),
    ])
  },
}

module.exports = Newsitem
