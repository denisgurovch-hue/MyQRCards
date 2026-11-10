import { hashPassword, verifyPassword } from './password';

describe('password helpers', () => {
  it('hashes and verifies passwords', async () => {
    const hash = await hashPassword('StrongPassphrase123!');
    expect(hash).not.toContain('StrongPassphrase123!');
    await expect(verifyPassword('StrongPassphrase123!', hash)).resolves.toBe(
      true,
    );
    await expect(verifyPassword('wrong-password', hash)).resolves.toBe(false);
  });
});
