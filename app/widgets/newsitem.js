const Fileinfo = require('./fileinfo')

const Newsitem = {
  oninit: function(vnode) {
    if (vnode.attrs.media) {
      this.srcsetJpeg = vnode.attrs.media.small_url + ' 500w, '
                      + vnode.attrs.media.medium_url + ' 800w '
      if (vnode.attrs.media.small_url_avif) {
        this.srcsetAvif = vnode.attrs.media.small_url_avif + ' 500w, '
                        + vnode.attrs.media.medium_url_avif + ' 800w '
      } else {
        this.srcsetAvif = null
      }
      this.coverSizes = '(max-width: 639px) calc(100vw - 40px), '
                      + '(max-width: 1000px) 300px, '
                      + '400px'
    }
  },

  view: function(vnode) {
    return m('newsitem', [
      m(m.route.Link,
        { href: '/article/' + vnode.attrs.path, class: 'title' },
        m('h3', [vnode.attrs.name])
      ),
      m('div.newsitemcontent', [
        vnode.attrs.media
          ? m(m.route.Link, {
                class: 'cover',
                href: '/article/' + vnode.attrs.path,
              },
              m('picture', [
                this.srcsetAvif ? m('source', {
                  srcset: this.srcsetAvif,
                  sizes: this.coverSizes,
                  type: 'image/avif',
                }) : null,
                m('img', {
                  srcset: this.srcsetJpeg,
                  sizes: this.coverSizes,
                  alt: 'Image for news item ' + vnode.attrs.name,
                  src: vnode.attrs.media.small_url }),
              ])
            )
          : null,
        m('div.entrycontent', {
          class: vnode.attrs.media ? '' : 'extrapadding',
        }, [
          (vnode.attrs.description
              ? m('.fr-view', m.trust(vnode.attrs.description))
              : null),
          (vnode.attrs.files && vnode.attrs.files.length
            ? vnode.attrs.files.map(function(file) {
                return m(Fileinfo, { file: file, trim: true })
              })
            : null),
          m('span.entrymeta', [
            'Posted ',
            (vnode.attrs.parent ? 'in' : ''),
            (vnode.attrs.parent ? m(m.route.Link, { href: '/page/' + vnode.attrs.parent.path }, vnode.attrs.parent.name) : null),
            'at ' + (vnode.attrs.published_at.replace('T', ' ').split('.')[0]).substr(0, 16),
            ' by ' + (vnode.attrs.staff && vnode.attrs.staff.fullname || 'Admin'),
          ]),
        ]),
      ]),
    ])
  },
}

module.exports = Newsitem
