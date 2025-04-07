async function getCurrentTab() {
  let queryOptions = { active: true, lastFocusedWindow: true };
  // `tab` will either be a `tabs.Tab` instance or `undefined`.
  let [tab] = await chrome.tabs.query(queryOptions);
  return tab;
}

document.addEventListener("DOMContentLoaded", async () => {

  const input = document.getElementById("search");
  const results = document.getElementById("results");
  const addButton = document.getElementById("add-repo");

  async function _getRepos() {
    const data = await chrome.storage.local.get("repos");
    return data.repos || [];
  }

  async function _setRepos(repos) {
    await chrome.storage.local.set({ repos });
    const newRepos = await _getRepos();
    return newRepos;
  }

  // TODO filter on search too
  async function addRepo(repo) {
    const repos = await _getRepos();
    const isSaved = await _getIsRepoSaved(repo.url);
    if(!isSaved)
      repos.push(repo);
    return await _setRepos(repos);
  }

  async function removeRepo(url) {
    const repos = await _getRepos();
    const filtered = repos.filter(r => r.url !== url);
    // TODO filter on search too
    return await _setRepos(filtered);
  }

  async function _getIsRepoSaved(url) {
    const repos = await _getRepos();
    return Boolean(repos.find(r => r.url === url));
  }

  // TODO - toggle hidden attribute if search text not in owner or name
  async function render(repos) {
    results.innerHTML = "";
    repos.forEach(repo => {
      const el = document.createElement("div");
      el.className = "bg-gray-100 rounded p-2 hover:bg-gray-200 flex justify-between items-center";
      el.innerHTML += `
        <div class="flex flex-col">
          <a href="${repo.url}" target="_blank" class="text-sm text-blue-600 hover:underline">${repo.owner}/${repo.name}</a>
          <span class="text-xs text-gray-400">Added: ${new Date(repo.added).toLocaleDateString()}</span>
        </div>
        <button class="bg-gray-200 p-2 rounded hover:bg-gray-300 remove-repo" data-url="${repo.url}">🗑️</button>
      `;
      results.appendChild(el);

      el.querySelector(".remove-repo").addEventListener("click", async (e) => {
        e.preventDefault();
        const url = e.target.dataset.url;
        const newRepos = await removeRepo(url);
        render(newRepos);
      });
    });
  }

  async function __clearAllRepos() {
    await chrome.storage.local.set({ repos: [] });
    await render([]);
  }

  const tab = await getCurrentTab();
  const url = new URL(tab.url);
  const isRepoSaved = await _getIsRepoSaved(url.href);
  if (isRepoSaved) {
    addButton.setAttribute("disabled", "disabled");
  }

  if (["github.com", "gitlab.com", "bitbucket.org"].includes(url.hostname)) {
    addButton.classList.remove("hidden");
    addButton.addEventListener("click", async (e) => {
      const parts = url.pathname.split("/").filter(Boolean);
      if (parts.length < 2) return;

      const [owner, name] = parts;
      const newRepo = {
        platform: url.hostname,
        owner,
        name,
        url: url.href,
        added: new Date().toISOString()
      };
      const repos = await addRepo(newRepo);
      await render(repos);
    });
  }

  input.addEventListener("input", async () => {
    const q = input.value.toLowerCase();
    const repos = await _getRepos();
    const matches = repos.filter(r =>
      r.name.toLowerCase().includes(q) || r.owner.toLowerCase().includes(q)
    );
    await render(matches);
  });

  const list = await _getRepos();
  await render(list);
});
