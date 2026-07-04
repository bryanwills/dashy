# Self-Hosted Operating Systems

The following lists third-party/community-maintained apps and scripts for deploying Dashy on various device types.
Note that these are unofficial. Please ensure you're using a recent version of Dashy (4.x.x +) before opening issues here.

---

## TrueNAS SCALE

Dashy is in the TrueNAS community apps catalog. Go to **Apps** > **Discover Apps**, search "Dashy", click **Install**, then set the web port and a host-path storage volume for `/app/user-data`. ([catalog entry](https://apps.truenas.com/catalog/dashy_community/))

Older setups may instead find Dashy via [TrueCharts](https://truecharts.org/charts/stable/dashy/), though TrueCharts is no longer integrated with TrueNAS and its chart may be outdated.

---

## Proxmox VE

The community-maintained [Proxmox VE Helper-Scripts](https://community-scripts.github.io/ProxmoxVE/) project has a script that spins up Dashy in its own LXC container. Run this in the Proxmox host shell:

```bash
bash -c "$(curl -fsSL https://raw.githubusercontent.com/community-scripts/ProxmoxVE/main/ct/dashy.sh)"
```

See the [script page](https://community-scripts.github.io/ProxmoxVE/scripts?id=dashy) for options. These scripts are community-run (not affiliated with Proxmox or Dashy), so give it a read before running.

---

## Unraid

Dashy is available through the [Community Applications](https://docs.unraid.net/community-applications/) plugin. Search for "Dashy" in the Apps tab and install from there. The template pre-fills the Docker image, port mapping, and volume paths for you.

If you'd prefer to set it up manually, go to Docker > Add Container and use `lissy93/dashy:latest` as the repository. Map port `8080`, and add a path mapping for the host directory containing your `conf.yml` to `/app/user-data`.

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

## NixOS

Dashy is packaged in [nixpkgs](https://search.nixos.org/packages?query=dashy-ui) as `dashy-ui`, and NixOS ships a `services.dashy` module. Enable it in your configuration:

```nix
services.dashy.enable = true;
```

See the [module options](https://search.nixos.org/options?query=services.dashy) for setting the port and your config. Note that the package builds the static app, so the server-only features (status checks, saving config through the UI) aren't available.

---

## Kubernetes

> [!CAUTION]
> This integration may need re-review, to ensure that it's using / compatible with Dashy 4+

This uses the Helm chart written by @vyrtualsynthese, which is available [here](https://github.com/vyrtualsynthese/selfhosted-helmcharts/tree/main/charts/dashy)

```bash
# Add the self-hosted repo
helm repo add self-hosted https://vyrtualsynthese.github.io/selfhosted-helmcharts/
helm repo update

# Install the dashy chart
helm install [RELEASE_NAME] self-hosted/dashy
```

[TrueCharts](https://truecharts.org/charts/stable/dashy/) also publishes a Dashy Helm chart, aimed at Kubernetes and TrueNAS SCALE.
