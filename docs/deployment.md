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

- [Deployment](#)
  - [Quick Start](#quick-start)
  - [Deployment Methods](#deployment-methods)
  - [Deploy with Docker](#deploy-with-docker)
  - [Using Docker Compose](#using-docker-compose)
  - [Podman](#podman)
  - [Portainer](#portainer)
  - [Coolify](#coolify)
  - [1Panel](#1panel)
  - [Kubernetes](#kubernetes)
  - [Unraid](#unraid)
  - [Proxmox VE](#proxmox-ve)
  - [TrueNAS SCALE](#truenas-scale)
  - [Home Server Platforms](#home-server-platforms)
  - [Synology NAS](#synology-nas)
  - [Saltbox](#saltbox)
  - [Build from Source](#build-from-source)
  - [Nix / NixOS](#nix--nixos)
  - [Deploy to Cloud Service](#deploy-to-cloud-service)
    - [Netlify](#netlify)
    - [Vercel](#vercel)
    - [Render](#render)
    - [Railway](#railway)
    - [Google Cloud Run](#google-cloud-run)
    - [Easypanel](#easypanel)
    - [EdgeOne Pages](#edgeone-pages)
    - [Play-with-Docker](#play-with-docker)
  - [Managed Hosting](#managed-hosting)
  - [Hosting with CDN](#hosting-with-cdn)
  - [Requirements](#requirements)
    - [System Requirements](#system-requirements)
    - [Docker](#docker)
    - [Bare Metal](#bare-metal)
    - [CDN / Cloud Deploy](#cdn--cloud-deploy)
    - [Browser Support](#browser-support)

---

## Deploy with Docker

**Container Info**: [
![Docker Supported Architecture](https://img.shields.io/badge/Architectures-amd64%20|%20arm32v7%20|%20arm64v8-6ba6e5)
![Docker Base Image](https://img.shields.io/badge/Base_Image-node%3A22--alpine-6ba6e5)
![Docker Hosted on](https://img.shields.io/badge/Hosted_on-DockerHub%20%26%20GHCR-6ba6e5)
](https://hub.docker.com/r/lissy93/dashy)<br />
**Status**:
![Build Status](https://img.shields.io/github/actions/workflow/status/Lissy93/dashy/docker.yml?label=Build&color=f4a966)
![Docker Pulls](https://img.shields.io/docker/pulls/lissy93/dashy?color=ecb2f7)
![Docker Stars](https://img.shields.io/docker/stars/lissy93/dashy?color=f7f754&label=Docker%20Stars)
![Docker Image Size](https://img.shields.io/docker/image-size/lissy93/dashy/latest?color=1eea76)
![Docker Latest Version](https://img.shields.io/docker/v/lissy93/dashy/latest?color=a8d8ea&label=Latest%20Version)

Dashy has a prebuilt container image hosted on [Docker Hub](https://hub.docker.com/r/lissy93/dashy). You will need [Docker](https://docs.docker.com/get-docker/) installed on your system.

```bash
docker run -d \
  -p 8080:8080 \
  -v /path/to/your/user-data:/app/user-data \
  --name my-dashboard \
  --restart=always \
  lissy93/dashy:latest
```

The `user-data` directory you mount must contain a `conf.yml` file. It can also contain any sub-config files, item icons, fonts, custom CSS, or other assets you want served from the web root. Anything you put in there is available at `/<filename>` in the browser.

Explanation of the above options:
- `-d` Detached mode (not running in the foreground of your terminal)
- `-p` The port that should be exposed, and the port it should be mapped to in your host system `[host-port]:[container-port]`, leave the container port as `8080`
- `-v` Mounts the host directory containing your `conf.yml` (and any other assets) into the container at `/app/user-data`
- `--name` Give your container a human-readable name
- `--restart=always` Spin up the container when the daemon starts, or after it has been stopped
- `lissy93/dashy:latest` The image to run. Replace `:latest` with a specific version from the [tags](https://hub.docker.com/r/lissy93/dashy/tags) if needed

For all available options, and to learn more, see the [Docker Run Docs](https://docs.docker.com/reference/cli/docker/container/run/)

Dashy is also available through GHCR: `docker pull ghcr.io/lissy93/dashy:latest`

The `latest` image is multi-arch, so the same tag works on amd64, arm64, and arm/v7 (Raspberry Pi 2+). Docker selects the right variant for your host automatically.

The image defaults to `:latest`, but you can instead specify a specific version, e.g. `docker pull lissy93/dashy:4.0.0`

---

## Using Docker Compose

Using Docker Compose can be useful for saving your specific config in files, without having to type out a long run command each time. Save compose config as a YAML file, and then run `docker compose up -d` (optionally use the `-f` flag to specify file location, if it isn't located at `./docker-compose.yml`), `-d` is detached mode (not running in the foreground of your terminal). Compose is also useful if you are using clusters, as the format is very similar to stack files, used with Docker Swarm.

The following is a complete example of a [`docker-compose.yml`](https://github.com/Lissy93/dashy/blob/master/docker-compose.yml) for Dashy. Run it as is, or uncomment the additional options you need.

```yaml
services:
  dashy:
    # The image to pull + version. Can use `ghcr.io/lissy93/dashy` instead
    image: lissy93/dashy:latest
    # Optional container name
    container_name: dashy
    # Port to serve on (keep container port (second one) as 8080)
    ports:
      - 8080:8080
    # Mount a directory containing your conf.yml and any other assets
    volumes:
      - ./user-data:/app/user-data
    # Add any env vars for server here, if needed
    environment:
      - NODE_ENV=production
    # Auto-start the container on boot
    restart: unless-stopped
    # Healthcheck to determine when container healthy
    healthcheck:
      test: ['CMD', 'node', '/app/services/healthcheck.js']
      interval: 1m30s
      timeout: 10s
      retries: 3
      start_period: 30s
```

To pull from GHCR instead of Docker Hub, set `image: ghcr.io/lissy93/dashy:latest`.

---

## Podman

[Podman](https://podman.io/) is a drop-in replacement for Docker that runs containers without a daemon and doesn't require root. If you're on Fedora, RHEL, or just prefer daemonless containers, Podman works with the same images and mostly the same CLI.

```bash
podman run -d \
  -p 8080:8080 \
  -v /path/to/your/user-data:/app/user-data:Z \
  --name dashy \
  --restart=always \
  docker.io/lissy93/dashy:latest
```

The `:Z` suffix on the volume mount handles SELinux relabeling, which you'll need on Fedora/RHEL. If you're not using SELinux, you can leave it off.

Podman also supports `podman-compose` or `podman compose` (with the compose plugin) using the same `docker-compose.yml` file shown above.

---

## Portainer

If you manage your Docker host through [Portainer](https://www.portainer.io/), you can deploy Dashy from its UI:

1. Go to Stacks > Add stack
2. Paste the [docker-compose.yml](https://github.com/Lissy93/dashy/blob/master/docker-compose.yml) contents, or point to the URL
3. Adjust the port and volume mappings as needed
4. Deploy the stack

Alternatively, go to Containers > Add container and use the image `lissy93/dashy:latest` with port `8080` mapped.

---

## Coolify

[Coolify](https://coolify.io/) is a self-hostable PaaS (a Heroku/Netlify alternative). Dashy is available as a one-click service template: under **+ New Resource** > **Service**, search "Dashy" and deploy. It runs the full Docker image, so all features work. ([template source](https://github.com/coollabsio/coolify/blob/v4.x/templates/compose/dashy.yaml))

---

## 1Panel

[1Panel](https://1panel.pro/) is a web-based Linux server management panel. Dashy is in its official App Store: open **App Store**, search "Dashy", click **Install**, and set the port. ([app page](https://1panel.pro/apps/dashy))

---

## Kubernetes

@vyrtualsynthese has written a Helm Chart for deploying with Kubernetes, available [here](https://github.com/vyrtualsynthese/selfhosted-helmcharts/tree/main/charts/dashy).

> [!NOTE]
> This is a community chart and may lag behind the latest Dashy release — check the image tag before deploying.

---

## Unraid

Dashy is available through the [Community Applications](https://forums.unraid.net/topic/38582-plug-in-community-applications/) plugin. Search for "Dashy" in the Apps tab and install from there. The template pre-fills the Docker image, port mapping, and volume paths for you.

If you'd prefer to set it up manually, go to Docker > Add Container and use `lissy93/dashy:latest` as the repository. Map port `8080`, and add a path mapping for the host directory containing your `conf.yml` to `/app/user-data`.

---

## Proxmox VE

The community-maintained [Proxmox VE Helper-Scripts](https://community-scripts.github.io/ProxmoxVE/) project has a script that spins up Dashy in its own LXC container. Run this in the Proxmox host shell:

```bash
bash -c "$(curl -fsSL https://raw.githubusercontent.com/community-scripts/ProxmoxVE/main/ct/dashy.sh)"
```

See the [script page](https://community-scripts.github.io/ProxmoxVE/scripts?id=dashy) for options. These scripts are community-run (not affiliated with Proxmox or Dashy), so give it a read before running.

---

## TrueNAS SCALE

Dashy is in the TrueNAS community apps catalog. Go to **Apps** > **Discover Apps**, search "Dashy", click **Install**, then set the web port and a host-path storage volume for `/app/user-data`. ([catalog entry](https://apps.truenas.com/catalog/dashy/))

Older setups may instead find Dashy via [TrueCharts](https://truecharts.org/charts/stable/dashy/), though TrueCharts is no longer integrated with TrueNAS and its chart may be outdated.

---

## Home Server Platforms

Several self-hosting platforms let you install Dashy from an app store, with a management UI on top:

- [Runtipi](https://runtipi.io/) - In the official Runtipi App Store
- [Cosmos Cloud](https://cosmos-cloud.io/) - In the official Cosmos marketplace
- [CasaOS](https://casaos.io/) - Via the community [BigBear app store](https://github.com/bigbeartechworld/big-bear-casaos) (not the built-in IceWhale store)
- [Umbrel](https://umbrel.com/) - Via a [community app store](https://github.com/dennysubke/dennys-umbrel-app-store) (not the official Umbrel store)

These all run Dashy as a Docker container under the hood, so configuration works the same way. You'll find your `conf.yml` in whichever directory the platform maps to `/app/user-data/`.

---

## Synology NAS

On DSM 7.2 and later, Docker is provided by the **Container Manager** package:

1. Install **Container Manager** from the **Package Center**.
2. In **File Station**, create a folder for Dashy's config (e.g. `docker/dashy`) and put your `conf.yml` (plus any icons/assets) inside it.
3. In Container Manager, open **Registry**, search for `lissy93/dashy`, and download the `latest` tag.
4. Under **Container** > **Create**, pick the image, enable auto-restart, map a host port (e.g. `4000`) to container port `8080`, and mount your `docker/dashy` folder to `/app/user-data`.

Alternatively, use Container Manager's **Project** feature with the [docker-compose.yml](https://github.com/Lissy93/dashy/blob/master/docker-compose.yml) above, or run it over SSH:

```bash
docker run -d \
  -p 4000:8080 \
  -v /volume1/docker/dashy:/app/user-data \
  --name dashy \
  --restart=always \
  lissy93/dashy:latest
```

Dashy should be reachable on your chosen port within a minute or two.

---

## Saltbox

[Saltbox](https://saltbox.dev/) (an Ansible-based server automation project) includes Dashy as a sandbox app. Once Saltbox is set up, install it with:

```bash
sb install sandbox-dashy
```

See the [Saltbox Dashy docs](https://docs.saltbox.dev/sandbox/apps/dashy/) for details.

---

## Build from Source

If you do not want to use Docker, you can run Dashy directly on your host system. For this, you will need both [git](https://git-scm.com/downloads) and [Node.js](https://nodejs.org/) (v20 or newer) installed, and optionally [yarn](https://yarnpkg.com/)

1. Get Code: `git clone https://github.com/Lissy93/dashy.git` and `cd dashy`
2. Configuration: Fill in your settings in `./user-data/conf.yml`
3. Install dependencies: `yarn`
4. Build: `yarn build`
5. Run: `yarn start`

---

## Nix / NixOS

Dashy is packaged in [nixpkgs](https://search.nixos.org/packages?query=dashy-ui) as `dashy-ui`, and NixOS ships a `services.dashy` module. Enable it in your configuration:

```nix
services.dashy.enable = true;
```

See the [module options](https://search.nixos.org/options?query=services.dashy) for setting the port and your config. Or run it ad-hoc with `nix run nixpkgs#dashy-ui`. Note the packaged version can lag behind the latest Dashy release.

---

## Deploy to Cloud Service

Dashy can be deployed to most cloud providers. The Docker guides above work on any VPS, but these providers offer quicker setup for static or containerized deployments.

> [!NOTE]
> Static hosting providers (Netlify, Vercel, EdgeOne) won't have status checks or config writing to disk, since those features need Dashy's Node server. Everything else works fine.

### Netlify

[![Deploy to Netlify](https://img.shields.io/badge/Deploy-Netlify-00C7B7?logo=netlify&logoColor=white)](https://app.netlify.com/start/deploy?repository=https://github.com/lissy93/dashy)

Dashy includes a [`netlify.toml`](https://github.com/Lissy93/dashy/blob/master/netlify.toml) so deployment works out of the box. [Netlify](https://www.netlify.com/) is free for personal use, supports custom domains, and deploys automatically from your Git repo.

Deploy link: `https://app.netlify.com/start/deploy?repository=https://github.com/lissy93/dashy`

### Vercel

[![Deploy with Vercel](https://img.shields.io/badge/Deploy-Vercel-000000?logo=vercel&logoColor=white)](https://vercel.com/new/project?template=https://github.com/lissy93/dashy)

[Vercel](https://vercel.com/) hosts static frontends with a generous free tier, custom domains, and built-in analytics.

Deploy link: `https://vercel.com/new/project?template=https://github.com/lissy93/dashy`

### Render

[![Deploy to Render](https://img.shields.io/badge/Deploy-Render-46E3B7?logo=render&logoColor=white)](https://render.com/deploy?repo=https://github.com/lissy93/dashy)

[Render](https://render.com/) runs the full Docker image, so status checks and config writing work. It builds from the [`render.yaml`](https://github.com/Lissy93/dashy/blob/master/render.yaml) blueprint at the repo root.

Deploy link: `https://render.com/deploy?repo=https://github.com/lissy93/dashy`

### Railway

[![Deploy on Railway](https://img.shields.io/badge/Deploy-Railway-0B0D0E?logo=railway&logoColor=white)](https://railway.app/template/MtdjAQ?referralCode=app)

[Railway](https://railway.com/) deploys the Dashy container from a template, with a free starter tier.

Template: `https://railway.app/template/MtdjAQ`

### Google Cloud Run

[![Run on Google Cloud](https://img.shields.io/badge/Deploy-Cloud_Run-4285F4?logo=googlecloud&logoColor=white)](https://deploy.cloud.run/?git_repo=https://github.com/lissy93/dashy.git)

[Cloud Run](https://cloud.google.com/run) runs the container serverlessly. The button opens Google Cloud Shell and builds from the repo's `Dockerfile`.

Deploy link: `https://deploy.cloud.run/?git_repo=https://github.com/lissy93/dashy.git`

### Easypanel

[![Deploy to Easypanel](https://img.shields.io/badge/Deploy-Easypanel-5765F2)](https://easypanel.io/docs/templates/dashy)

[Easypanel](https://easypanel.io) is a self-hosted server control panel with a Dashy template. It runs the full Docker image, so all features including the Node server work.

Template: `https://easypanel.io/docs/templates/dashy`

> [!NOTE]
> The Easypanel template currently pins an older Dashy version. After deploying, change the image tag to `lissy93/dashy:latest` (or a recent version) to get the newest release.

### EdgeOne Pages

[![Deploy to EdgeOne](https://cdnstatic.tencentcs.com/edgeone/pages/deploy.svg)](https://edgeone.ai/pages/new?repository-url=https://github.com/lissy93/dashy)

[EdgeOne Pages](https://pages.edgeone.ai) is Tencent's edge hosting platform. Static deploy from your Git repo.

Deploy link: `https://edgeone.ai/pages/new?repository-url=https://github.com/lissy93/dashy`

### Play-with-Docker

> [!WARNING]
> Play-with-Docker is being retired and now shows a deprecation notice, so it may stop working. Treat it as a throwaway demo only, and use another method for anything real.

[![Try in PWD](https://img.shields.io/badge/Try-Play_with_Docker-0db7ed?logo=docker&logoColor=white)](https://labs.play-with-docker.com/?stack=https://raw.githubusercontent.com/Lissy93/dashy/master/docker-compose.yml)

[Play with Docker](https://labs.play-with-docker.com/) gives you a free, temporary Docker environment in the browser. Good for trying Dashy without installing anything. Sessions last 4 hours.

URL: `https://labs.play-with-docker.com/?stack=https://raw.githubusercontent.com/Lissy93/dashy/master/docker-compose.yml`

---

## Managed Hosting

If you'd rather not self-host, a couple of providers will run a Dashy instance for you (paid):

- [Elestio](https://elest.io/open-source/dashy) - Fully managed Dashy, or bring your own VM
- [PikaPods](https://www.pikapods.com/) - Managed Dashy hosting from a few dollars per month

---

## Hosting with CDN

Once Dashy has been built, it is effectively just a static web app. This means that it can be served up with pretty much any static host, CDN or web server. To host Dashy through a CDN, the steps are very similar to building from source: clone the project, cd into it, install dependencies, write your config file and build the app. Once build is complete you will have a `./dist` directory within Dashy's root, and this is the build application which is ready to be served up.

However without Dashy's node server, there are a couple of features that will be unavailable to you, including: writing config changes to disk through the UI, and application status checks. Everything else will work fine.

---

## Requirements

### Architecture
The pre-built Docker image runs on `amd64`, `arm64` and `armv7` (`armv6` is not supported).

### System Resources
- CPU: any single core, x86-64 or ARM
- RAM: Node server idles around ~80–120 MB; 256 MB is comfortable, works in less
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
