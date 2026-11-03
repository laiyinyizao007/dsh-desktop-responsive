# Reports to the plugins this one adapts

The phone layout adapts the surfaces of two other plugins. Their class names
are semantic rather than hashed, but they belong to somebody else, and a
plugin that is upgraded may rename them.

So the fixes belong upstream, where they will keep working. These are the
reports, ready to send.

## The project console

**Repository**: https://github.com/OliverLiy/projectHub
**What**: the filter pills lose their text on a narrow panel.

The branch is pushed and the fork exists; opening the pull request is one
click:

- https://github.com/laiyinyizao007/projectHub/pull/new/fix/console-filter-pills-on-a-narrow-panel

The body is in `projectHub-console-narrow.md`.

## The bottom workbench

**Repository**: https://github.com/omdsh-dev/DSH-better-sidebar
**What**: the keyboard inset counts the browser's own bars, so the bottom
workbench is lifted by the height of the address bar.

This one is an issue rather than a patch: there is no standard way to tell
the keyboard's height from the chrome's on iOS, and the fix needs a device
to try.

- https://github.com/omdsh-dev/DSH-better-sidebar/issues/new

The body is in `better-sidebar-keyboard-inset.md`.
