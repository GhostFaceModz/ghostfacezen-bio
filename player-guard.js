/* Referrer identity for the YouTube embed. Works in the browser and in node:test. */
(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  root.ghostPlayerGuard = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  // strict-origin-when-cross-origin sends the page origin on both http→https
  // and https→https. It only drops the Referer on an https→http downgrade.
  // YouTube error 153 is the embed request arriving with no Referer at all.
  const EMBED_REFERRER_POLICY = 'strict-origin-when-cross-origin';
  const EMBED_URL = /^(?:https?:)?\/\/(?:[\w-]+\.)?(?:youtube\.com|youtube-nocookie\.com)\/embed(?:\/|[?#]|$)/i;

  function referrerPolicyForUrl(url) {
    return typeof url === 'string' && EMBED_URL.test(url) ? EMBED_REFERRER_POLICY : '';
  }

  // 153 is "video player configuration error" (missing embedder Referer).
  // It is not specific to one track, so the playlist must not skip past it.
  function isEmbedConfigurationError(code) {
    return code === 153;
  }

  return { referrerPolicyForUrl, isEmbedConfigurationError, EMBED_REFERRER_POLICY };
});
