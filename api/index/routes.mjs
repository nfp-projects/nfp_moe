export default class IndexRoutes {
  constructor(opts = {}) {
    this.indexBody = ''
  }

  async sendIndex(ctx) {
    ctx.body = this.indexBody
  }
}
