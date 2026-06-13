# Authelia OIDC

Dashy supports using [Authelia](https://www.authelia.com/) as its OIDC provider.

[Authelia](https://www.authelia.com/) is an [open source](https://github.com/authelia/authelia) authentication and authorization server for self-hosted services. It speaks OIDC, supports MFA, and is configured via a single YAML file. Users live in a flat file, LDAP, or your own SQL store. It's a popular pairing with reverse proxies for forward-auth across many apps, and the same instance can act as your Dashy OIDC provider.

### Contents

- [1. Deploy Authelia](#1-deploy-authelia)
- [2. Configure Authelia](#2-configure-authelia)
  - [Generate secrets and keys](#generate-secrets-and-keys)
  - [Users database](#users-database)
  - [Main configuration](#main-configuration)
- [3. Enabling Authelia in Dashy](#3-enabling-authelia-in-dashy)
- [4. Groups and Visibility](#4-groups-and-visibility)
- [Troubleshooting](#troubleshooting-common-authelia-issues)
- [How it Works](#how-it-works)
  - [Client side](#client-side)
  - [Server side](#server-side)
  - [Visual Overview](#visual-overview)

## 1. Deploy Authelia

Authelia v4.38+ requires HTTPS for the session cookie URLs. In production, terminate TLS at a reverse proxy on a real domain. For local testing the example below uses a self-signed cert and `lvh.me`, a wildcard DNS name that resolves to `127.0.0.1` everywhere, so no /etc/hosts edits are needed.

<details>
    <summary>Example <code>docker-compose.yml</code></summary>

```yaml
name: dashy-authelia

services:
  authelia:
    image: authelia/authelia:4.38
    restart: unless-stopped
    ports:
      - "9091:9091"
    volumes:
      - ./config:/config
    environment:
      TZ: UTC
    healthcheck:
      test: ["CMD-SHELL", "wget --no-check-certificate -qO- https://127.0.0.1:9091/api/health >/dev/null 2>&1"]
      start_period: 20s
      interval: 10s
      timeout: 5s
      retries: 10
```

</details>

The `config/` directory holds Authelia's `configuration.yml`, the user database, the OIDC signing key, and (for local testing) the TLS cert. Generate them in step 2.

---

## 2. Configure Authelia

### Generate secrets and keys

Authelia needs four secrets: a session secret, a storage encryption key, an OIDC HMAC secret, and an RSA private key for signing id_tokens. For local testing also generate a self-signed TLS cert.

```bash
mkdir -p config
SESSION_SECRET=$(openssl rand -hex 64)
STORAGE_KEY=$(openssl rand -hex 32)
HMAC_SECRET=$(openssl rand -hex 64)

openssl genrsa -out config/oidc-private.pem 2048

# Local testing only. In production use a real cert from your reverse proxy.
openssl req -x509 -newkey rsa:2048 -nodes \
  -keyout config/tls.key -out config/tls.crt \
  -days 365 -subj "/CN=authelia.lvh.me" \
  -addext "subjectAltName=DNS:authelia.lvh.me,DNS:*.lvh.me"
```

Keep the three shell variables around: you'll paste them into `configuration.yml` below.

### Users database

Hash a password with Authelia's CLI:

```bash
docker run --rm authelia/authelia:4.38 \
  authelia crypto hash generate argon2 --password 'YourPasswordHere'
```

Copy the `Digest:` value into `config/users_database.yml`:

```yaml
users:
  authelia-admin:
    disabled: false
    displayname: "Authelia Admin"
    password: "$argon2id$v=19$m=65536,t=3,p=4$..."
    email: admin@example.com
    groups:
      - admins
  authelia-user:
    disabled: false
    displayname: "Authelia User"
    password: "$argon2id$v=19$m=65536,t=3,p=4$..."
    email: user@example.com
    groups:
      - users
```

The `admins` group name is what Dashy's `adminGroup` will match.

### Main configuration

`config/configuration.yml`:

```yaml
theme: light
server:
  address: 'tcp://:9091'
  tls:
    certificate: /config/tls.crt
    key: /config/tls.key
log:
  level: info
totp:
  issuer: authelia.lvh.me
authentication_backend:
  password_reset:
    disable: true
  file:
    path: /config/users_database.yml
    password:
      algorithm: argon2id
access_control:
  default_policy: one_factor
session:
  secret: <SESSION_SECRET>
  cookies:
    - domain: 'lvh.me'
      authelia_url: 'https://authelia.lvh.me:9091'
regulation:
  max_retries: 3
  find_time: 2m
  ban_time: 5m
storage:
  encryption_key: <STORAGE_KEY>
  local:
    path: /config/db.sqlite3
notifier:
  filesystem:
    filename: /config/notifications.txt
identity_providers:
  oidc:
    hmac_secret: <HMAC_SECRET>
    cors:
      endpoints:
        - authorization
        - token
        - revocation
        - introspection
        - userinfo
      allowed_origins:
        - http://localhost:4000
    jwks:
      - key_id: dashy
        algorithm: RS256
        use: sig
        key: |
          -----BEGIN PRIVATE KEY-----
          (contents of config/oidc-private.pem)
          -----END PRIVATE KEY-----
    clients:
      - client_id: dashy
        client_name: Dashy
        public: true
        authorization_policy: one_factor
        require_pkce: true
        pkce_challenge_method: S256
        redirect_uris:
          - http://localhost:4000
          - http://localhost:4000/
        scopes:
          - openid
          - profile
          - email
          - groups
        userinfo_signed_response_alg: none
```

Key things to note:

- `public: true` and `require_pkce: true` are required: Dashy is a SPA, so it must be a public client with PKCE
- Register the redirect URI both with and without a trailing slash, since browsers may strip or add one
- The `groups` scope is required for the `adminGroup` check
- `userinfo_signed_response_alg: none` keeps the userinfo response as JSON, which is what `oidc-client-ts` (Dashy's OIDC client) expects
- The `cors` block is required: Dashy is a SPA and makes cross-origin calls from the browser to Authelia's token and userinfo endpoints, and without these origins allow-listed the browser blocks the token exchange after login. `allowed_origins` must list Dashy's exact origin (scheme + host + port)

For production, swap `server.tls` out for a reverse proxy doing HTTPS, change `session.cookies` to your real domain (e.g. `domain: example.com`, `authelia_url: https://auth.example.com`), and pick a real user backend (LDAP or SQL).

Bring Authelia up:

```bash
docker compose up -d
```

Once it's healthy, `https://authelia.lvh.me:9091/.well-known/openid-configuration` should return JSON with `issuer: https://authelia.lvh.me:9091`. That issuer URL is what Dashy needs.

### Summary

Authelia is now configured with an OIDC client for Dashy.

---

## 3. Enabling Authelia in Dashy

In `/user-data/conf.yml`:

```yaml
appConfig:
  ...
  disableConfigurationForNonAdmin: true
  auth:
    enableOidc: true
    oidc:
      clientId: dashy
      endpoint: https://authelia.lvh.me:9091
      adminGroup: admins
      scope: openid profile email groups
```

Where:
- `disableConfigurationForNonAdmin` - Prevent read/write config access to non-admin users
- `auth.enableOidc` - Set the auth mode to OIDC
- `clientId` - Must match the `client_id` field of the Authelia client
- `endpoint` - The Authelia base URL (the OIDC issuer). Dashy appends `/.well-known/openid-configuration` itself
- `adminGroup` - Name of the Authelia group that grants admin in Dashy
- `scope` - Must include `groups` for the `adminGroup` check to work

Restart Dashy for these changes to take effect.

If Authelia uses a self-signed cert, Dashy's server has to trust it before it can fetch the discovery doc or JWKS. Start Dashy with `NODE_EXTRA_CA_CERTS=/path/to/tls.crt`, or mount your CA bundle into the Dashy container and point that env var at it. With a real cert this isn't needed. Your browser also needs to trust the cert (visit `https://authelia.lvh.me:9091` once and accept the warning, or import the cert into the browser's trust store).

Everything should now be fully configured and working 🎉
When you load Dashy, you'll be redirected to Authelia's login page. After signing in, you'll land back on Dashy's homepage with full access, and all of Dashy's client, server and asset endpoints will be locked behind authentication.

### Silent token renewal (optional)

By default, when your token expires Dashy sends you back through Authelia's login to get a new one. Set `enableSilentRenew: true` to have Dashy refresh the session quietly in the background instead, using a refresh token:

```yaml
    oidc:
      clientId: dashy
      endpoint: https://authelia.lvh.me:9091
      adminGroup: admins
      scope: openid profile email groups
      enableSilentRenew: true
```

Dashy adds the `offline_access` scope to its request automatically, but Authelia only issues a refresh token if the client is allowed to. Add `offline_access` to the client's `scopes` and `refresh_token` to its `grant_types`:

```yaml
    clients:
      - client_id: dashy
        scopes:
          - openid
          - profile
          - email
          - groups
          - offline_access
        grant_types:
          - authorization_code
          - refresh_token
```

It's off by default, and if a refresh ever fails Dashy falls back to the normal sign-in. See [silent token renewal](/docs/authentication#silent-token-renewal) for the full notes and caveats.

---

## 4. Groups and Visibility

Once group membership is in the id_token, you can use it to hide or show pages, sections and items. The property name is `hideForKeycloakUsers` / `showForKeycloakUsers` (the name is historical; it works for any OIDC provider, including Authelia).

To make an Admin section visible only to members of `admins`:

```yaml
displayData:
  showForKeycloakUsers:
    groups:
      - admins
```

Both `showForKeycloakUsers` and `hideForKeycloakUsers` accept lists of `groups` and `roles`. If a user matches an entry they're allowed or excluded as defined.

```yaml
sections:
  - name: Internal Tools
    displayData:
      showForKeycloakUsers:
        groups: ['admins']
      hideForKeycloakUsers:
        groups: ['users']
    items:
      - title: Hidden from interns
        displayData:
          hideForKeycloakUsers:
            groups: ['interns']
```

---

## Troubleshooting common Authelia Issues

#### Config validation fails on session cookies
Problem: Authelia refuses to start, complaining `option 'authelia_url' does not have a secure scheme` or `option 'domain' is not a valid cookie domain`.<br />
Solution: v4.38+ requires HTTPS for `authelia_url` and a cookie domain with at least one period. Use a real domain (`example.com`, `auth.example.com`) or `lvh.me` for local testing, and enable TLS either on Authelia or in front of it.

#### Dashy server can't fetch Authelia's discovery doc
Problem: Dashy server logs show TLS errors (`self-signed certificate`, `UNABLE_TO_VERIFY_LEAF_SIGNATURE`) when fetching `.well-known/openid-configuration` or the JWKS.<br />
Solution: Authelia is on a self-signed cert. Start Dashy with `NODE_EXTRA_CA_CERTS=/path/to/tls.crt`, or use a real certificate. The signing cert for OIDC tokens is separate from the TLS cert: it's the TLS cert that needs to be trusted by Node.

#### "Critical Configuration Load Error" with a CORS message on first load
Problem: Browser shows `Cross-Origin Request Blocked ... at https://authelia.lvh.me:9091/.well-known/openid-configuration. (Reason: CORS request did not succeed). Status code: (null)` before any redirect to Authelia, and Dashy renders a Critical Configuration Load Error.<br />
Solution: Misleading error: this is the self-signed cert, not CORS. When the browser sees an untrusted HTTPS cert during a JS fetch it blocks the request silently with no chance for you to click through. Open `https://authelia.lvh.me:9091` directly in the same browser, click through the warning, then reload Dashy. For a less hacky setup, use [mkcert](https://github.com/FiloSottile/mkcert) to generate a locally-trusted cert, or terminate TLS at a reverse proxy with a real Let's Encrypt cert.

#### CORS error on the token endpoint after login
Problem: Login at Authelia succeeds, but the redirect back to Dashy fails with a CORS error on a POST to `/api/oidc/token`.<br />
Solution: Authelia's CORS allow-list doesn't include Dashy's origin. Add the `identity_providers.oidc.cors` block from step 2 with `token` (and ideally `authorization`, `userinfo`, `revocation`, `introspection`) under `endpoints`, and Dashy's origin under `allowed_origins`. Restart Authelia.

#### Redirect loop after login
Problem: Browser bounces between Dashy and Authelia repeatedly.<br />
Solution: `endpoint` in `conf.yml` probably includes `.well-known/openid-configuration`. Drop everything from `.well-known` onwards; Dashy appends it itself.

#### invalid_request: redirect URI mismatch
Problem: Authelia returns `invalid_request` saying the redirect URI is not registered.<br />
Solution: Authelia matches redirect URIs exactly. Register both the bare URL and the trailing-slash variant (`http://localhost:4000` and `http://localhost:4000/`) on the client.

#### Logged in but config saves return 403
Problem: User authenticates fine, but saving the dashboard returns 403.<br />
Solution: The id_token isn't carrying the group claim. Paste the token (from localStorage, key `ID_TOKEN`) into [jwt.io](https://jwt.io) and look for `groups`. If it's missing, the client's `scopes` list doesn't include `groups`. If the claim is there but the user isn't in it, add them to the `admins` group in `users_database.yml` (or whatever backend you're using) and restart Authelia.

#### Issuer mismatch behind a reverse proxy
Problem: Server logs show `unexpected "iss" claim value`. The browser reaches Authelia at `https://auth.example.com` but Authelia advertises a different issuer.<br />
Solution: Make sure your reverse proxy forwards `X-Forwarded-Proto: https` and `X-Forwarded-Host`, and that `session.cookies[].authelia_url` matches the public URL exactly.

#### Locked out after a few wrong passwords
Problem: Login fails with "User has been banned" even with the correct password.<br />
Solution: The `regulation` block bans an account after `max_retries` failed attempts within `find_time`. Default ban is 5 minutes. Wait it out or `docker compose restart authelia` to clear the in-memory ban.

#### Two-factor prompt appears unexpectedly
Problem: After password entry Authelia asks for a TOTP code or other 2FA, but you wanted password-only for Dashy.<br />
Solution: `access_control.default_policy` is set to `two_factor`. Change it to `one_factor`, or add a specific rule with `policy: one_factor` matching the Dashy redirect.

#### Username claim is a UUID, not the username
Problem: Dashy logs show users with random-looking subject IDs.<br />
Solution: Authelia's `sub` claim is an opaque UUID per user. Dashy's OIDC client falls through `preferred_username`, `email`, then `sub`, so as long as the `profile` and `email` scopes are requested the username should be human-readable. Confirm both scopes are in the client's `scopes` list.

#### Token expired / clock skew
Problem: 401s with `"exp" claim timestamp check failed` or `"iat" claim timestamp check failed`, even just after login.<br />
Solution: Dashy allows 30 seconds of drift. Sync clocks on both hosts with NTP. Container clocks follow their host, so it's almost always the host that's drifted.

#### Numeric Client ID truncated
Problem: Audience mismatch when `clientId` in `conf.yml` is a long numeric string.<br />
Solution: Wrap numeric Client IDs in quotes (e.g. `clientId: "12345678901234567"`). Without quotes YAML parses the value as a JS number and loses precision past around 15 digits.

#### Dashy server can't reach Authelia
Problem: Auth'd API calls return 401 and Dashy logs show fetch errors for `.well-known/openid-configuration`.<br />
Solution: `endpoint` must be reachable from inside the Dashy container, not just from the browser. If both run in Docker, put them on the same network. Test with `docker exec <dashy-container> wget -qO- "$ENDPOINT/.well-known/openid-configuration"`.

#### Config change to auth.oidc not picked up
Problem: Updated `clientId`, `endpoint`, `adminGroup` or `scope` in `conf.yml`, but Dashy still uses the old values.<br />
Solution: The server reads the auth config only at boot. Restart the Dashy container after any change to fields under `auth.oidc`.

---

## How it Works

If you're a developer or contributor looking to understand or make changes to Dashy's OIDC implementation, the following outlines how it's wired together.

The same OIDC pipeline backs Authelia, Authentik, Keycloak, and any other generic OIDC provider. The only Authelia-specific code is your configuration; everything else is shared.

### Client side

Boot starts in [`src/main.js`](https://github.com/lissy93/dashy/blob/4.1.5/src/main.js). After the initial `/conf.yml` fetch parses the auth block, `isOidcEnabled()` decides whether to lazily import [`oidc-client-ts`](https://github.com/authts/oidc-client-ts) and call `initOidcAuth()`.

[`src/utils/auth/OidcAuth.js`](https://github.com/lissy93/dashy/blob/4.1.5/src/utils/auth/OidcAuth.js) wraps `oidc-client-ts`. On load it inspects the URL: if it sees a `?code=` callback it runs `userManager.signinCallback()` to exchange the code (and PKCE verifier) for tokens, persists the user info, and hard-redirects to `/`. Otherwise it calls `userManager.getUser()`; if there's no usable session it falls through to `userManager.signinRedirect()` to send the browser to Authelia. A short-lived `sessionStorage` guard prevents the redirect loop that would otherwise occur if the IdP returns without a usable user.

`persistUserInfo()` writes the raw `id_token`, the user's `groups` and `roles`, a derived `isAdmin` flag, and a username (falling back through `preferred_username`, `email`, and `sub`) to localStorage. The keys (`ID_TOKEN`, `KEYCLOAK_INFO`, `USERNAME`, `ISADMIN`) live in [`src/utils/config/defaults.js`](https://github.com/lissy93/dashy/blob/4.1.5/src/utils/config/defaults.js); the `KEYCLOAK_INFO` name is historical and reused for all OIDC providers, including Authelia.

[`src/utils/auth/getApiAuthHeader.js`](https://github.com/lissy93/dashy/blob/4.1.5/src/utils/auth/getApiAuthHeader.js) builds the Authorization header for every internal API call. It does a client-side `exp` check and returns `null` for missing or expired tokens, so the next request triggers a fresh login rather than a 401.

[`src/utils/IsVisibleToUser.js`](https://github.com/lissy93/dashy/blob/4.1.5/src/utils/IsVisibleToUser.js) reads `KEYCLOAK_INFO` when evaluating `showForKeycloakUsers` and `hideForKeycloakUsers` rules.

### Server side

[`services/auth-oidc.js`](https://github.com/lissy93/dashy/blob/4.1.5/services/auth-oidc.js) contains the entire server-side auth surface, in five small pieces:

- `loadOidcSettings()` reads `auth.oidc` (or `auth.keycloak`) at boot and returns a normalised `{ issuer, clientId, adminGroup, adminRole }`. For generic OIDC providers the `issuer` is whatever you set as `endpoint` in `conf.yml`, verbatim
- `createOidcMiddleware()` returns a Connect middleware. Permissive on no-token requests so the SPA can bootstrap; otherwise it verifies the Bearer token against the issuer's JWKS using [`jose`](https://github.com/panva/jose). Checks cover signature, issuer (against the canonical value from the discovery doc), audience (must equal `clientId`), and expiry, with a 30-second clock-skew tolerance. Sets `req.auth = { user, isAdmin, claims }` on success, `401` on failure
- `getIssuerContext()` lazily fetches `.well-known/openid-configuration` on first use and wraps `jwks_uri` in `createRemoteJWKSet`, which handles JWKS caching and on-demand key rotation. The result is memoised per-issuer for the life of the process
- `deriveIsAdmin()` checks the token's `groups` claim against `adminGroup`, and the `realm_access.roles` / `resource_access.<clientId>.roles` arrays against `adminRole`. Authelia only emits `groups`, so the group path is what's used in practice
- `maybeBootstrapConfig()` is the stripped-response helper. When auth is configured, guest access is off, and an unauthenticated request hits the root `/conf.yml`, it returns a minimal copy with only `appConfig.auth`, `appConfig.enableServiceWorker`, and a `pageInfo.title` of `Login | <your title>`. Sections, items, hostnames and any other secrets never leave the server

[`services/app.js`](https://github.com/lissy93/dashy/blob/4.1.5/services/app.js) wires it all together. The middleware mounts as `protectConfig` in front of every YAML route and config-mutating route. The `/*.yml` handler sets `Cache-Control: private, no-store` and `Vary: Authorization` whenever auth is configured (so intermediate caches can never mix auth states), then calls `maybeBootstrapConfig`; a stripped result is sent as-is, otherwise `res.sendFile` serves the full file. `POST /config-manager/save` is additionally guarded by `requireAdmin`, which returns `401` if `req.auth` is unset and `403` if `req.auth.isAdmin` is false.

### Visual Overview

<details>

<summary>End-to-end authentication flow</summary>

```mermaid
sequenceDiagram
    autonumber
    actor User
    participant Browser as Browser (Dashy SPA)
    participant Dashy as Dashy Server
    participant Auth as Authelia

    Note over Browser,Dashy: 1. Bootstrap (no token yet)
    User->>Browser: Open Dashy
    Browser->>Dashy: GET /conf.yml
    Dashy-->>Browser: 200 stripped conf<br />(auth block + minimal pageInfo)
    Browser->>Browser: Parse auth.oidc

    Note over Browser,Auth: 2. OIDC login (Authorization Code + PKCE)
    Browser->>Auth: 302 /api/oidc/authorization<br />client_id, code_challenge, redirect_uri
    User->>Auth: Submit credentials
    Auth-->>Browser: 302 back with ?code=AUTH_CODE
    Browser->>Auth: POST /api/oidc/token<br />(code + code_verifier)
    Auth-->>Browser: id_token + access_token
    Browser->>Browser: Store tokens in localStorage<br />hard reload to /

    Note over Browser,Dashy: 3. Authenticated read
    Browser->>Dashy: GET /conf.yml<br />Authorization: Bearer id_token
    Dashy->>Auth: Fetch discovery + JWKS<br />(lazy on first call, then cached)
    Auth-->>Dashy: openid-configuration + JWKS
    Dashy->>Dashy: Verify signature / issuer / audience / expiry
    Dashy-->>Browser: 200 full conf.yml

    Note over Browser,Dashy: 4. Write request (admin only)
    Browser->>Dashy: POST /config-manager/save<br />Authorization: Bearer id_token
    Dashy->>Dashy: Verify token, derive isAdmin from<br />adminGroup claim
    alt isAdmin
        Dashy-->>Browser: 200 saved
    else not admin
        Dashy-->>Browser: 403 Forbidden
    end
```

</details>

<details>

<summary>Server-side request handling</summary>

```mermaid
flowchart TD
    Req([Incoming request to Dashy server])
    Req --> Bearer{Authorization:<br />Bearer present?}

    Bearer -- No --> NoAuth[req.auth unset<br />pass through]:::neutral
    Bearer -- Yes --> Verify[/Verify JWT against cached JWKS:<br />signature · issuer · audience · expiry/]
    Verify --> Valid{Valid?}
    Valid -- No --> R401Bad[/401 Unauthorized/]:::err
    Valid -- Yes --> SetAuth[req.auth = user + isAdmin<br />derived from claims]:::ok

    NoAuth --> Route{Endpoint}
    SetAuth --> Route

    Route -- "GET /conf.yml" --> ConfGate{req.auth?}
    ConfGate -- No --> Strip[/200 stripped conf<br />auth + minimal pageInfo/]:::ok
    ConfGate -- Yes --> Full[/200 full conf.yml/]:::ok

    Route -- "POST /config-manager/save" --> SaveGate{req.auth<br />and isAdmin?}
    SaveGate -- No req.auth --> R401Save[/401 Unauthorized/]:::err
    SaveGate -- Not admin --> R403[/403 Forbidden/]:::err
    SaveGate -- Admin --> Saved[/200 saved/]:::ok

    classDef ok fill:#bbf7d0,stroke:#16a34a,color:#14532d
    classDef err fill:#fecaca,stroke:#dc2626,color:#7f1d1d
    classDef neutral fill:#dbeafe,stroke:#2563eb,color:#1e3a8a
```

</details>
