import sharp from 'sharp'
import { readFile } from 'node:fs/promises'
import path from 'node:path'

const root = path.resolve(process.cwd())
const svg = await readFile(path.join(root, 'public', 'icon.svg'))
const outDir = path.join(root, 'public', 'icons')

const make = async (size, name) =>
  sharp(svg, { density: 512 })
    .resize(size, size)
    .flatten()
    .png()
    .toFile(path.join(outDir, name))

await make(192, 'icon-192.png')
await make(512, 'icon-512.png')
await make(512, 'icon-512-maskable.png')
await make(180, 'apple-touch-icon.png')
await make(32, 'favicon-32.png')

console.log('✓ Icons generated in public/icons/')
