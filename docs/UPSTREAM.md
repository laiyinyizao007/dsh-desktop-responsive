# The contract with the host

The plugin adapts a layout it does not own. Two things follow from that.

## What the plugin finds by itself

The upstream marks what the plugin needs. These markers are upstream's own,
not this plugin's, and they are the way in to the layout:

| Marker | What it is |
| --- | --- |
| `[data-dsh-sidebar-root]` | The sidebar's own root |
| `[data-conversation-region="chat"]` | The conversation |
| `[data-conversation-region="composer"]` | The composer |
| `[data-conversation-content]` | The message flow |
| `[data-composer-dock]` | The row under the composer |
| `[data-conversation-tabs]` | The view tabs |
| `[data-rightbar-col]` | The right column |
| `[data-sidebar-collapsed]` | The sidebar's state |
| `[data-side="sidebar"]` | The resize handle |
| `[data-actions-reveal="hover"]` | The row of actions under a message |
| `[data-dsh-panel-host]` | Where a workbench panel is drawn |

From the sidebar's root the plugin walks up to the ancestor that owns the
layout's grid, and from there it works out the sidebar's column and the
centre column. It then gives those three elements the same markers a host
with the patches would have given them, so that the rules — which are
written against those markers — behave the same either way.

## What a host may add

A host that builds the upstream from source can add the markers with the
patches in `patches/`. They add attributes and nothing else, and they make
two things better:

- **The settings dialog** becomes a full-screen tab page. The plugin cannot
  find the dialog's parts by itself: it is portalled into the body, and
  nothing marks which element is which.
- **The conversation's header** gets its own pieces marked — the header
  row, the title row, the workspace row — so the plugin can fold the view
  tabs, move the session's title and place its own controls.

Without the patches the plugin still does everything else, and says what
it could not do:

```
[dsh-desktop-responsive] the settings dialog and the conversation header
were not adapted: this host does not carry the markers for them.
```

## Applying the patches

The patches are against a specific version of the upstream packages, and
they are the same ones the DSH Desktop's build uses. To apply them:

```bash
npx patch-package @deepseek-ai/dsh-client-ui-conversation
npx patch-package @deepseek-ai/dsh-client-ui-chat
npx patch-package @deepseek-ai/dsh-client-ui-settings-general
```

with the files from `patches/` copied into the root of your checkout first.

## Why the markers at all

The upstream's class names are hashes — `pI_x6G_frame` — and they change
with every build. A selector on one breaks silently: the rule stops
applying and nothing says so. A marker is a name that survives the build,
and it is the only thing in the upstream that does.

The plugin therefore never selects on a class name, and a test in
`test/` fails the build if one appears in its source.

## What the plugin needs from a newer upstream

| If the upstream changes | Then |
| --- | --- |
| A marker is renamed | The plugin stops finding that surface, and says so in the console |
| The layout's grid changes shape | The plugin's own grid write is checked against what React wrote, and restored when the plugin is unloaded |
| The settings dialog is reworked | The patches no longer apply; the plugin falls back to leaving it alone |
