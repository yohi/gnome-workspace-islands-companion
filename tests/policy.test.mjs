import assert from 'node:assert/strict';
import {test} from 'node:test';
import {desiredIslandsEnabled, workspaceTarget} from '../src/policy.js';

test('one monitor disables, multiple enables', () => {
    assert.equal(desiredIslandsEnabled(1), false);
    assert.equal(desiredIslandsEnabled(2), true);
    assert.equal(desiredIslandsEnabled(3), true);
});

test('transient and invalid layouts do not change state', () => {
    for (const value of [0, -1, 1.5, NaN, null, undefined])
        assert.equal(desiredIslandsEnabled(value), null);
});

test('focused window wins over mouse pointer', () => {
    assert.equal(workspaceTarget(1, 0, 0, 2), 'secondary');
    assert.equal(workspaceTarget(0, 1, 0, 2), 'primary');
});

test('pointer is fallback when no focused window', () => {
    assert.equal(workspaceTarget(-1, 1, 0, 2), 'secondary');
    assert.equal(workspaceTarget(-1, 0, 0, 2), 'primary');
});

test('invalid focus or layout safely declines dispatch', () => {
    assert.equal(workspaceTarget(-1, -1, 0, 2), 'unknown');
    assert.equal(workspaceTarget(3, 3, 0, 2), 'unknown');
    assert.equal(workspaceTarget(0, 0, -1, 2), 'unknown');
    assert.equal(workspaceTarget(0, 0, 0, 0), 'unknown');
});

test('non-zero primary index is respected', () => {
    assert.equal(workspaceTarget(0, 1, 1, 2), 'secondary');
    assert.equal(workspaceTarget(1, 0, 1, 2), 'primary');
});
