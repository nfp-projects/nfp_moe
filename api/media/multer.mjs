import multer from 'multer'

const storage = multer.diskStorage({
  filename: (req, file, cb) => cb(null, file.originalname),
})
const upload = multer({ storage: storage })

export function processBody(ctx) {
  return new Promise((res, rej) => {
    upload.single('file')(ctx.req, ctx.res, (err) => {
        if (err) return rej(err)
        return res(ctx.req.file)
      })
  })
}
