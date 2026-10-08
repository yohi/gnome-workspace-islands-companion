# GNOME Workspace Islands Companion

Experimental GNOME Shell **50** extension that complements [Workspace Islands](https://github.com/danielbernalo/gnome-workspace-islands) without modifying its source.

## Features

- **Monitor-aware lifecycle**: enable Workspace Islands on 2+ active monitors; disable it on a single active monitor.
- **Unified keyboard shortcuts**: Super+Alt+Left/Right switches only the focused monitor. Primary uses native GNOME workspace switching; secondary delegates to Workspace Islands. Pointer location is the fallback if no window has focus.
- **Debounced monitoring**: wait for 650ms of layout stability before changing enablement.

> **Experimental.** GNOME Shell 50 / Wayland hotplug behavior is **not yet verified on real hardware**. This cannot guarantee disabling Islands before Mutter has moved windows, so it is **not** a proven fix for missing windows on monitor disconnect.

## Requirements

- GNOME Shell 50 and the upstream Workspace Islands extension.
- `gsettings get org.gnome.mutter workspaces-only-on-primary` must be `true` (the companion does not alter this preference).

## Build / install

On a GNOME Shell 50 workstation:

```sh
git clone https://github.com/yohi/gnome-workspace-islands-companion.git
cd gnome-workspace-islands-companion
make pack
gnome-extensions install --force dist/workspace-islands-companion@yohi.github.com.shell-extension.zip
```

Log out/in if needed so GNOME discovers the new extension, then:

```sh
gnome-extensions enable workspace-islands-companion@yohi.github.com
```

## Important: avoid shortcut collisions

The companion's default shortcuts intentionally match those of Workspace Islands. **Clear upstream shortcuts once before enabling the companion**:

```sh
gsettings set org.gnome.shell.extensions.workspace-islands switch-next '[]'
gsettings set org.gnome.shell.extensions.workspace-islands switch-prev '[]'
```

Also check native keybinding settings for overlapping accelerators:

```sh
gsettings get org.gnome.desktop.wm.keybindings switch-to-workspace-right
gsettings get org.gnome.desktop.wm.keybindings switch-to-workspace-left
```

Restore upstream defaults with:

```sh
gsettings reset org.gnome.shell.extensions.workspace-islands switch-next
gsettings reset org.gnome.shell.extensions.workspace-islands switch-prev
```

The companion does not silently edit other extensions' settings.

## Configuration

```sh
# Disable/enable auto lifecycle management:
gsettings set org.gnome.shell.extensions.workspace-islands-companion auto-manage false
gsettings set org.gnome.shell.extensions.workspace-islands-companion auto-manage true

# Clear companion shortcuts for troubleshooting:
gsettings set org.gnome.shell.extensions.workspace-islands-companion companion-switch-next '[]'
gsettings set org.gnome.shell.extensions.workspace-islands-companion companion-switch-prev '[]'
```

Changing shortcut settings may require disabling and re-enabling the companion.

## Checks

```sh
npm test
npm run check:syntax
make pack
```

Unit tests check pure monitor/focus policy. Integration, display hotplug, window recovery, suspend/resume, and actual keyboard dispatch need GNOME 50 Wayland testing. See [manual test matrix](docs/manual-test-matrix.md).

## Technical caveats

- Calls upstream's **private** `_switchRelative()` method through GNOME Shell's extension manager. This is not a stable public API.
- GNOME Shell may temporarily reinitialize other extensions when toggling one.
- A disabled built-in laptop panel counts as one active monitor; the policy is based on **active outputs**, not connector presence.
- When enabled, auto management may override manual Islands enablement changes at the next monitor event.
- Disabling the companion deliberately leaves Islands in its current enabled state.
