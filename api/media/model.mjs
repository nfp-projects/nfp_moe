import path from 'path'
import bookshelf from '../bookshelf.mjs'
import config from '../config.mjs'

/*

Media model:
{
  filename,
  filetype,
  small_image,
  medium_image,
  large_image,
  *small_url,
  *medium_url,
  *large_url,
  size,
  staff_id,
  is_deleted,
  created_at,
  updated_at,
}

*/

const Media = bookshelf.createModel({
  tableName: 'media',

  virtuals: {
    small_url() {
      return `${Media.baseUrl}${this.get('small_image')}`
    },

    medium_url() {
      return `${Media.baseUrl}${this.get('medium_image')}`
    },

    large_url() {
      return `${Media.baseUrl}${this.get('large_image')}`
    },

    small_url_avif() {
      if (!this.get('small_image_avif')) return null
      return `${Media.baseUrl}${this.get('small_image_avif')}`
    },

    medium_url_avif() {
      if (!this.get('small_image_avif')) return null
      return `${Media.baseUrl}${this.get('medium_image_avif')}`
    },

    large_url_avif() {
      if (!this.get('small_image_avif')) return null
      return `${Media.baseUrl}${this.get('large_image_avif')}`
    },

    link() {
      return `${Media.baseUrl}${this.get('org_image')}`
    },

    url() {
      return `${Media.baseUrl}${this.get('medium_image')}`
    },

    thumb() {
      return `${Media.baseUrl}${this.get('small_image')}`
    },
  },
}, {
  baseUrl: config.get('upload:baseurl'),

  getSubUrl(input, size, type = 'jpg') {
    if (!input) return input

    let output = input
    if (path.extname(input)) {
      let ext = path.extname(input).toLowerCase()
      output = input.slice(0, -ext.length)
    }
    return `${output}.${size}.${type}`
  },
})

export default Media
