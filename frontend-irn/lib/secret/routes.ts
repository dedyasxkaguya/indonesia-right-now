export const SECRET_ROOT = '/__halaman-gelap';
export const SECRET_TRUTH = '/__halaman-gelap/truth';

/** Internal destinations for the middleware rewrite; never linked from the UI. */
export const SECRET_INTERNAL_ROOT = '/zona-gelap';
export const SECRET_INTERNAL_TRUTH = '/zona-gelap/truth';

export function isSecretPath(pathname: string): boolean {
  const secretPaths = [SECRET_ROOT, SECRET_TRUTH, SECRET_INTERNAL_ROOT, SECRET_INTERNAL_TRUTH];
  return secretPaths.some((path) => pathname === path || pathname.startsWith(`${path}/`));
}
