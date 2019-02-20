/* eslint max-len: 0 */
import Router from 'koa-router'

import access from './access'
import AuthRoutes from './authentication/routes'
import MediaRoutes from './media/routes'
import { restrict } from './access/middleware'

const router = new Router()

// API Authentication
const authentication = new AuthRoutes()
router.post('/api/login', authentication.login.bind(authentication))

// API Media
const media = new MediaRoutes()
router.post('/api/media', restrict(access.Manager), media.upload.bind(media))

export default router
