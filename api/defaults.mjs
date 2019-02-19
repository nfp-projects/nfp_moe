
// taken from isobject npm library
function isObject(val) {
  return val != null && typeof val === 'object' && Array.isArray(val) === false
}

export default function defaults(options, def) {
  let out = { }

  if (options) {
    Object.keys(options || {}).forEach(key => {
      out[key] = options[key]

      if (Array.isArray(out[key])) {
        out[key] = out[key].map(item => {
          if (isObject(item)) return defaults(item)
          return item
        })
      } else if (out[key] && typeof out[key] === 'object') {
        out[key] = defaults(options[key], def && def[key])
      }
    })
  }

  if (def) {
    Object.keys(def).forEach(function(key) {
      if (typeof out[key] === 'undefined') {
        out[key] = def[key]
      }
    })
  }

  return out
}
