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
    ctx.body = await this.Staff.getAll(ctx, null, [])
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

    let staff = await this.Staff.updateSingle(ctx, ctx.params.id, ctx.request.body)

    ctx.body = staff
  }

  /** DELETE: /api/staff/:id */
  async removeStaff(ctx) {
    await this.Staff.updateSingle(ctx, ctx.params.id, { is_deleted: true })

    ctx.status = 204
  }
}
