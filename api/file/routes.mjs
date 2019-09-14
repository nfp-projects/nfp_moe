import { readFile } from 'fs'
import parseTorrent from 'parse-torrent'

import config from '../config.mjs'
import File from './model.mjs'
import * as multer from '../multer.mjs'
import { uploadFile } from '../media/upload.mjs'
import Jwt from '../jwt.mjs'

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
    let meta = {}

    if (result.originalname.endsWith('.torrent')) {
      let fileContent = await new Promise((res, rej) => {
        readFile(result.path, (err, data) => {
          if (err) return rej(err)
          res(data)
        })
      })
      let torrent = parseTorrent(fileContent)
      meta = {
        torrent: {
          name: torrent.name,
          announce: torrent.announce,
          hash: torrent.infoHash,
          files: torrent.files.map(file => ({ name: file.name, size: file.length })),
        },
      }
    }

    let file = await this.uploadFile(token, result.path)
    ctx.body = await this.File.create({
      filename: result.originalname,
      filetype: result.mimetype,
      path: file.path,
      article_id: ctx.params.articleId,
      size: result.size,
      staff_id: ctx.state.user.id,
      meta: meta,
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
