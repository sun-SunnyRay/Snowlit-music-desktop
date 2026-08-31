const loadLocalOrigin = () => {
  try {
    // Local file is gitignored. Missing on a clean clone.
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const local = require('./config.local') as { SNOWLIT_ACCOUNT_ORIGIN?: string }
    return String(local.SNOWLIT_ACCOUNT_ORIGIN || '')
  } catch {
    return ''
  }
}

export const SNOWLIT_ACCOUNT_ORIGIN = loadLocalOrigin()
export const SNOWLIT_OTP_ORIGIN = SNOWLIT_ACCOUNT_ORIGIN

export const SNOWLIT_OTP_SEND_PATH = '/v1/otp/send'
export const SNOWLIT_AUTH_VERIFY_PATH = '/v1/auth/verify'
export const SNOWLIT_AUTH_ME_PATH = '/v1/auth/me'
export const SNOWLIT_LISTS_PATH = '/v1/lists'

export const SNOWLIT_ACCOUNT_TIMEOUT_MS = 15000
export const SNOWLIT_LISTS_TIMEOUT_MS = 30000
export const SNOWLIT_CODE_WAIT_SEC = 60
