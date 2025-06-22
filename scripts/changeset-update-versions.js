import * as fs from 'node:fs/promises'
import * as path from 'node:path'
import * as url from 'node:url'
import packageJson from '../package.json' with { type: 'json' }

const dirname = path.dirname(url.fileURLToPath(import.meta.url))
const cargoTomlPath = path.resolve(dirname, '../src-tauri/Cargo.toml')
const cargoLockPath = path.resolve(dirname, '../src-tauri/Cargo.lock')
const tauriConfPath = path.resolve(dirname, '../src-tauri/tauri.conf.json')

let cargoContent = await fs.readFile(cargoTomlPath, 'utf-8')
let cargoLockContent = await fs.readFile(cargoLockPath, 'utf-8')
let tauriConfContent = await fs.readFile(tauriConfPath, 'utf-8')

console.log('Updating versions in Cargo.toml, Cargo.lock and tauri.conf.json')

cargoContent = cargoContent.replace(/version = (.*)/, `version = "${packageJson.version}"`)
cargoLockContent = cargoLockContent.replace(
  /\[\[package]]\s*name\s=\s"ganymede"\s*version\s=\s"(.*)"/g,
  `[[package]]\nname = "ganymede"\nversion = "${packageJson.version}"`,
)
tauriConfContent = tauriConfContent.replace(/"version": "(.*)"/, `"version": "${packageJson.version}"`)

await fs.writeFile(cargoTomlPath, cargoContent, 'utf-8')
await fs.writeFile(cargoLockPath, cargoLockContent, 'utf-8')
await fs.writeFile(tauriConfPath, tauriConfContent, 'utf-8')

console.log('Versions updated')
