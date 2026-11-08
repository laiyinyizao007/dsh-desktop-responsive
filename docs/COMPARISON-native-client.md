# Against a native client

`~/Projects/dsh-mobile/docs/architecture.md` designs a **native mobile
client** for DSH: a Flutter app on iOS and Android that speaks the Harness
protocol directly, through `packages/dsh_client` from the dsh-go upstream.

This plugin is a **phone-width layout for the web UI**. The two answer the
same question — how does somebody drive a DSH host from a phone — and they
answer it at different layers. This document says how they differ, what is
worth taking from the other one, and what is not.

The reference document is read as `native:§N` below.

---

## 1. What each one actually changes

| | The native client | This plugin |
|---|---|---|
| The layer | The runtime: a new app, a new protocol client, a new lifecycle | The layout: the existing web UI, remeasured |
| What it replaces | The whole client | The geometry of the shell |
| What it needs from the host | `/api/remote.mux` over WebSocket, `/api/<ns>/<method>` straight through, a widened endpoint allowlist (`native:§4`) | Nothing. It binds to what the web UI already speaks |
| What it inherits | Nothing | The web client's connection, its events, its plugins, its settings |
| What it has to build | Connection, reconnection, platform channels, background survival, signing, distribution | A marker contract, a stylesheet, a viewport measurement |

The difference is not "which is better". It is which costs are paid once.

The native client pays for the runtime: it re-implements the protocol
client (`native:§3.2` — `DshConnection → DshCarrier → DshRpc → DshMux →
DshClient`), re-implements the reconnect policy (`native:§3.6`), and then
has to survive the platform (`native:§5`, `native:§6`). It buys one thing
with all of that: a native feel, and access to the parts of the host that
have no web surface at all.

This plugin pays for the layout only. The web client's reconnection is
already written, already tested, and already handles the generations, the
backoff and the missed events (`native:§3.6` describes it well). The plugin
has nothing to say about any of that, and — deliberately — says nothing at
all.

## 2. Side by side

| | The native client | This plugin |
|---|---|---|
| Features it can reach | Only what `dsh_client` wraps: sessions, messages, models, approvals, questions, credentials (`native:§3.4`) | Everything the web UI has, including the panels of other plugins — the workbench, the project console, the better sidebar |
| Workbench, project console, plugin settings | Native adapters, or a "web island", or "open it on the web" (`native:§9.2`) | Already native: it is the web UI, remeasured |
| Install | An IPA, sideloaded; a free Apple ID means re-signing every 7 days (`native:§8.4`) | `npm install dsh-desktop-responsive`; the host restarts |
| Toolchain | Flutter 3.47.7, Dart 3.13.4, Xcode 26, pinned with SHA256 (`native:§8.3`) | One npm package; no build step of its own |
| Protocol work on the desktop | The bridge must expose the mux and `/api/<ns>/<method>`; today it has neither (`native:§2.2`, `native:§4`) | None. The host's own client does the talking |
| Connection | Written from scratch against `DshClient`, with its own state machine (`native:§7`) | Inherited, and never touched |
| The hardest problem | The iOS background lifecycle: a silent WAV loop on an audio session, 3–5% battery per hour, a grey area for review (`native:§6.1`) | The DOM contract with an upstream that renames its classes on every build |
| Platform work | 24 Dart-side channels, 18 on iOS upstream, 9 in the slim version; ~8,800 lines of Swift deleted (`native:§5.1`, `native:§5.3`) | None needed. The browser is the platform |
| Upstream drift | A pinned Flutter version and a lockfile | A marker manifest, a contract test, and a runtime audit that names what upstream stopped providing (`docs/UPSTREAM.md`) |
| Licence | AGPL upstream, so no App Store; side loading only (`native:§1`, `native:§8.4`) | MIT |

Where the native client is clearly better: the feel of a native app, the
notifications and the share sheet as the platform implements them, the
dynamic island, and the reach into host features that have no web face.

Where this plugin is clearly better: coverage, cost, and the fact that it
needs nothing from the host to work.

## 3. The two are not rivals

The native document lists this plugin under its non-goals, and says the two
can live together (`native:§1`): the native client may embed a web view as
a fallback. **That fallback is this plugin.** When the native client puts
the web UI in a web view, the web UI is unusable on a phone without it.

Two contracts follow from that, and they are worth writing down:

1. **The web view is the fallback, and the fallback is phone-shaped.**
   The plugin's job inside the native client is exactly its job in a
   browser: make the shell fit. Nothing about it assumes a browser.
2. **The native client owns the background.** A web view on iOS is
   suspended when the app goes to the background, and a suspended page runs
   no JavaScript — so the connection cannot be kept alive from inside it.
   The native client's silent-audio keep-alive (`native:§6.1`) is what
   keeps the fallback alive, not this plugin. See
   [DETAIL.md](DETAIL.md#running-inside-a-native-apps-web-view).

The same document's plugin tiers (`native:§9.2`) put an existing web
plugin in three rungs: a native adapter, a web island, or "open it on the
web". This plugin is a candidate for the middle one.

## 4. What is worth taking

Each item below is a rule in the native document, what this plugin already
does with it, and what is left.

### 4.1 The stability rules (`native:§9.4`)

Six rules govern the native plugin protocol. Four of them this plugin
already keeps:

| Rule | Here |
|---|---|
| Only add, never change | The plugin adds attributes and never restructures upstream's tree (`docs/UPSTREAM.md`) |
| The user decides | The reading size is a user setting, and the plugin only nudges it while it is still the default (`docs/DETAIL.md`) |
| Geometry belongs to the app | The plugin decides the sizes; a plugin only brings a description and an icon |
| Break only yourself | A missing anchor takes down the surface it belongs to, and says so (`data-dshr-missing`) |

Two were missing, and are now in:

- **A new surface is negotiated.** A plugin that wants to adapt its own
  surface to a phone used to have to guess: read the root attribute, or
  watch the CSS. The service now answers. `capabilities()` says which
  mode the layout is in and which of the plugin's surfaces it offers, and
  `subscribe` tells a plugin when the mode changes.
- **There are limits.** The strip that other plugins add items to shares
  one row with the header's own tools. Its width is bounded, the items
  that do not fit are scrolled sideways, and the room the upstream
  containers give it is the bound rather than the content.

### 4.2 The reconciliation (`native:§9.6`)

The native document keeps the bridge, the SDK and the app in step with
byte-for-byte copies and twin implementations, and fails the build when
they drift.

This plugin has the same discipline in a different shape: the anchor
manifest is the contract, the contract test fails the build when a marker
disappears or when a patch stops carrying it, and the runtime audit names
what upstream stopped providing.

What is missing is the *generator*. The patches in `patches/` are hand
written, and a marker that the patch forgets is only caught when someone
writes a test for it. The native document's `sync-bridge.mjs` is the model:
read the installed upstream, write the manifest, fail when the two differ.

### 4.3 Missing means degrade (`native:§5.1`)

The native client catches `MissingPluginException` in 53 places and
registers a `SilentEvents` channel that never fires, so that a platform
without a capability compiles knowing it, and never fails at runtime.

This plugin does the same thing with markers: a surface upstream no longer
provides is left alone and named, and the rest of the layout keeps
working. The vocabulary is worth keeping in step.

### 4.4 Do not write a second reconnect (`native:§7`)

The native document is emphatic: `DshMux` owns the generations, the
backoff and the re-subscription, and a client that writes its own on top
of it fights it.

This plugin has the same rule, unwritten. It should be written down, and
it is — see [DETAIL.md](DETAIL.md#what-this-plugin-does-not-do).

### 4.5 The cheapest verification first (`native:§10`)

The native plan puts `packages/dsh_client/bin/probe.dart` first: the
cheapest thing that proves the protocol works, before any UI is written.

The same order applies here, and the equivalent is the behaviour test in
`test/`: a jsdom document, the plugin loaded into it, and the layout
asserted. It runs in seconds on the machine the work happens on.

### 4.6 Say what was not verified (`native:§11`)

The native document ends with a section that names what it did not verify.
So does this one now — see
[DETAIL.md](DETAIL.md#what-has-not-been-verified).

### 4.7 The compiler's own words (`native:§8.2`)

When a CI job fails, the useful part is the error the tool printed, not the
wrapper's summary. The native document's build logs the compiler's lines
and annotates them, because the annotations are readable without a login.

This plugin has no CI of its own yet, and the rule should be written into
it when it has one.

## 5. What is not worth taking

| In the native document | Why not here |
|---|---|
| The 24 platform channels, and their Swift and Kotlin | The browser is the platform; there is nothing to bridge |
| The silent WAV keep-alive | The browser keeps the page alive. In a native web view it is the native app's job, not the page's |
| ShareExtension, App Group, the dynamic island | Native features of a native app |
| The pinned Flutter version and its SHA256 | The equivalent drift here is upstream's class hashes, and the manifest already answers it |
| `/dsh-go/v1/*` and `dsh-go-bridge` | The native plugin protocol is for a client that cannot draw a web page. This one draws the web page |
| `dsh_remote`, Noise IK and WebRTC | A first version does without it, and so does this plugin |

## 6. What changed because of this comparison

| Change | Where |
|---|---|
| The service answers what it can host, and tells a plugin when the layout changes | `capabilities()` and `subscribe` in `client.js`; tested in `test/responsive-layout-client.test.mjs` |
| The strip of other plugins' items is bounded, and scrolls | `ACTION_STRIP_MAX_PX`, the stylesheet, and the room published as `--dsh-actions-extra` |
| The rules this plugin does not break are written down | [DETAIL.md](DETAIL.md#what-this-plugin-does-not-do) |
| What was not verified is written down | [DETAIL.md](DETAIL.md#what-has-not-been-verified) |
| The boundary against a native web view is written down | [DETAIL.md](DETAIL.md#running-inside-a-native-apps-web-view) |

## 7. What is still open

| | |
|---|---|
| The patches are hand written | A generator that reads the installed upstream and writes the manifest would catch a marker a patch forgets |
| The plugin has no CI | The rules it keeps — the contract test, the behaviour tests — are only worth what a machine runs them |
| The capabilities answer is one-way | A plugin can ask what the layout offers, but cannot ask the layout to offer something |
| The native client is a design | Nothing in the native document has been built. The parts of it that would touch this plugin are the web view and the plugin tiers |
