import _ from 'lodash'

const levels = {
  Normal: 1,
  Manager: 10,
  Admin: 100,
}

levels.is = function is(ctx, level) {
  if (!_.isInteger(level)) throw new Error('AccessLevelDenied')
  if (!ctx.state.user || !ctx.state.user.level) return false
  if (ctx.state.user.level !== level) return false
  return true
}

levels.atLeast = function atLeast(ctx, level) {
  if (!_.isInteger(level)) throw new Error('AccessLevelDenied')
  if (!ctx.state.user || !ctx.state.user.level) return false
  if (ctx.state.user.level < level) return false
  return true
}

levels.ensure = function ensure(ctx, level) {
  if (!levels.atLeast(ctx, level)) {
    throw new Error('AccessLevelDenied')
  }
}

export default levels
