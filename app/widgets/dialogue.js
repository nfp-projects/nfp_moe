const m = require('mithril')

const Dialogue = {
  view: function(vnode) {
    return m('div.floating-container', {
        hidden: vnode.attrs.hidden,
      }, m('dialogue', [
          m('h2', vnode.attrs.title),
          m('p', vnode.attrs.message),
          m('div.buttons', [
            m('button', { class: vnode.attrs.yesclass || '', onclick: vnode.attrs.onyes }, vnode.attrs.yes),
            m('button', { class: vnode.attrs.noclass || '', onclick: vnode.attrs.onno }, vnode.attrs.no),
          ])
        ])
      )
  },
}

module.exports = Dialogue
