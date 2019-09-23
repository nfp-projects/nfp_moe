const storageName = 'darkmode'

const Darkmode = {
  darkIsOn: false,

  setDarkMode: function(setOn) {
    if (setOn) {
      localStorage.setItem(storageName, true)
      document.body.className = 'darkmodeon'
      Darkmode.darkIsOn = true
    } else {
      localStorage.removeItem(storageName)
      document.body.className = ''
      Darkmode.darkIsOn = false
    }
  },

  isOn: function() {
    return Darkmode.darkIsOn
  },
}

Darkmode.darkIsOn = localStorage.getItem(storageName)

module.exports = Darkmode
