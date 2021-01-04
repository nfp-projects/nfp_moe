import sharp from 'sharp'
import Media from './model.mjs'

export default class Resizer {
  constructor(opts = {}) {
    Object.assign(this, {
      Media: opts.Media || Media,
      sharp: opts.sharp || sharp,
    })
  }

  createSmall(input, format = 'jpg') {
    let output = this.Media.getSubUrl(input, 'small', format === 'avif' ? 'avif' : 'jpg')

    let sized = this.sharp(input)
      .resize(500, 500, {
        fit: sharp.fit.inside,
        withoutEnlargement: true,
      })
    
    if (format === 'avif') {
      return sized
        .avif({
          quality: 80,
          speed: 5,
        })
        .toFile(output)
        .then(() => output)
    } else {
      return sized
        .jpeg({
          quality: 93,
        })
        .toFile(output)
        .then(() => output)
    }
  }

  createMedium(input, height, format = 'jpg') {
    let output = this.Media.getSubUrl(input, 'medium', format === 'avif' ? 'avif' : 'jpg')

    let sized = this.sharp(input)
      .resize(800, height || 800, {
        fit: height && sharp.fit.cover || sharp.fit.inside,
        withoutEnlargement: true,
      })
    
    if (format === 'avif') {
      return sized
        .avif({
          quality: 80,
          speed: 5,
        })
        .toFile(output)
        .then(() => output)
    } else {
      return sized
        .jpeg({
          quality: 93,
        })
        .toFile(output)
        .then(() => output)
    }
  }

  createLarge(input, format = 'jpg') {
    let output = this.Media.getSubUrl(input, 'large', format === 'avif' ? 'avif' : 'jpg')

    let sized = this.sharp(input)
      .resize(1280, 1280, {
        fit: sharp.fit.inside,
        withoutEnlargement: true,
      })
    
    if (format === 'avif') {
      return sized
        .avif({
          quality: 85,
          speed: 5,
        })
        .toFile(output)
        .then(() => output)
    } else {
      return sized
        .jpeg({
          quality: 93,
        })
        .toFile(output)
        .then(() => output)
    }
  }

  autoRotate(input) {
    const output = `${input}_2.jpg`

    return this.sharp(input)
            .rotate()
            .toFile(output)
            .then(() => output)
  }
}
