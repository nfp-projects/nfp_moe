const m = require('mithril')

const Pages = {
  oninit: function(vnode) {
    this.onpage = vnode.attrs.onpage || function() {}
  },

  view: function(vnode) {
    if (!vnode.attrs.links) return null
    return m('pages', [
      vnode.attrs.links.first
        ? m(m.route.Link, {
            href: vnode.attrs.base + '?page=' + vnode.attrs.links.first.page,
            onclick: function() { vnode.state.onpage(vnode.attrs.links.first.page) },
          }, 'First')
        : m('div'),
      vnode.attrs.links.previous
        ? m(m.route.Link, {
            href: vnode.attrs.base + '?page=' + vnode.attrs.links.previous.page,
            onclick: function() { vnode.state.onpage(vnode.attrs.links.previous.page) },
          }, vnode.attrs.links.previous.title)
        : m('div'),
      m('div', vnode.attrs.links.current && vnode.attrs.links.current.title || 'Current page'),
      vnode.attrs.links.next
        ? m(m.route.Link, {
            href: vnode.attrs.base + '?page=' + vnode.attrs.links.next.page,
            onclick: function() { vnode.state.onpage(vnode.attrs.links.next.page) },
          }, vnode.attrs.links.next.title)
        : m('div'),
      vnode.attrs.links.last
        ? m(m.route.Link, {
            href: vnode.attrs.base + '?page=' + vnode.attrs.links.last.page,
            onclick: function() { vnode.state.onpage(vnode.attrs.links.last.page) },
          }, 'Last')
        : m('div'),
    ])
  },
}

module.exports = Pages
