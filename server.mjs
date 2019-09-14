import Koa from 'koa'
import bodyParser from 'koa-bodyparser'
import cors from '@koa/cors'

import config from './api/config.mjs'
import router from './api/router.mjs'
import Jwt from './api/jwt.mjs'
import log from './api/log.mjs'
import { serve } from './api/serve.mjs'
import { mask } from './api/middlewares/mask.mjs'
import { errorHandler } from './api/error/middleware.mjs'
import { accessChecks } from './api/access/middleware.mjs'
import ParserMiddleware from './api/parser/middleware.mjs'

const app = new Koa()
const parser = new ParserMiddleware()

app.use(log.logMiddleware())
app.use(errorHandler())
app.use(mask())
app.use(bodyParser())
app.use(parser.contextParser())
app.use(accessChecks())
app.use(parser.generateLinks())
app.use(Jwt.jwtMiddleware())
app.use(cors({
  exposeHeaders: ['link', 'pagination_total'],
  credentials: true,
}))
app.use(router.routes())
app.use(router.allowedMethods())
app.use(serve('./public', '/public'))

const server = app.listen(
  config.get('server:port'),
  () => log.info(`Server running on port ${config.get('server:port')}`)
)

export default server
