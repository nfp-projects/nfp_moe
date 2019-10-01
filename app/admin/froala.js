const Froala = {
  files: [
    { type: 'css', url: 'https://cdn.jsdelivr.net/npm/froala-editor@3.0.4/css/froala_editor.pkgd.min.css' },
    { type: 'css', url: 'https://cdn.jsdelivr.net/npm/froala-editor@3.0.4/css/themes/gray.min.css' },
    { type: 'js', url: 'https://cdn.jsdelivr.net/npm/froala-editor@3.0.4/js/froala_editor.pkgd.min.js' },
  ],
  loadedFiles: 0,
  loadedFroala: false,

  checkLoadedAll: function(res) {
    if (Froala.loadedFiles < Froala.files.length) {
      return
    }
    Froala.loadedFroala = true
    res()
  },

  createFroalaScript: function() {
    if (Froala.loadedFroala) return Promise.resolve()
    return new Promise(function(res) {
      let onload = function() {
        Froala.loadedFiles++
        Froala.checkLoadedAll(res)
      }
      let head = document.getElementsByTagName('head')[0]

      for (var i = 0; i < Froala.files.length; i++) {
        let element
        if (Froala.files[i].type === 'css') {
          element = document.createElement('link')
          element.setAttribute('rel', 'stylesheet')
          element.setAttribute('type', 'text/css')
          element.setAttribute('href', Froala.files[i].url)
        } else {
          element = document.createElement('script')
          element.setAttribute('type', 'text/javascript')
          element.setAttribute('src', Froala.files[i].url)
        }
        element.onload = onload
        head.insertBefore(element, head.firstChild)
      }
    })
  },
}

module.exports = Froala
