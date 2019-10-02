import sharp from 'sharp'
import Media from './model.mjs'

export default class Resizer {
  constructor(opts = {}) {
    Object.assign(this, {
      Media: opts.Media || Media,
      sharp: opts.sharp || sharp,
    })
  }

  createSmall(input) {
    let output = this.Media.getSubUrl(input, 'small')

    return this.sharp(input)
            .resize(360, 360, {
              fit: sharp.fit.inside,
              withoutEnlargement: true,
            })
            .jpeg({
              quality: 90,
            })
            .toFile(output)
            .then(() => output)
  }

  createMedium(input, height) {
    let output = this.Media.getSubUrl(input, 'medium')

    return this.sharp(input)
            .resize(700, height || 700, {
              fit: height && sharp.fit.cover || sharp.fit.inside,
              withoutEnlargement: true,
            })
            .jpeg({
              quality: 90,
            })
            .toFile(output)
            .then(() => output)
  }

  createLarge(input) {
    let output = this.Media.getSubUrl(input, 'large')

    return this.sharp(input)
            .resize(1280, 1280, {
              fit: sharp.fit.inside,
              withoutEnlargement: true,
            })
            .jpeg({
              quality: 90,
            })
            .toFile(output)
            .then(() => output)
  }

  autoRotate(input) {
    const output = `${input}_2.jpg`

    return this.sharp(input)
            .rotate()
            .toFile(output)
            .then(() => output)
  }
}
