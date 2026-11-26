import { spawn } from 'node:child_process'
import { mkdtemp, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

const CHROME =
  process.env.CHROME_BIN ?? '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'
const PORT = 9333

const [url, out = 'screenshot.png', width = '390', height = '844'] = process.argv.slice(2)

if (!url) {
  console.error('usage: node scripts/screenshot.mjs <url> [out] [width] [height]')
  process.exit(1)
}

const profile = await mkdtemp(join(tmpdir(), 'rd-chrome-'))
const chrome = spawn(
  CHROME,
  [
    '--headless=new',
    '--disable-gpu',
    '--hide-scrollbars',
    `--remote-debugging-port=${PORT}`,
    `--user-data-dir=${profile}`,
    'about:blank',
  ],
  { stdio: 'ignore' },
)

async function devtools(path, init) {
  for (let attempt = 0; attempt < 60; attempt += 1) {
    try {
      const response = await fetch(`http://127.0.0.1:${PORT}${path}`, init)
      if (response.ok) return response
    } catch {
      // Chrome is still starting.
    }
    await new Promise((resolve) => setTimeout(resolve, 100))
  }
  throw new Error('Chrome DevTools did not start')
}

function connection(wsUrl) {
  const socket = new WebSocket(wsUrl)
  let nextId = 1
  const pending = new Map()

  socket.addEventListener('message', (event) => {
    const message = JSON.parse(event.data)
    if (message.id && pending.has(message.id)) {
      const { resolve, reject } = pending.get(message.id)
      pending.delete(message.id)
      message.error ? reject(new Error(message.error.message)) : resolve(message.result)
    }
  })

  const ready = new Promise((resolve, reject) => {
    socket.addEventListener('open', resolve, { once: true })
    socket.addEventListener('error', reject, { once: true })
  })

  return {
    ready,
    send(method, params = {}) {
      return new Promise((resolve, reject) => {
        const id = nextId
        nextId += 1
        pending.set(id, { resolve, reject })
        socket.send(JSON.stringify({ id, method, params }))
      })
    },
    close() {
      socket.close()
    },
  }
}

try {
  await devtools('/json/version')
  const page = await (await devtools('/json/new?about:blank', { method: 'PUT' })).json()
  const cdp = connection(page.webSocketDebuggerUrl)
  await cdp.ready

  await cdp.send('Page.enable')
  await cdp.send('Emulation.setDeviceMetricsOverride', {
    width: Number(width),
    height: Number(height),
    deviceScaleFactor: 2,
    mobile: true,
  })
  await cdp.send('Emulation.setTouchEmulationEnabled', { enabled: true })

  await cdp.send('Page.navigate', { url })
  await new Promise((resolve) => setTimeout(resolve, 1500))

  if (process.env.OFFLINE === '1') {
    await cdp.send('Runtime.enable')
    await cdp.send('Runtime.evaluate', {
      expression: 'navigator.serviceWorker.ready.then(() => true)',
      awaitPromise: true,
      timeout: 15000,
    })
    await cdp.send('Page.reload')
    await new Promise((resolve) => setTimeout(resolve, 1200))
    await cdp.send('Network.enable')
    await cdp.send('Network.emulateNetworkConditions', {
      offline: true,
      latency: 0,
      downloadThroughput: 0,
      uploadThroughput: 0,
    })
    await cdp.send('Page.reload')
    await new Promise((resolve) => setTimeout(resolve, 1500))
  }

  const { data } = await cdp.send('Page.captureScreenshot', { format: 'png' })
  await writeFile(out, Buffer.from(data, 'base64'))
  cdp.close()
  console.log(`saved ${out}`)
} finally {
  chrome.kill()
}
