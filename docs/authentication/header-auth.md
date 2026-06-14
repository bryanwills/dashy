# Header Authentication

Header authentication lets Dashy trust a reverse proxy in front of it to handle login. The proxy authenticates the user, then passes their username to Dashy in an HTTP header. Dashy reads that header and signs them in automatically, so there's no separate Dashy login page.

Use this when you already run something like [Authelia](https://www.authelia.com/), [Authentik](https://goauthentik.io/), Traefik's `forwardAuth`, Caddy's `forward_auth`, or nginx's `auth_request` in front of your services, and you want Dashy to pick up the same session.

### Contents

- [Configure Dashy](#configure-dashy)
- [Configure your proxy](#configure-your-proxy)
- [Troubleshooting](#troubleshooting)
- [Security notes](#security-notes)
- [How it works](#how-it-works)

## Configure Dashy

In `/user-data/conf.yml`, set the `auth` block under `appConfig`:

```yaml
appConfig:
  auth:
    enableHeaderAuth: true
    users:
      - user: alice
        hash: 0a7b1d4c2e...   # SHA-256 hash, see below
        type: admin
      - user: bob
        hash: 3f8e2b1a9d...
        type: normal
    headerAuth:
      userHeader: Remote-User
      proxyWhitelist:
        - 172.18.0.2
```

- `enableHeaderAuth` - turns the mode on
- `userHeader` - the header holding the username. Defaults to `Remote-User`. Authelia sends `Remote-User`, Authentik sends `X-authentik-username`; use whatever yours forwards. The name is case-insensitive
- `proxyWhitelist` - the IP(s) Dashy will accept the header from. Anything not on this list is rejected, which is what stops a client from setting the header itself. Required in practice: if it's empty, nothing gets through
- `users` - the people allowed in. The forwarded username is matched (case-insensitive) against this list to find their `type` (`admin` or `normal`). They still need an entry here even though the proxy did the actual auth

The `hash` is a SHA-256 of any string. Nobody types it, since the proxy already logged them in, but Dashy uses it to derive the session token it keeps in the browser, so each user needs one. Generate it the same way as for [built-in auth](/docs/built-in#generating-a-password-hash).

## Configure your proxy

Two things the proxy has to do:

1. Forward the username header on every request to Dashy (e.g. `Remote-User: alice`). On most forward-auth setups this is a one-line setting
2. Connect to Dashy from an IP that's in `proxyWhitelist`

The whitelist is the security boundary, so Dashy must only be reachable through the proxy. If someone can hit Dashy directly and their IP happens to be whitelisted, they can forge the header. See [Security notes](#security-notes).

## Troubleshooting

#### 401 "Unauthorized - not from trusted proxy"
The request reached Dashy from an IP that isn't in `proxyWhitelist`. The check is on the direct connection IP, so with Docker that's the proxy container's address on the shared network, not the host or the client's IP. Find it with `docker inspect <proxy-container>` (or read the rejected IP from Dashy's logs) and add it.

#### 401 "Unauthorized - missing user header"
The request came from a trusted IP but had no username header. Either the proxy isn't forwarding it, or `userHeader` doesn't match the header name the proxy actually sends. Check the exact header in your proxy config.

#### "User '...' from upstream proxy was not found in conf.yml"
The proxy sent a username with no matching entry in `auth.users`. Add a user whose `user` matches it (case doesn't matter).

#### Logged in but can't save the config
That user's `type` isn't `admin`. Saving is admin-only, so set `type: admin` on their entry.

#### Logging out just logs me back in
Expected. Logout clears Dashy's cookie, but you're still signed in at the proxy, so the next page load re-authenticates from the header. To fully sign out, log out at the proxy.

## Security notes

- Header auth is only as strong as the proxy in front of it. Dashy trusts any whitelisted IP that sends the header, so the whole model depends on Dashy being unreachable except through the proxy. Lock that down at the network or firewall level
- Keep `proxyWhitelist` tight: just the proxy's real connecting IP(s), nothing broader
- The username and role come from `conf.yml`. A user the proxy authenticates but that you haven't listed is refused, so removing someone from `auth.users` blocks them even if the proxy still lets them through

## How it works

1. The user hits Dashy through the proxy. The proxy authenticates them and adds the username header
2. On load, Dashy's frontend calls `/get-user`. The server checks the request IP against `proxyWhitelist`, and if it's trusted, reads the username from `userHeader` and returns it
3. The frontend looks that username up in `auth.users`, derives a session token from the user and hash, sets the auth cookie, and stores the username
4. From there it's normal Dashy auth: `isLoggedIn`, the admin check, and the per-page, section and item visibility rules all work as usual

Server-side, the same proxy-whitelist middleware guards the config and API routes, so a request from an untrusted IP is rejected before it reaches anything. Writes (saving config) additionally require the matched user to be `type: admin`.

The relevant code is `src/utils/auth/HeaderAuth.js` on the frontend, and `services/app.js` with `services/get-user.js` on the server.
