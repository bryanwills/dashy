# Self-Hosted Platforms

Dashy has ready-made apps, templates, and one-click installs for a range of self-hosted control panels and home-server platforms. To deploy onto a specific operating system or NAS instead, see [Self-Hosted Operating Systems](/docs/deployment/self-hosted-os).

> [!NOTE]
> - Please ensure the app you install is pinned to a recent or latest version of Dashy (e.g. 4.x.x upwards).
> - Some of these integrations are unofficial/third-party, so we can't offer support for them. Raise any issues in the appropriate repo.

## Portainer

If you manage your Docker host through [Portainer](https://www.portainer.io/), you can deploy Dashy from its UI:

1. Go to Stacks > Add stack
2. Paste the [docker-compose.yml](https://github.com/Lissy93/dashy/blob/master/docker-compose.yml) contents, or point to the URL
3. Adjust the port and volume mappings as needed
4. Deploy the stack

Alternatively, add the [lissy93/portainer-templates](https://github.com/Lissy93/portainer-templates) list (`https://raw.githubusercontent.com/Lissy93/portainer-templates/main/templates.json`) under Settings > App Templates, then install Dashy from the Templates tab.

> [!NOTE]
> Some older Portainer templates mount config at `/app/public/conf.yml`. For Dashy 4, use `/app/user-data` instead.

---

## Coolify

[Coolify](https://coolify.io/) is a self-hostable PaaS (a Heroku/Netlify alternative). Dashy is available as a service template: under **+ New Resource** > **Service**, search "Dashy" and deploy. The current template may still mount config at `/app/public/conf.yml`; for Dashy 4, change this to `/app/user-data`. ([template source](https://github.com/coollabsio/coolify/blob/v4.x/templates/compose/dashy.yaml))

---

## 1Panel

[1Panel](https://1panel.pro/) is a web-based Linux server management panel. Dashy is in its official App Store: open **App Store**, search "Dashy", click **Install**, and set the port. ([app page](https://1panel.pro/apps/dashy))

> [!NOTE]
> The public 1Panel app page currently lists an older Dashy 3.x version. If the installer allows it, change the image to `lissy93/dashy:latest` or a recent 4.x tag.

---

## Runtipi

[Runtipi](https://runtipi.io/) is a homeserver management platform. The source for the Dashy app is [here](https://github.com/runtipi/runtipi-appstore/tree/master/apps/dashy).

1. Install runtipi with: `curl -L https://setup.runtipi.io | bash`
2. Open tipi.local
3. Go to App Store --> Search --> Dashy

---

## Cosmos Cloud

[Cosmos Cloud](https://cosmos-cloud.io/) is a self-hosted server manager with a built-in reverse proxy and app market. Dashy is in the official market, so there's no extra source to add.

1. Open your Cosmos admin UI and go to the **Market**
2. Search "Dashy" and click **Install**
3. Accept the defaults, or set a path for your own `conf.yml`, then confirm

Cosmos pulls `lissy93/dashy:latest` and sets up its reverse proxy for you. ([market entry](https://github.com/azukaar/cosmos-servapps-official/tree/master/servapps/Dashy))

> [!NOTE]
> The current Cosmos template still mounts config at `/app/public`. For Dashy 4, edit the service to mount your config directory at `/app/user-data`.

---

## CasaOS

Dashy isn't in the built-in CasaOS store, but it is in the community [BigBear app store](https://github.com/bigbeartechworld/big-bear-casaos).

1. In the CasaOS **App Store**, open the menu and choose **Add Source**
2. Paste `https://github.com/bigbeartechworld/big-bear-casaos/archive/refs/heads/master.zip` and save
3. A **BigBearCasaOS** category appears. Search for **Dashy v4** and click **Install**

> [!CAUTION]
> The store lists two Dashy apps. Pick **"Dashy v4"** (`lissy93/dashy:4.0.8`). The plain **"Dashy"** entry is pinned to the old `3.3.1`, so avoid it.

The same BigBear store should also work on [ZimaOS](https://www.zimaspace.com/) (Zimaboard), with the same steps.

---

## Umbrel

Dashy isn't in the official Umbrel App Store. A community app store has it, but it's no longer maintained.

> [!CAUTION]
> The only Umbrel option, [dennys-umbrel-app-store](https://github.com/dennysubke/dennys-umbrel-app-store), is discontinued by its maintainer and pins Dashy `3.x`. It won't get updates, so treat it as a last resort. Running Dashy with [Docker](/docs/deployment/docker) directly on your Umbrel host is the better option.

To install it anyway:

1. In the Umbrel **App Store**, open the three-dot menu and choose **Community App Stores**
2. Add `https://github.com/dennysubke/dennys-umbrel-app-store`
3. Open the store, find **Dashy**, and click **Install** (it serves on port 4444)

---

## EasyPanel

[![Deploy to Easypanel](https://img.shields.io/badge/Deploy-Easypanel-5765F2)](https://easypanel.io/docs/templates/dashy)

[Easypanel](https://easypanel.io) is a self-hosted server control panel with a Dashy template. It runs the full Docker image, so all features including the Node server work.

Template: `https://easypanel.io/docs/templates/dashy`

> [!CAUTION]
> The Easypanel template pins an old Dashy version (`3.3.1`). After deploying, change the image tag to `lissy93/dashy:latest` (or a recent 4.x version) to get the current release.

---

## Saltbox

[Saltbox](https://docs.saltbox.dev/) (an Ansible-based server automation project) includes Dashy as a sandbox app. Once Saltbox is set up, install it with:

```bash
sb install sandbox-dashy
```

See the [Saltbox Dashy docs](https://docs.saltbox.dev/sandbox/apps/dashy/) for details.
