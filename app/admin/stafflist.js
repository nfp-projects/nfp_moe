const { getAllStaff, removeStaff } = require('../api/staff')
const Dialogue = require('../widgets/dialogue')
const Pages = require('../widgets/pages')

const AdminStaffList = {
  oninit: function(vnode) {
    this.error = ''
    this.lastpage = m.route.param('page') || '1'
    this.staff = []
    this.removeStaff = null

    this.fetchStaffs(vnode)
  },

  fetchStaffs: function(vnode) {
    this.loading = true

    return getAllStaff()
    .then(function(result) {
      vnode.state.staff = result
    })
    .catch(function(err) {
      vnode.state.error = err.message
    })
    .then(function() {
      vnode.state.loading = false
      m.redraw()
    })
  },

  confirmRemoveStaff: function(vnode) {
    let removingStaff = this.removeStaff
    this.removeStaff = null
    this.loading = true
    removeStaff(removingStaff.id)
      .then(this.oninit.bind(this, vnode))
      .catch(function(err) {
        vnode.state.error = err.message
        vnode.state.loading = false
        m.redraw()
      })
  },

  getLevel: function(level) {
    if (level === 100) {
      return 'Admin'
    }
    return 'Manager'
  },

  view: function(vnode) {
    return [
      m('div.admin-wrapper', [
        m('div.admin-actions', [
            m('span', 'Actions:'),
            m(m.route.Link, { href: '/admin/staff/add' }, 'Create new staff'),
          ]),
        m('article.editarticle', [
          m('header', m('h1', 'All staff')),
          m('div.error', {
            hidden: !this.error,
            onclick: function() { vnode.state.error = '' },
          }, this.error),
          (this.loading
            ? m('div.loading-spinner.full')
            : m('table', [
                m('thead', 
                  m('tr', [
                    m('th', 'Fullname'),
                    m('th', 'Email'),
                    m('th', 'Level'),
                    m('th.right', 'Updated'),
                    m('th.right', 'Actions'),
                  ])
                ),
                m('tbody', this.staff.map(function(item) {
                  return m('tr', [
                    m('td', m(m.route.Link, { href: '/admin/staff/' + item.id }, item.fullname)),
                    m('td', item.email),
                    m('td.right', AdminStaffList.getLevel(item.level)),
                    m('td.right', (item.updated_at || '---').replace('T', ' ').split('.')[0]),
                    m('td.right', m('button', { onclick: function() { vnode.state.removeStaff = item } }, 'Remove')),
                  ])
                })),
              ])
          ),
          m(Pages, {
            base: '/admin/staff',
            links: this.links,
          }),
        ]),
      ]),
      m(Dialogue, {
        hidden: vnode.state.removeStaff === null,
        title: 'Delete ' + (vnode.state.removeStaff ? vnode.state.removeStaff.name : ''),
        message: 'Are you sure you want to remove "' + (vnode.state.removeStaff ? vnode.state.removeStaff.fullname : '') + '" (' + (vnode.state.removeStaff ? vnode.state.removeStaff.email : '') + ')',
        yes: 'Remove',
        yesclass: 'alert',
        no: 'Cancel',
        noclass: 'cancel',
        onyes: this.confirmRemoveStaff.bind(this, vnode),
        onno: function() { vnode.state.removeStaff = null },
      }),
    ]
  },
}

module.exports = AdminStaffList
