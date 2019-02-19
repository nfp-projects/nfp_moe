import Koa from 'koa'
import bodyParser from 'koa-bodyparser'
import cors from '@koa/cors'

import config from './api/config'
import router from './api/router'
import Jwt from './api/jwt'
import log from './api/log'
import { serve } from './api/serve'
import { errorHandler } from './api/error/middleware'
import { accessChecks } from './api/access/middleware'
import ParserMiddleware from './api/parser/middleware'

const app = new Koa()
const parser = new ParserMiddleware()

app.use(errorHandler())
app.use(bodyParser())
app.use(parser.contextParser())
app.use(accessChecks())
app.use(parser.generateLinks())
app.use(log.logMiddleware())
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
