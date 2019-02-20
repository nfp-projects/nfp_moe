import http from 'http'
import path from 'path'
import fs from 'fs'

let stub

export function uploadFile(token, file) {
  // For testing
  if (stub) return stub(token, file)

  return new Promise((resolve, reject) => {
    fs.readFile(file, (err, data) => {
      if (err) return reject(err)

      const crlf = '\r\n'
      const filename = path.basename(file)
      const boundary = `--${Math.random().toString(16)}`
      const headers = [
        `Content-Disposition: form-data; name="file"; filename="${filename}"` + crlf,
      ]
      const multipartBody = Buffer.concat([
        new Buffer(
          `${crlf}--${boundary}${crlf}` +
          headers.join('') + crlf
        ),
        data,
        new Buffer(
          `${crlf}--${boundary}--`
        ),
      ])

      const options = {
        port: 2111,
        hostname: 'storage01.nfp.is',
        method: 'POST',
        path: '/media?token=' + token,
        headers: {
          'Content-Type': 'multipart/form-data; boundary=' + boundary,
          'Content-Length': multipartBody.length,
        },
      }

      const req = http.request(options)

      req.write(multipartBody)
      req.end()

      req.on('error', reject)

      req.on('response', res => {
        res.setEncoding('utf8')
        let output = ''

        res.on('data', function (chunk) {
          output += chunk.toString()
        })

        res.on('end', function () {
          try {
            output = JSON.parse(output)
          } catch (e) {
            // Do nothing
          }
          resolve(output)
        })
      })
    })
  })
}

export function overrideStub(newStub) {
  stub = newStub
}
