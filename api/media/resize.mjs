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
              quality: 80,
            })
            .toFile(output)
            .then(() => output)
  }

  createMedium(input) {
    let output = this.Media.getSubUrl(input, 'medium')

    return this.sharp(input)
            .resize(700, 700, {
              fit: sharp.fit.inside,
              withoutEnlargement: true,
            })
            .jpeg({
              quality: 80,
            })
            .toFile(output)
            .then(() => output)
  }

  createLarge(input) {
    let output = this.Media.getSubUrl(input, 'large')

    return this.sharp(input)
            .jpeg({
              quality: 80,
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
