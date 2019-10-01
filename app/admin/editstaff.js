const Staff = require('../api/staff')

const EditStaff = {
  oninit: function(vnode) {
    this.fetchStaff(vnode)
  },

  onupdate: function(vnode) {
    if (this.lastid !== m.route.param('id')) {
      this.fetchStaff(vnode)
    }
  },

  fetchStaff: function(vnode) {
    this.lastid = m.route.param('id')
    this.loading = this.lastid !== 'add'
    this.creating = this.lastid === 'add'
    this.error = ''
    this.staff = {
      fullname: '',
      email: '',
      password: '',
      level: 10,
    }

    if (this.lastid !== 'add') {
      Staff.getStaff(this.lastid)
      .then(function(result) {
        vnode.state.editedPath = true
        vnode.state.staff = result
        document.title = 'Editing: ' + result.fullname + ' - Admin NFP Moe'
      })
      .catch(function(err) {
        vnode.state.error = err.message
      })
      .then(function() {
        vnode.state.loading = false
        m.redraw()
      })
    } else {
      document.title = 'Creating Staff Member - Admin NFP Moe'
    }
  },

  updateValue: function(fullname, e) {
    this.staff[fullname] = e.currentTarget.value
  },

  save: function(vnode, e) {
    e.preventDefault()
    if (!this.staff.fullname) {
      this.error = 'Fullname is missing'
    } else if (!this.staff.email) {
      this.error = 'Email is missing'
    } else {
      this.error = ''
    }
    if (this.error) return

    this.staff.description = vnode.state.froala && vnode.state.froala.html.get() || this.staff.description

    this.loading = true

    let promise

    if (this.staff.id) {
      promise = Staff.updateStaff(this.staff.id, {
        fullname: this.staff.fullname,
        email: this.staff.email,
        level: this.staff.level,
        password: this.staff.password,
      })
    } else {
      promise = Staff.createStaff({
        fullname: this.staff.fullname,
        email: this.staff.email,
        level: this.staff.level,
        password: this.staff.password,
      })
    }

    promise.then(function(res) {
      m.route.set('/admin/staff')
    })
    .catch(function(err) {
      vnode.state.error = err.message
    })
    .then(function() {
      vnode.state.loading = false
      m.redraw()
    })
  },

  updateLevel: function(e) {
    this.staff.level = Number(e.currentTarget.value)
  },

  view: function(vnode) {
    const levels = [[10, 'Manager'], [100, 'Admin']]
    return (
      this.loading ?
        m('div.loading-spinner')
      : m('div.admin-wrapper', [
          m('div.admin-actions', this.staff.id
            ? [
              m('span', 'Actions:'),
              m(m.route.Link, { href: '/admin/staff' }, 'Staff list'),
            ]
            : null),
          m('article.editstaff', [
            m('header', m('h1', this.creating ? 'Create Staff' : 'Edit ' + (this.staff.fullname || '(untitled)'))),
            m('div.error', {
              hidden: !this.error,
              onclick: function() { vnode.state.error = '' },
            }, this.error),
            m('form.editstaff.content', {
              onsubmit: this.save.bind(this, vnode),
            }, [
              m('label', 'Level'),
              m('select', {
                onchange: this.updateLevel.bind(this),
              }, levels.map(function(level) { return m('option', { value: level[0], selected: level[0] === vnode.state.staff.level }, level[1]) })),
              m('label', 'Fullname'),
              m('input', {
                type: 'text',
                value: this.staff.fullname,
                oninput: this.updateValue.bind(this, 'fullname'),
              }),
              m('label', 'Email'),
              m('input', {
                type: 'text',
                value: this.staff.email,
                oninput: this.updateValue.bind(this, 'email'),
              }),
              m('label', 'Password (optional)'),
              m('input', {
                type: 'text',
                value: this.staff.password,
                oninput: this.updateValue.bind(this, 'password'),
              }),
              m('input', {
                type: 'submit',
                value: 'Save',
              }),
            ]),
          ]),
        ])
    )
  },
}

module.exports = EditStaff
