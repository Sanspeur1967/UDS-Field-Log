let entries = JSON.parse(localStorage.getItem("uds_mobile_entries") || "[]");
let actions = JSON.parse(localStorage.getItem("uds_mobile_actions") || "[]");

window.onload = () => {
  const now = new Date();
  const today = now.toISOString().split("T")[0];
  document.getElementById("date").value = today;
  document.getElementById("reportDate").value = today;
  document.getElementById("time").value = now.toTimeString().slice(0,5);
  renderLogs();
  renderActions();
  if ("serviceWorker" in navigator) navigator.serviceWorker.register("service-worker.js");
};

function showTab(id){
  document.querySelectorAll(".tab").forEach(t=>t.classList.remove("active"));
  document.querySelectorAll("nav button").forEach(b=>b.classList.remove("active"));
  document.getElementById(id).classList.add("active");
  event.target.classList.add("active");
}

document.getElementById("photos").addEventListener("change", async () => {
  const preview = document.getElementById("photoPreview");
  preview.innerHTML = "";
  const files = [...document.getElementById("photos").files];
  for (const f of files){
    const data = await fileToData(f);
    preview.innerHTML += `<img src="${data}">`;
  }
});

function fileToData(file){
  return new Promise((resolve,reject)=>{
    const r = new FileReader();
    r.onload = e => resolve(e.target.result);
    r.onerror = reject;
    r.readAsDataURL(file);
  });
}

async function saveEntry(){
  const files = [...document.getElementById("photos").files];
  const photos = [];
  for (const f of files) photos.push(await fileToData(f));

  const entry = {
    id: Date.now(),
    date: val("date"),
    time: val("time"),
    shift: val("shift"),
    area: val("area"),
    workType: val("workType"),
    job: val("job"),
    nextShift: val("nextShift"),
    notes: val("notes"),
    checks: {
      ptha: checked("ptha"),
      lif: checked("lif"),
      housekeeping: checked("housekeeping"),
      barricades: checked("barricades"),
      ground: checked("ground")
    },
    photos,
    createdAt: new Date().toISOString()
  };

  if(!entry.area || !entry.job){ alert("Add Area / Heading and Job Being Performed."); return; }

  entries.unshift(entry);
  localStorage.setItem("uds_mobile_entries", JSON.stringify(entries));
  clearEntry();
  renderLogs();
  alert("Entry saved offline.");
}

function saveAction(){
  const action = {
    id: Date.now(),
    actionText: val("actionText"),
    owner: val("owner"),
    priority: val("priority"),
    dueDate: val("dueDate"),
    status: val("status"),
    createdAt: new Date().toISOString()
  };
  if(!action.actionText){ alert("Enter the action required."); return; }
  actions.unshift(action);
  localStorage.setItem("uds_mobile_actions", JSON.stringify(actions));
  clearAction();
  renderActions();
}

function renderLogs(){
  const q = (document.getElementById("search")?.value || "").toLowerCase();
  const list = document.getElementById("logList");
  list.innerHTML = entries.filter(e => JSON.stringify(e).toLowerCase().includes(q)).map(e => `
    <div class="item">
      <strong>${esc(e.area)}</strong>
      <span class="badge">${esc(e.shift)}</span>
      <span class="badge">${esc(e.workType)}</span><br>
      ${esc(e.date)} ${esc(e.time)}
      <p><b>Job:</b> ${esc(e.job)}</p>
      <p><b>Next:</b> ${esc(e.nextShift)}</p>
      <p><b>Notes:</b> ${esc(e.notes)}</p>
      <div class="photos">${(e.photos||[]).map(p=>`<img src="${p}">`).join("")}</div>
    </div>
  `).join("");
}

function renderActions(){
  const list = document.getElementById("actionList");
  list.innerHTML = actions.map(a => `
    <div class="item">
      <strong>${esc(a.priority)}: ${esc(a.actionText)}</strong><br>
      Owner: ${esc(a.owner)}<br>
      Due: ${esc(a.dueDate)} | Status: ${esc(a.status)}
    </div>
  `).join("");
}

function generateReport(){
  const date = val("reportDate");
  const todays = entries.filter(e=>e.date===date);
  const open = actions.filter(a=>a.status !== "Closed");

  let html = `<h2>UDS Daily Field Report</h2><p><b>Date:</b> ${esc(date)}</p><hr>`;
  if(!todays.length) html += `<p>No entries recorded for this date.</p>`;

  todays.forEach(e=>{
    html += `<h3>${esc(e.area)}</h3>
      <p><b>Time:</b> ${esc(e.time)} | <b>Shift:</b> ${esc(e.shift)} | <b>Work Type:</b> ${esc(e.workType)}</p>
      <p><b>Job Being Performed:</b> ${esc(e.job)}</p>
      <p><b>Next Shift:</b> ${esc(e.nextShift)}</p>
      <p><b>Notes:</b> ${esc(e.notes)}</p>
      <p><b>Controls:</b> ${controlText(e.checks)}</p>
      <p><b>Photos:</b> ${(e.photos||[]).length}</p>
      <div class="photos">${(e.photos||[]).map(p=>`<img src="${p}">`).join("")}</div><hr>`;
  });

  html += `<h3>Open Actions</h3>`;
  if(!open.length) html += `<p>No open actions.</p>`;
  open.forEach(a=>{
    html += `<p><b>${esc(a.priority)}</b>: ${esc(a.actionText)}<br>Owner: ${esc(a.owner)} | Due: ${esc(a.dueDate)} | Status: ${esc(a.status)}</p>`;
  });
  document.getElementById("reportOutput").innerHTML = html;
}

function exportActions(){
  const rows = [["Priority","Action","Owner","Due Date","Status"], ...actions.map(a=>[a.priority,a.actionText,a.owner,a.dueDate,a.status])];
  const csv = rows.map(r=>r.map(x=>`"${String(x||"").replaceAll('"','""')}"`).join(",")).join("\n");
  download("UDS_Action_Register.csv", csv, "text/csv");
}

function exportBackup(){
  download("UDS_Field_Log_Backup.json", JSON.stringify({entries,actions},null,2), "application/json");
}

function download(name, content, type){
  const blob = new Blob([content], {type});
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = name; a.click();
  URL.revokeObjectURL(url);
}

function controlText(c={}){
  const out = [];
  if(c.ptha) out.push("PTHA");
  if(c.lif) out.push("LIF");
  if(c.housekeeping) out.push("Housekeeping");
  if(c.barricades) out.push("Barricades");
  if(c.ground) out.push("Ground Checked");
  return out.join(", ") || "Not recorded";
}
function clearEntry(){
  ["area","job","nextShift","notes"].forEach(id=>document.getElementById(id).value="");
  ["ptha","lif","housekeeping","barricades","ground"].forEach(id=>document.getElementById(id).checked=false);
  document.getElementById("photos").value="";
  document.getElementById("photoPreview").innerHTML="";
}
function clearAction(){
  ["actionText","owner","dueDate"].forEach(id=>document.getElementById(id).value="");
}
function val(id){return document.getElementById(id).value}
function checked(id){return document.getElementById(id).checked}
function esc(x){return String(x||"").replace(/[&<>"']/g,m=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[m]))}
