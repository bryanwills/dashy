# Authentication

- [Basic Auth](#built-in-auth)
  - [Setting Up Authentication](#setting-up-authentication)
  - [Hash Password](#hash-password)
  - [Logging In and Out](#logging-in-and-out)
  - [Guest Access](#enabling-guest-access)
  - [Granular Access](#granular-access)
  - [Permissions](#permissions)
  - [Using Environment Variables for Passwords](#using-environment-variables-for-passwords)
  - [Adding HTTP Auth to Configuration](#adding-http-auth-to-configuration)
  - [Security](#security)
- [HTTP Auth](#http-auth)
  - [Using Config-File Users](#using-config-file-users-recommended)
  - [Using Static Credentials](#using-static-credentials)
- [Keycloak Auth](#keycloak)
- [Header Authentication](#header-authentication)
- [OIDC Auth](#oidc)
- [authentik](#authentik)
- [Alternative Authentication Methods](#alternative-authentication-methods)
  - [Reverse Proxy Auth](#reverse-proxy-auth)
  - [Zero-Trust Tunnels](#zero-trust-tunnels)
  - [VPN](#vpn)
  - [IP-Based Access](#ip-based-access)
  - [Web Server Authentication](#web-server-authentication)
  - [SSO / OAuth Providers](#sso--oauth-providers)
  - [Cloud Hosting Providers](#cloud-hosting-providers)

> [!IMPORTANT]
> It is your responsibility to properly secure your Dashy instance.
> Never expose your Dashy instance to the public internet or untrusted users without sufficient authentication and authorization in place.

## Built-In Auth

Dashy has a basic login page included, and frontend authentication. You can enable this by adding users to the `auth` section under `appConfig` in your `conf.yml`. If this section is not specified, then no authentication will be required to access the app, and the homepage will resolve to your dashboard. To also enable HTTP Authorization, set the `ENABLE_HTTP_AUTH` env var to `true`.

### Setting Up Authentication

The `auth` property takes an array of users. Each user needs to include a username, hash and optional user type (`admin` or `normal`). The hash property is a [SHA-256 Hash](https://en.wikipedia.org/wiki/SHA-2) of your desired password.

For example:

```yaml
appConfig:
  auth:
    users:
    - user: alicia
      hash: 4D1E58C90B3B94BCAD9848ECCACD6D2A8C9FBC5CA913304BBA5CDEAB36FEEFA3
      type: admin
    - user: bob
      hash: 5E884898DA28047151D0E56F8DC6292773603D0D6AABBDD62A11EF721D1542D8
```

### Hash Password

Dashy uses [SHA-256 Hash](https://en.wikipedia.org/wiki/Sha-256), a 64-character string, which you can generate by running `echo -n "my-super-secure-password" | sha256sum`, or using an online tool, such as [this one](https://passwordsgenerator.net/sha256-hash-generator/) or [CyberChef](https://gchq.github.io/CyberChef/) (which can be self-hosted/ ran locally).

A hash is a one-way cryptographic function, meaning that it is easy to generate a hash for a given password, but very hard to determine the original password for a given hash. This means, that so long as your password is long, strong and unique, it is safe to store its hash in the clear. Having said that, you should never reuse passwords, hashes can be cracked by iterating over known password lists, generating a hash of each.

### Logging In and Out

Once authentication is enabled, so long as there is no valid token in cookie storage, the application will redirect the user to the login page. When the user enters credentials in the login page, they will be checked, and if valid, then a token will be generated, and they can be redirected to the home page. If credentials are invalid, then an error message will be shown, and they will remain on the login page. Once in the application, to log out: the user can click the logout button (in the top-right), which will clear cookie storage, causing them to be redirected back to the login page.

### Enabling Guest Access

With authentication set up, by default no access is allowed to your dashboard without first logging in with valid credentials. Guest mode can be enabled to allow for read-only access to a secured dashboard by any user, without the need to log in. A guest user cannot write any changes to the config file, but can apply modifications locally (stored in their browser). You can enable guest access, by setting `appConfig.auth.enableGuestAccess: true`.

### Granular Access

You can use the following properties to make certain pages, sections or items only visible to some users, or hide pages, sections and items from guests.

- `hideForUsers` - Page, Section or Item will be visible to all users, except for those specified in this list
- `showForUsers` - Page, Section or Item will be hidden from all users, except for those specified in this list
- `hideForGuests` - Page, Section or Item will be visible for logged in users, but not for guests

For Example:
```yaml
pages:
  - name: Home Lab
    path: home-lab.yml
    displayData:
      showForUsers: [admin]
  - name: Intranet
    path: intranet.yml
    displayData:
      hideForGuests: true
      hideForUsers: [alicia, bob]
```    

```yaml
- name: Code Analysis & Monitoring
  icon: fas fa-code
  displayData:
    cols: 2
    hideForUsers: [alicia, bob]
  items:
    ...
```

```yaml
- name: Deployment Pipelines
  icon: fas fa-rocket
  displayData:
    hideForGuests: true
  items:
    - title: Hide Me
      displayData:
        hideForUsers: [alicia, bob]
```

### Permissions

Any user who is not an admin (with `type: admin`) will not be able to write changes to disk.

You can also prevent any user from writing changes to disk, using `preventWriteToDisk`. Or prevent any changes from being saved locally in browser storage, using `preventLocalSave`. Both properties can be found under [`appConfig`](/docs/configuring#appconfig-optional).

To disable all UI config features, including View Config, set `disableConfiguration`. Alternatively you can disable UI config features for all non admin users by setting `disableConfigurationForNonAdmin` to true.

### Using Environment Variables for Passwords

If you don't want to hash your password, you can instead leave out the `hash` attribute, and replace it with `password` which should have the value of an environmental variable name you wish to use.

Note that env var must begin with `VITE_APP_`, and you must set this variable before building the app.

For example:

```yaml
  auth:
    users:
    - user: bob
      password: VITE_APP_BOB
```

Just be sure to set `VITE_APP_BOB='my super secret password'` before build-time.

### Adding HTTP Auth to Configuration

Without this, the built-in auth is just a client-side login page — your config and API endpoints can still be accessed directly. Set `ENABLE_HTTP_AUTH=true` to protect them.

> [!NOTE]
> HTTP Auth and guest access (`enableGuestAccess`) are incompatible. Guests have no credentials, so they can't fetch the config file when HTTP auth is active.

This uses the same users you've already defined in `appConfig.auth.users` to authenticate all server-side requests (config files, status checks, system info, CORS proxy, etc.) via HTTP Basic Auth.

**How it works:** When a user logs in through the Dashy UI, a session token is stored in a cookie. The frontend automatically includes this token in requests to local API endpoints. On the server side, the token is validated against your configured users. If someone tries to access an endpoint directly (e.g. with curl), the server will respond with a `401` and a Basic Auth challenge — they'll need to provide a valid username and password.

**Setup:**

1. Make sure you have users configured in your `conf.yml` (see [Setting Up Authentication](#setting-up-authentication) above)
2. Set the `ENABLE_HTTP_AUTH=true` environment variable (e.g. in your `docker-compose.yml` or `.env` file)
3. Restart the container - the auth mode is determined at startup, so env var changes need a restart

Adding or removing users in `conf.yml` takes effect immediately without a restart, since the user list is read from disk on each request.

For full protection, you'll want both the client-side login page (via `appConfig.auth.users`) and server-side auth (via `ENABLE_HTTP_AUTH=true`).

### Security

With basic auth (and without HTTP auth), the login logic runs on the client-side. A technical user could inspect the code and view parts of your configuration, including password hashes. If the SHA-256 hash is of a common password, it may be possible to determine it using a lookup table, and then use that to generate a valid auth token. Therefore, you should always use a long, strong and unique password.

If your instance is exposed to the internet, the built-in auth alone is not sufficient - use a reverse proxy with its own authentication layer (see [Alternative Authentication Methods](#alternative-authentication-methods)), or access Dashy over a VPN. See the [Network Exposure](/docs/management#network-exposure) section in the management docs for more on this.

The built-in login page prevents casual unauthorized access on a private network. It's not a security perimeter.

****[⬆️ Back to Top](#)****

---

## HTTP Auth

If you'd like to protect server-side endpoints with HTTP Basic Auth, there are two approaches. They protect the same endpoints but use different credential sources, so pick one - don't combine them.

### Using config-file users (recommended)

This is the approach described in [Adding HTTP Auth to Configuration](#adding-http-auth-to-configuration) above. Set `ENABLE_HTTP_AUTH=true` and it uses the same `appConfig.auth.users` from your `conf.yml`. The frontend handles authentication automatically using the session token from the login page, so no extra setup is needed.

This is the recommended approach because it keeps credentials in one place and works together with the client-side login page. But the drawback is that your credentials will be stored in your config file.

### Using static credentials

If you don't have users in your `conf.yml` (e.g. you handle user management externally, or just want a single shared password for server-side access), you can set the `BASIC_AUTH_USERNAME` and `BASIC_AUTH_PASSWORD` environmental variables instead.

With this approach, there is no Dashy login page. When the browser first requests the config file, the server responds with a `401` and the browser shows its native HTTP auth prompt. Once the user enters the correct credentials, the browser caches them for the session and all subsequent requests work.

To skip the browser prompt and have the frontend authenticate automatically, also set `VITE_APP_BASIC_AUTH_USERNAME` and `VITE_APP_BASIC_AUTH_PASSWORD` to the same values. These are baked in at build time, so a rebuild is required, and you should only do this on a trusted network.

> [!WARNING]
> Do not combine `BASIC_AUTH_USERNAME`/`BASIC_AUTH_PASSWORD` with conf.yml users. If both are present, the server will log a warning at startup. With `ENABLE_HTTP_AUTH` set, config-file users take priority and the static credentials are ignored. Without it, the static credentials protect the server but the Dashy login page will use conf.yml credentials, and the frontend will send the wrong credentials to server endpoints. Pick one approach or the other.

****[⬆️ Back to Top](#)****

---

## Keycloak

Dashy also supports using a [Keycloak](https://www.keycloak.org/) (V17+) authentication server. The setup for this is a bit more involved, but it gives you greater security overall, useful for if your instance is exposed to the internet.

[Keycloak](https://www.keycloak.org/about.html) is a Java-based [open source](https://github.com/keycloak/keycloak), high-performance, secure authentication system, supported by [RedHat](https://www.redhat.com/en). It can be deployed with Docker ([`quay.io/repository/keycloak/keycloak`](https://quay.io/repository/keycloak/keycloak)), and enables you to secure multiple self-hosted applications with single-sign-on using standard protocols (OpenID Connect, OAuth 2.0, SAML 2.0 and social login).

### 1. Deploy Keycloak

If you've not already done so, spin up a Keycloak instance.
You can do this by following the [Keycloak Docs](https://www.keycloak.org/guides.html#getting-started), or use the following Docker examples:

```bash
docker run -d \
  -p 9100:8080 \
  --name keycloak \
  -e KEYCLOAK_ADMIN=kc-admin \
  -e KEYCLOAK_ADMIN_PASSWORD=KeycloakAdmin2026! \
  quay.io/keycloak/keycloak:25.0 start-dev
```

<details>
    <summary>Example <code>docker-compose.yml</code></summary>

```env
KEYCLOAK_ADMIN=kc-admin
KEYCLOAK_ADMIN_PASSWORD=KeycloakAdmin2026!
```

```yaml
name: dashy-keycloak
services:
  keycloak:
    image: quay.io/keycloak/keycloak:25.0
    command:
      - start-dev
      - --http-port=9100
      - --hostname-strict=false
      - --health-enabled=true
    restart: unless-stopped
    ports:
      - "9100:9100"
      - "4000:8080"
    volumes:
      - keycloak-data:/opt/keycloak/data
    environment:
      KEYCLOAK_ADMIN: ${KEYCLOAK_ADMIN}
      KEYCLOAK_ADMIN_PASSWORD: ${KEYCLOAK_ADMIN_PASSWORD}
      KC_HTTP_ENABLED: "true"
      KC_HOSTNAME_STRICT: "false"
      KC_HEALTH_ENABLED: "true"
    healthcheck:
      test: ["CMD-SHELL", "timeout 2 bash -c '</dev/tcp/127.0.0.1/9100'"]
      start_period: 30s
      interval: 10s
      timeout: 5s
      retries: 15

  dashy:
    image: lissy93/dashy:4.1.0
    network_mode: service:keycloak
    restart: unless-stopped
    depends_on:
      keycloak:
        condition: service_healthy
    environment:
      NODE_ENV: production
      HOST: 0.0.0.0
      PORT: 8080
    volumes:
      - ./user-data:/app/user-data
    healthcheck:
      test: ["CMD-SHELL", "wget -qO- http://127.0.0.1:8080/healthz >/dev/null 2>&1"]
      start_period: 30s
      interval: 10s
      timeout: 5s
      retries: 15

volumes:
  keycloak-data:
```

</details>

You should now be able to access the Keycloak web interface at `http://127.0.0.1:9100`, log in with your admin credentials above, and create a new password when prompted.

### 2. Setup Keycloak Users

Before we can use Keycloak, we must first set it up with some users. Keycloak uses Realms (similar to tenants) to create isolated groups of users. You must create a Realm before you will be able to add your first user.

1. Head over to the admin console
2. In the top-left corner there is a dropdown called 'Master', open it and click 'Create realm'
3. Give your realm a name, and hit 'Create'

Before adding users and clients, allow Dashy's origin in the iframe Keycloak uses for session checks. Without this you'll see "Authentication failed (Keycloak)" on first load. In the new realm (not master), go to *Realm settings → Security defenses → Headers*, clear *X-Frame-Options*, and set *Content-Security-Policy* to:

```text
frame-src 'self' <your-dashy-origin>; frame-ancestors 'self' <your-dashy-origin>; object-src 'none';
```

Click Save. Same-origin production deployments don't need this.

You can now create your first user.

1. In the left-hand menu, click 'Users', then 'Add User'
2. Fill in the form. On Keycloak 25 and newer, *First name* and *Last name* are required by the default user-profile schema. If you skip them the user can sign in but login will then fail with "Account is not fully set up"
3. Under the 'Credentials' tab, give the new user an initial password. They will be prompted to change this after first login

Next, create a new client for Dashy.

1. Within your new realm, navigate to 'Clients' on the left-hand side, then click 'Create' in the top-right
2. Choose a 'Client ID' (e.g. `dashy`), set 'Client Protocol' to 'openid-connect'
3. Turn *Client authentication* OFF and leave *Standard flow* enabled. Dashy is a SPA, so it acts as an OAuth public client with PKCE. A confidential client requires a client_secret that a browser app can't safely hold
4. For 'Valid Redirect URIs' put the URL where you host Dashy, with a trailing `/*` (e.g. `https://dashy.example.com/*`). When testing locally on both `localhost` and `127.0.0.1`, add both
5. Set 'Valid post logout redirect URIs' to the same values
6. For 'Web Origins' use the same URLs but without `/*` (Web Origins want bare origins, and adding `/*` here causes a 403 on Keycloak's session iframe)
7. Make note of your client-id, and click 'Save'

For the `adminRole` check to work, the role must appear in the id_token (Keycloak's default mapper only adds it to the access token):

1. Open your `dashy` client, go to the *Client scopes* tab, click the dedicated scope row (`dashy-dedicated`)
2. Add a new mapper of type *User Realm Role*, name it (e.g. `realm_roles`), claim name `realm_access.roles`, multivalued ON, *Add to ID token* ON, *Add to access token* ON, *Add to userinfo* ON
3. (Optional, for `adminGroup` instead of `adminRole`) Add a second mapper of type *Group Membership*, claim name `groups`

To create the admin role itself and grant it to a user:

1. *Realm roles* in the left-hand menu, *Create role*, name it (e.g. `dashy-admin`)
2. *Users* → pick your admin user → *Role mapping* → *Assign role* → select `dashy-admin`

Keycloak should now be configured, and ready to go! The Keycloak UI is not super intuitive, so if you're struggling to find where to configure any of the above options, below is a full start-to-end walkthrough video:

https://github.com/user-attachments/assets/12b6a596-1ec6-453a-9ff7-d4e2c3aa69f7

### 3. Enable Keycloak in Dashy Config File

Now that your Keycloak instance is up and running, all that's left to do is to configure Dashy to use it. Under `appConfig`, set `auth.enableKeycloak: true`, then fill in the details in `auth.keycloak`, including: `serverUrl` - the URL where your Keycloak instance is hosted, `realm` - the name you gave your Realm, and `clientId` - the Client ID you chose.
For example:

```yaml
appConfig:
  # ...
  disableConfigurationForNonAdmin: true
  auth:
    enableKeycloak: true
    keycloak:
      serverUrl: 'http://localhost:9100'
      realm: 'dashy'
      clientId: 'dashy'
      adminRole: 'dashy-admin'  # role name that grants admin privileges
```

If you use Keycloak with an external Identity Provier, you can set the `idpHint: 'alias-of-kc-idp'` option to allow the IdP Hint to be passed to Keycloak. This will cause Keycloak to skip its login page and redirect the user directly to the specified IdP's login page. Set to the value of the 'Alias' field of the desired IdP as defined in Keycloak under 'Identity Providers'.

### 4. Add groups and roles (Optional)

Keycloak allows you to assign users roles and groups. You can use these values to configure who can access various sections or items in Dashy.
Keycloak server administration and configuration is a deep topic; please refer to the [server admin guide](https://www.keycloak.org/docs/latest/server_admin/index.html#assigning-permissions-and-access-using-roles-and-groups) to see details about creating and assigning roles and groups.
Once you have groups or roles assigned to users you can configure access under each section or item `displayData.showForKeycloakUsers` and `displayData.hideForKeycloakUsers`.
Both show and hide configurations accept a list of `groups` and `roles` that limit access. If a users data matches one or more items in these lists they will be allowed or excluded as defined.

```yaml
sections:
  - name: DeveloperResources
    displayData:
      showForKeycloakUsers:
        roles: ['canViewDevResources']
      hideForKeycloakUsers:
        groups: ['ProductTeam']
    items:
      - title: Not Visible for developers
        displayData:
          hideForKeycloakUsers:
            groups: ['DevelopmentTeam']
```

Your app is now secured :) When you load Dashy, it will redirect to your Keycloak login page, and any user without valid credentials will be prevented from accessing your dashboard.

From within the Keycloak console, you can then configure things like time-outs, password policies, etc. You can also backup your full Keycloak config, and it is recommended to do this, along with your Dashy config. You can spin up both Dashy and Keycloak simultaneously and restore both applications configs using a `docker-compose.yml` file, and this is recommended.

### How server-side enforcement works

Dashy's server reads `auth.keycloak` from `conf.yml` at boot, lazily fetches your Keycloak realm's OIDC discovery doc + JWKS, then verifies the `id_token` the SPA attaches to every API call as `Authorization: Bearer <id_token>`. Tokens that fail signature / issuer / audience / expiry verification are rejected with `401`. Write endpoints (`POST /config-manager/save`) additionally require the `adminRole` (or `adminGroup`) to be present in the token claims, and non-admins receive `403`. Unauthenticated requests for `/conf.yml` get a stripped response containing only the `auth` block plus a minimal `pageInfo`, just enough for the SPA to bootstrap the login flow. The full config is only served to authenticated users.

The admin check reads the role / group claim from the id_token, so the client mapper from Step 2 above (the one with *Add to ID token* on) is what makes `adminRole` / `adminGroup` work. Without it the server gets a token with no roles claim and treats everyone as non-admin.

### Troubleshooting Keycloak

If you encounter issues with your Keycloak setup, follow these steps to troubleshoot and resolve common problems.

#### 1. Client Authentication Issue
Problem: Redirect loop, if client authentication is enabled.
Solution: Switch off "Client authentication" in the dashy client's "Advanced" settings.

#### 2. Double URL
Problem: If you get redirected to "https://dashy.my.domain/#iss=https://keycloak.my.domain/realms/dashy"
Solution: Turn on "Exclude Issuer From Authentication Response" in the dashy client's "Advanced" -> "OpenID Connect Compatibility Modes".

#### 3. Problems with multiple Dashy Pages
Problem: Refreshing or logging out of dashy results in an "invalid_redirect_uri" error.
Solution: In the dashy client's "Access settings", set "Root URL" to https://dashy.my.domain/, and make sure the valid redirect URIs end in /*.

#### 4. 403 on login-status-iframe.html/init
Problem: Browser console shows a 403 from Keycloak when the SPA loads.
Solution: Open the dashy client's "Web origins" and remove any trailing `/*`. Web Origins must be bare origins (e.g. http://localhost:4000), not http://localhost:4000/*.

#### 5. CSP error for /3p-cookies/step1.html or "Authentication failed (Keycloak)"
Problem: The hidden Keycloak iframe is blocked by frame-ancestors.
Solution: In the dashy realm (not master), open Realm settings -> Security defenses -> Headers. Clear X-Frame-Options and set the Content-Security-Policy as described earlier in this section.

---

## Header Authentication

Header authentication allows Dashy to trust an upstream reverse proxy to handle authentication. The proxy authenticates users and forwards their identity to Dashy via a configurable HTTP header (e.g. `REMOTE_USER`). This is the standard pattern used by [Authelia](https://www.authelia.com/), [Authentik](https://goauthentik.io/), Traefik's `forwardAuth`, Caddy's `forward_auth`, and Nginx's `auth_request`.

This is useful when you already have a central authentication layer in front of your self-hosted services and want Dashy to automatically pick up the authenticated user without requiring a separate login.

### Configuration

```yaml
appConfig:
  auth:
    enableHeaderAuth: true
    users:
      - user: alice
        hash: 0a7b1d4c2e... # SHA-256 hash of password
        type: admin
      - user: bob
        hash: 3f8e2b1a9d...
        type: normal
    headerAuth:
      userHeader: Remote-User
      proxyWhitelist:
        - 172.18.0.2
        - 127.0.0.1
```

- **`userHeader`** - The HTTP header name containing the authenticated username. Defaults to `Remote-User` if not specified. Common values: `Remote-User` (Authelia), `X-authentik-username` (Authentik), or whatever your proxy forwards. Header matching is case-insensitive.
- **`proxyWhitelist`** - Required. An array of IP addresses that Dashy will accept the header from. Only requests originating from these IPs will be trusted. This prevents clients from spoofing the header directly.
- **`users`** - Required. The header username is matched against this list to determine the user's role (`admin` or `normal`) and to generate the session token. Users must be defined here even though authentication is handled externally.

### How it Works

1. User visits Dashy, which is behind a reverse proxy (e.g. Authelia)
2. The proxy authenticates the user and forwards the request with a header like `Remote-User: alice`
3. Dashy's server checks that the request comes from a whitelisted proxy IP, then returns the username via the `/get-user` endpoint
4. The client matches the username against the configured users, generates a session token, and sets the auth cookie
5. From this point, standard Dashy auth applies - `isLoggedIn()`, admin checks, and granular access controls all work as normal

### Notes

- The `proxyWhitelist` checks `req.socket.remoteAddress`, which is the direct connection source. If your proxy connects through Docker networking, use the container's internal IP (e.g. `172.18.0.2`), not the external IP
- Logout clears Dashy's session cookie, but the user remains authenticated at the proxy level. Revisiting the page will re-authenticate automatically
- When header auth is enabled, server-side API endpoints are also protected by the proxy whitelist. Requests not from a whitelisted IP will be rejected. Admin enforcement applies - only users with `type: admin` can access write endpoints (config save)

---

## OIDC

Dashy also supports using a general [OIDC compatible](https://openid.net/connect/) authentication server. In order to use it, the authentication section needs to be configured:

```yaml
appConfig:
  disableConfigurationForNonAdmin: true # Prevent authenticated non-admins using editor
  auth:
    enableOidc: true
    oidc:
      clientId: 'registered-client-id'
      endpoint: 'https://your-oidc-provider.example.com'
      scope: 'openid profile email'
      adminGroup: admin
```

Because Dashy is a SPA, a [public client](https://datatracker.ietf.org/doc/html/rfc6749#section-2.1) registration with PKCE is needed.

If you set `adminGroup`, include `groups` in `scope` (e.g. `scope: 'openid profile email groups'`) so your IdP actually returns the claim in the id_token. Same goes for `adminRole` and a `roles` scope if your IdP needs one.

Note, that if your `clientId` is numeric, you must place it in quotes. Otherwise YAML parses it as a number, and values longer than JavaScript's safe-integer range (around 15 digits) lose precision, which makes the client ID match fail.

An example for Authelia is shared below, but other OIDC systems can be used:

```yaml
identity_providers:
  oidc:
    clients:
      - client_id: dashy
        client_name: dashy
        public: true
        authorization_policy: 'one_factor'
        require_pkce: true
        pkce_challenge_method: 'S256'
        redirect_uris:
          - https://dashy.local # should point to your dashy endpoint
        grant_types:
          - authorization_code
        scopes:
          - 'openid'
          - 'profile'
          - 'roles'
          - 'email'
          - 'groups'
```

Groups and roles will be populated and available for controlling display similar to [Keycloak](#keycloak) above.

### How server-side enforcement works

Dashy's server reads `auth.oidc` from `conf.yml` at boot, lazily fetches the OIDC discovery doc + JWKS from your `endpoint`, then verifies the `id_token` the SPA attaches to every API call as `Authorization: Bearer <id_token>`. Tokens that fail signature / issuer / audience / expiry verification are rejected with `401`. Write endpoints (`POST /config-manager/save`) additionally require the `adminGroup` (or `adminRole`) to be present in the token's `groups` / `roles` claims, and non-admins receive `403`. Unauthenticated requests for `/conf.yml` get a stripped response containing only the `auth` block plus a minimal `pageInfo`, just enough for the SPA to bootstrap the login flow. The full config is only served to authenticated users.

Your IdP must include `groups` / `roles` in the id_token, not only the access token, for the admin check to work (most IdPs do this when the `groups` scope is requested).

---

## authentik

This documentation is specific to `authentik`, however it may be useful in getting other idP's working with `Dashy`.

This guide will only walk through the following:
 * Creating and configuring an OIDC provider
 * Creating and configuring an application
 * Assigning groups
 * Configuring `Dashy` to use the OIDC client
 * Show quick examples of how to hide/show `pages`, `items`, and `sections` using OIDC groups

This guide assumes the following:
 * You have a working instance of `authentik` terminated with SSL
 * You have a working instance of `Dashy` terminated with SSL
 * Users and groups are provisioned
 * You are familiar with how `authentik` works in case you need to do further troubleshooting that is outside the scope of this guide.
 
>[!TIP]
>It it recommended that you create groups specific for `Dashy`. Groups will allow you to display content based on group membership as well as limiting user access to `Dashy`. If you do not need this functionality, then you can forgo creating specific groups.

>[!TIP]
>You can use the application wizard to create the provider and application at one time. This is the recommended route, but only the manual process will be outlined in this guide.

![image](https://github.com/user-attachments/assets/72e45162-6c86-4d6f-a1ae-724ac503c00c)

#### 1. Create an OIDC provider

Login to the admin console for `authentik`. Go to `Applications` > `Providers`. Click `Create`.

![image](https://github.com/user-attachments/assets/c1f7f45d-469c-4bf1-a825-34658341a83e)

A dialog box will pop-up, select the `OAuth2/OpenID Provider`. Click `Next`.

![image](https://github.com/user-attachments/assets/ea84fe57-b813-404d-8dad-5e221b440bdb)

On the next page of the wizard, set the `Name`, `Authentication flow`, `Authorization flow`, and `Invalidation flow`. See example below. Using the `default-provider-authorization-implicit-consent` authorization flow on internal services and `default-provider-authorization-explicit-consent` on external services is a common practice. However, it is fully up to you on how you would like to configure this option. `Implicit` will login directly without user consent, `explicit` will ask if the user approves the service being logged into with their user credentials. For the invalidation flow (required on Authentik 2023.10 and later) the built-in `default-provider-invalidation-flow` is fine.

![image](https://github.com/user-attachments/assets/e600aeaf-08d1-49aa-b304-11e90e5c89cd)

Scroll down and configure the `Protocol settings`. Set the `Client type` to `Public`. Add the `Redirect URIs/Origins (RegEx)`. If the site is hosted at `dashy.lan.domain.com`, then you would enter as the example below.

>[!NOTE]
>If you have an internal and external domain for `Dashy`, enter both URI's. Enter each URI on a new line.

![image](https://github.com/user-attachments/assets/4a289d7e-d7b4-4ff6-af5d-3e5202fae84e)

Scroll down to set the `Signing Key`. It is recommended to use the built in `authentik Self-signed Certificate` here unless you have special needs for your own custom cert.

![image](https://github.com/user-attachments/assets/386c0750-9d2b-4482-8938-8b301b489b38)

If you plan to use `adminGroup` in your Dashy config, you need a `groups` scope mapping first. Authentik does not ship one by default. Open *Customisation > Property Mappings* in a new tab, click *Create > Scope Mapping*, set *Name* to `groups`, *Scope name* to `groups`, and *Expression* to:

```python
return {"groups": [g.name for g in request.user.ak_groups.all()]}
```

Save it, then come back to the provider wizard.

Expand `Advanced protocol settings` then verify the `Scopes` are set to what is highlighted in `white` below (including the `groups` mapping you just created, if you want `adminGroup` to work). Set the `Subject mode` to `Based on the User's Email`.

![image](https://github.com/user-attachments/assets/ae5e87b8-1ad6-41dd-b6e1-9665623f842a)

Lastly, toggle `Include claims in id_token` to on. Click `Finish` to complete creating the provider.

![image](https://github.com/user-attachments/assets/25353b3c-3f54-47cf-bd47-b5023f86d7cf)

Grab the generated `Client ID` and `OpenID Configuration Issuer` URL by clicking the newly created provider as this will use this later when `Dashy` is configured to use the OIDC auth mechanism. In this tutorial, what was generated is used below. Obviously adjust the `Client ID` that was generated and use your domain here for the `issuer`.
```
Client ID: pzN9DCMLqHTTatgtYFg50cl0jn1NmCyBC3wreX15
OpenID Configuration Issuer: https://auth.domain.com/application/o/dashy/
```

#### 2. Create an application

Make sure you are still in the `authentik` admin console then go to `Applications` > `Applications`. Click `Create`.

![image](https://github.com/user-attachments/assets/fd225936-15a1-409f-83c8-e24a43047df0)

Next, it is required to give a user facing `Name`, `Slug` and assign the newly created provider. Use the example below if you have been following the guide. If you have used your own naming, then adjust accordingly. Click `Create` once you are done.

![image](https://github.com/user-attachments/assets/e6574d7d-6b22-4e7d-b388-45341b98746b)

>[!TIP]
>Open the application in a new tab from the `authentik` user portal and upload a custom icon. You can also enter a user facing `Description` that the user would see.

![image](https://github.com/user-attachments/assets/20561387-549f-49de-98e6-30330dcdc734)

#### 3. *(Optional)* Limiting access via `authentik` with groups

If you would like to deny `Dashy` access from specific users who are not within `authentik` based groups, you bind them to the application you just created now. `authentik` will deny access to those who are not members of this group or groups. If you want to allow everyone access from your `authentik` instance, skip this step.

Make sure you are still in the `authentik` admin console then go to `Applications` > `Applications`. Click the newly created `Dashy` application.

![image](https://github.com/user-attachments/assets/613fafe7-881f-4664-a903-945854ac65e2)

Click the `Policy/Group/User Bindings` tab at the top, then click `Bind existing policy`. This assumes you have already created the groups you want to use for `Dashy` and populated users in those groups.

![image](https://github.com/user-attachments/assets/10fca15b-e77d-4624-ae03-0ece3910904c)

Click `Group` for the binding type. Under `Group` select the appropriate group you would like to bind. Make sure `Enabled` is toggeled on. Click `Create`.

![image](https://github.com/user-attachments/assets/ebf680ab-696f-4c08-ae89-d73fe92b398f)

`Dashy` will now be scoped only to users within the assigned groups you have bound the application to. Keep adding groups if you would like to adjust the dashboard visibilty based on group membership.

#### 4. Configure `Dashy` to use OIDC client

>[!IMPORTANT]
>It is highly recommended to edit your `conf.yml` directly for this step.

>[!CAUTION]
>Do not make the same mistake many have made here by including the fully qualified address for the `OpenID Configuration URL`. `Dashy` will append the `.well-known` configuration automatically. If the `.well-known` URI is included the app will get redirect loops and `400` errors.

Enter the `Client ID` in the `clientId` field and `OpenID Configuration Issuer` in the `endpoint` field.

Below is how to configure the `auth` section in the yaml syntax. Once this is enabled, when an attempt to access `Dashy` is made it will now redirect you to the `authentik` login page moving forward.

```yaml
appConfig:
  theme: glass
  layout: auto
  iconSize: medium
  disableConfigurationForNonAdmin: true # Prevent logged-in, non-admins using the view/edit config features
  auth:
    enableOidc: true
    oidc:
      clientId: pzN9DCMLqHTTatgtYFg50cl0jn1NmCyBC3wreX15
      endpoint: https://auth.domain.com/application/o/dashy/
```

#### 5. *(OPTIONAL)* Example snippets for dashboard visibility

Using the `hideForKeycloakUsers` configuration option is needed to use the `authentik` groups that were created previously.

Adjusting `pages` visibility:
```
pages:
  - name: App Management
    path: appmgmt.yml
    displayData:
      hideForKeycloakUsers:
        groups:
          - Dashy Users
  - name: Network Management
    path: network.yml
    displayData:
      hideForKeycloakUsers:
        groups:
          - Dashy Users
```

Adjusting `items` visibility:
```
    items:
      - title: Authentik Admin
        icon: authentik.svg
        url: https://auth.domain.com/if/admin/
        target: newtab
        id: 0_1472_authentikadmin
        displayData:
          hideForKeycloakUsers:
            groups:
              - Dashy Users
      - title: Authentik User
        icon: authentik-light.png
        url: https://auth.domain.com/if/user/
        target: newtab
        id: 1_1472_authentikuser
```

Adjusting `sections` visibility:
```
sections:
  - name: Authentication
    displayData:
      sortBy: default
      cols: 1
      collapsed: false
      hideForGuests: false
      hideForKeycloakUsers:
        groups: 
          - Dashy Users
```
---

## Alternative Authentication Methods

These are alternatives to Dashy's built-in auth, Keycloak, and OIDC. Most of them sit in front of Dashy at the network or reverse proxy level, which is generally the better approach for anything internet-facing.

- [Reverse Proxy Auth](#reverse-proxy-auth) - Authelia, Authentik, or similar sitting in front of Dashy
- [Zero-Trust Tunnels](#zero-trust-tunnels) - Cloudflare Tunnel, Tailscale Funnel
- [VPN](#vpn) - Keep Dashy off the internet entirely
- [IP-Based Access](#ip-based-access) - Restrict by source IP in your web server
- [Web Server Authentication](#web-server-authentication) - HTTP basic auth at the proxy level
- [SSO / OAuth Providers](#sso--oauth-providers) - Cloud-hosted identity providers
- [Cloud Hosting Providers](#cloud-hosting-providers) - Built-in auth on hosting platforms

### Reverse proxy auth

The most common setup for self-hosters running multiple services. You put an auth server in front of your reverse proxy, and it handles login, 2FA, and sessions for everything behind it. You configure it once, and all your apps get protected.

Dashy has [Header Authentication](#header-authentication) support, so when your proxy authenticates a user and forwards their identity via a header, Dashy picks up the username and maps it to a configured user automatically. No separate Dashy login needed.

**Authelia** is lightweight and Docker-friendly. It supports 2FA, per-path access rules, and multiple user backends. To get started quickly:

1. `git clone https://github.com/authelia/authelia.git`
2. `cd authelia/examples/compose/lite`
3. Edit `users_database.yml`, `configuration.yml`, and `docker-compose.yml` for your domain and users
4. `docker compose up -d`

See the [Authelia docs](https://www.authelia.com/docs/) for the full setup guide.

**Authentik** is heavier but gives you a proper admin UI, built-in OIDC/SAML support, and user self-service (password resets, enrollment flows, etc). Good if you want a single identity provider across many apps. See the [authentik Docker Compose install](https://docs.goauthentik.io/docs/installation/docker-compose) to get started, and the [authentik section](#authentik) above for Dashy-specific OIDC config.

### Zero-trust tunnels

These let you expose Dashy to the internet without opening inbound ports or configuring port forwarding. Auth is handled by the tunnel provider before traffic ever reaches your server.

**Cloudflare Tunnel** connects Dashy to Cloudflare's edge network via an outbound-only `cloudflared` daemon (runs nicely as a Docker sidecar). Cloudflare handles DNS, TLS, and DDoS protection. Pair it with Cloudflare Access to require identity provider login before anyone reaches Dashy. The free tier covers most home setups. See the [Cloudflare Tunnel docs](https://developers.cloudflare.com/cloudflare-one/connections/connect-networks/).

**Tailscale Funnel** exposes Dashy through your Tailscale mesh to the public internet, with automatic TLS. Simpler to set up than Cloudflare but you get less control over access policies. See the [Funnel docs](https://tailscale.com/kb/1223/funnel).

### VPN

A VPN keeps Dashy off the public internet entirely. You connect to your home network remotely and access Dashy like you're on the LAN. No auth to configure, no attack surface to worry about. The downside: you need the VPN running to see anything, and some networks (corporate WiFi, hotels) block VPN traffic.

[WireGuard](https://www.wireguard.com/) is fast and minimal. Most self-hosters run it through a UI like [wg-easy](https://github.com/wg-easy/wg-easy), which gives you a web interface for managing peers and generating QR codes for mobile.

[Tailscale](https://tailscale.com/) wraps WireGuard and takes care of NAT traversal, key exchange, and device management. No port forwarding needed, works across networks with zero config. There's a generous free tier. [Headscale](https://github.com/juanfont/headscale) is a self-hosted coordination server if you want to keep everything on your own infrastructure.

[OpenVPN](https://openvpn.net/) still works fine if you already have it running, but for a new setup WireGuard or Tailscale are easier to get going.

### IP-based access

If you have a static IP or are already on a VPN, you can restrict access to Dashy by source IP at the web server level. This works well as an extra layer on top of other auth methods.

NGINX:
```text
location / {
    proxy_pass http://dashy:8080;
    allow 192.168.1.0/24;
    allow 203.0.113.50;
    deny all;
}
```

Caddy ([request matchers docs](https://caddyserver.com/docs/caddyfile/matchers)):
```text
dashy.example.com {
    @blocked not remote_ip 192.168.1.0/24 203.0.113.50
    respond @blocked "Access denied" 403
    reverse_proxy dashy:8080
}
```

Apache (2.4+):
```text
<Location />
    Require ip 192.168.1.0/24
    Require ip 203.0.113.50
</Location>
```

### Web server authentication

Your reverse proxy can handle HTTP basic auth directly, no extra services needed. This gives you a browser login prompt in front of Dashy. Make sure you're using HTTPS, as basic auth sends credentials base64-encoded (not encrypted) with every request.

NGINX ([auth module docs](https://nginx.org/en/docs/http/ngx_http_auth_basic_module.html)):
```text
location / {
    auth_basic "Dashy";
    auth_basic_user_file /etc/nginx/conf.d/.htpasswd;
    proxy_pass http://dashy:8080;
}
```

Generate the password file with `htpasswd -c /etc/nginx/conf.d/.htpasswd alicia`.

Caddy ([basicauth directive](https://caddyserver.com/docs/caddyfile/directives/basicauth)):
```text
dashy.example.com {
    basicauth {
        alicia $2a$14$... # generate with: caddy hash-password
    }
    reverse_proxy dashy:8080
}
```

Apache:
```text
AuthType Basic
AuthName "Dashy"
AuthUserFile /path/to/.htpasswd
Require valid-user
```

Generate the password file with `htpasswd -c /path/to/.htpasswd alicia`.

### SSO / OAuth providers

Cloud identity providers like [Auth0](https://auth0.com/), [Okta](https://developer.okta.com/), [Ory](https://www.ory.sh/), and [Google Cloud Identity](https://cloud.google.com/identity) can work with Dashy through its [OIDC support](#oidc). If your provider speaks OIDC (most do), just configure it as described in the OIDC section and you're set.

For providers that only support OAuth2 or SAML without an OIDC layer, you'll need something in between to translate. Authentik, Keycloak, and Authelia can all bridge from SAML/OAuth2 to OIDC.

### Cloud hosting providers

If you're running Dashy on a cloud platform, most have their own auth options you can enable without touching Dashy's config. See your provider's docs: [Cloudflare Access](https://www.cloudflare.com/teams/access/), [Netlify Password Protection](https://docs.netlify.com/visitor-access/password-protection/), [AWS Cognito](https://aws.amazon.com/cognito/), [Azure App Service Authentication](https://learn.microsoft.com/en-us/azure/app-service/overview-authentication-authorization), and [Vercel Password Protection](https://vercel.com/docs/security/password-protection).

****[⬆️ Back to Top](#)****
