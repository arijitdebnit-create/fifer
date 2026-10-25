(async function () {
  "use strict";
  const el = (id) => document.getElementById(id);
  try {
    const d = await (await fetch("data/records.json", { cache: "no-cache" })).json();
    el("asOf").textContent = "Figures as of " + d.asOf + ". Men's international cricket.";
    el("source").textContent = "Source: " + d.source;
    el("tables").innerHTML = d.tables.map((t) => {
      const showM = t.rows.some((r) => r[2] != null);
      return `<section class="card"><h2>${t.title}</h2><div class="tbl-wrap"><table>
        <thead><tr><th>#</th><th>Player</th><th>Team</th>${showM ? "<th>M</th>" : ""}<th class="num">${t.unit}</th></tr></thead>
        <tbody>${t.rows.map((r, k) => `<tr><td>${k + 1}</td><td>${r[0]}</td><td>${r[1]}</td>${showM ? `<td>${r[2] ?? "–"}</td>` : ""}<td class="num"><b>${Number(r[3]).toLocaleString("en-IN")}</b></td></tr>`).join("")}</tbody>
      </table></div></section>`;
    }).join("");
  } catch (e) {
    el("asOf").textContent = "Could not load records.";
    console.error(e);
  }
})();
