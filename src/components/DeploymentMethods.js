import React, { useState } from 'react';
import Link from '@docusaurus/Link';
import styles from '../styles/DeploymentMethods.module.scss';

const icon = (file) => `https://pixelflare.cc/alicia/icons/${file}/w128`;

const METHODS = [
  { name: 'Docker', link: '/docs/deployment/docker', icon: icon('docker.png'), official: true, category: 'Docker' },
  { name: 'Docker Compose', link: '/docs/deployment/docker#docker-compose', icon: icon('docker-compose.png'), official: true, category: 'Docker' },
  { name: 'Podman', link: '/docs/deployment/docker#podman', icon: icon('podman.png'), category: 'Docker' },
  { name: 'Build from Source', link: '/docs/deployment/bare-metal#build-from-source', icon: icon('build-from-source.png'), official: true, category: 'Bare Metal' },
  { name: 'Pre-Built Release', link: '/docs/deployment/bare-metal#pre-built-release', icon: icon('download-release.png'), official: true, category: 'Bare Metal' },
  { name: 'TrueNAS SCALE', link: '/docs/deployment/self-hosted-os#truenas-scale', icon: icon('truenas-scale.png'), externalLink: 'https://apps.truenas.com/catalog/dashy_community/', category: 'Operating Systems' },
  { name: 'Proxmox VE', link: '/docs/deployment/self-hosted-os#proxmox-ve', icon: icon('proxmox.png'), externalLink: 'https://community-scripts.github.io/ProxmoxVE/scripts?id=dashy', category: 'Operating Systems' },
  { name: 'Unraid', link: '/docs/deployment/self-hosted-os#unraid', icon: icon('unraid.png'), category: 'Operating Systems' },
  { name: 'Synology NAS', link: '/docs/deployment/self-hosted-os#synology-nas', icon: icon('synology.png'), category: 'Operating Systems' },
  { name: 'NixOS', link: '/docs/deployment/self-hosted-os#nixos', icon: icon('nixos.png'), category: 'Operating Systems' },
  { name: 'Kubernetes', link: '/docs/deployment/self-hosted-os#kubernetes', icon: icon('kubernetes.png'), category: 'Operating Systems' },
  { name: 'Portainer', link: '/docs/deployment/self-hosted-platforms#portainer', icon: icon('portainer.png'), official: true, category: 'Platforms' },
  { name: 'Coolify', link: '/docs/deployment/self-hosted-platforms#coolify', icon: icon('coolify.png'), category: 'Platforms' },
  { name: '1Panel', link: '/docs/deployment/self-hosted-platforms#1panel', icon: icon('1panel.png'), externalLink: 'https://1panel.pro/apps/dashy', category: 'Platforms' },
  { name: 'Runtipi', link: '/docs/deployment/self-hosted-platforms#runtipi', icon: icon('runtipi.png'), category: 'Platforms' },
  { name: 'Cosmos Cloud', link: '/docs/deployment/self-hosted-platforms#cosmos-cloud', icon: icon('cosmos-cloud.png'), category: 'Platforms' },
  { name: 'CasaOS', link: '/docs/deployment/self-hosted-platforms#casaos', icon: icon('casaos.png'), category: 'Platforms' },
  { name: 'Umbrel', link: '/docs/deployment/self-hosted-platforms#umbrel', icon: icon('umbrel.png'), category: 'Platforms' },
  { name: 'EasyPanel', link: '/docs/deployment/self-hosted-platforms#easypanel', icon: icon('easy-panel.png'), externalLink: 'https://easypanel.io/docs/templates/dashy', category: 'Platforms' },
  { name: 'Saltbox', link: '/docs/deployment/self-hosted-platforms#saltbox', icon: icon('saltbox.png'), externalLink: 'https://docs.saltbox.dev/sandbox/apps/dashy/', category: 'Platforms' },
  { name: 'Netlify', link: '/docs/deployment/cloud#netlify', icon: icon('netlify.png'), externalLink: 'https://app.netlify.com/start/deploy?repository=https://github.com/lissy93/dashy', official: true, category: 'Static Hosting' },
  { name: 'Vercel', link: '/docs/deployment/cloud#vercel', icon: icon('vercel.png'), externalLink: 'https://vercel.com/new/clone?repository-url=https://github.com/lissy93/dashy', category: 'Static Hosting' },
  { name: 'EdgeOne Pages', link: '/docs/deployment/cloud#edgeone-pages', icon: icon('edgeone.png'), category: 'Static Hosting' },
  { name: 'Cloudflare Pages', link: '/docs/deployment/cloud#cloudflare-pages', icon: icon('cloudflare-pages.png'), category: 'Static Hosting' },
  { name: 'Firebase Hosting', link: '/docs/deployment/cloud#firebase-hosting', icon: icon('firebase.png'), category: 'Static Hosting' },
  { name: 'Azure Static Web Apps', link: '/docs/deployment/cloud#azure-static-web-apps', icon: icon('azure.png'), category: 'Static Hosting' },
  { name: 'Any CDN', link: '/docs/deployment/cloud#hosting-with-any-cdn', icon: icon('cdn.png'), category: 'Static Hosting' },
  { name: 'Render', link: '/docs/deployment/cloud#render', icon: icon('render.jpg'), externalLink: 'https://render.com/deploy?repo=https://github.com/lissy93/dashy', category: 'Container Services' },
  { name: 'Railway', link: '/docs/deployment/cloud#railway', icon: icon('railway.png'), externalLink: 'https://railway.com/deploy/dashy', category: 'Container Services' },
  { name: 'Fly.io', link: '/docs/deployment/cloud#flyio', icon: icon('fly-io.png'), category: 'Container Services' },
  { name: 'Koyeb', link: '/docs/deployment/cloud#koyeb', icon: icon('koyeb.png'), externalLink: 'https://app.koyeb.com/deploy?type=docker&image=docker.io/lissy93/dashy:latest&name=dashy&ports=8080%3Bhttp%3B%2F', category: 'Container Services' },
  { name: 'Northflank', link: '/docs/deployment/cloud#northflank', icon: icon('northflank.png'), externalLink: 'https://northflank.com/stacks/deploy-dashy', category: 'Container Services' },
  { name: 'DigitalOcean', link: '/docs/deployment/cloud#digitalocean-app-platform', icon: icon('digital-ocean.png'), category: 'Container Services' },
  { name: 'Azure Container Apps', link: '/docs/deployment/cloud#azure-container-apps', icon: icon('azure.png'), category: 'Container Services' },
  { name: 'Google Cloud Run', link: '/docs/deployment/cloud#google-cloud-run', icon: icon('google-cloud-run.png'), category: 'Container Services' },
  { name: 'Elestio', link: '/docs/deployment/cloud#managed-hosting', icon: icon('elestio.png'), externalLink: 'https://elest.io/open-source/dashy', category: 'Managed Hosting' },
  { name: 'PikaPods', link: '/docs/deployment/cloud#managed-hosting', icon: icon('pikapods.png'), category: 'Managed Hosting' },
  { name: 'Hostinger', link: '/docs/deployment/cloud#managed-hosting', icon: icon('hostinger.png'), externalLink: 'https://www.hostinger.com/applications/dashy', category: 'Managed Hosting' },
];

const CATEGORIES = [...new Set(METHODS.map((m) => m.category))];

function MethodIcon({ src, name }) {
  const [failed, setFailed] = useState(false);
  if (!src || failed) {
    return <span className={styles.fallbackIcon} aria-hidden="true">{name.charAt(0)}</span>;
  }
  return (
    <img
      src={src}
      alt=""
      width="56"
      height="56"
      loading="lazy"
      decoding="async"
      onError={() => setFailed(true)}
    />
  );
}

function MethodCard({ method }) {
  const external = Boolean(method.externalLink);
  const title = external
    ? `Deploy Dashy with ${method.name} (opens in a new tab)`
    : `Dashy ${method.name} deployment guide`;
  return (
    <Link
      to={method.externalLink || method.link}
      className={styles.card}
      title={title}
      {...(external && { target: '_blank', rel: 'noopener noreferrer' })}
    >
      <MethodIcon src={method.icon} name={method.name} />
      <span className={styles.name}>{method.name}</span>
      {method.official && <span className={styles.official} title="Officially supported">official</span>}
      {external && <span className={styles.external} aria-hidden="true">↗</span>}
    </Link>
  );
}

export default function DeploymentMethods() {
  const [filter, setFilter] = useState('All');
  const visible = METHODS.filter((m) => {
    if (filter === 'All') return true;
    if (filter === 'Official') return m.official;
    return m.category === filter;
  });
  return (
    <nav className={styles.wrapper} aria-label="Dashy deployment methods">
      <div className={styles.header}>
        <p className={styles.intro}>Click one of the {METHODS.length} guides below to get started</p>
        <select
          className={styles.filter}
          aria-label="Filter deployment methods"
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
        >
          {['All', 'Official', ...CATEGORIES].map((c) => <option key={c}>{c}</option>)}
        </select>
      </div>
      <div className={styles.grid}>
        {visible.map((m) => <MethodCard key={m.name} method={m} />)}
      </div>
    </nav>
  );
}
