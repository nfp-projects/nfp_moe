import config from '../config'
import File from './model'
import * as multer from '../multer'
import { uploadFile } from '../media/upload'
import Jwt from '../jwt'

export default class FileRoutes {
  constructor(opts = {}) {
    Object.assign(this, {
      File: opts.File || File,
      multer: opts.multer || multer,
      jwt: opts.jwt || new Jwt(),
      uploadFile: opts.uploadFile || uploadFile,
    })
  }

  async upload(ctx) {
    let result = await this.multer.processBody(ctx)

    let token = this.jwt.signDirect({ site: config.get('upload:name') }, config.get('upload:secret'))

    return ctx.throw(422, 'Unable to process for now')

    let file = await this.uploadFile(token, result.path)
    ctx.body = await this.File.create({
      filename: result.originalname,
      filetype: result.mimetype,
      article_id: ctx.params.articleId,
      size: result.size,
      staff_id: ctx.state.user.id,
    })
  }

  async getAllFiles(ctx) {
    ctx.body = await this.File.getAll(ctx)
  }

  async removeFile(ctx) {
    let file = await this.File.getSingle(ctx.params.id)
    
    file.set({
      is_deleted: true,
    })

    await file.save()

    ctx.status = 200
  }
}
