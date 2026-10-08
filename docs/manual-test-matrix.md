# Manual test matrix (GNOME Shell 50, Wayland)

**NOT VERIFIED** on hardware. Capture Shell version, Workspace Islands version, display connectors, logs and outcome. Keep a terminal open on the laptop display for recovery.

| Case | Procedure | Expected |
| --- | --- | --- |
| Laptop only at login | Login with one display | Islands disabled, GNOME native shortcut works |
| Two monitors at login | Login with external monitor | Islands enabled after layout settles |
| Connect external | Hotplug from one to two | Islands automatically enabled |
| Disconnect with visible windows | Open external windows, unplug | Islands disabled; windows remain reachable |
| **Disconnect with hidden windows** | Open windows on multiple virtual workspaces, unplug | No orphan minimized/inaccessible windows |
| Reconnect | Replug same external display | Islands enabled, windows reachable |
| Rapid dock flaps | Toggle dock twice rapidly | No repeating enable/disable loop |
| Lock/unlock | Lock and unlock with external connected | Both extensions remain usable |
| Focus vs pointer | Focus secondary, move pointer primary, switch | Only secondary changes |
| Primary focused | Focus primary, pointer secondary, switch | Only primary changes |
| No focus | Remove window focus and switch | Pointer determines monitor |
| Multiple monitors | Use 3 displays | Focused display alone switches |
| Islands absent | Remove upstream extension | Safe warning / secondary no-op |
| Mutter precondition false | Turn off workspaces-only-on-primary | Do not enable Islands automatically |
| Companion disabled | Disable companion with Islands active | Shortcuts removed; Islands state unchanged |
| Collision check | Leave upstream accelerators bound | Clear competing upstream keys before usage |

## Diagnostics / recovery

```sh
journalctl --user -b | grep -E 'workspace-islands|gnome-shell'
gnome-extensions disable workspace-islands-companion@yohi.github.com
gnome-extensions disable workspace-islands@danielbernalo.github.io
```

Hotplug disable occurs after the monitor-change notification, so window restoration is **not guaranteed**. A missing window must be investigated independently.
