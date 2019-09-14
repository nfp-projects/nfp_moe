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

    let smallPath = await this.resize.createSmall(result.path)
    let mediumPath = await this.resize.createMedium(result.path)

    let token = this.jwt.signDirect({ site: config.get('upload:name') }, config.get('upload:secret'))

    let [large, small, medium] = await Promise.all([
      this.uploadFile(token, result.path),
      this.uploadFile(token, smallPath),
      this.uploadFile(token, mediumPath),
    ])

    ctx.body = await this.Media.create({
      filename: result.originalname,
      filetype: result.mimetype,
      small_image: small.path,
      medium_image: medium.path,
      large_image: large.path,
      size: result.size,
      staff_id: ctx.state.user.id,
    })
  }

  async getAllMedia(ctx) {
    ctx.body = await this.Media.getAll(ctx)
  }

  async removeMedia(ctx) {
    let media = await this.Media.getSingle(ctx.params.id)
    
    media.set({
      is_deleted: true,
    })

    await media.save()

    ctx.status = 200
  }
}
