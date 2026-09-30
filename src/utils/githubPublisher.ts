import { VirtualFile } from '../types/workspace';

export interface GitHubUser {
  login: string;
  id: number;
  avatar_url: string;
  name: string;
  html_url: string;
}

export interface PublishProgressCallback {
  (step: 'auth' | 'repo' | 'commit' | 'pages' | 'verify' | 'done', message: string, detail?: {
    owner?: string;
    repo?: string;
    repoUrl?: string;
    pagesUrl?: string;
    commitSha?: string;
  }): void;
}

const GITHUB_API = 'https://api.github.com';

function getHeaders(token: string) {
  return {
    Authorization: `Bearer ${token.trim()}`,
    Accept: 'application/vnd.github+json',
    'X-GitHub-Api-Version': '2022-11-28',
  };
}

export async function verifyGitHubToken(token: string): Promise<GitHubUser> {
  const cleanToken = token.trim();
  if (!cleanToken) {
    throw new Error('Please enter a GitHub Personal Access Token.');
  }

  const res = await fetch(`${GITHUB_API}/user`, {
    headers: getHeaders(cleanToken),
  });

  if (!res.ok) {
    if (res.status === 401) {
      throw new Error('Invalid GitHub token. Please verify your token and permissions.');
    }
    const errBody = await res.json().catch(() => ({}));
    throw new Error(errBody.message || `GitHub authentication failed (HTTP ${res.status}).`);
  }

  return res.json();
}

export async function getOrCreateRepository(
  token: string,
  user: GitHubUser,
  repoName: string,
  description: string,
  isPrivate: boolean
): Promise<{ owner: string; repo: string; html_url: string; default_branch: string }> {
  const cleanRepoName = repoName
    .toLowerCase()
    .replace(/[^a-z0-9-_]/g, '-')
    .replace(/^-|-$/g, '') || 'offline-html-site';

  // 1. Check if repo already exists
  const checkRes = await fetch(`${GITHUB_API}/repos/${user.login}/${cleanRepoName}`, {
    headers: getHeaders(token),
  });

  if (checkRes.ok) {
    const existing = await checkRes.json();
    return {
      owner: user.login,
      repo: existing.name,
      html_url: existing.html_url,
      default_branch: existing.default_branch || 'main',
    };
  }

  // 2. Create the repository
  const createRes = await fetch(`${GITHUB_API}/user/repos`, {
    method: 'POST',
    headers: {
      ...getHeaders(token),
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      name: cleanRepoName,
      description: description || 'Hosted offline HTML site published via StaticDock',
      private: isPrivate,
      auto_init: true, // initializes with a README so branch ref exists immediately
    }),
  });

  if (!createRes.ok) {
    const errData = await createRes.json().catch(() => ({}));
    throw new Error(
      errData.message ||
        `Failed to create repository "${cleanRepoName}". (Status ${createRes.status})`
    );
  }

  const created = await createRes.json();
  return {
    owner: user.login,
    repo: created.name,
    html_url: created.html_url,
    default_branch: created.default_branch || 'main',
  };
}

export async function uploadFilesViaGitTree(
  token: string,
  owner: string,
  repo: string,
  branch: string,
  files: VirtualFile[],
  standaloneHtml: string,
  commitMessage: string
): Promise<string> {
  const headers = {
    ...getHeaders(token),
    'Content-Type': 'application/json',
  };

  // 1. Get branch reference to find parent commit
  let parentCommitSha: string | null = null;
  let baseTreeSha: string | null = null;

  const refRes = await fetch(`${GITHUB_API}/repos/${owner}/${repo}/git/ref/heads/${branch}`, {
    headers: getHeaders(token),
  });

  if (refRes.ok) {
    const refData = await refRes.json();
    parentCommitSha = refData.object.sha;
    // Get commit to find base_tree
    const commitRes = await fetch(
      `${GITHUB_API}/repos/${owner}/${repo}/git/commits/${parentCommitSha}`,
      { headers: getHeaders(token) }
    );
    if (commitRes.ok) {
      const commitData = await commitRes.json();
      baseTreeSha = commitData.tree.sha;
    }
  }

  // 2. Prepare tree items: upload blobs for each file
  const treeItems: Array<{
    path: string;
    mode: '100644';
    type: 'blob';
    sha: string;
  }> = [];

  // Always include .nojekyll so GitHub Pages does not ignore underscore or assets folders
  const nojekyllBlobRes = await fetch(`${GITHUB_API}/repos/${owner}/${repo}/git/blobs`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ content: '', encoding: 'utf-8' }),
  });
  if (nojekyllBlobRes.ok) {
    const blob = await nojekyllBlobRes.json();
    treeItems.push({ path: '.nojekyll', mode: '100644', type: 'blob', sha: blob.sha });
  }

  // Include Standalone HTML copy as well for single-file sharing
  const standaloneBlobRes = await fetch(`${GITHUB_API}/repos/${owner}/${repo}/git/blobs`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ content: standaloneHtml, encoding: 'utf-8' }),
  });
  if (standaloneBlobRes.ok) {
    const blob = await standaloneBlobRes.json();
    treeItems.push({ path: 'bundle.standalone.html', mode: '100644', type: 'blob', sha: blob.sha });
  }

  // Upload each virtual file
  for (const file of files) {
    let content = '';
    let encoding: 'utf-8' | 'base64' = 'utf-8';

    if (file.isDataUrl && file.content.includes(';base64,')) {
      content = file.content.split(';base64,')[1];
      encoding = 'base64';
    } else {
      content = file.content;
      encoding = 'utf-8';
    }

    const blobRes = await fetch(`${GITHUB_API}/repos/${owner}/${repo}/git/blobs`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ content, encoding }),
    });

    if (!blobRes.ok) {
      throw new Error(`Failed to upload blob for ${file.path}`);
    }

    const blobData = await blobRes.json();
    treeItems.push({
      path: file.path.replace(/^\/+/, ''),
      mode: '100644',
      type: 'blob',
      sha: blobData.sha,
    });
  }

  // 3. Create Tree
  const createTreePayload: {
    tree: typeof treeItems;
    base_tree?: string;
  } = { tree: treeItems };
  if (baseTreeSha) {
    createTreePayload.base_tree = baseTreeSha;
  }

  const treeRes = await fetch(`${GITHUB_API}/repos/${owner}/${repo}/git/trees`, {
    method: 'POST',
    headers,
    body: JSON.stringify(createTreePayload),
  });

  if (!treeRes.ok) {
    const err = await treeRes.json().catch(() => ({}));
    throw new Error(err.message || 'Failed to construct Git tree on GitHub.');
  }

  const newTree = await treeRes.json();

  // 4. Create Commit
  const commitPayload: {
    message: string;
    tree: string;
    parents?: string[];
  } = {
    message: commitMessage || 'Auto-publish static HTML site via StaticDock',
    tree: newTree.sha,
    parents: parentCommitSha ? [parentCommitSha] : [],
  };

  const newCommitRes = await fetch(`${GITHUB_API}/repos/${owner}/${repo}/git/commits`, {
    method: 'POST',
    headers,
    body: JSON.stringify(commitPayload),
  });

  if (!newCommitRes.ok) {
    const err = await newCommitRes.json().catch(() => ({}));
    throw new Error(err.message || 'Failed to create Git commit.');
  }

  const newCommit = await newCommitRes.json();

  // 5. Update or Create Branch Ref
  if (parentCommitSha) {
    const updateRefRes = await fetch(
      `${GITHUB_API}/repos/${owner}/${repo}/git/refs/heads/${branch}`,
      {
        method: 'PATCH',
        headers,
        body: JSON.stringify({
          sha: newCommit.sha,
          force: true,
        }),
      }
    );
    if (!updateRefRes.ok) {
      throw new Error('Failed to update branch reference.');
    }
  } else {
    const createRefRes = await fetch(`${GITHUB_API}/repos/${owner}/${repo}/git/refs`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        ref: `refs/heads/${branch}`,
        sha: newCommit.sha,
      }),
    });
    if (!createRefRes.ok) {
      throw new Error('Failed to create branch reference.');
    }
  }

  return newCommit.sha;
}

export async function enableGitHubPages(
  token: string,
  owner: string,
  repo: string,
  branch: string
): Promise<{ html_url: string; status: string | null }> {
  // Check if Pages is already enabled
  const checkPagesRes = await fetch(`${GITHUB_API}/repos/${owner}/${repo}/pages`, {
    headers: getHeaders(token),
  });

  if (checkPagesRes.ok) {
    const pagesData = await checkPagesRes.json();
    return {
      html_url: pagesData.html_url || `https://${owner.toLowerCase()}.github.io/${repo}/`,
      status: pagesData.status || 'built',
    };
  }

  // Try enabling Pages
  const enableRes = await fetch(`${GITHUB_API}/repos/${owner}/${repo}/pages`, {
    method: 'POST',
    headers: {
      ...getHeaders(token),
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      source: {
        branch,
        path: '/',
      },
    }),
  });

  if (!enableRes.ok) {
    // If status 409, might already exist or be building
    if (enableRes.status === 409) {
      return {
        html_url: `https://${owner.toLowerCase()}.github.io/${repo}/`,
        status: 'queued',
      };
    }
    const err = await enableRes.json().catch(() => ({}));
    throw new Error(err.message || 'Failed to enable GitHub Pages on repository.');
  }

  const pagesInfo = await enableRes.json();
  return {
    html_url: pagesInfo.html_url || `https://${owner.toLowerCase()}.github.io/${repo}/`,
    status: pagesInfo.status || 'queued',
  };
}

export async function publishProjectToGitHubPages(options: {
  token: string;
  repoName: string;
  repoDescription?: string;
  isPrivate?: boolean;
  branch?: string;
  files: VirtualFile[];
  standaloneHtml: string;
  onProgress?: PublishProgressCallback;
}): Promise<{
  owner: string;
  repo: string;
  repoUrl: string;
  pagesUrl: string;
  commitSha: string;
  branch: string;
}> {
  const {
    token,
    repoName,
    repoDescription = 'Static HTML site published offline via StaticDock',
    isPrivate = false,
    branch = 'main',
    files,
    standaloneHtml,
    onProgress,
  } = options;

  // 1. Verify token
  onProgress?.('auth', 'Verifying GitHub credentials and token permissions...');
  const user = await verifyGitHubToken(token);

  // 2. Create or verify repository
  onProgress?.('repo', `Setting up GitHub repository "${repoName}" for ${user.login}...`, {
    owner: user.login,
  });
  const repoInfo = await getOrCreateRepository(
    token,
    user,
    repoName,
    repoDescription,
    isPrivate
  );

  // 3. Commit files
  onProgress?.('commit', `Uploading ${files.length} static assets and configuring .nojekyll...`, {
    owner: repoInfo.owner,
    repo: repoInfo.repo,
    repoUrl: repoInfo.html_url,
  });
  const commitSha = await uploadFilesViaGitTree(
    token,
    repoInfo.owner,
    repoInfo.repo,
    branch,
    files,
    standaloneHtml,
    `Publish static HTML site via StaticDock (${files.length} files)`
  );

  // 4. Enable GitHub Pages
  onProgress?.('pages', `Enabling GitHub Pages on branch "${branch}"...`, {
    owner: repoInfo.owner,
    repo: repoInfo.repo,
    repoUrl: repoInfo.html_url,
    commitSha,
  });
  const pages = await enableGitHubPages(token, repoInfo.owner, repoInfo.repo, branch);

  const finalPagesUrl = pages.html_url.endsWith('/') ? pages.html_url : `${pages.html_url}/`;

  onProgress?.('done', `Site published! Live at ${finalPagesUrl}`, {
    owner: repoInfo.owner,
    repo: repoInfo.repo,
    repoUrl: repoInfo.html_url,
    pagesUrl: finalPagesUrl,
    commitSha,
  });

  return {
    owner: repoInfo.owner,
    repo: repoInfo.repo,
    repoUrl: repoInfo.html_url,
    pagesUrl: finalPagesUrl,
    commitSha,
    branch,
  };
}
