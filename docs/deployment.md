# Deployment

Welcome to Dashy, so glad you're here :) Deployment is super easy, and there are several methods available depending on what type of system you're using. If you're self-hosting, then deploying with Docker (or similar container engine) is the recommended approach.

## Quick Start

If you want to skip the fuss, and [get straight down to it](/docs/quick-start), then you can spin up a new instance of Dashy by running:

```bash
docker run -p 8080:8080 lissy93/dashy
```

See [Management Docs](/docs/management) for info about securing, monitoring, updating, health checks, auto starting, web server configuration, etc

Once you've got Dashy up and running, you'll want to configure it with your own content, for this you can reference the [configuring docs](/docs/configuring).

## Deployment Methods

- [Docker](/docs/deployment/docker)
  - [Docker Run](/docs/deployment/docker#docker-run)
  - [Docker Compose](/docs/deployment/docker#docker-compose)
  - [Podman](/docs/deployment/docker#podman)
- [Bare Metal](/docs/deployment/bare-metal)
  - [Build from Source](/docs/deployment/bare-metal#build-from-source)
  - [Pre-Built Release](/docs/deployment/bare-metal#pre-built-release)
- [Self-Hosted Operating Systems](/docs/deployment/self-hosted-os)
  - [TrueNAS SCALE](/docs/deployment/self-hosted-os#truenas-scale)
  - [Proxmox VE](/docs/deployment/self-hosted-os#proxmox-ve)
  - [Unraid](/docs/deployment/self-hosted-os#unraid)
  - [Synology NAS](/docs/deployment/self-hosted-os#synology-nas)
  - [NixOS](/docs/deployment/self-hosted-os#nixos)
  - [Kubernetes](/docs/deployment/self-hosted-os#kubernetes)
- [Self-Hosted Platforms](/docs/deployment/self-hosted-platforms)
  - [Portainer](/docs/deployment/self-hosted-platforms#portainer)
  - [Coolify](/docs/deployment/self-hosted-platforms#coolify)
  - [1Panel](/docs/deployment/self-hosted-platforms#1panel)
  - [Runtipi](/docs/deployment/self-hosted-platforms#runtipi)
  - [Cosmos Cloud](/docs/deployment/self-hosted-platforms#cosmos-cloud)
  - [CasaOS](/docs/deployment/self-hosted-platforms#casaos)
  - [Umbrel](/docs/deployment/self-hosted-platforms#umbrel)
  - [EasyPanel](/docs/deployment/self-hosted-platforms#easypanel)
  - [Saltbox](/docs/deployment/self-hosted-platforms#saltbox)
- [Cloud Services](/docs/deployment/cloud)
  - [Static Hosting Providers](/docs/deployment/cloud#static-hosting-providers)
    - [Netlify](/docs/deployment/cloud#netlify)
    - [Vercel](/docs/deployment/cloud#vercel)
    - [EdgeOne Pages](/docs/deployment/cloud#edgeone-pages)
    - [Cloudflare Pages](/docs/deployment/cloud#cloudflare-pages)
    - [Firebase Hosting](/docs/deployment/cloud#firebase-hosting)
    - [Azure Static Web Apps](/docs/deployment/cloud#azure-static-web-apps)
  - [Container Runtimes](/docs/deployment/cloud#container-runtimes)
    - [Render](/docs/deployment/cloud#render)
    - [Railway](/docs/deployment/cloud#railway)
    - [Fly.io](/docs/deployment/cloud#flyio)
    - [Koyeb](/docs/deployment/cloud#koyeb)
    - [Northflank](/docs/deployment/cloud#northflank)
    - [DigitalOcean App Platform](/docs/deployment/cloud#digitalocean-app-platform)
    - [Azure Container Apps](/docs/deployment/cloud#azure-container-apps)
    - [Google Cloud Run](/docs/deployment/cloud#google-cloud-run)
  - [Managed Hosting](/docs/deployment/cloud#managed-hosting)
  - [Hosting with any CDN](/docs/deployment/cloud#hosting-with-any-cdn)
  - [Other VPS](/docs/deployment/cloud#other-vps)

---

## Requirements

### Architecture
The pre-built Docker image runs on `amd64`, `arm64` and `armv7` (`armv6` is not supported).

### System Resources
- CPU: any single core, x86-64 or ARM
- RAM: Node server idles around ~80-120 MB; 256 MB is comfortable, works in less
- Disk: ~250 MB for the image + whatever your config/icons need
- Runs fine on a Pi 3 and up

### Bare Metal
Requires [Node.js](https://nodejs.org/) (20+) and [Yarn](https://yarnpkg.com/)

### CDN / Cloud Deploy
No specific requirements. The built app (without the Node server) is very lightweight and can be served by any static host or CDN. If you're using custom icons or other assets, additional disk space will be needed.

### Browser Support
JavaScript is required. Dashy targets browsers with >1% global usage and the last 2 versions of each (via [browserslist](https://browsersl.ist/)). In practice, any modern browser works fine. Internet Explorer is not supported.

| Browser | Minimum Version | Status |
|---------|----------------|--------|
| Chrome / Chromium | 90+ | Fully supported |
| Firefox | 90+ | Fully supported |
| Edge | 90+ | Fully supported |
| Safari | 14+ | Mostly Supported |
| Opera | 76+ | Supported |
| Samsung Internet | 15+ | Supported |
| Firefox ESR | Latest | Supported |
| Internet Explorer | - | Not supported |
