export function redirectToAuthWithCallback() {
  if (typeof window === 'undefined') return;
  const callbackUrl = `${window.location.pathname}${window.location.search}`;
  window.location.replace(`/auth?callbackUrl=${encodeURIComponent(callbackUrl)}`);
}
