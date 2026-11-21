# The contract with the host

The plugin adapts a layout it does not own. Two things follow from that.

## What the plugin finds by itself

Upstream ships a handful of stable attributes — not the hashed class names,
which change with every build. These are the way in to the layout, and the
published `@deepseek-ai/dsh-client-ui-*` packages carry all of them:

| Attribute | What it is | Package |
| --- | --- | --- |
| `[data-conversation-region="chat"]` | The conversation | `dsh-client-ui-conversation` |
| `[data-conversation-region="composer"]` | The composer | `dsh-client-ui-conversation` |
| `[data-conversation-content]` | The message flow | `dsh-client-ui-conversation` |
| `[data-width-handle]` | The handle that sets the conversation's width | `dsh-client-ui-conversation` |
| `[data-slot="conversation.session.header.utilities"]` | The header's tool slot | `dsh-client-ui-conversation` |
| `[data-slot="conversation.session.header.corner"]` | The header's corner slot | `dsh-client-ui-conversation` |
| `[data-rightbar-col]` | The right column | `dsh-client-ui-layout` |
| `[data-sidebar-collapsed]` | The sidebar's state | `dsh-client-ui-layout` |
| `[data-side="sidebar"]` | The resize handle | `dsh-client-ui-layout` |
| `[data-actions-reveal="hover"]` | The row of actions under a message | `dsh-client-ui-chat` |
| `[data-menu-material="translucent"]` | The menus | `dsh-client-ui-primitives` |
| `[data-row-key]` | A row of the workspace tree | `dsh-client-ui-workspace` |

From the sidebar's root — `[data-dsh-sidebar-root]`, which the published
packages do not carry and the host's build does — the plugin walks up to
the ancestor that owns the layout's grid, and from there it works out the
sidebar's column and the centre column. It then gives those three elements
the same markers a host with the patches would have given them, so that the
rules — which are written against those markers — behave the same either
way.

## The markers the plugin needs

The rest of the upstream's surfaces carry no stable attribute. The
published packages carry none of the markers below — the only `data-dsh-*`
attribute they ship is `data-dsh-automatic-focus`, which belongs to
another plugin's contract — so a host that has these has a build that adds
them, and the plugin's rules are written against exactly these names:

| Marker | What it is | Who adds it |
| --- | --- | --- |
| `[data-dsh-region="layout"]` | The frame | the plugin, at runtime |
| `[data-dsh-region="sidebar"]` | The sidebar's column | the plugin, at runtime |
| `[data-dsh-region="center"]` | The centre column | the plugin, at runtime |
| `[data-dsh-sidebar-root]` | The sidebar's own root | the host's build |
| `[data-dsh-region="sidebar-toggle"]` | The button that opens the sidebar | the host's build; optional — without it the plugin uses the last button of the root's first row |
| `[data-dsh-region="conversation-header"]` | The conversation's header | `patches/` |
| `[data-dsh-region="conversation-title-row"]` | The row the title sits in | `patches/` |
| `[data-dsh-region="conversation-workspace-row"]` | The workspace row | `patches/` |
| `[data-dsh-region="conversation-tabs"]` | The view tabs | `patches/` |
| `[data-dsh-region="composer-dock"]` | The row under the composer | `patches/` |
| `[data-dsh-region="chat-user-stack"]` | The stack of sent messages | `patches/` |
| `[data-dsh-region="settings-overlay"]` | The settings overlay | `patches/` |
| `[data-dsh-region="settings-nav"]` | The settings section list | `patches/` |
| `[data-dsh-region="settings-nav-list"]` | The section list's items | `patches/` |
| `[data-dsh-region="settings-nav-title"]` | The section list's title | `patches/` |
| `[data-dsh-region="settings-content"]` | The settings body | `patches/` |
| `[data-dsh-region="settings-header"]` | The settings header | `patches/` |
| `[data-dsh-region="settings-options"]` | The settings options | `patches/` |
| `[data-dsh-settings-sidebar-footer]` | The footer's slot | `patches/` |

The first three the plugin adds to the elements it has already found, so
they are there on every host. The rest are not: the frame is found through
`[data-dsh-sidebar-root]`, so a host that carries neither that attribute
nor `[data-dsh-region="layout"]` leaves the plugin with nothing to adapt.

## What a host may add

A host that builds the upstream from source can add the markers with the
patches in `patches/`. They add attributes and nothing else. Fourteen of
the markers above come from them — the conversation's header, title row,
workspace row and view tabs, the composer's dock, the stack of sent
messages, and the eight parts of the settings dialog.

Two of them the patches do not carry: `[data-dsh-sidebar-root]` and
`[data-dsh-region="sidebar-toggle"]` belong to the sidebar package, which
the patches do not touch. A host that builds the upstream from source has
to add the first itself, or the plugin will not find the frame. The second
is optional: without it the plugin takes the last button of the sidebar
root's first row, which is where the upstream renders its toggle.

The DSH Desktop's build adds the first of the two on its own: it patches
the upstream's sidebar package to carry `data-dsh-sidebar-root`, so the
plugin finds the frame there without anything else. It does not add the
`data-dsh-region` markers, so on the Desktop the conversation's header, the
view tabs, the composer's dock, the sent messages and the settings dialog
keep the desktop's own shape. A host built from source with the patches
above gets those as well.

## Without the markers

The plugin adapts what it can find and leaves the rest alone. On a host
that carries none of the markers it cannot find the frame at all, and
nothing happens. On a host that carries the layout markers but not the
conversation ones, this is what does not apply:

| Surface | What is lost |
| --- | --- |
| The view tabs | They are not folded into the chevron menu |
| The conversation's header | It keeps the desktop's height and padding |
| The title row | The plugin's floating controls are placed by the desktop's offset |
| The composer dock | The usage row is not folded into the model picker, and opens as no sheet |
| The sent messages | The bubble keeps the desktop's maximum width |
| The settings dialog | It stays a floating panel instead of a full-screen tab page |

The settings dialog is the one surface the plugin says out loud about:
while the dialog is open, the missing anchors are logged and written to
`data-dshr-missing` on the root element. The others are silent.

## Applying the patches

The patches are against a specific version of the upstream packages
(`0.2.1-rc.3`), and they are this plugin's own — the Desktop's build has
a patch layer of its own. To apply them:

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

The plugin therefore never selects on a hashed class name, and a test in
`test/` fails the build if one appears in its source. The three class
names it does use belong to other plugins' own surfaces — the project
console, the workbench home — and those anchors are marked optional: when
one of them is renamed, that one adaptation stops applying and the plugin
says so, while the rest carry on.

## What the plugin needs from a newer upstream

| If the upstream changes | Then |
| --- | --- |
| A stable attribute is renamed | The plugin stops finding that surface, and says so in the console |
| The layout's grid changes shape | The plugin's own grid write is checked against what React wrote, and restored when the plugin is unloaded |
| The settings dialog is reworked | The patches no longer apply; the plugin falls back to leaving it alone |
