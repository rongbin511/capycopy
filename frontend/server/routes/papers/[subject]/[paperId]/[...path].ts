import { proxyRequest } from 'h3'
import { isPaperAssetPath } from '~/utils/paperPaths'

/** Proxy paper images/PDFs to the Python API in production/preview. */
export default defineEventHandler(async (event) => {
  const path = event.path || ''
  if (!isPaperAssetPath(path)) {
    throw createError({ statusCode: 404, statusMessage: 'Not Found' })
  }
  const config = useRuntimeConfig()
  const base = config.apiProxyTarget || 'http://127.0.0.1:8000'
  return proxyRequest(event, `${base}${path}`)
})
