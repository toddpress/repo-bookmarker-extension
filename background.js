
document.addEventListener("DOMContentLoaded", async () => {
  const data = await chrome.storage.local.get("repos");
  const list = data.repos || [];
  console.log({ data })
  const input = document.getElementById("search");
  const results = document.getElementById("results");
  const addButton = document.getElementById("add-repo");

  function render(matches) {
    results.innerHTML = "";
    matches.forEach(repo => {
      const el = document.createElement("div");
      el.className = "bg-gray-100 rounded p-2 hover:bg-gray-200";
      el.innerHTML = `<a href="${repo.url}" target="_blank" class="text-blue-600 hover:underline">${repo.platform}: ${repo.owner}/${repo.name}</a>`;
      results.appendChild(el);
    });
  }

  input.addEventListener("input", () => {
    const q = input.value.toLowerCase();
    const matches = list.filter(r => r.name.toLowerCase().includes(q) || r.owner.toLowerCase().includes(q));
    console.log('searching repos', { matches })
    render(matches);
  });

  render(list);

  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    console.log({ tabs })
    const tab = tabs[0];
    const url = new URL(tab.url);
    if (["github.com", "gitlab.com", "bitbucket.org"].includes(url.hostname)) {
      const parts = url.pathname.split("/").filter(Boolean);
      if (parts.length >= 2) {
        addButton.classList.remove("hidden");
        addButton.addEventListener("click", async () => {
          const newRepo = {
            platform: url.hostname,
            owner: parts[0],
            name: parts[1],
            url: url.href,
            added: new Date().toISOString()
          };
          const data = await chrome.storage.local.get("repos");
          const repos = data.repos || [];
          repos.push(newRepo);
          await chrome.storage.local.set({ repos });
          render(repos);
        });
      }
    }
  });
});
