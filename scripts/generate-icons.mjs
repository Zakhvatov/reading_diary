import { mkdir, readFile } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import sharp from 'sharp'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const source = await readFile(join(root, 'scripts/icon.svg'))

const targets = [
  ['public/icons/icon-180.png', 180],
  ['public/icons/icon-192.png', 192],
  ['public/icons/icon-512.png', 512],
  ['public/icons/maskable-512.png', 512],
]

await mkdir(join(root, 'public/icons'), { recursive: true })

await Promise.all(
  targets.map(([file, size]) =>
    sharp(source, { density: 300 }).resize(size, size).png().toFile(join(root, file)),
  ),
)

console.log('icons written:', targets.map(([file]) => file).join(', '))
