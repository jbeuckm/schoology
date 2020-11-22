import axios, { Method, AxiosResponse } from 'axios'
const crypto = require('crypto')
import { parse, stringify } from 'query-string'

const DEFAULT_SITE_BASE = 'https://www.schoology.com'
const SCHOOLOGY_API_HOST = 'https://api.schoology.com'
const SCHOOLOGYTEST_API_HOST = 'https://api.schoologytest.com'
const REALM_PARAM = { 'OAuth realm': 'Schoology API' }

type Token = {
  oauth_token: string
  oauth_token_secret: string
}
type SIGNATURE_METHOD = 'HMAC-SHA1' | 'PLAINTEXT'

const headerFormat = (components: Record<string, string | number>) => {
  const parts: string[] = []
  Object.keys(components).forEach(key => parts.push(key + '="' + components[key] + '"'))
  return parts.join(',')
}

const baseStringFormat = (components: Record<string, string | number>) => {
  const parts: string[] = []
  Object.keys(components).forEach(key => parts.push(key + '=' + components[key]))
  return parts.join('&')
}

class SchoologyAPI {
  client_key: string
  client_secret: string
  site_base: string
  api_base: string
  oauth_token: string
  oauth_token_secret: string

  constructor(
    client_key: string,
    client_secret: string,
    site_base: string = DEFAULT_SITE_BASE,
    api_host: string = null
  ) {
    this.client_key = client_key
    this.client_secret = client_secret
    this.site_base = site_base

    const isTestSite = site_base.indexOf('schoologytest') !== -1

    const _api_host = api_host || (isTestSite ? SCHOOLOGYTEST_API_HOST : SCHOOLOGY_API_HOST)
    this.api_base = `${_api_host}/v1`
  }

  getAuthHeaderComponents = (
    signatureMethod: SIGNATURE_METHOD = 'PLAINTEXT',
    token: string = ''
  ) => {
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

  getSignedAuthHeader = (method: string, url: string) => {
    const authHeaderComponents = this.getAuthHeaderComponents('HMAC-SHA1', this.oauth_token)

    const baseString = [method.toUpperCase(), url, baseStringFormat(authHeaderComponents)]
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

  setToken = (token: Token) => {
    this.oauth_token = token.oauth_token
    this.oauth_token_secret = token.oauth_token_secret
  }

  getRequestToken = () => {
    const Authorization = this.getUnsignedAuthHeader()

    return axios({
      headers: { Authorization },
      method: 'get',
      url: this.api_base + '/oauth/request_token',
    }).then((response: AxiosResponse) => {
      const token = parse(response.data)

      this.setToken(token as Token)

      return token
    })
  }

  getConnectURL = (returnUrl: string) => {
    return `${this.site_base}/oauth/authorize?oauth_token=${this.oauth_token}&return_url=${returnUrl}`
  }

  downloadFile = (url: string) => {
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

  makeRequest = (method: Method, path: string, data?: any) => {
    const url = this.api_base + path

    const authHeader = this.getPlaintextAuthHeader()

    return axios({
      headers: {
        Authorization: authHeader,
      },
      method,
      url,
      data,
    }).then((response: AxiosResponse) => response.data)
  }

  getAccessToken = (requestToken?: Token) => {
    requestToken && this.setToken(requestToken)

    return this.makeRequest('get', '/oauth/access_token').then((response: string) => {
      const token = parse(response)

      this.setToken(token as Token)

      return token
    })
  }

  getUserInfo = (accessToken?: Token) => {
    accessToken && this.setToken(accessToken)

    return this.makeRequest('get', '/app-user-info')
  }
}

export default SchoologyAPI
