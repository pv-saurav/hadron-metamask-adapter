// -----------------------------------------------------------------------------
// Utility helpers for working with MetaMask (desktop & mobile) in a type‑safe way
// -----------------------------------------------------------------------------

import type { EIP1193Provider } from '@hadron/abstract-adapter-evm';

/**
 * Augment the global `window` type so TypeScript recognises MetaMask’s
 * injected objects (`window.ethereum` and its variants).
 */
declare global {
  interface Window {
    /** Injected by MetaMask (or other EIP‑1193 wallets). */
    ethereum?: EIP1193Provider;
  }
}

/* -------------------------------------------------------------------------- */
/* 1. Safely obtain the MetaMask provider (desktop & mobile‑extension)        */
/* -------------------------------------------------------------------------- */

/**
 * Locate and return the genuine MetaMask provider if available.
 *
 * 1. Return `null` when no provider is injected at all.
 * 2. Prefer the single top‑level `window.ethereum` when:
 *      • it claims to be MetaMask (`isMetaMask === true`)
 *      • and is **not** faked by setting `overrideIsMetaMask === true`
 * 3. When both Coinbase Wallet **and** MetaMask are installed, Coinbase
 *    overrides `window.ethereum`. In that case, MetaMask still exposes
 *    itself inside `window.ethereum.providers`. We scan the array and
 *    pick the one whose `isMetaMask` flag is `true`.
 */
export function getMetaMaskProvider(): EIP1193Provider | null {
  // ------------- No injected wallet at all -----------------------------
  if (!window.ethereum) {
    return null;
  }

  // ------------- Fast‑path: genuine MetaMask is the default provider ---
  if (window.ethereum.isMetaMask && !(window.ethereum as any).overrideIsMetaMask) {
    return window.ethereum as EIP1193Provider;
  }

  // ------------- Fallback: multiple providers scenario -----------------
  //    (e.g. Coinbase overrides `window.ethereum`, MetaMask hides in
  //     `window.ethereum.providers`).
  //    We ignore the TS error because `providers` is not part of the
  //    standard EIP‑1193 typings yet.
  // @ts-ignore – non‑standard field provided by MetaMask / Coinbase
  return window.ethereum.providers?.find(
    (item: EIP1193Provider) => item.isMetaMask,
  ) || null;
}

/* -------------------------------------------------------------------------- */
/* 2. Detect if the code is executing inside MetaMask Mobile’s in‑app browser */
/* -------------------------------------------------------------------------- */

/**
 * MetaMask Mobile injects two clues:
 *  • `window.ReactNativeWebView` (React Native bridge)
 *  • `navigator.userAgent` ending with `MetaMaskMobile`
 */
export function isMetaMaskMobileWebView(): boolean {
  // safety guard
  if (typeof window === 'undefined') return false;

  // @ts-ignore – `ReactNativeWebView` is injected only in MetaMask Mobile
  return Boolean(window.ReactNativeWebView) &&
         navigator.userAgent.endsWith('MetaMaskMobile');
}

/* -------------------------------------------------------------------------- */
/* 3. Deep‑link helper – open the current dApp inside MetaMask Mobile         */
/* -------------------------------------------------------------------------- */

/**
 * Opens the current page inside MetaMask Mobile using the official deep‑link
 * schema. Uses different formats for Android vs. iOS/Web:
 *
 *  • Android:  `dapp://<origin-and-path>`
 *  • iOS/Web:  `https://metamask.app.link/dapp/<origin-and-path>`
 *
 * Example:
 *   https://myDapp.com/page   →   dapp://myDapp.com/page
 *                             →   https://metamask.app.link/dapp/myDapp.com/page
 */
export function openMetaMaskWithDeeplink(): void {
  const { href, protocol } = window.location;

  // Strip `http:` or `https:` and leading `//` → "myDapp.com/page"
  const originLink = href.replace(protocol, '').slice(2);

  // Universal link (iOS & external browsers)
  const iosLink  = `https://metamask.app.link/dapp/${originLink}`;

  // Custom scheme (Android, triggers the “Open in app” chooser)
  const androidLink = `dapp://${originLink}`;

  const ua = navigator.userAgent || '';

  // Regex: true for Android Mobile browsers
  if (/\bAndroid(?:.+)Mobile\b/i.test(ua)) {
    window.location.href = androidLink;
  } else {
    window.open(iosLink, '_blank');
  }
}
