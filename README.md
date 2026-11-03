# dsh-desktop-responsive

A phone-width layout for the **DSH Desktop** and the **DeepSeek Harness**
web UI.

The Harness is a desktop application: a three-column shell with a sidebar, a
conversation and a right-hand column of panels, and a composer that sits at
the bottom of the middle one. On a phone all of that has to become
something else — a drawer, a sheet, a single column — and none of it should
cost a patch to the upstream.

This plugin does that from the outside. It writes no code into the host: it
reads the layout, changes the geometry, and puts everything back when it is
unloaded.

## What it changes

| | On a phone |
| --- | --- |
| The sidebar | The expanded one becomes a floating drawer over the content; the rail of icons stays |
| The settings dialog | A full-screen page of tabs instead of a floating panel |
| The composer | Follows the keyboard, and leaves the same room below it that the header takes above |
| The messages | The bubble widens to the screen, and the body type grows a step |
| The header | The tabs fold away behind one chevron, and the session's tools fold into one menu |
| The usage row | Folds into the model picker, and opens as a sheet |
| The tables | Scroll sideways, with a shadow at the edge |
| The workbench | The bottom workbench and the project console take the whole screen |

## Install

The plugin is a plain DSH plugin. Put it in the profile's plugins and
restart the Harness:

```bash
cd ~/.dsh/profiles/web/node_modules
npm install dsh-desktop-responsive
```

or, from a checkout:

```bash
npm install /path/to/dsh-desktop-responsive
```

Nothing else is needed: the plugin finds the layout by itself.

### Building the host from source

A host that builds the upstream from source can apply the patches in
`patches/`, and the plugin then adapts the settings dialog and the
conversation's header as well. See [docs/UPSTREAM.md](docs/UPSTREAM.md) for
the contract and for what each part of the plugin does without them.

## How it stays out of the host's way

The upstream's class names are hashes — `pI_x6G_frame` — and they change
with every build. A selector on one breaks silently. The plugin therefore
never names a class: it uses the markers the upstream carries, and where the
upstream has none it marks the elements itself, the same way a host with
the patches would.

The plugin also puts back what it changed. The layout's grid is React's,
and the plugin writes it only while it is in charge; on unload the value
React wrote is restored.

## The details

[docs/DETAIL.md](docs/DETAIL.md) describes each of the changes, why it is
made the way it is, and what the upstream's contract is.

## Tests

```bash
npm test
```

The tests are behaviour tests: they load the plugin into a DOM, and check
what it does to the layout rather than what its source says. A guard fails
the build if a hashed class name appears in the plugin's source, or if a
rule swallowed another one — the kind of mistake a browser drops without a
word.

## Licence

MIT. See [LICENSE](LICENSE).
