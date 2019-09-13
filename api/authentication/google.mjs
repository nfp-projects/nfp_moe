import google from 'googleapis'
import googleauth from 'google-auth-library'
import config from '../config'

const oauth2Client = new googleauth.OAuth2Client(config.get('googleid'))

// This is hard to have always running as it requires a
// test access token which always expire.

/* istanbul ignore next */
export function getProfile(token) {
  return oauth2Client.getTokenInfo(token)
}
 