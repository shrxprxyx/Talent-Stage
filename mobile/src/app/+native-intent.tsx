// Sends OAuth redirect deep links to the root, where index.tsx routes the user on.
export function redirectSystemPath({ path }: { path: string; initial: boolean }) {
  if (/(sso|oauth)[-_]?(native[-_])?callback/i.test(path)) return '/';
  return path;
}