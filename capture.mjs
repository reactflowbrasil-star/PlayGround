import { createRequire } from 'node:module'
import { mkdirSync, readFileSync, statSync } from 'node:fs'
import { join } from 'node:path'

const url = process.env.CAPTURE_URL
const output = process.env.CAPTURE_DIR
if (!url || !output) {
  console.error('Set CAPTURE_URL and CAPTURE_DIR.')
  process.exit(1)
}
mkdirSync(output, { recursive: true })

const playwrightHome = join(process.env.HOME, '.local/share/omgithub-playwright')
const require = createRequire(join(playwrightHome, 'package.json'))
const { chromium } = require('playwright')

const runtimeScripts = join(process.env.RUNTIME_DIR || '/home/runner/work/_temp/omgithub-runtime', 'scripts')
try {
  const captures = require(join(runtimeScripts, 'wip-screenshots.cjs'))
  captures.instrument({ chromium })
} catch {}

const configName = process.platform === 'darwin' ? 'metal.json' : 'linux.json'
const config = JSON.parse(readFileSync(join(playwrightHome, configName), 'utf8'))
if (process.platform === 'linux') {
  process.env.DISPLAY ||= ':' + readFileSync(join(playwrightHome, 'display'), 'utf8').trim()
}

const transient = error => {
  const wrapped = error instanceof Error ? error : new Error(String(error))
  wrapped.exitCode = 75
  return wrapped
}

const views = [
  { name: 'desktop', width: 1440, height: 900, mobile: false },
  { name: 'mobile', width: 390, height: 844, mobile: true }
]

let browser
try {
  browser = await chromium.launch({ ...config.browser.launchOptions, timeout: 30000 }).catch(transient)
  for (const view of views) {
    const started = Date.now()
    const context = await browser.newContext({
      viewport: { width: view.width, height: view.height },
      deviceScaleFactor: 1,
      isMobile: view.mobile,
      hasTouch: view.mobile
    }).catch(transient)
    let page
    try {
      page = await context.newPage().catch(transient)
      page.setDefaultTimeout(30000)
      const pageErrors = []
      page.on('pageerror', error => pageErrors.push(error.message))

      let response
      try {
        response = await page.goto(url, { waitUntil: 'load', timeout: 45000 })
      } catch (error) {
        throw transient(error)
      }
      if (!response) throw transient(new Error('No navigation response.'))
      if (!response.ok()) {
        const status = response.status()
        const error = new Error(`HTTP ${status} loading ${url}`)
        error.exitCode = [408, 429, 500, 502, 503, 504].includes(status) ? 75 : 1
        throw error
      }

      try {
        await page.waitForFunction(() => {
          const canvas = document.getElementById('game')
          const play = document.getElementById('playBtn')
          return Boolean(
            canvas &&
            canvas.width > 0 &&
            canvas.height > 0 &&
            play &&
            document.getElementById('score')?.textContent?.trim() &&
            document.fonts.status === 'loaded'
          )
        }, null, { timeout: 15000 })
      } catch (error) {
        throw new Error(`App did not initialize: ${error.message}`)
      }

      try {
        await page.waitForTimeout(600)
        await page.evaluate(() => document.getElementById('playBtn').click())
        await page.waitForFunction(
          () => document.getElementById('overlay')?.classList.contains('hidden'),
          null,
          { timeout: 5000 }
        )
      } catch (error) {
        throw new Error(`App did not start: ${error.message}`)
      }
      await page.waitForTimeout(1200)

      const metrics = await page.evaluate(() => {
        const canvas = document.getElementById('game')
        if (!canvas) return { ok: false, reason: 'canvas missing' }
        const context2d = canvas.getContext('2d')
        const width = canvas.width
        const height = canvas.height
        if (!width || !height) return { ok: false, reason: 'canvas has no size' }
        const pixels = context2d.getImageData(0, 0, width, height).data
        const total = width * height
        const step = Math.max(1, Math.floor(total / 16000))
        let lit = 0
        let samples = 0
        for (let pixel = 0; pixel < total; pixel += step) {
          const index = pixel * 4
          if (pixels[index] + pixels[index + 1] + pixels[index + 2] > 55) lit += 1
          samples += 1
        }
        return {
          ok: true,
          width,
          height,
          lit,
          samples,
          score: document.getElementById('score')?.textContent?.trim(),
          level: document.getElementById('level')?.textContent?.trim()
        }
      })

      if (!metrics.ok) throw new Error(`Rendering defect: ${metrics.reason}`)
      if (metrics.lit < Math.max(12, metrics.samples * 0.003)) {
        throw new Error(`Rendering defect: canvas looks blank (${metrics.lit}/${metrics.samples} lit samples)`)
      }

      const statsVisible = await page.locator('.topbar').isVisible()
      const statsText = await page.locator('.topbar').innerText()
      if (!statsVisible || !/pontos/i.test(statsText) || !/recorde/i.test(statsText) || !/n[íi]vel/i.test(statsText)) {
        throw new Error('Rendering defect: HUD is missing or incomplete')
      }
      const lifeCount = await page.locator('#lives .life').count()
      if (!lifeCount) throw new Error('Rendering defect: lives indicator is missing')
      if (!/^\d+$/.test(metrics.score || '') || !/^\d+$/.test(metrics.level || '')) {
        throw new Error('Rendering defect: score or level is not initialized')
      }
      if (pageErrors.length) {
        throw new Error(`Page error: ${pageErrors.join(' | ')}`)
      }

      const file = join(output, `final-${view.name}.png`)
      try {
        await page.screenshot({ path: file, timeout: 30000 })
      } catch (error) {
        throw transient(error)
      }
      const bytes = statSync(file).size
      if (!bytes) throw new Error(`Rendering defect: empty screenshot ${file}`)
      console.log(`Captured ${view.name} (${metrics.width}x${metrics.height}, ${metrics.lit}/${metrics.samples} lit samples, ${bytes} bytes) in ${Date.now() - started}ms`)
    } finally {
      await page?.close().catch(() => {})
      await context.close().catch(() => {})
    }
  }
} catch (error) {
  console.error(error)
  process.exitCode = error.exitCode || 1
} finally {
  await browser?.close().catch(error => {
    console.error(error)
    process.exitCode ||= 75
  })
}
