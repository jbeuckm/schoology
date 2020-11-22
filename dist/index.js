"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const axios_1 = __importDefault(require("axios"));
const crypto = require('crypto');
const query_string_1 = require("query-string");
const DEFAULT_SITE_BASE = 'https://www.schoology.com';
const SCHOOLOGY_API_HOST = 'https://api.schoology.com';
const SCHOOLOGYTEST_API_HOST = 'https://api.schoologytest.com';
const REALM_PARAM = { 'OAuth realm': 'Schoology API' };
const headerFormat = components => {
    const parts = [];
    Object.keys(components).forEach(key => parts.push(key + '="' + components[key] + '"'));
    return parts.join(',');
};
const baseStringFormat = (components, joinChar = ',') => {
    const parts = [];
    Object.keys(components).forEach(key => parts.push(key + '=' + components[key]));
    return parts.join('&');
};
class SchoologyAPI {
    constructor(client_key, client_secret, site_base = DEFAULT_SITE_BASE, api_host = null) {
        this.getAuthHeaderComponents = (signatureMethod = 'PLAINTEXT', token = '') => {
            const nonce = crypto.randomBytes(16).toString('base64');
            const timestamp = Math.round(new Date().getTime() / 1000);
            return {
                oauth_consumer_key: this.client_key,
                oauth_nonce: nonce,
                oauth_signature_method: signatureMethod,
                oauth_timestamp: timestamp,
                oauth_token: token,
                oauth_version: '1.0',
            };
        };
        this.getUnsignedAuthHeader = () => headerFormat(Object.assign(Object.assign(Object.assign({}, REALM_PARAM), this.getAuthHeaderComponents()), { oauth_signature: this.client_secret + '%26' }));
        this.getPlaintextAuthHeader = () => {
            const authHeaderComponents = this.getAuthHeaderComponents('PLAINTEXT', this.oauth_token);
            const key = [this.client_secret, this.oauth_token_secret].join('&');
            return headerFormat(Object.assign(Object.assign(Object.assign({}, REALM_PARAM), authHeaderComponents), { oauth_signature: key }));
        };
        this.getSignedAuthHeader = (method, url) => {
            const authHeaderComponents = this.getAuthHeaderComponents('HMAC-SHA1', this.oauth_token);
            const baseString = [method.toUpperCase(), url, baseStringFormat(authHeaderComponents, '&')]
                .map(encodeURIComponent)
                .join('&');
            const key = [this.client_secret, this.oauth_token_secret].join('&');
            const signature = crypto
                .createHmac('sha1', key)
                .update(baseString)
                .digest('base64');
            return headerFormat(Object.assign(Object.assign(Object.assign({}, REALM_PARAM), authHeaderComponents), { oauth_signature: signature }));
        };
        this.setToken = token => {
            this.oauth_token = token.oauth_token;
            this.oauth_token_secret = token.oauth_token_secret;
        };
        this.getRequestToken = () => {
            const Authorization = this.getUnsignedAuthHeader();
            return axios_1.default({
                headers: { Authorization },
                method: 'get',
                url: this.api_base + '/oauth/request_token',
            }).then(response => {
                const token = query_string_1.parse(response.data);
                this.setToken(token);
                return token;
            });
        };
        this.getConnectURL = returnUrl => {
            return `${this.site_base}/oauth/authorize?oauth_token=${this.oauth_token}&return_url=${returnUrl}`;
        };
        this.downloadFile = url => {
            const authHeader = this.getPlaintextAuthHeader();
            return axios_1.default({
                method: 'get',
                headers: {
                    Authorization: authHeader,
                },
                url,
                responseType: 'stream',
            });
        };
        this.makeRequest = (method, path, data) => {
            const url = this.api_base + path;
            const authHeader = this.getPlaintextAuthHeader();
            return axios_1.default({
                headers: {
                    Authorization: authHeader,
                },
                method,
                url,
                data,
            }).then(response => response.data);
        };
        this.getAccessToken = requestToken => {
            requestToken && this.setToken(requestToken);
            return this.makeRequest('get', '/oauth/access_token').then(response => {
                const token = query_string_1.parse(response);
                this.setToken(token);
                return token;
            });
        };
        this.getUserInfo = accessToken => {
            accessToken && this.setToken(accessToken);
            return this.makeRequest('get', '/app-user-info');
        };
        this.client_key = client_key;
        this.client_secret = client_secret;
        this.site_base = site_base;
        const isTestSite = site_base.indexOf('schoologytest') !== -1;
        const _api_host = api_host || (isTestSite ? SCHOOLOGYTEST_API_HOST : SCHOOLOGY_API_HOST);
        this.api_base = `${_api_host}/v1`;
    }
}
exports.default = SchoologyAPI;
//# sourceMappingURL=index.js.map