import Staff from './model.mjs'
import * as security from './security.mjs'

export default class StaffRoutes {
  constructor(opts = {}) {
    Object.assign(this, {
      Staff: opts.Staff || Staff,
      security: opts.security || security,
    })
  }

  /** GET: /api/staff */
  async getAllStaff(ctx) {
    ctx.body = await this.Staff.getAll(ctx, { }, [])
  }

  /** GET: /api/staff/:id */
  async getSingleStaff(ctx) {
    ctx.body = await this.Staff.getSingle(ctx.params.id, [], true, ctx)
  }

  /** POST: /api/staff */
  async createStaff(ctx) {
    await this.security.validUpdate(ctx)

    ctx.body = await this.Staff.create(ctx.request.body)
  }

  /** PUT: /api/staff/:id */
  async updateStaff(ctx) {
    await this.security.validUpdate(ctx)

    let page = await this.Staff.getSingle(ctx.params.id)

    page.set(ctx.request.body)

    await page.save()

    ctx.body = page
  }

  /** DELETE: /api/staff/:id */
  async removeStaff(ctx) {
    let page = await this.Staff.getSingle(ctx.params.id)

    page.set({ is_deleted: true })

    await page.save()

    ctx.status = 204
  }
}
