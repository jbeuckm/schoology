import axios from 'axios'
const crypto = require('crypto')
import { parse, stringify } from 'query-string'

const DEFAULT_SITE_BASE = 'https://www.schoology.com'
const SCHOOLOGY_API_BASE = 'https://api.schoology.com/v1'
const REALM_PARAM = { 'OAuth realm': 'Schoology API' }

const headerFormat = components => {
  const parts = []
  Object.keys(components).forEach(key => parts.push(key + '="' + components[key] + '"'))
  return parts.join(',')
}

const baseStringFormat = (components, joinChar = ',') => {
  const parts = []
  Object.keys(components).forEach(key => parts.push(key + '=' + components[key]))
  return parts.join('&')
}

class SchoologyAPI {
  constructor(client_key, client_secret, site_base = DEFAULT_SITE_BASE) {
    this.client_key = client_key
    this.client_secret = client_secret
    this.site_base = site_base
    this.api_base = SCHOOLOGY_API_BASE
  }

  getAuthHeaderComponents = (signatureMethod = 'PLAINTEXT', token = '') => {
    const nonce = crypto.randomBytes(16).toString('base64')
    const timestamp = Math.round(new Date().getTime() / 1000)

    return {
      oauth_consumer_key: this.client_key,
      oauth_nonce: nonce,
      oauth_signature_method: signatureMethod,
      oauth_timestamp: timestamp,
      oauth_token: token,
      oauth_version: '1.0',
    }
  }

  getUnsignedAuthHeader = () =>
    headerFormat({
      ...REALM_PARAM,
      ...this.getAuthHeaderComponents(),
      oauth_signature: this.client_secret + '%26',
    })

  getPlaintextAuthHeader = () => {
    const authHeaderComponents = this.getAuthHeaderComponents('PLAINTEXT', this.oauth_token)

    const key = [this.client_secret, this.oauth_token_secret].join('&')

    return headerFormat({
      ...REALM_PARAM,
      ...authHeaderComponents,
      oauth_signature: key,
    })
  }

  getSignedAuthHeader = (method, url) => {
    const authHeaderComponents = this.getAuthHeaderComponents('HMAC-SHA1', this.oauth_token)

    const baseString = [method.toUpperCase(), url, baseStringFormat(authHeaderComponents, '&')]
      .map(encodeURIComponent)
      .join('&')

    const key = [this.client_secret, this.oauth_token_secret].join('&')

    const signature = crypto
      .createHmac('sha1', key)
      .update(baseString)
      .digest('base64')

    return headerFormat({
      ...REALM_PARAM,
      ...authHeaderComponents,
      oauth_signature: signature,
    })
  }

  setToken = token => {
    this.oauth_token = token.oauth_token
    this.oauth_token_secret = token.oauth_token_secret
  }

  getRequestToken = () => {
    const Authorization = this.getUnsignedAuthHeader()

    return axios({
      headers: { Authorization },
      method: 'get',
      url: this.api_base + '/oauth/request_token',
    }).then(response => {
      const token = parse(response.data)

      this.setToken(token)

      return token
    })
  }

  getConnectURL = returnUrl => {
    return `${this.site_base}/oauth/authorize?oauth_token=${this.oauth_token}&return_url=${returnUrl}`
  }

  downloadFile = url => {
    const authHeader = this.getPlaintextAuthHeader()

    return axios({
      method: 'get',
      headers: {
        Authorization: authHeader,
      },
      url,
      responseType: 'stream',
    })
  }

  makeRequest = (method, path, data) => {
    const url = this.api_base + path

    const authHeader = this.getPlaintextAuthHeader()

    return axios({
      headers: {
        Authorization: authHeader,
      },
      method,
      url,
      data,
    }).then(response => response.data)
  }

  getAccessToken = requestToken => {
    requestToken && this.setToken(requestToken)

    return this.makeRequest('get', '/oauth/access_token').then(data => parse(data))
  }

  getUserInfo = accessToken => {
    accessToken && this.setToken(accessToken)

    return this.makeRequest('get', '/app-user-info')
  }
}

export default SchoologyAPI
