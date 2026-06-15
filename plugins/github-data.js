const fs = require('fs');
const path = require('path');

const REPO = 'lissy93/dashy';
const MAX_TAG_DATE_FETCHES = 20;
const FEED_TAG_DATE_CHUNK = 10;

function stripMarkdown(text) {
  return text
    .replace(/#{1,6}\s*/g, '')
    .replace(/[*_~`>]/g, '')
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
    .replace(/!\[[^\]]*\]\([^)]+\)/g, '')
    .replace(/\n+/g, ' ')
    .trim();
}

async function fetchJson(url, headers) {
  const res = await fetch(url, { headers });
  if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);
  return { json: await res.json(), headers: res.headers };
}

async function fetchAllContributors(headers) {
  const allContributors = [];
  let page = 1;
  const perPage = 100;

  while (true) {
    const { json: data } = await fetchJson(
      `https://api.github.com/repos/${REPO}/contributors?per_page=${perPage}&page=${page}`,
      headers,
    );
    if (!Array.isArray(data) || data.length === 0) break;
    allContributors.push(...data);
    if (data.length < perPage) break;
    page++;
  }

  return allContributors;
}

function escapeXml(value) {
  return String(value == null ? '' : value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

// Fetch every tag across all pages (the main loader only keeps page 1).
async function fetchAllTags(headers) {
  const allTags = [];
  for (let page = 1; page <= 10; page++) {
    const { json } = await fetchJson(
      `https://api.github.com/repos/${REPO}/tags?per_page=100&page=${page}`,
      headers,
    );
    if (!Array.isArray(json) || json.length === 0) break;
    allTags.push(...json);
    if (json.length < 100) break;
  }
  return allTags;
}

// Build an RSS 2.0 feed of every release and tag, newest first.
// Returns the XML string, or null if there is nothing worth publishing.
async function buildFeedXml(data, headers, siteUrl) {
  const releases = Array.isArray(data.releases) ? data.releases : [];
  const allTags = await fetchAllTags(headers);

  // Seed known dates from data we already have, to avoid redundant API calls.
  const dateByTag = new Map();
  for (const r of releases) {
    if (r.tag_name && r.published_at) dateByTag.set(r.tag_name, r.published_at);
  }
  for (const t of (data.tags || [])) {
    if (t.name && t.date) dateByTag.set(t.name, t.date);
  }
  if (data.latestTag?.name && data.latestTag?.date) {
    dateByTag.set(data.latestTag.name, data.latestTag.date);
  }

  // Resolve dates for any remaining tags via their commit, in bounded chunks.
  const unresolved = allTags.filter(t => !dateByTag.has(t.name) && t.commit?.sha);
  for (let i = 0; i < unresolved.length; i += FEED_TAG_DATE_CHUNK) {
    const chunk = unresolved.slice(i, i + FEED_TAG_DATE_CHUNK);
    const results = await Promise.allSettled(
      chunk.map(t =>
        fetchJson(`https://api.github.com/repos/${REPO}/commits/${t.commit.sha}`, headers)
          .then(({ json: c }) => ({
            name: t.name,
            date: c.commit?.author?.date || c.commit?.committer?.date,
          }))
      )
    );
    for (const res of results) {
      if (res.status === 'fulfilled' && res.value.date) {
        dateByTag.set(res.value.name, res.value.date);
      }
    }
  }

  // Releases first (richer content), then tags that have no release of their own.
  const releaseTagNames = new Set(releases.map(r => r.tag_name));
  const items = [];
  for (const r of releases) {
    if (!r.published_at) continue;
    items.push({
      title: r.name || r.tag_name,
      url: r.html_url || `https://github.com/${REPO}/releases/tag/${r.tag_name}`,
      date: r.published_at,
      description: r.body || `Release ${r.tag_name}`,
      category: 'Release',
    });
  }
  for (const t of allTags) {
    if (releaseTagNames.has(t.name)) continue;
    const date = dateByTag.get(t.name);
    if (!date) continue;
    items.push({
      title: t.name,
      url: `https://github.com/${REPO}/releases/tag/${t.name}`,
      date,
      description: `Tag ${t.name}`,
      category: 'Tag',
    });
  }

  if (items.length === 0) return null;
  items.sort((a, b) => new Date(b.date) - new Date(a.date));

  const feedUrl = `${siteUrl}rss.xml`;
  const channelLink = `${siteUrl}updates`;
  const xmlItems = items.map(it => `    <item>
      <title>${escapeXml(it.title)}</title>
      <link>${escapeXml(it.url)}</link>
      <guid isPermaLink="true">${escapeXml(it.url)}</guid>
      <pubDate>${new Date(it.date).toUTCString()}</pubDate>
      <category>${escapeXml(it.category)}</category>
      <description>${escapeXml(it.description)}</description>
    </item>`).join('\n');

  return `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>Dashy — Releases &amp; Updates</title>
    <link>${escapeXml(channelLink)}</link>
    <atom:link href="${escapeXml(feedUrl)}" rel="self" type="application/rss+xml" />
    <description>New releases and version tags for Dashy, the self-hosted dashboard for your homelab.</description>
    <language>en</language>
    <lastBuildDate>${new Date().toUTCString()}</lastBuildDate>
    <generator>dashy-docs github-data plugin</generator>
${xmlItems}
  </channel>
</rss>
`;
}

module.exports = function githubDataPlugin(context) {
  const { url, baseUrl } = context.siteConfig;
  const siteUrl = url.replace(/\/$/, '') + (baseUrl || '/');
  let feedXml = null;

  return {
    name: 'github-data',

    async loadContent() {
      const token = process.env.GITHUB_TOKEN || '';
      const headers = { 'User-Agent': 'dashy-docs' };
      if (token) headers['Authorization'] = `token ${token}`;

      const data = {
        releases: null,
        tags: null,
        commits: null,
        contributors: null,
        sponsors: null,
        starCount: null,
        dockerPulls: null,
        contributorCount: null,
        latestTag: null,
      };

      // Fetch all sources in parallel, each wrapped in try/catch
      const [
        releasesResult,
        tagsResult,
        commitsResult,
        contributorsResult,
        sponsorsResult,
        repoResult,
        dockerResult,
        contributorCountResult,
      ] = await Promise.allSettled([
        fetchJson(`https://api.github.com/repos/${REPO}/releases?per_page=100`, headers),
        fetchJson(`https://api.github.com/repos/${REPO}/tags?per_page=100`, headers),
        fetchJson(`https://api.github.com/repos/${REPO}/commits?per_page=30&page=1`, headers),
        fetchAllContributors(headers),
        fetchJson('https://github-sponsors-api.as93.net/lissy93', headers),
        fetchJson(`https://api.github.com/repos/${REPO}`, headers),
        fetchJson('https://hub.docker.com/v2/repositories/lissy93/dashy/', headers),
        fetch(`https://api.github.com/repos/${REPO}/contributors?per_page=1&anon=true`, { headers }),
      ]);

      // Releases — trim to only what components need
      if (releasesResult.status === 'fulfilled') {
        data.releases = releasesResult.value.json.map(r => ({
          tag_name: r.tag_name,
          name: r.name,
          published_at: r.published_at,
          body: r.body ? stripMarkdown(r.body).slice(0, 200) : '',
          html_url: r.html_url,
          author_login: r.author?.login,
          author_avatar: r.author?.avatar_url,
        }));
      }

      // Tags — resolve dates for non-release tags
      if (tagsResult.status === 'fulfilled') {
        const rawTags = tagsResult.value.json;
        const releaseTagNames = data.releases
          ? new Set(data.releases.map(r => r.tag_name))
          : new Set();

        const nonReleaseTags = rawTags
          .filter(t => !releaseTagNames.has(t.name))
          .slice(0, MAX_TAG_DATE_FETCHES);

        const tagDateResults = await Promise.allSettled(
          nonReleaseTags.map(t =>
            fetchJson(`https://api.github.com/repos/${REPO}/commits/${t.commit.sha}`, headers)
              .then(({ json: c }) => ({
                name: t.name,
                date: c.commit.author.date,
              }))
          )
        );

        data.tags = tagDateResults
          .filter(r => r.status === 'fulfilled')
          .map(r => r.value);

        // Latest tag + date (for UpdateBanner) — reuse already-resolved date if possible
        if (rawTags.length > 0) {
          const latestTag = rawTags[0];
          const resolvedInBatch = data.tags?.find(t => t.name === latestTag.name);
          const matchingRelease = data.releases?.find(r => r.tag_name === latestTag.name);

          if (resolvedInBatch) {
            data.latestTag = { name: latestTag.name, date: resolvedInBatch.date };
          } else if (matchingRelease) {
            data.latestTag = { name: latestTag.name, date: matchingRelease.published_at };
          } else {
            try {
              const { json: commitData } = await fetchJson(
                `https://api.github.com/repos/${REPO}/commits/${latestTag.commit.sha}`,
                headers,
              );
              data.latestTag = {
                name: latestTag.name,
                date: commitData.commit.author.date,
              };
            } catch {
              data.latestTag = { name: latestTag.name, date: null };
            }
          }
        }
      }

      // Commits — fetch page 1 from the parallel batch, then paginate for more
      const allRawCommits = [];
      if (commitsResult.status === 'fulfilled') {
        allRawCommits.push(...commitsResult.value.json);

        // Fetch up to 7 more pages sequentially
        if (commitsResult.value.json.length >= 30) {
          for (let page = 2; page <= 5; page++) {
            try {
              const { json } = await fetchJson(
                `https://api.github.com/repos/${REPO}/commits?per_page=30&page=${page}`,
                headers,
              );
              if (!Array.isArray(json) || json.length === 0) break;
              allRawCommits.push(...json);
              if (json.length < 30) break;
            } catch {
              break; // keep what we have so far
            }
          }
        }

        data.commits = allRawCommits.map(c => {
          const msg = (c.commit?.message || '').split('\n')[0];
          const prMatch = msg.match(/[\s\S]{0,5}?Merge pull request #\d+ from ([^/]+)\//);
          const apiAuthor = c.author?.login || c.commit?.author?.name;
          const isPrMergeByOwner = prMatch && (!apiAuthor || apiAuthor.toLowerCase() === 'lissy93');
          return {
            sha: c.sha,
            message: msg,
            date: c.commit?.author?.date || c.commit?.committer?.date,
            author_login: isPrMergeByOwner ? prMatch[1] : apiAuthor,
            author_avatar: isPrMergeByOwner ? `https://github.com/${prMatch[1]}.png` : c.author?.avatar_url,
            html_url: c.html_url,
          };
        });
      }

      // Contributors — trim to what Authors component needs
      if (contributorsResult.status === 'fulfilled') {
        const allContribs = contributorsResult.value;
        data.contributors = allContribs
          .filter(c => c.type === 'User' && !c.login.endsWith('[bot]'))
          .map(c => ({
            id: c.id,
            login: c.login,
            avatar_url: c.avatar_url,
            html_url: c.html_url,
            contributions: c.contributions,
            type: c.type,
          }));
      }

      // Sponsors
      if (sponsorsResult.status === 'fulfilled') {
        const sponsorsData = sponsorsResult.value.json;
        if (Array.isArray(sponsorsData) && sponsorsData.length > 0) {
          data.sponsors = sponsorsData.map(s => ({
            login: s.login,
            name: s.name,
            avatarUrl: s.avatarUrl,
          }));
        }
      }

      // Star count
      if (repoResult.status === 'fulfilled') {
        data.starCount = repoResult.value.json.stargazers_count || null;
      }

      // Docker pulls
      if (dockerResult.status === 'fulfilled') {
        data.dockerPulls = dockerResult.value.json.pull_count || null;
      }

      // Contributor count from Link header
      if (contributorCountResult.status === 'fulfilled') {
        try {
          const linkHeader = contributorCountResult.value.headers.get('Link');
          if (linkHeader) {
            const lastMatch = linkHeader.match(/&page=(\d+)>;\s*rel="last"/);
            if (lastMatch) {
              data.contributorCount = parseInt(lastMatch[1], 10);
            }
          }
        } catch {}
      }

      const fetched = Object.entries(data)
        .filter(([, v]) => v != null)
        .map(([k, v]) => Array.isArray(v) ? `${k}(${v.length})` : `${k}`)
        .join(', ');
      console.log(`[github-data] Build-time data: ${fetched || 'none (API rate-limited?)'}`);

      // Build the RSS feed from the same data. Never let this break the build.
      try {
        feedXml = await buildFeedXml(data, headers, siteUrl);
        console.log(`[github-data] RSS feed: ${feedXml ? 'generated' : 'skipped (no data)'}`);
      } catch (err) {
        console.warn(`[github-data] RSS feed generation failed: ${err.message}`);
      }

      return data;
    },

    async contentLoaded({ content, actions }) {
      actions.setGlobalData(content);
    },

    async postBuild({ outDir }) {
      if (!feedXml) return;
      try {
        fs.writeFileSync(path.join(outDir, 'rss.xml'), feedXml);
        console.log('[github-data] Wrote rss.xml to build output');
      } catch (err) {
        console.warn(`[github-data] Failed to write rss.xml: ${err.message}`);
      }
    },
  };
};
