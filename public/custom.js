/**
 * Swagger pre-auth and auth script for Swagger UI
 * @author TheRolf
 */
(function () {
  const API_KEY = 'ApiKey';

  function startUntil(func, cond) {
    const it = setInterval(() => {
      if (!cond()) return;

      // if condition true, disable interval
      clearInterval(it);

      // start function
      func();
    }, 20);
  }

  function getKeys() {
    const value = window.localStorage.getItem(API_KEY);

    // if new guy, return empty object
    if (!value) return {};

    // try to parse and return value
    try {
      return JSON.parse(value);
    } catch {}

    // if not parsed, set empty object
    return {};
  }

  startUntil(
    () => {
      const originalAuthorize = ui.authActions.authorize;

      // on login
      ui.authActions.authorize = function (payload) {
        const key = Object.keys(payload)[0];

        // get stored keys
        const apiKeys = getKeys();

        // add this one
        apiKeys[key] = payload[key].value;

        // update keys
        window.localStorage.setItem(API_KEY, JSON.stringify(apiKeys));

        // call original key
        return originalAuthorize(payload);
      };

      // if logout is clicked delete the api key in the local storage
      const originalLogout = ui.authActions.logout;

      // on logout
      ui.authActions.logout = function (payload) {
        const apiKeys = getKeys();

        console.log(apiKeys);
        // delete key if existing
        if (payload[0] in apiKeys) delete apiKeys[payload[0]];

        // update keys
        window.localStorage.setItem(API_KEY, JSON.stringify(apiKeys));

        // call original key
        return originalLogout(payload);
      };

      // on load
      // load each token,
      // For each existing token, pre auth
      const apiKeys = getKeys();

      const keys = Object.keys(apiKeys);
      keys.forEach((key) => {
        window.ui.preauthorizeApiKey(key, apiKeys[key]);
      });

      if (keys.length) console.info(`Pre-authed to ${keys.join(', ')}`);
    },
    () => window.ui !== undefined,
  );
})();
