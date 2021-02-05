import Koa from 'koa-lite'
import bodyParser from 'koa-bodyparser'
import cors from '@koa/cors'

import config from './config.mjs'
import router from './router.mjs'
import Jwt from './jwt.mjs'
import log from './log.mjs'
import { serve } from './serve.mjs'
import { mask } from './middlewares/mask.mjs'
import { errorHandler } from './error/middleware.mjs'
import { accessChecks } from './access/middleware.mjs'
import ParserMiddleware from './parser/middleware.mjs'

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
