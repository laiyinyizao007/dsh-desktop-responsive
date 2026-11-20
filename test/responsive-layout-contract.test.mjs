// @vitest-environment node
//
// The contract is read out of files — the plugin's source, the upstream's
// source, the patches — so this test needs the file system and not a DOM.
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { readFile, readdir } from 'node:fs/promises'
import { existsSync } from 'node:fs'
import { join } from 'node:path'

const repoRoot = join(import.meta.dirname, '..')
const clientPath = join(repoRoot, 'client.js')

/**
 * Whether the upstream is installed here.
 *
 * The upstream is not on a registry — it is built from source — so a
 * checkout of this plugin on its own may not have it. The tests that read
 * it are skipped then, rather than failing for want of a file.
 */
function upstreamInstalled(pkg) {
  return existsSync(join(repoRoot, 'node_modules', pkg))
}

/**
 * The plugin's whole upstream contract is the anchor manifest it exports.
 *
 * Upstream rebuilds its stylesheet whenever it ships, which rehashes the CSS
 * module class names (`pI_x6G_frame` and friends), so a plugin that selects
 * on them breaks silently. The anchors are either a `data-dsh-region` marker
 * this repository patches into upstream, or a stable data attribute upstream
 * already ships.
 *
 * These tests fail when upstream changes one of those surfaces, so the
 * breakage shows up as a failing test instead of a phone screen that quietly
 * stops adapting. The plugin's own behaviour is checked by
 * `test/responsive-layout-client.test.mjs`.
 */

/** The upstream package each anchor belongs to, and the file it lives in. */
const UPSTREAM_FILES = {
  '@deepseek-ai/dsh-client-ui-layout': 'lib/client.js',
  '@deepseek-ai/dsh-client-ui-sidebar': 'lib/client.js',
  '@deepseek-ai/dsh-client-ui-conversation': 'lib/client.js',
  '@deepseek-ai/dsh-client-ui-chat': 'lib/client.js',
  '@deepseek-ai/dsh-client-ui-settings-general': 'lib/client.js',
  '@deepseek-ai/dsh-client-ui-primitives': 'lib/index.js',
  '@deepseek-ai/dsh-client-ui-model-selection': 'lib/client.js',
  // The sidebar's workspace tree. The plugin reads the rows of it, and
  // the tests that read this package's source are skipped when it is not
  // installed here.
  '@deepseek-ai/dsh-client-ui-workspace': 'lib/client.js',
}

/** The patch file that carries the markers of one upstream package. */
/** Read one installed upstream file. */
async function upstreamSource(pkg) {
  return readFile(join(repoRoot, 'node_modules', pkg, UPSTREAM_FILES[pkg]), 'utf8')
}

/**
 * The markers the plugin's own patches do not carry.
 *
 * The published upstream carries no `data-dsh-*` attribute at all — that
 * was checked against the tarballs — so a marker is never the upstream's.
 * It is one of three things: a patch in `patches/` adds it, the plugin
 * adds it to an element it has already found, or the host's build adds
 * it. The DSH Desktop's build patches the upstream's sidebar package to
 * carry the sidebar's root and its toggle.
 *
 * The plugin's own markings are matched loosely: a pattern rather than a
 * line of source, so that reformatting the file does not fail a test
 * about where a marker comes from.
 */
const PLUGIN_MARKED = {
  frame: /setMarker\(\s*\w+\s*,\s*A\.frame\s*\)/,
  sidebar: /setMarker\(\s*\w+\s*,\s*A\.sidebar\s*\)/,
  center: /setMarker\(\s*\w+\s*,\s*A\.center\s*\)/,
}

const HOST_MARKED = ['sidebarRoot', 'sidebarToggle']

/**
 * Every patch of this repository.
 *
 * The file name carries the upstream version, which moves; the package it
 * belongs to does not. So the patches are found by the directory rather
 * than by a list that goes stale. A list, not a map: two files for one
 * package — an old file left behind after a patch was regenerated for a
 * new upstream version — must both be examined, not have the newer one
 * hide the older.
 */
async function readPatches() {
  const dir = join(repoRoot, 'patches')
  const files = []
  for (const name of await readdir(dir)) {
    if (!name.endsWith('.patch')) continue
    const stem = name.replace(/\.patch$/, '')
    const cut = stem.lastIndexOf('+')
    files.push({
      pkg: stem.slice(0, cut).replace('+', '/'),
      version: stem.slice(cut + 1),
      file: join(dir, name),
      source: await readFile(join(dir, name), 'utf8'),
    })
  }
  return files
}

/**
 * Whether a patch adds a marker.
 *
 * Only the added lines count: a patch that removes a marker carries the
 * name in its removed lines too, and that is the opposite of carrying it.
 * The patches add the marker as an attribute of the upstream's own
 * elements, so the attribute name is in the added lines, and for a region
 * marker so is its value.
 */
function patchCarriesMarker(patch, anchor) {
  const match = /^\[([a-z-]+)(?:=["']([^"']+)["'])?\]$/.exec(anchor.selector)
  if (match === null) return false
  const [, attribute, value] = match
  const added = patch
    .split('\n')
    .filter(line => line.startsWith('+') && !line.startsWith('+++'))
  // The attribute and its value have to be on one line: a patch that adds
  // another region marker and mentions this marker's value somewhere else
  // is not carrying this marker.
  return added.some(
    line => line.includes(attribute) && (value === undefined || line.includes(`"${value}"`))
  )
}

/** Strip comments so a hashed class name in prose is not read as a selector. */
function stripComments(source) {
  return source.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:])\/\/.*$/gm, '$1')
}

/**
 * Load the plugin's manifest.
 *
 * The plugin is a browser module that registers itself with
 * `window.__ModuleLoader__`. The test stands in for the loader so the module
 * can be imported outside a browser; the manifest is then read from the
 * module's own exports, so the contract cannot drift from the code.
 */
async function loadManifest() {
  let captured = null
  globalThis.window = {
    __ModuleLoader__: {
      load(module) {
        captured = module
      },
    },
  }
  vi.resetModules()
  await import('../client.js')
  if (captured === null) throw new Error('the client plugin did not register itself')
  const exports = captured.factory()
  delete globalThis.window
  return exports.anchors
}

describe('the anchor manifest', () => {
  let anchors = null

  beforeEach(async () => {
    anchors = await loadManifest()
  })

  afterEach(() => {
    delete globalThis.window
  })

  it('is not empty', () => {
    expect(Object.keys(anchors).length).toBeGreaterThan(0)
  })

  it('names the package and the origin of every anchor', () => {
    for (const [key, anchor] of Object.entries(anchors)) {
      expect(anchor.package, `${key} has no upstream package`).toBeTruthy()
      // 'element' is a semantic HTML element: it has no upstream class
      // name to rehash, so it is as stable as an attribute. 'class' is a
      // semantic class name of another plugin's, which the rule about
      // hashed names keeps honest.
      expect(
        ['marker', 'attribute', 'element', 'class'],
        `${key} has an unknown origin`
      ).toContain(anchor.origin)
      if (anchor.optional === true) {
        // A surface that belongs to another plugin: it is not upstream, so
        // there is no upstream package to name, and the surface may be
        // absent entirely.
        continue
      }
      expect(
        UPSTREAM_FILES[anchor.package],
        `${key} names an unknown upstream package: ${anchor.package}`
      ).toBeTruthy()
    }
  })

  it.skipIf(!upstreamInstalled('@deepseek-ai/dsh-client-ui-layout'))(
    'finds every attribute anchor in the installed upstream source', async () => {
    for (const [key, anchor] of Object.entries(anchors)) {
      if (anchor.optional === true) continue
      // A marker is never the upstream's: the published packages carry no
      // `data-dsh-*` attribute at all. Where each marker comes from is
      // the subject of the next test.
      if (anchor.origin === 'marker') continue
      const source = await upstreamSource(anchor.package)
      if (anchor.origin === 'element') {
        // A semantic element name — `table`, `button` — has no upstream
        // class name to rehash, so the element itself is the contract.
        // Upstream renders it as a string argument to `createElement`, so
        // the name appears quoted rather than as a tag. A selector that
        // carries an attribute is an attribute anchor in disguise and is
        // checked by name below.
        if (!anchor.selector.includes('[')) {
          expect(
            source,
            `${anchor.package} does not carry ${key}`
          ).toMatch(new RegExp(`["'\`]${anchor.selector}["'\`]`))
          continue
        }
        const attribute = anchor.selector.slice(1, -1).split('=')[0]
        expect(source, `${anchor.package} does not carry ${key}`).toContain(attribute)
        continue
      }
      // An upstream attribute is written with a dynamic value — the resize
      // handle renders `"data-side": props.side` — so only the attribute
      // name can be asserted against the source.
      const attribute = anchor.selector.slice(1, -1).split('=')[0]
      expect(source, `${anchor.package} does not carry ${key}`).toContain(attribute)
    }
  })

  it('gives every marker anchor a source', async () => {
    // This one runs whether or not the upstream is installed: it reads
    // the repository's own patches and the plugin's own source, and it
    // is the check that catches a marker nothing provides — the plugin
    // would then quietly stop adapting that surface, which is the
    // failure this whole file exists for.
    const patches = await readPatches()
    const clientSource = await readFile(clientPath, 'utf8')
    for (const [key, anchor] of Object.entries(anchors)) {
      if (anchor.origin !== 'marker') continue
      if (key in PLUGIN_MARKED) {
        // The plugin marks these itself, on the grid it found.
        expect(clientSource, `the plugin does not mark ${key}`).toMatch(PLUGIN_MARKED[key])
        continue
      }
      if (HOST_MARKED.includes(key)) {
        // The host's build carries it. This repository's patches must not
        // start to: the host is the one that knows where its own sidebar
        // lives, and a patch that guessed would pin the host to a guess.
        for (const patch of patches) {
          expect(
            patchCarriesMarker(patch.source, anchor),
            `the patch for ${patch.pkg} carries ${key}, which the host provides`
          ).toBe(false)
        }
        continue
      }
      const patch = patches.find(item => item.pkg === anchor.package)
      expect(patch, `${key} names a package this repository has no patch for`).toBeTruthy()
      expect(
        patchCarriesMarker(patch.source, anchor),
        `no patch carries ${key}`
      ).toBe(true)
    }
  })

  it.skipIf(!upstreamInstalled('@deepseek-ai/dsh-client-ui-layout'))(
    'carries every marker anchor in the patch of its package', async () => {
      const patches = await readPatches()
      for (const [key, anchor] of Object.entries(anchors)) {
        if (anchor.origin !== 'marker') continue
        // The plugin's own and the host's markers are not in a patch, and
        // the test above says where they come from.
        if (key in PLUGIN_MARKED || HOST_MARKED.includes(key)) continue
        const patch = patches.find(item => item.pkg === anchor.package)
        if (patch === undefined) continue
        expect(
          patchCarriesMarker(patch.source, anchor),
          `the patch for ${anchor.package} does not carry ${key}`
        ).toBe(true)
      }
    })
})

describe('the plugin source', () => {
  it('does not select on a hashed CSS module class', async () => {
    const source = stripComments(await readFile(clientPath, 'utf8'))
    // Upstream's class names look like `pI_x6G_frame`; the hash changes on
    // every upstream build, so a selector on one breaks silently.
    expect(source).not.toMatch(/\.[A-Za-z][A-Za-z0-9]*_[A-Za-z0-9]{4,6}_[A-Za-z]/)
    expect(source).not.toMatch(/["'`][A-Za-z][A-Za-z0-9]*_[A-Za-z0-9]{4,6}_[A-Za-z]/)
  })

  it('selects only on anchors from the manifest', async () => {
    const anchors = await loadManifest()
    const source = stripComments(await readFile(clientPath, 'utf8'))
    const known = new Set(Object.values(anchors).map(anchor => anchor.selector))
    const used = new Set()
    for (const match of source.matchAll(/\[data-[a-z-]+(?:=["'][^"']*["'])?\]/g)) {
      used.add(match[0])
    }
    for (const selector of used) {
      // The plugin's own attributes are namespaced, so they are not part of
      // the upstream contract.
      const isPluginOwned = selector.startsWith('[data-dshr-') || selector.startsWith('[data-plugin-css')
      expect(
        known.has(selector) || isPluginOwned,
        `the plugin selects on ${selector}, which is not in the manifest`
      ).toBe(true)
    }
    // Every anchor has to be used, or the manifest carries dead weight.
    for (const [key, anchor] of Object.entries(anchors)) {
      expect(
        source.includes(anchor.selector),
        `the plugin never selects on ${key} (${anchor.selector})`
      ).toBe(true)
    }
  })

  it('names a missing anchor instead of failing silently', async () => {
    const source = await readFile(clientPath, 'utf8')
    expect(source).toContain('auditAnchors')
    expect(source).toContain('console.error')
  })

  it('respects prefers-reduced-motion', async () => {
    const source = await readFile(clientPath, 'utf8')
    expect(source).toContain('prefers-reduced-motion')
  })

  it('guards its style injection', async () => {
    const source = await readFile(clientPath, 'utf8')
    expect(source).toContain('data-plugin-css')
    expect(source).toContain('dsh-desktop-responsive')
  })

  it('does not assume upstream DOM structure', async () => {
    const source = stripComments(await readFile(clientPath, 'utf8'))
    // A structural selector such as `:first-child` encodes an assumption
    // about upstream's render tree that no marker can protect. Every
    // element the plugin touches has to carry an anchor instead.
    const structural = source.match(/:\s*(first-child|last-child|nth-child|nth-of-type|first-of-type|last-of-type)\b/g)
    expect(
      structural,
      `the plugin relies on upstream's DOM structure: ${structural?.join(', ')}`
    ).toBeNull()
  })

  it('does not reach into upstream for anything but its anchors', async () => {
    const source = stripComments(await readFile(clientPath, 'utf8'))
    // The frame's grid is the one upstream value the plugin reads, and it
    // reads it through the style property rather than through a selector.
    const reads = source.match(/querySelector(?:All)?\(([^)]*)\)/g) ?? []
    const anchors = await loadManifest()
    const known = new Set(Object.values(anchors).map(anchor => anchor.selector))
    for (const read of reads) {
      const argument = /querySelector(?:All)?\(([^)]*)\)/.exec(read)?.[1] ?? ''
      if (argument.includes('`')) continue // A template built from the manifest.
      const literal = /'([^']+)'|"([^"]+)"/.exec(argument)
      if (literal === null) continue
      const selector = literal[1] ?? literal[2]
      expect(
        known.has(selector) || selector.startsWith('[data-dshr-'),
        `the plugin queries ${selector}, which is not in the manifest`
      ).toBe(true)
    }
  })
})

describe("the plugin's own dictionary", () => {
  it.skipIf(!upstreamInstalled('@deepseek-ai/dsh-client-ui-model-selection'))('names the model menu the way upstream names it', async () => {
    // The plugin finds the model menu by the name upstream gives it, so the
    // two dictionaries have to agree. Upstream ships its strings inside its
    // own bundle rather than in a locale file.
    const upstream = await upstreamSource('@deepseek-ai/dsh-client-ui-model-selection')
    const names = [...upstream.matchAll(/"menu\.aria":\s*"([^"]+)"/g)].map(match => match[1])
    expect(names.length).toBeGreaterThan(0)
    const plugin = await readFile(clientPath, 'utf8')
    const own = [...plugin.matchAll(/'modelMenu\.aria':\s*'([^']+)'/g)].map(match => match[1])
    for (const name of names) {
      expect(
        own,
        `the plugin does not know the model menu name "${name}"; upstream renamed it`
      ).toContain(name)
    }
  })
})

describe('the upstream patches', () => {
  it.skipIf(!upstreamInstalled('@deepseek-ai/dsh-client-ui-layout'))('are named after the installed upstream version', async () => {
    // patch-package applies a patch whose file name carries another
    // version, but only with a warning. Renaming the file is mechanical,
    // so the drift is caught here instead of in a build log.
    //
    // Only the packages this repository actually patches are checked: the
    // manifest names more packages than that — the sidebar's own root is
    // an anchor, but the sidebar package is not patched here.
    const patches = await readPatches()
    for (const patch of patches) {
      if (!upstreamInstalled(patch.pkg)) continue
      const manifest = JSON.parse(
        await readFile(join(repoRoot, 'node_modules', patch.pkg, 'package.json'), 'utf8')
      )
      expect(
        patch.version,
        `${patch.pkg} is installed at ${manifest.version}, but ${patch.file.split(/[\\/]/).pop()} is named for ${patch.version}`
      ).toBe(manifest.version)
    }
  })
})
