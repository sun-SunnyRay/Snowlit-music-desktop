const fs = require('node:fs')
const path = require('node:path')

const pkgPath = path.join(__dirname, '..', 'package.json')
const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'))
const code = Number(pkg.versionCode) + 1
if (!Number.isInteger(code) || code < 1) {
  throw new Error(`invalid versionCode: ${pkg.versionCode}`)
}

pkg.versionCode = code
pkg.version = `${Math.floor(code / 10)}.${code % 10}.0`
fs.writeFileSync(pkgPath, `${JSON.stringify(pkg, null, 2)}\n`)
process.stdout.write(`${code} → ${pkg.version}\n`)
