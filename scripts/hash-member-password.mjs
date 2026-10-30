import { randomBytes, scryptSync } from 'node:crypto';

const password = process.env.MEMBER_PASSWORD;

if (!password) {
  throw new Error('MEMBER_PASSWORD 환경 변수에 비밀번호를 입력하세요.');
}

const cost = 16384;
const blockSize = 8;
const parallelization = 1;
const salt = randomBytes(16);

const derivedKey = scryptSync(password, salt, 64, {
  N: cost,
  r: blockSize,
  p: parallelization,
});

console.log(
  [
    'scrypt',
    cost,
    blockSize,
    parallelization,
    salt.toString('base64url'),
    derivedKey.toString('base64url'),
  ].join('$')
);