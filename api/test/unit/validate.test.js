import '../setup.js';
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  passwordProblem,
  validateAttachment,
  validateComment,
  validateForgot,
  validateInvite,
  validateMinutes,
  validatePasswordChange,
  validateProfile,
  validateRegister,
  validateReset,
} from '../../src/lib/validate.js';

const fieldsOf = (fn) => {
  try {
    fn();
  } catch (err) {
    assert.equal(err.status, 400);
    return err.fields;
  }
  assert.fail('Đáng lẽ phải báo lỗi');
};

describe('mật khẩu', () => {
  it('cần 8 ký tự, có chữ và số, tối đa 72 byte', () => {
    assert.match(passwordProblem('abc1'), /8/);
    assert.match(passwordProblem('abcdefgh'), /chữ và số/);
    assert.match(passwordProblem('12345678'), /chữ và số/);
    assert.match(passwordProblem('ă'.repeat(40) + '1'), /quá dài/);
    assert.equal(passwordProblem('matkhau123'), null);
    assert.equal(passwordProblem('mậtkhẩu123'), null);
  });

  it('đổi mật khẩu: tài khoản Google đặt lần đầu không cần mật khẩu cũ', () => {
    assert.ok(fieldsOf(() => validatePasswordChange({ newPassword: 'moi123456' })).currentPassword);
    assert.deepEqual(validatePasswordChange({ newPassword: 'moi123456' }, { requireCurrent: false }), { currentPassword: '', newPassword: 'moi123456' });
    assert.ok(fieldsOf(() => validatePasswordChange({ currentPassword: 'cu123456a', newPassword: 'cu123456a' })).newPassword);
  });
});

describe('đăng ký, quên mật khẩu, lời mời', () => {
  it('chuẩn hoá tên và email', () => {
    const data = validateRegister({ name: '  Duy   An ', email: ' AN@Example.COM ', password: 'abc12345' });
    assert.deepEqual(data, { name: 'Duy An', email: 'an@example.com', password: 'abc12345' });
  });

  it('báo lỗi từng trường', () => {
    const fields = fieldsOf(() => validateRegister({ name: 'A', email: 'sai', password: '1' }));
    assert.deepEqual(Object.keys(fields).sort(), ['email', 'name', 'password']);
  });

  it('quên mật khẩu và mời thành viên cần email hợp lệ', () => {
    assert.deepEqual(validateForgot({ email: 'A@B.co' }), { email: 'a@b.co' });
    assert.ok(fieldsOf(() => validateForgot({ email: 'abc' })).email);
    assert.ok(fieldsOf(() => validateInvite({})).email);
  });

  it('đặt lại mật khẩu cần token và mật khẩu hợp lệ', () => {
    const fields = fieldsOf(() => validateReset({ token: '', password: 'x' }));
    assert.ok(fields.token && fields.password);
    assert.ok(fieldsOf(() => validateReset({ token: 'x'.repeat(201), password: 'abc12345' })).token);
  });
});

describe('ảnh trên Cloudinary', () => {
  const cloud = 'taskflow-test';
  const good = 'https://res.cloudinary.com/taskflow-test/image/upload/v1712345/taskflow/abc.jpg';

  it('nhận ảnh đúng tài khoản Cloudinary của app', () => {
    const data = validateAttachment({ url: good, name: ' anh.jpg ', width: '800', height: 600.4, bytes: -5, publicId: 'taskflow/abc' }, cloud);
    assert.deepEqual(data, { url: good, publicId: 'taskflow/abc', name: 'anh.jpg', width: 800, height: 600, bytes: 0 });
  });

  it('từ chối link lạ, tài khoản khác hoặc chèn mã', () => {
    for (const url of [
      'https://evil.com/a.jpg',
      'http://res.cloudinary.com/taskflow-test/image/upload/a.jpg',
      'https://res.cloudinary.com/other/image/upload/a.jpg',
      'https://res.cloudinary.com/taskflow-test/video/upload/a.mp4',
      'https://res.cloudinary.com/taskflow-test/image/upload/a.jpg"onerror="x',
      'javascript:alert(1)',
    ]) {
      assert.throws(() => validateAttachment({ url }, cloud), { status: 400 }, url);
    }
  });

  it('ảnh đại diện nhận link Cloudinary khi server đã cấu hình', () => {
    assert.deepEqual(validateProfile({ avatar: good }, { cloudName: cloud }), { avatar: good });
    assert.ok(fieldsOf(() => validateProfile({ avatar: good })).avatar);
    assert.ok(fieldsOf(() => validateProfile({ avatar: 'https://evil.com/a.png' }, { cloudName: cloud })).avatar);
    assert.deepEqual(validateProfile({ avatar: 'emoji:🐳' }), { avatar: 'emoji:🐳' });
    assert.deepEqual(validateProfile({ avatar: '' }), { avatar: '' });
    assert.ok(fieldsOf(() => validateProfile({ avatar: 'data:image/svg+xml;base64,PHN2Zz4=' })).avatar);
  });
});

describe('bình luận và Pomodoro', () => {
  it('bình luận 1 đến 1000 ký tự', () => {
    assert.deepEqual(validateComment({ text: '  Xong rồi  ' }), { text: 'Xong rồi' });
    assert.throws(() => validateComment({ text: '   ' }), { status: 400 });
    assert.throws(() => validateComment({ text: 'a'.repeat(1001) }), { status: 400 });
  });

  it('phiên Pomodoro 1 đến 120 phút', () => {
    assert.deepEqual(validateMinutes({ minutes: '25' }), { minutes: 25 });
    for (const minutes of [0, 121, 'abc', undefined]) assert.throws(() => validateMinutes({ minutes }), { status: 400 });
  });
});
