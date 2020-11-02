import axios from 'axios'
jest.mock('axios')

import SchoologyAPI from './index'

const TEST_KEY = 'TEST_KEY'
const TEST_SECRET = 'TEST_SECRET'

describe('SchoologyAPI', () => {
  afterEach(() => {
    jest.clearAllMocks()
  })

  test('getAuthHeaderComponents', async () => {
    const api = new SchoologyAPI(TEST_KEY, TEST_SECRET)

    const headers = api.getAuthHeaderComponents()

    expect(headers.oauth_consumer_key).toEqual(TEST_KEY)
  })

  test('getRequestToken', async () => {
    const api = new SchoologyAPI(TEST_KEY, TEST_SECRET)

    axios.mockImplementationOnce(() => Promise.resolve({ data: 'token=🔑' }))

    await expect(api.getRequestToken()).resolves.toEqual({ token: '🔑' })

    expect(axios).toHaveBeenCalledWith(
      expect.objectContaining({
        method: 'get',
        url: 'https://api.schoology.com/v1/oauth/request_token',
        headers: expect.objectContaining({
          Authorization: expect.stringContaining(TEST_KEY),
        }),
      })
    )
  })

  test('detect test schoology', async () => {
    const api = new SchoologyAPI(TEST_KEY, TEST_SECRET, 'https://districtABC.schoologytest.com')

    axios.mockImplementationOnce(() => Promise.resolve('ok'))

    await api.getRequestToken()

    expect(axios).toHaveBeenCalledWith(
      expect.objectContaining({
        method: 'get',
        url: 'https://api.schoologytest.com/v1/oauth/request_token',
        headers: expect.objectContaining({
          Authorization: expect.stringContaining(TEST_KEY),
        }),
      })
    )
  })
})
