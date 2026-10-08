import Gio from 'gi://Gio';
import GLib from 'gi://GLib';
import Meta from 'gi://Meta';
import Shell from 'gi://Shell';

import {Extension} from 'resource:///org/gnome/shell/extensions/extension.js';
import * as Main from 'resource:///org/gnome/shell/ui/main.js';

import {desiredIslandsEnabled, workspaceTarget} from './policy.js';

const ISLANDS_UUID = 'workspace-islands@danielbernalo.github.io';
const MUTTER_SCHEMA = 'org.gnome.mutter';
const ONLY_ON_PRIMARY = 'workspaces-only-on-primary';
// Workspace Islands currently waits 300 ms for a quiet period. This delay
// applies to our independent monitor policy, not to upstream's own state.
const MONITOR_QUIET_MS = 650;

export default class WorkspaceIslandsCompanion extends Extension {
    enable() {
        this._alive = true;
        this._signals = [];
        this._pendingReconcile = 0;
        this._bound = [];
        this._settings = this.getSettings();
        this._mutterSettings = new Gio.Settings({schema_id: MUTTER_SCHEMA});

        this._connect(Main.layoutManager, 'monitors-changed', () => this._scheduleReconcile());
        this._connect(this._settings, 'changed::auto-manage', () => this._scheduleReconcile());
        this._connect(this._mutterSettings, `changed::${ONLY_ON_PRIMARY}`,
            () => this._scheduleReconcile());

        this._registerKeybindings();
        this._scheduleReconcile();
    }

    disable() {
        this._alive = false;
        if (this._pendingReconcile) {
            GLib.Source.remove(this._pendingReconcile);
            this._pendingReconcile = 0;
        }

        for (const name of this._bound)
            Main.wm.removeKeybinding(name);
        this._bound = [];

        for (const [object, signalId] of this._signals)
            object.disconnect(signalId);
        this._signals = [];

        this._settings = null;
        this._mutterSettings = null;
        // Do not undo the Islands enabled state: on an extension reload that
        // could immediately re-enable the extension we just disabled.
    }

    _connect(object, signal, handler) {
        this._signals.push([object, object.connect(signal, handler)]);
    }

    _registerKeybindings() {
        for (const [name, delta] of [['companion-switch-next', 1], ['companion-switch-prev', -1]]) {
            const action = Main.wm.addKeybinding(
                name, this._settings, Meta.KeyBindingFlags.NONE,
                Shell.ActionMode.NORMAL, () => this._switch(delta));
            if (action === Meta.KeyBindingAction.NONE) {
                console.warn(`workspace-islands-companion: failed to bind ${name}`);
                continue;
            }
            this._bound.push(name);
        }
    }

    _scheduleReconcile() {
        if (!this._alive)
            return;
        if (this._pendingReconcile)
            GLib.Source.remove(this._pendingReconcile);

        this._pendingReconcile = GLib.timeout_add(GLib.PRIORITY_DEFAULT,
            MONITOR_QUIET_MS, () => {
                this._pendingReconcile = 0;
                if (this._alive)
                    this._reconcile();
                return GLib.SOURCE_REMOVE;
            });
        GLib.Source.set_name_by_id(this._pendingReconcile,
            '[workspace-islands-companion] monitor settle');
    }

    _reconcile() {
        if (!this._settings.get_boolean('auto-manage'))
            return;

        const desired = desiredIslandsEnabled(Main.layoutManager.monitors.length);
        if (desired === null)
            return;

        const upstream = Main.extensionManager.lookup(ISLANDS_UUID);
        if (!upstream) {
            console.warn('workspace-islands-companion: Workspace Islands is not installed');
            return;
        }
        if (Boolean(upstream.enabled) === desired)
            return;

        // Workspace Islands requires the primary-only Mutter workspace model.
        // Never change an unrelated user preference to satisfy that dependency.
        if (desired && !this._mutterSettings.get_boolean(ONLY_ON_PRIMARY)) {
            console.warn('workspace-islands-companion: cannot enable Islands; ' +
                `${MUTTER_SCHEMA}.${ONLY_ON_PRIMARY} must be true`);
            return;
        }

        // This modifies only GNOME's extension enablement preferences. The
        // manager may asynchronously rebase extension order; disable() above
        // is safe during that reinitialization and cancels stale work.
        const applied = desired
            ? Main.extensionManager.enableExtension(ISLANDS_UUID)
            : Main.extensionManager.disableExtension(ISLANDS_UUID);
        if (!applied)
            console.warn('workspace-islands-companion: failed to update Islands enabled state');
    }

    _switch(delta) {
        const count = Main.layoutManager.monitors.length;
        const focusedIndex = global.display.focus_window?.get_monitor() ?? -1;
        const pointerIndex = global.display.get_current_monitor();
        const target = workspaceTarget(focusedIndex, pointerIndex,
            Main.layoutManager.primaryIndex, count);

        if (target === 'primary') {
            // Use GNOME's own workspace activation and animation. This does
            // not affect secondary displays with workspaces-only-on-primary.
            const direction = delta > 0 ? Meta.MotionDirection.RIGHT : Meta.MotionDirection.LEFT;
            const active = global.workspace_manager.get_active_workspace();
            const next = active?.get_neighbor(direction);
            if (next && next !== active)
                Main.wm.actionMoveWorkspace(next);
            return;
        }

        if (target === 'secondary') {
            const islands = Main.extensionManager.lookup(ISLANDS_UUID)?.stateObj;
            if (typeof islands?._switchRelative !== 'function' || !islands._registry) {
                console.warn('workspace-islands-companion: Islands not active; ' +
                    'secondary workspace switch skipped');
                return;
            }
            // Private method: intentionally isolated to this one call site.
            // This is a compatibility boundary, not an upstream public API.
            islands._switchRelative(delta);
        }
    }
}
