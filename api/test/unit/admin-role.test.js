import '../setup.js';
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { isAdmin, isEnvAdmin, publicUser } from '../../src/models/User.js';

describe('quyền quản trị', () => {
  it('email trong ADMIN_EMAILS là admin, không phân biệt hoa thường', () => {
    assert.equal(isEnvAdmin({ email: 'boss@example.com' }), true);
    assert.equal(isEnvAdmin({ email: 'BOSS2@example.com' }), true);
    assert.equal(isEnvAdmin({ email: 'an@example.com' }), false);
  });

  it('role admin trong database cũng là admin', () => {
    assert.equal(isAdmin({ email: 'an@example.com', role: 'admin' }), true);
    assert.equal(isAdmin({ email: 'an@example.com', role: 'user' }), false);
    assert.equal(isAdmin(null), false);
  });

  it('tài khoản demo không bao giờ là admin', () => {
    assert.equal(isEnvAdmin({ email: 'boss@example.com', isDemo: true }), false);
    assert.equal(isAdmin({ email: 'boss@example.com', role: 'admin', isDemo: true }), false);
    assert.equal(publicUser({ _id: '1', name: 'Demo', email: 'boss@example.com', isDemo: true }).role, 'user');
  });
});
