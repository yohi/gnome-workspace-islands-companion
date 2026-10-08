/** Pure policy helpers (no GNOME Shell / GI dependencies). */

/**
 * null means the display configuration is transient or unreadable. During
 * hotplug GNOME may briefly report no monitors; never use that as a reason
 * to disable a running extension.
 */
export function desiredIslandsEnabled(monitorCount) {
    if (!Number.isInteger(monitorCount) || monitorCount < 1)
        return null;

    return monitorCount > 1;
}

export function isExtensionActive(extension, activeState) {
    return extension?.state === activeState;
}

/**
 * Prefer the focused window over pointer position, matching Workspace Islands.
 * A missing or invalid target is never silently treated as the primary.
 */
export function workspaceTarget(focusedMonitorIndex, pointerMonitorIndex,
    primaryMonitorIndex, monitorCount) {
    if (!Number.isInteger(primaryMonitorIndex) || primaryMonitorIndex < 0 ||
        !Number.isInteger(monitorCount) || monitorCount < 1 ||
        primaryMonitorIndex >= monitorCount)
        return 'unknown';

    const valid = i => Number.isInteger(i) && i >= 0 && i < monitorCount;
    const target = valid(focusedMonitorIndex)
        ? focusedMonitorIndex
        : pointerMonitorIndex;

    if (!valid(target))
        return 'unknown';

    return target === primaryMonitorIndex ? 'primary' : 'secondary';
}
