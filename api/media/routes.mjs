import config from '../config.mjs'
import Media from './model.mjs'
import * as multer from '../multer.mjs'
import Resizer from './resize.mjs'
import { uploadFile } from './upload.mjs'
import Jwt from '../jwt.mjs'

export default class MediaRoutes {
  constructor(opts = {}) {
    Object.assign(this, {
      Media: opts.Media || Media,
      multer: opts.multer || multer,
      resize: opts.resize || new Resizer(),
      jwt: opts.jwt || new Jwt(),
      uploadFile: opts.uploadFile || uploadFile,
    })
  }

  async upload(ctx) {
    let result = await this.multer.processBody(ctx)

    let height = null
    if (ctx.query.height) {
      height = Number(ctx.query.height)
    }

    let smallPath = await this.resize.createSmall(result.path)
    let mediumPath = await this.resize.createMedium(result.path, height)
    let largePath = await this.resize.createLarge(result.path)
    let smallPathAvif = await this.resize.createSmall(result.path, 'avif')
    let mediumPathAvif = await this.resize.createMedium(result.path, height, 'avif')
    let largePathAvif = await this.resize.createLarge(result.path, 'avif')

    let token = this.jwt.signDirect({ site: config.get('upload:name') }, config.get('upload:secret'))

    let [org, small, medium, large, smallAvif, mediumAvif, largeAvif] = await Promise.all([
      this.uploadFile(token, result.path),
      this.uploadFile(token, smallPath),
      this.uploadFile(token, mediumPath),
      this.uploadFile(token, largePath),
      this.uploadFile(token, smallPathAvif),
      this.uploadFile(token, mediumPathAvif),
      this.uploadFile(token, largePathAvif),
    ])

    ctx.body = await this.Media.create({
      filename: result.originalname,
      filetype: result.mimetype,
      small_image: small.path,
      medium_image: medium.path,
      large_image: large.path,
      small_image_avif: smallAvif.path,
      medium_image_avif: mediumAvif.path,
      large_image_avif: largeAvif.path,
      org_image: org.path,
      size: result.size,
      staff_id: ctx.state.user.id,
    })
  }

  async getAllMedia(ctx) {
    ctx.body = await this.Media.getAll(ctx)
  }

  async removeMedia(ctx) {
    await this.Media.updateSingle(ctx, ctx.params.id, { is_deleted: true })

    ctx.status = 200
  }
}
