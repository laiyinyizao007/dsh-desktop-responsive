# dsh-desktop-responsive

A phone-width layout for the **DSH Desktop** and for a **DeepSeek
Harness** web UI whose build carries the host markers.

The Harness is a desktop application: a three-column shell with a sidebar, a
conversation and a right-hand column of panels, and a composer that sits at
the bottom of the middle one. On a phone all of that has to become
something else — a drawer, a sheet, a single column — and none of it should
cost a patch to the upstream.

This plugin does that from the outside. It writes no code into the host: it
reads the layout, changes the geometry, and puts everything back when it is
unloaded.

## What it changes

| | On a phone | Needs |
| --- | --- | --- |
| The sidebar | The expanded one becomes a floating drawer over the content; the rail of icons stays | the frame marker, plus upstream attributes |
| The settings dialog | A full-screen page of tabs instead of a floating panel | `data-dsh-region` markers |
| The composer | Follows the keyboard, and leaves the same room below it that the header takes above | the frame marker, plus upstream attributes |
| The messages | The bubble widens to the screen, and the body type grows a step | `data-dsh-region` markers |
| The header | The tabs fold away behind one chevron, and the session's tools fold into one menu | `data-dsh-region` markers |
| The usage row | Folds into the model picker, and opens as a sheet | `data-dsh-region` markers |
| The tables | Scroll sideways, with a shadow at the edge | the frame marker, plus upstream attributes |
| The workbench | The bottom workbench and the project console take the whole screen | the frame marker, plus upstream attributes |

The plugin finds the layout by the attributes the upstream ships, and by
the markers a host build adds. Everything it adapts lives inside the
frame, so one marker is needed before anything at all can happen: the
plugin finds the frame through `[data-dsh-sidebar-root]`. The DSH
Desktop's build carries it — it patches the upstream's sidebar package to
add it — so the plugin works there as it is. The packages published to npm
do not carry it, so on a plain `dsh --profile web` install the plugin finds
nothing to adapt, says so in the console, and leaves the page alone.

Once the frame is found, the sidebar drawer, the composer that follows the
keyboard, the tables and the workbench need only the attributes the
upstream ships. The header, the view tabs, the usage sheet, the message
bubbles and the settings dialog need the `data-dsh-region` markers, and a
host built from source with the patches in `patches/` gets them.
[docs/UPSTREAM.md](docs/UPSTREAM.md) lists every marker and says which one
carries what.

## Install

The plugin is a plain DSH plugin. Install it into a profile and restart
the Harness:

```bash
# from npm
dsh plugin --profile web add dsh-desktop-responsive

# from GitHub
dsh plugin --profile web add github:laiyinyizao007/dsh-desktop-responsive

# from a local checkout
dsh plugin --profile web add /path/to/dsh-desktop-responsive
```

Nothing else is needed beyond the markers above: the plugin finds the
layout by itself.

`dsh plugin` forwards to `pnpm` in the profile directory, so the profile's
own `pnpm-workspace.yaml` decides how the install runs. The plugin has no
runtime dependencies; it declares `@deepseek-ai/dsh-client-locale` as a peer
because that is the package that provides the `locale` service it registers
its own strings with, and the Harness already ships it.

The peer range carries an explicit prerelease branch on purpose. The
Harness is published as prereleases, and node-semver only lets a
prerelease satisfy a range when some comparator in that range shares the
version's exact `major.minor.patch` tuple and itself carries a prerelease
tag — so a range written as `>=0.2.1-rc.1 <0.3.0` would silently exclude
every `0.2.2-rc.*` build. The declared range is
`>=0.2.1-rc.1 <0.2.2 || >=0.2.2-alpha.1 <0.3.0-0`: one branch per
`major.minor.patch` tuple the Harness publishes on. The second branch
starts at `alpha` rather than `rc` because `alpha` sorts before `rc` on
the same tuple, so one comparator admits both `0.2.2-alpha.*` and
`0.2.2-rc.*`.

### Opening it on a phone

The plugin changes how the Harness web UI looks in a narrow window; it
does not decide how a phone reaches that UI. That is the deployment's
choice, and most of them need no domain at all:

| Where the phone is | What to run | Domain |
| --- | --- | --- |
| Nowhere — a narrow desktop window | nothing more | no |
| On the same Wi-Fi as the computer | `dsh --profile web --host 192.168.1.5` (the computer's LAN address), then open the URL it prints — `http://192.168.1.5:<port>/?token=…` | no |
| On a Tailscale (or similar) network with the computer | `dsh --profile web --host 100.x.y.z` (the computer's tailnet address) | no |
| Anywhere, through a tunnel or reverse proxy | `dsh --profile web --trusted-host your.host --public-url https://your.host/` behind the tunnel | yours, or a temporary `trycloudflare.com` one |

Two things the Harness asks of every one of them:

- **Bind one address, not all.** `--host 0.0.0.0` is refused; name the
  interface. The address the UI is bound to is accepted as it is.
- **Admit any other name.** Under a name that is neither loopback nor
  the bound address — a domain, a tunnel's host, a MagicDNS name — the
  page still loads, but every call it makes to the Harness is refused
  with 403 until that name is passed with `--trusted-host`.

The DSH Desktop runs its web UI on loopback only (`127.0.0.1`), so no
phone reaches it directly, whatever the list says. It can be reached
through a tunnel or reverse proxy running on the same computer; the name
that proxy serves then goes in the `trustedHosts` of the
`@deepseek-ai/dsh-client-connection` entry (id `connection`), set with a
row in the profile's `cordis.patch.yml`. Without such a proxy, run the
`web` profile bound to a LAN or tailnet address as in the table.

The first visit has to carry the login: open the URL `dsh web` prints,
with its `?token=`, once. The Harness swaps it for a cookie and the plain
address works from then on. Open it in the phone's browser itself — typed,
pasted, or through the browser's own QR scanner. A link opened from a chat
app or a camera preview can land in a view that keeps no cookies, and the
login is then lost on the very next request.

The DSH Desktop's own phone page (the one behind its "connect phone" QR
code) is a separate, fixed page that loads no plugins; this plugin
applies to the full web UI only.

### Building the host from source

A host that builds the upstream from source can apply the patches in
`patches/`. They add the markers the plugin looks for on the conversation's
header, title row, workspace row and view tabs, on the composer's dock, on
the stack of sent messages, and on the eight parts of the settings dialog.
Two markers the plugin needs are not in them — the sidebar's root and the
sidebar toggle — so a from-source build has to add those as well, or the
plugin will not find the frame. The DSH Desktop's build already carries
the sidebar's root, so there the plugin works without them. See
[docs/UPSTREAM.md](docs/UPSTREAM.md) for the contract and for what each
part of the plugin does without them.

## How it stays out of the host's way

The upstream's class names are hashes — `pI_x6G_frame` — and they change
with every build. A selector on one breaks silently. The plugin therefore
never names one: it uses the markers the upstream carries, and where the
upstream has none it marks the elements itself, the same way a host with
the patches would. The only class names it uses belong to other plugins'
own surfaces — the project console, the workbench home — and they are
optional: when one of them is renamed, that one adaptation stops applying
and the plugin says so, while the rest carry on.

The plugin also puts back what it changed. The layout's grid is React's,
and the plugin writes it only while it is in charge; on unload the value
React wrote is restored. Everything else it wrote on the host's own
elements — the markers it added, the `inert` it put on the columns behind
the drawer, the dialog semantics it gave the composer's dock — goes back
to what it was. A value the host has changed in the meantime is left
alone: what the host wrote last is not the plugin's to undo.

## The details

[docs/DETAIL.md](docs/DETAIL.md) describes each of the changes, why it is
made the way it is, and what the upstream's contract is.

[docs/COMPARISON-native-client.md](docs/COMPARISON-native-client.md) sets
this plugin against a native mobile client for the same host: what each
one changes, where this one is better, and which of its rules are worth
taking.

## Tests

```bash
npm install --include=dev
npm test
```

The `--include=dev` is not ceremony: a machine with `NODE_ENV=production`
set — which is what a server tends to have — makes npm skip the
development dependencies, and the test runner is one of them. Without it
the install says "up to date" and installs nothing.

The tests are behaviour tests: they load the plugin into a DOM, and check
what it does to the layout rather than what its source says. A guard fails
the build if a hashed class name appears in the plugin's source, if a
marker nothing provides slips into the manifest, or if a rule swallowed
another one — the kind of mistake a browser drops without a word.

## Licence

MIT. See [LICENSE](LICENSE).
