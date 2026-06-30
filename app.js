
let currentUser = null;
let currentUserRole = null;
let previewRole = null;
let supabaseClient = null;

function initSupabase(){
  if(!window.supabase){
    console.error("Supabase JS library did not load.");
    return false;
  }
  if(!SUPABASE_URL || !SUPABASE_ANON_KEY){
    console.error("Missing Supabase URL or anon key.");
    return false;
  }
  supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
      storage: window.localStorage
    }
  });
  return true;
}

async function initAuth(){
  loadRememberedEmail();

  if(!initSupabase()){
    const msg = "Supabase library/key not loaded. Check config.js and internet.";
    if(typeof authMessage !== "undefined") authMessage.textContent = msg;
    return;
  }

  const { data, error } = await supabaseClient.auth.getSession();
  if(error) console.warn(error.message);

  currentUser = data?.session?.user || null;
  await updateAuthUI();

  supabaseClient.auth.onAuthStateChange(async (_event, session) => {
    currentUser = session?.user || null;
    await updateAuthUI();
    renderAll();
  });
}

async function updateAuthUI(){
  const screen = document.getElementById("authScreen");
  const userLabel = document.getElementById("currentUserEmail");

  if(currentUser){
    if(screen) screen.classList.add("hidden");
    if(userLabel) userLabel.textContent = currentUser.email || "Signed in";
    await loadCurrentUserRole();
  }else{
    if(screen) screen.classList.remove("hidden");
    if(userLabel) userLabel.textContent = "Not signed in";
    currentUserRole = null;
  }
  updateAdminVisibility(); applyRoleView();
}

async function loginUser(){
  const email = loginEmail.value.trim();
  const password = loginPassword.value;

  if(!email || !password){
    authMessage.textContent = "Enter email and password.";
    return;
  }

  authMessage.textContent = "Logging in...";

  if(!supabaseClient && !initSupabase()){
    authMessage.textContent = "Supabase is not loaded. Refresh and try again.";
    return;
  }

  const { data, error } = await supabaseClient.auth.signInWithPassword({ email, password });

  if(error){
    authMessage.textContent = error.message;
    return;
  }

  currentUser = data.user;
  saveRememberedEmail();
  authMessage.textContent = "";
  await updateAuthUI();
  renderAll();
}

async function signupUser(){
  const email = loginEmail.value.trim();
  const password = loginPassword.value;

  if(!email || !password){
    authMessage.textContent = "Enter email and password.";
    return;
  }

  authMessage.textContent = "Creating user...";

  if(!supabaseClient && !initSupabase()){
    authMessage.textContent = "Supabase is not loaded. Refresh and try again.";
    return;
  }

  const { error } = await supabaseClient.auth.signUp({ email, password });

  authMessage.textContent = error ? error.message : "User created. Confirm email if required, then login.";
}

async function resetPassword(){
  const email = loginEmail.value.trim();
  if(!email){
    authMessage.textContent = "Enter your email first.";
    return;
  }

  if(!supabaseClient && !initSupabase()){
    authMessage.textContent = "Supabase is not loaded. Refresh and try again.";
    return;
  }

  const { error } = await supabaseClient.auth.resetPasswordForEmail(email);
  authMessage.textContent = error ? error.message : "Password reset email sent.";
}

async function logoutUser(){
  if(supabaseClient) await supabaseClient.auth.signOut();
  currentUser = null;
  await updateAuthUI();
}

async function getAuthHeaders(extra={}){
  if(!supabaseClient) initSupabase();
  const { data } = await supabaseClient.auth.getSession();
  const token = data?.session?.access_token || SUPABASE_ANON_KEY;
  return {
    "apikey": SUPABASE_ANON_KEY,
    "Authorization": "Bearer " + token,
    "Content-Type": "application/json",
    ...extra
  };
}

function togglePassword(){
  const input = document.getElementById("loginPassword");
  const btn = document.getElementById("showPasswordBtn") || document.querySelector(".show-pass-btn");
  if(!input) return;
  if(input.type === "password"){
    input.type = "text";
    if(btn) btn.textContent = "Hide";
  }else{
    input.type = "password";
    if(btn) btn.textContent = "Show";
  }
}

function saveRememberedEmail(){
  const remember = document.getElementById("rememberMe");
  const email = document.getElementById("loginEmail");
  if(remember?.checked && email?.value){
    localStorage.setItem("uds_remember_email", email.value.trim());
  }else{
    localStorage.removeItem("uds_remember_email");
  }
}

function loadRememberedEmail(){
  const remembered = localStorage.getItem("uds_remember_email") || "";
  const email = document.getElementById("loginEmail");
  if(email && remembered) email.value = remembered;
}

let entries=JSON.parse(localStorage.getItem("uds_pro_entries")||localStorage.getItem("uds_v2_entries")||"[]");
let savedForms=JSON.parse(localStorage.getItem("uds_enterprise_forms")||"[]");
let actions=JSON.parse(localStorage.getItem("uds_pro_actions")||localStorage.getItem("uds_v2_actions")||"[]");
let pendingPhotos=[], modalPhotos=[], modalIndex=0, markupIndex=null, markupTool="circle", markupImage=null;

window.onload=async()=>{document.querySelectorAll("button[data-tab]").forEach(b=>b.addEventListener("click",()=>showTab(b.dataset.tab)));document.querySelectorAll("button[data-go]").forEach(b=>b.addEventListener("click",()=>showTab(b.dataset.go)));const n=new Date(),t=n.toISOString().split("T")[0];date.value=t;reportDate.value=t;aiDate.value=t;time.value=n.toTimeString().slice(0,5);loadPreviewRole();await initAuth();applyLanguage();renderAll();checkSupabase();if("serviceWorker"in navigator)navigator.serviceWorker.register("service-worker.js?v=5.8")};
function showTab(id){document.querySelectorAll(".tab").forEach(t=>t.classList.remove("active"));document.querySelectorAll("button[data-tab]").forEach(b=>b.classList.remove("active"));document.getElementById(id).classList.add("active");let n=document.querySelector(`button[data-tab='${id}']`);if(n)n.classList.add("active");if(id==="entriesRegister")renderEntriesRegister();if(id==="forms"){renderSelectedForm();renderSavedForms();}if(id==="gallery")renderGallery();if(id==="map")renderMineMap();if(id==="admin"){updateAdminVisibility();loadUserRoles();}window.scrollTo(0,0)}
function supabaseReady(){return SUPABASE_URL.includes("supabase.co")&&SUPABASE_ANON_KEY.length>20}
function headers(extra={}){return {"apikey":SUPABASE_ANON_KEY,"Authorization":"Bearer "+SUPABASE_ANON_KEY,"Content-Type":"application/json",...extra}}
function checkSupabase(){syncStatus.textContent=supabaseReady()?"v6 Enterprise • online sync configured":"v6 Enterprise • offline mode only";supabaseStatus.textContent=supabaseReady()?`Connected: ${SUPABASE_URL}`:"Not connected. Add publishable/anon key to config.js."}
function fileToData(file){return new Promise((res,rej)=>{let r=new FileReader();r.onload=e=>res(e.target.result);r.onerror=rej;r.readAsDataURL(file)})}
function dataUrlToBlob(d){let a=d.split(","),m=a[0].match(/:(.*?);/)[1],b=atob(a[1]),n=b.length,u8=new Uint8Array(n);while(n--)u8[n]=b.charCodeAt(n);return new Blob([u8],{type:m})}

function takePhoto(){cameraPhoto.value="";cameraPhoto.click()} function choosePhotos(){libraryPhotos.value="";libraryPhotos.click()}
document.addEventListener("change",async e=>{if(e.target.id==="cameraPhoto"||e.target.id==="libraryPhotos"){for(const f of [...e.target.files])pendingPhotos.push({id:"p_"+Date.now()+"_"+Math.random(),data:await fileToData(f)});e.target.value="";renderPendingPhotos()}});
function renderPendingPhotos(){photoCount.textContent=pendingPhotos.length?`${pendingPhotos.length} photo(s) ready to save.`:"No photos added yet.";photoPreview.innerHTML=pendingPhotos.map((p,i)=>`<div class="photo-card"><img src="${p.data}" onclick="openPendingPhoto(${i})"><button onclick="openMarkup(${i})" type="button">Markup</button><button onclick="removePendingPhoto('${p.id}')" type="button">Remove</button></div>`).join("")}
function removePendingPhoto(id){pendingPhotos=pendingPhotos.filter(p=>p.id!==id);renderPendingPhotos()} function clearPendingPhotos(){pendingPhotos=[];cameraPhoto.value="";libraryPhotos.value="";renderPendingPhotos()}
function openPendingPhoto(i){modalPhotos=pendingPhotos.map(p=>p.data);modalIndex=i;showModalPhoto()}
function showModalPhoto(){modalImage.src=modalPhotos[modalIndex]||"";photoModal.classList.add("active")} function closePhotoModal(){photoModal.classList.remove("active")} function prevModalPhoto(){if(!modalPhotos.length)return;modalIndex=(modalIndex-1+modalPhotos.length)%modalPhotos.length;showModalPhoto()} function nextModalPhoto(){if(!modalPhotos.length)return;modalIndex=(modalIndex+1)%modalPhotos.length;showModalPhoto()}
function downloadModalPhoto(){let a=document.createElement("a");a.href=modalImage.src;a.download="UDS_photo.jpg";a.click()} async function shareModalPhoto(){try{let blob=dataUrlToBlob(modalImage.src),file=new File([blob],"UDS_photo.jpg",{type:blob.type});if(navigator.share&&navigator.canShare({files:[file]}))await navigator.share({files:[file],title:"UDS Photo"});else alert("Share not available. Use Download.")}catch(e){alert("Share not available.")}}



let editorItems=[], selectedItem=null, editorTool="move", editorImage=null, editorPhotoIndex=null, editorDragging=false, editorDragOffset={x:0,y:0};

function openMarkup(i){
  editorPhotoIndex=i; editorItems=[]; selectedItem=null; editorTool="move";
  editorImage=new Image();
  editorImage.onload=()=>{
    const c=markupCanvas, maxW=Math.min(window.innerWidth-24,1100), maxH=Math.min(window.innerHeight*0.62,850);
    const scale=Math.min(maxW/editorImage.width,maxH/editorImage.height,1);
    c.width=Math.round(editorImage.width*scale); c.height=Math.round(editorImage.height*scale);
    markupModal.classList.add("active"); drawEditor();
  };
  editorImage.src=pendingPhotos[i].data;
}
function closeMarkup(){markupModal.classList.remove("active")}
function setMarkupTool(tool){editorTool=tool}

function rad(d){return d*Math.PI/180}
function centerOf(it){
  if(it.type==="circle")return{x:it.x,y:it.y}
  if(it.type==="rect")return{x:it.x,y:it.y}
  if(it.type==="text")return{x:it.x,y:it.y}
  if(it.type==="arrow")return{x:(it.x1+it.x2)/2,y:(it.y1+it.y2)/2}
  return{x:0,y:0}
}
function getCanvasPoint(event){
  const r=markupCanvas.getBoundingClientRect(), t=event.touches&&event.touches[0]?event.touches[0]:event;
  return {x:(t.clientX-r.left)*(markupCanvas.width/r.width), y:(t.clientY-r.top)*(markupCanvas.height/r.height)};
}
function drawEditor(){
  const c=markupCanvas, ctx=c.getContext("2d"); ctx.clearRect(0,0,c.width,c.height);
  if(editorImage)ctx.drawImage(editorImage,0,0,c.width,c.height);
  for(const item of editorItems){
    const sel=item===selectedItem; ctx.lineWidth=sel?7:5; ctx.strokeStyle=sel?"#00ff66":"red"; ctx.fillStyle=sel?"#00ff66":"red";
    if(item.type==="circle"){
      ctx.beginPath(); ctx.arc(item.x,item.y,item.r,0,Math.PI*2); ctx.stroke(); if(sel)drawSelection(ctx,item);
    }
    if(item.type==="rect"){
      ctx.save(); ctx.translate(item.x,item.y); ctx.rotate(rad(item.rot||0)); ctx.strokeRect(-item.w/2,-item.h/2,item.w,item.h); ctx.restore(); if(sel)drawSelection(ctx,item);
    }
    if(item.type==="arrow"){
      drawArrow(ctx,item.x1,item.y1,item.x2,item.y2); if(sel)drawSelection(ctx,item);
    }
    if(item.type==="text"){
      ctx.save(); ctx.translate(item.x,item.y); ctx.rotate(rad(item.rot||0)); ctx.font=`bold ${item.size||30}px Arial`; ctx.lineWidth=5; ctx.strokeStyle="white"; ctx.strokeText(item.text,0,0); ctx.fillStyle=sel?"#00ff66":"red"; ctx.fillText(item.text,0,0); ctx.restore(); if(sel)drawSelection(ctx,item);
    }
  }
}
function drawSelection(ctx,it){
  ctx.save(); ctx.strokeStyle="#00ff66"; ctx.fillStyle="#00ff66"; ctx.lineWidth=3;
  if(it.type==="rect"){
    ctx.translate(it.x,it.y); ctx.rotate(rad(it.rot||0)); ctx.setLineDash([8,6]); ctx.strokeRect(-it.w/2-10,-it.h/2-10,it.w+20,it.h+20); ctx.setLineDash([]); handle(ctx,0,-it.h/2-34); handle(ctx,-it.w/2-10,-it.h/2-10); handle(ctx,it.w/2+10,it.h/2+10);
  }else if(it.type==="text"){
    ctx.translate(it.x,it.y); ctx.rotate(rad(it.rot||0)); ctx.setLineDash([8,6]); ctx.strokeRect(-10,-(it.size||30)-12,(it.text.length*(it.size||30)*0.62)+20,(it.size||30)+24); ctx.setLineDash([]); handle(ctx,0,-(it.size||30)-36);
  }else if(it.type==="circle"){
    ctx.setLineDash([8,6]); ctx.strokeRect(it.x-it.r-12,it.y-it.r-12,it.r*2+24,it.r*2+24); ctx.setLineDash([]); handle(ctx,it.x,it.y-it.r-34); handle(ctx,it.x+it.r+12,it.y+it.r+12);
  }else if(it.type==="arrow"){
    handle(ctx,it.x1,it.y1); handle(ctx,it.x2,it.y2);
  }
  ctx.restore();
}
function handle(ctx,x,y){ctx.beginPath();ctx.arc(x,y,10,0,Math.PI*2);ctx.fill()}
function drawArrow(ctx,x1,y1,x2,y2){
  ctx.beginPath();ctx.moveTo(x1,y1);ctx.lineTo(x2,y2);ctx.stroke();
  const a=Math.atan2(y2-y1,x2-x1),h=26;
  ctx.beginPath();ctx.moveTo(x2,y2);ctx.lineTo(x2-h*Math.cos(a-Math.PI/6),y2-h*Math.sin(a-Math.PI/6));ctx.lineTo(x2-h*Math.cos(a+Math.PI/6),y2-h*Math.sin(a+Math.PI/6));ctx.closePath();ctx.fill();
}
function addEditorItem(x,y){
  if(editorTool==="circle")editorItems.push({type:"circle",x,y,r:45,rot:0});
  else if(editorTool==="rect")editorItems.push({type:"rect",x,y,w:120,h:75,rot:0});
  else if(editorTool==="arrow")editorItems.push({type:"arrow",x1:x-80,y1:y+50,x2:x,y2:y,rot:0});
  else if(editorTool==="text"){const text=prompt("Text:","Issue"); if(text)editorItems.push({type:"text",x,y,text,size:30,rot:0})}
  selectedItem=editorItems[editorItems.length-1]||null;
}
function hitTestEditor(x,y){
  for(let i=editorItems.length-1;i>=0;i--){
    const it=editorItems[i];
    if(it.type==="circle" && Math.hypot(x-it.x,y-it.y)<=it.r+25)return it;
    if(it.type==="rect"){
      const a=rad(-(it.rot||0)), dx=x-it.x, dy=y-it.y, lx=dx*Math.cos(a)-dy*Math.sin(a), ly=dx*Math.sin(a)+dy*Math.cos(a);
      if(lx>=-it.w/2-18&&lx<=it.w/2+18&&ly>=-it.h/2-18&&ly<=it.h/2+18)return it;
    }
    if(it.type==="text"){
      const a=rad(-(it.rot||0)), dx=x-it.x, dy=y-it.y, lx=dx*Math.cos(a)-dy*Math.sin(a), ly=dx*Math.sin(a)+dy*Math.cos(a), w=it.text.length*(it.size||30)*0.62, h=(it.size||30);
      if(lx>=-15&&lx<=w+25&&ly>=-h-22&&ly<=20)return it;
    }
    if(it.type==="arrow"){
      const minX=Math.min(it.x1,it.x2)-35,maxX=Math.max(it.x1,it.x2)+35,minY=Math.min(it.y1,it.y2)-35,maxY=Math.max(it.y1,it.y2)+35;
      if(x>=minX&&x<=maxX&&y>=minY&&y<=maxY)return it;
    }
  }
  return null;
}
function startEditorPointer(event){
  event.preventDefault(); const p=getCanvasPoint(event), hit=hitTestEditor(p.x,p.y);
  if(hit){selectedItem=hit; editorDragging=true; const c=centerOf(hit); editorDragOffset={x:p.x-c.x,y:p.y-c.y};}
  else{selectedItem=null; if(editorTool!=="move")addEditorItem(p.x,p.y);}
  drawEditor();
}
function moveEditorPointer(event){
  if(!editorDragging||!selectedItem)return; event.preventDefault(); const p=getCanvasPoint(event), it=selectedItem, c=centerOf(it), nx=p.x-editorDragOffset.x, ny=p.y-editorDragOffset.y, dx=nx-c.x, dy=ny-c.y;
  if(it.type==="circle"||it.type==="rect"||it.type==="text"){it.x+=dx; it.y+=dy;}
  if(it.type==="arrow"){it.x1+=dx; it.y1+=dy; it.x2+=dx; it.y2+=dy;}
  drawEditor();
}
function endEditorPointer(){editorDragging=false}
markupCanvas.addEventListener("mousedown",startEditorPointer);
markupCanvas.addEventListener("mousemove",moveEditorPointer);
markupCanvas.addEventListener("mouseup",endEditorPointer);
markupCanvas.addEventListener("mouseleave",endEditorPointer);
markupCanvas.addEventListener("touchstart",startEditorPointer,{passive:false});
markupCanvas.addEventListener("touchmove",moveEditorPointer,{passive:false});
markupCanvas.addEventListener("touchend",endEditorPointer,{passive:false});

function rotateSelected(deg){
  if(!selectedItem)return;
  if(selectedItem.type==="arrow"){
    const c=centerOf(selectedItem), a=rad(deg);
    for(const end of [["x1","y1"],["x2","y2"]]){
      const dx=selectedItem[end[0]]-c.x, dy=selectedItem[end[1]]-c.y;
      selectedItem[end[0]]=c.x+dx*Math.cos(a)-dy*Math.sin(a);
      selectedItem[end[1]]=c.y+dx*Math.sin(a)+dy*Math.cos(a);
    }
  }else{
    selectedItem.rot=(selectedItem.rot||0)+deg;
  }
  drawEditor();
}
function resizeSelected(factor){
  if(!selectedItem)return;
  if(selectedItem.type==="circle")selectedItem.r=Math.max(15,selectedItem.r*factor);
  if(selectedItem.type==="rect"){selectedItem.w=Math.max(25,selectedItem.w*factor);selectedItem.h=Math.max(20,selectedItem.h*factor);}
  if(selectedItem.type==="text")selectedItem.size=Math.max(12,(selectedItem.size||30)*factor);
  if(selectedItem.type==="arrow"){
    const c=centerOf(selectedItem);
    selectedItem.x1=c.x+(selectedItem.x1-c.x)*factor; selectedItem.y1=c.y+(selectedItem.y1-c.y)*factor;
    selectedItem.x2=c.x+(selectedItem.x2-c.x)*factor; selectedItem.y2=c.y+(selectedItem.y2-c.y)*factor;
  }
  drawEditor();
}
function duplicateSelected(){
  if(!selectedItem)return;
  const copy=JSON.parse(JSON.stringify(selectedItem));
  if(copy.type==="arrow"){copy.x1+=25;copy.y1+=25;copy.x2+=25;copy.y2+=25;}else{copy.x+=25;copy.y+=25;}
  editorItems.push(copy); selectedItem=copy; drawEditor();
}
function deleteSelectedMarkup(){if(!selectedItem)return; editorItems=editorItems.filter(item=>item!==selectedItem); selectedItem=null; drawEditor()}
function saveMarkup(){selectedItem=null; drawEditor(); if(editorPhotoIndex!==null){pendingPhotos[editorPhotoIndex].data=markupCanvas.toDataURL("image/jpeg",0.92); renderPendingPhotos();} closeMarkup()}


function startVoiceEntry(){let SR=window.SpeechRecognition||window.webkitSpeechRecognition;if(!SR){alert("Voice dictation is not supported in this browser.");return}let r=new SR();r.lang="en-US";r.onresult=e=>{let text=e.results[0][0].transcript;notes.value=(notes.value?notes.value+" ":"")+text;parseVoiceEntry(text)};r.start()}
function parseVoiceEntry(text){let t=text.toLowerCase();let h=text.match(/(xd\\d+\\s*[a-z]{0,2}\\d+|exl\\s*xd\\d+\\s*[a-z]{0,2}\\d+)/i);if(h)heading.value=h[0].toUpperCase();let bolts=t.match(/(\\d+|eighteen|twelve|ten|twenty|thirty|forty) bolts?/);if(bolts)boltsInstalled.value=wordNum(bolts[1]);if(t.includes("mesh"))meshInstalled.value=text.match(/(\\d+|four|three|two|five) mesh/i)?.[0]||"Mesh noted";if(t.includes("shotcrete"))activity.value="Shotcrete";else if(t.includes("bolt"))activity.value="Bolting";else if(t.includes("muck"))activity.value="Mucking";if(t.includes("spraymec"))equipment.value=(equipment.value?equipment.value+"; ":"")+"Spraymec";if(t.includes("waiting")||t.includes("delay")){delayType.value="Waiting on Equipment";delays.value=(delays.value?delays.value+" ":"")+text}job.value=(job.value?job.value+" ":"")+text}
function wordNum(w){return {ten:10,twelve:12,eighteen:18,twenty:20,thirty:30,forty:40,four:4,three:3,two:2,five:5}[String(w).toLowerCase()]||w}
function startVoiceQuestion(){let SR=window.SpeechRecognition||window.webkitSpeechRecognition;if(!SR){alert("Voice dictation is not supported in this browser.");return}let r=new SR();r.lang="en-US";r.onresult=e=>{rawNote.value=e.results[0][0].transcript;aiAskQuestion()};r.start()}

function buildEntry(){return{local_id:"e_"+Date.now(),cloud_id:null,date:val("date"),time:val("time"),shift:val("shift"),heading:val("heading"),levelArea:val("levelArea"),crew:val("crew"),supervisor:val("supervisor"),foreman:val("foreman"),personnel:num("personnel"),activity:val("activity"),roundChainage:val("roundChainage"),metresAdvanced:num("metresAdvanced"),boltsInstalled:num("boltsInstalled"),cableBolts:num("cableBolts"),meshInstalled:val("meshInstalled"),shotcreteM3:num("shotcreteM3"),shotcreteThickness:val("shotcreteThickness"),equipment:val("equipment"),groundCondition:val("groundCondition"),delayType:val("delayType"),delayHours:num("delayHours"),job:val("job"),delays:val("delays"),nextShift:val("nextShift"),safetyObservation:val("safetyObservation"),goodCatch:val("goodCatch"),notes:val("notes"),checks:{ptha:chk("ptha"),lif:chk("lif"),scaled:chk("scaled"),groundSupport:chk("groundSupport"),boltPattern:chk("boltPattern"),shotcreteQuality:chk("shotcreteQuality"),ventilation:chk("ventilation"),servicesClear:chk("servicesClear"),barricades:chk("barricades"),reentry:chk("reentry")},photos:pendingPhotos.map(p=>p.data),synced:false,createdAt:new Date().toISOString()}}
async function saveEntry(){if(!canWrite()){alert("Viewer role is read-only.");return;}let e=buildEntry();if(!e.heading||!e.job){alert("Add Heading / Drive and Job Being Performed.");return}entries.unshift(e);saveLocal();clearEntry();renderAll();if(supabaseReady()&&navigator.onLine)await syncAll();else alert("Saved offline.")}
function saveAction(){if(!canWrite()){alert("Viewer role is read-only.");return;}let a={local_id:"a_"+Date.now(),cloud_id:null,heading:val("actionHeading"),actionText:val("actionText"),owner:val("owner"),priority:val("priority"),dueDate:val("dueDate"),status:val("status"),synced:false,createdAt:new Date().toISOString()};if(!a.actionText){alert("Enter the action required.");return}actions.unshift(a);saveLocal();clearAction();renderAll();if(supabaseReady()&&navigator.onLine)syncAll();else alert("Action saved offline.")}

async function syncAll(){if(!supabaseReady()){alert("Supabase key is not configured yet.");return}if(!navigator.onLine){alert("No internet.");return}syncStatus.textContent="Syncing...";try{for(const e of entries.filter(x=>!x.synced))await syncEntry(e);for(const a of actions.filter(x=>!x.synced))await syncAction(a);saveLocal();renderAll();syncStatus.textContent="Sync complete";alert("Sync complete.")}catch(err){syncStatus.textContent="Sync failed";alert("Sync failed: "+err.message)}}
async function syncEntry(e){let body={entry_date:e.date,entry_time:e.time,shift:e.shift,heading:e.heading,level_area:e.levelArea,activity:e.activity,round_chainage:e.roundChainage,metres_advanced:e.metresAdvanced,bolts_installed:e.boltsInstalled,mesh_installed:e.meshInstalled,shotcrete_m3:e.shotcreteM3,shotcrete_thickness:e.shotcreteThickness,equipment:e.equipment,ground_condition:e.groundCondition,job:e.job,delays:e.delays,next_shift:e.nextShift,notes:extraNotes(e),ptha:e.checks.ptha,lif:e.checks.lif,scaled:e.checks.scaled,ground_support:e.checks.groundSupport,bolt_pattern:e.checks.boltPattern,shotcrete_quality:e.checks.shotcreteQuality,ventilation:e.checks.ventilation,services_clear:e.checks.servicesClear,barricades:e.checks.barricades,reentry:e.checks.reentry,synced_by:"UDS Development Pro Enterprise 5.8",created_by:currentUser?.id||null,created_by_email:currentUser?.email||""};let r=await fetch(`${SUPABASE_URL}/rest/v1/development_entries`,{method:"POST",headers:await getAuthHeaders({"Prefer":"return=representation"}),body:JSON.stringify(body)});if(!r.ok)throw new Error(await r.text());let s=(await r.json())[0];e.cloud_id=s.id;for(let i=0;i<(e.photos||[]).length;i++){let u=await uploadPhoto(e.photos[i],s.id,i);await insertPhoto(s.id,u)}e.synced=true}
function extraNotes(e){return `Crew: ${e.crew||""}; Supervisor: ${e.supervisor||""}; Foreman: ${e.foreman||""}; Personnel: ${e.personnel||0}; Cable bolts: ${e.cableBolts||0}; Delay type: ${e.delayType||""}; Delay hours: ${e.delayHours||0}; Safety observation: ${e.safetyObservation||""}; Good catch: ${e.goodCatch||""}; Notes: ${e.notes||""}`}
async function uploadPhoto(d,id,i){let blob=dataUrlToBlob(d),path=`${id}/${Date.now()}_${i}.jpg`;let r=await fetch(`${SUPABASE_URL}/storage/v1/object/${PHOTO_BUCKET}/${path}`,{method:"POST",headers:{"apikey":SUPABASE_ANON_KEY,"Authorization":"Bearer "+SUPABASE_ANON_KEY,"Content-Type":blob.type,"x-upsert":"true"},body:blob});if(!r.ok)throw new Error(await r.text());return `${SUPABASE_URL}/storage/v1/object/public/${PHOTO_BUCKET}/${path}`}
async function insertPhoto(id,u){let r=await fetch(`${SUPABASE_URL}/rest/v1/development_photos`,{method:"POST",headers:await getAuthHeaders(),body:JSON.stringify({development_entry_id:id,photo_url:u,caption:""})});if(!r.ok)throw new Error(await r.text())}
async function syncAction(a){let body={heading:a.heading,priority:a.priority,action_text:a.actionText,owner:a.owner,due_date:a.dueDate||null,status:a.status,created_by:currentUser?.id||null,created_by_email:currentUser?.email||""};let r=await fetch(`${SUPABASE_URL}/rest/v1/development_actions`,{method:"POST",headers:await getAuthHeaders({"Prefer":"return=representation"}),body:JSON.stringify(body)});if(!r.ok)throw new Error(await r.text());a.cloud_id=(await r.json())[0].id;a.synced=true}
async function loadCloudCount(){if(!supabaseReady()){alert("Supabase key is not configured yet.");return}try{let r=await fetch(`${SUPABASE_URL}/rest/v1/development_entries?select=id`,{headers:await getAuthHeaders()});if(!r.ok)throw new Error(await r.text());alert(`Cloud has ${(await r.json()).length} development entries.`)}catch(e){alert("Could not check cloud: "+e.message)}}

async function callAI(task,payload){if(!supabaseReady()){alert("Supabase key is not configured.");return}aiOutput.textContent="Working...";try{let r=await fetch(`${SUPABASE_URL}/functions/v1/${AI_FUNCTION_NAME}`,{method:"POST",headers:await getAuthHeaders(),body:JSON.stringify({task,payload})});let data=await r.json();aiStatus.textContent="AI function working.";aiOutput.textContent=data.result||JSON.stringify(data,null,2)}catch(e){aiStatus.textContent="AI error.";aiOutput.textContent="AI error: "+e.message}}
function allPayload(){return{entries,actions,question:val("rawNote"),date:val("aiDate")||val("reportDate")}} function aiPayloadForDate(){let d=val("aiDate")||val("reportDate");return{date:d,entries:entries.filter(e=>e.date===d),actions:actions.filter(a=>a.status!=="Closed")}}
function aiDailyReport(){callAI("daily_report",aiPayloadForDate())} function aiShiftHandover(){callAI("shift_handover",aiPayloadForDate())} function aiTrendAnalysis(){callAI("trend_analysis",allPayload())} function aiSupervisorDashboard(){callAI("supervisor_dashboard",allPayload())} function aiAskQuestion(){callAI("voice_ai_assistant",allPayload())} function aiSafetySummary(){callAI("safety_summary",aiPayloadForDate())} function testAI(){callAI("test",{message:"Confirm UDS AI Edge Function is working."})}


async function loadCurrentUserRole(){
  if(!currentUser || !supabaseClient) return;
  try{
    const { data, error } = await supabaseClient
      .from("user_roles")
      .select("*")
      .eq("email", currentUser.email)
      .eq("active", true)
      .maybeSingle();

    if(error) throw error;
    currentUserRole = data || null;
    if(currentUserRole){
      currentUserEmail.textContent = `🟢 ${currentUserRole.full_name || currentUser.email} • ${currentUserRole.role}`;
    }
  }catch(e){
    console.warn("Role lookup failed:", e.message);
    currentUserRole = null;
  }
}

function isAdmin(){ return currentUserRole && currentUserRole.role === "Admin"; }


function togglePassword(){
  const input = document.getElementById("loginPassword");
  const btn = document.querySelector(".show-pass-btn");
  if(!input) return;
  if(input.type === "password"){
    input.type = "text";
    if(btn) btn.textContent = "Hide";
  }else{
    input.type = "password";
    if(btn) btn.textContent = "Show";
  }
}

function saveRememberedEmail(){
  if(document.getElementById("rememberMe")?.checked){
    localStorage.setItem("uds_remember_email", loginEmail.value.trim());
  }else{
    localStorage.removeItem("uds_remember_email");
  }
}

function loadRememberedEmail(){
  const remembered = localStorage.getItem("uds_remember_email") || "";
  if(remembered && document.getElementById("loginEmail")){
    loginEmail.value = remembered;
  }
}

function updateAdminVisibility(){
  const btn = document.getElementById("adminNavButton");
  const adminCards = document.querySelectorAll(".admin-only");
  if(btn) btn.style.display = isAdmin() ? "block" : "none";
  adminCards.forEach(card => card.classList.toggle("locked", !isAdmin()));
  const status = document.getElementById("adminStatus");
  if(status){
    if(!currentUser) status.textContent = "Not signed in.";
    else if(isAdmin()) status.textContent = `Admin access granted for ${currentUser.email}.`;
    else status.textContent = `Signed in as ${currentUser.email}. Admin role required.`;
  }
}

async function saveUserRole(){
  if(!isAdmin()){
    alert("Admin role required.");
    return;
  }
  const payload = {
    email: adminEmail.value.trim(),
    full_name: adminFullName.value.trim(),
    department: adminDepartment.value.trim(),
    crew: adminCrew.value.trim(),
    position: adminPosition.value.trim(),
    role: adminRole.value,
    active: adminActive.value === "true"
  };
  if(!payload.email){
    alert("Email required.");
    return;
  }

  const { error } = await supabaseClient
    .from("user_roles")
    .upsert(payload, { onConflict: "email" });

  if(error){
    alert("Could not save role: " + error.message);
    return;
  }
  alert("Role saved.");
  await loadUserRoles();
}

async function loadUserRoles(){
  if(!currentUser){
    userRoleList.innerHTML = "<div class='notice'>Login required.</div>";
    return;
  }
  if(!isAdmin()){
    userRoleList.innerHTML = "<div class='notice'>Admin role required.</div>";
    updateAdminVisibility();
    return;
  }

  const { data, error } = await supabaseClient
    .from("user_roles")
    .select("*")
    .order("created_at", { ascending:false });

  if(error){
    userRoleList.innerHTML = `<div class='notice'>${esc(error.message)}</div>`;
    return;
  }

  userRoleList.innerHTML = (data || []).map(u => `
    <div class="user-card ${u.active ? "" : "disabled"}">
      <b>${esc(u.full_name || u.email)}</b>
      <span class="user-role-badge role-${String(u.role || "").toLowerCase()}">${esc(u.role)}</span>
      <p>${esc(u.email)}</p>
      <p>${esc(u.position || "")} ${u.department ? "• " + esc(u.department) : ""} ${u.crew ? "• " + esc(u.crew) : ""}</p>
      <p><b>Status:</b> ${u.active ? "Active" : "Disabled"}</p>
      <button type="button" onclick="editUserRole('${escAttr(u.email)}')">Edit</button>
    </div>
  `).join("") || "<div class='notice'>No users found.</div>";
}

async function editUserRole(email){
  if(!isAdmin()) return;
  const { data, error } = await supabaseClient.from("user_roles").select("*").eq("email", email).maybeSingle();
  if(error || !data){
    alert("User not found.");
    return;
  }
  adminEmail.value = data.email || "";
  adminFullName.value = data.full_name || "";
  adminDepartment.value = data.department || "";
  adminCrew.value = data.crew || "";
  adminPosition.value = data.position || "";
  adminRole.value = data.role || "Viewer";
  adminActive.value = data.active ? "true" : "false";
  window.scrollTo(0,0);
}




function trueRoleName(){
  return currentUserRole?.role || "Viewer";
}

function isTrueAdmin(){
  return trueRoleName() === "Admin";
}

function setPreviewRole(role){
  if(!isTrueAdmin()){
    alert("Only Admin can preview roles.");
    return;
  }
  previewRole = role === "Actual" ? null : role;
  localStorage.setItem("uds_preview_role", previewRole || "");
  applyRoleView();
  renderDevRolePreview();
}

function loadPreviewRole(){
  const stored = localStorage.getItem("uds_preview_role") || "";
  previewRole = stored || null;
}

function renderDevRolePreview(){
  let existing = document.getElementById("devRolePreview");
  if(existing) existing.remove();

  if(!isTrueAdmin()) return;

  const dashboard = document.getElementById("dashboard");
  const titleCard = dashboard?.querySelector(".section-title");
  if(!dashboard || !titleCard) return;

  const roles = ["Actual","Admin","Manager","Superintendent","Supervisor","Viewer"];
  const active = previewRole || "Actual";

  const div = document.createElement("div");
  div.id = "devRolePreview";
  div.className = "dev-role-preview";
  div.innerHTML = `
    <h3>Developer Role Preview</h3>
    <p>Logged in as Admin. Preview what each role sees without changing the database.</p>
    <div class="dev-role-buttons">
      ${roles.map(r => `<button type="button" class="${active===r?'active-preview':''}" onclick="setPreviewRole('${r}')">${r}</button>`).join("")}
    </div>
  `;
  titleCard.insertAdjacentElement("afterend", div);
}

function getRoleName(){ return previewRole || currentUserRole?.role || "Viewer"; }



function roleLevel(role){
  return {Supervisor:1,Superintendent:2,Manager:3,Admin:4}[role] || 1;
}
function getRoleName(){ return previewRole || currentUserRole?.role || "Supervisor"; }
function canCreate(){ return roleLevel(getRoleName()) >= 1; }
function canViewCrew(){ return roleLevel(getRoleName()) >= 2; }
function canViewAll(){ return roleLevel(getRoleName()) >= 3; }
function canAdmin(){ return getRoleName() === "Admin" && currentUserRole?.role === "Admin"; }
function canManageUsers(){ return canAdmin(); }
function canReviewForms(){ return roleLevel(getRoleName()) >= 2; }

function roleAction(action){
  if(action==="entry"){showTab("entry");return;}
  if(action==="forms"){showTab("forms");return;}
  if(action==="gallery"){showTab("gallery");return;}
  if(action==="map"){showTab("map");return;}
  if(action==="ai"){showTab("ai");return;}
  if(action==="report"){showTab("report");return;}
  if(action==="actions"){showTab("actions");return;}
  if(action==="admin"){showTab("admin");return;}
  if(action==="dashboard"){showTab("dashboard");return;}
  if(action==="installer"){showTab("admin");setTimeout(()=>checkInstallerStatus(),150);return;}
}

function applyRoleView(){
  const role = getRoleName();
  const title = document.getElementById("roleDashboardTitle");
  const subtitle = document.getElementById("roleDashboardSubtitle");
  const panel = document.getElementById("roleViewPanel");
  const scope = document.getElementById("roleScopePanel");
  if(!title || !panel) return;

  const config = {
    Supervisor:{
      title:"Supervisor Dashboard",
      subtitle:"My shift entries, my forms, my photos, actions and AI handover.",
      actions:[
        ["Development Entry","entry"],["Complete Forms","forms"],["My Actions","actions"],["My Photos","gallery"],["Shift Report","report"],["AI Assistant","ai"]
      ],
      scope:["Own Entries","Own Forms","Own Photos","Own Actions"]
    },
    Superintendent:{
      title:"Superintendent Dashboard",
      subtitle:"Area-level review of supervisors, headings, forms, delays and actions.",
      actions:[
        ["Area Production","dashboard"],["Supervisor Entries","dashboard"],["Forms Review","forms"],["Heading History","map"],["Open Actions","actions"],["AI Daily Summary","ai"]
      ],
      scope:["Area Entries","Supervisor Forms","Area Photos","KPI / Delays"]
    },
    Manager:{
      title:"Manager Dashboard",
      subtitle:"Department-wide production, safety, forms, action and AI trend review.",
      actions:[
        ["Production Dashboard","dashboard"],["All Forms","forms"],["All Actions","actions"],["All Photos","gallery"],["AI Executive Summary","ai"],["Reports","report"]
      ],
      scope:["All Entries","All Forms","All Photos","Executive Trends"]
    },
    Admin:{
      title:"Admin Dashboard",
      subtitle:"System health, users, roles, all records, installer status and developer preview.",
      actions:[
        ["User Management","admin"],["All Production Entries","dashboard"],["All Forms","forms"],["All Actions","actions"],["Installer Status","installer"],["AI / Reports","ai"]
      ],
      scope:["Users / Roles","Database Health","All Records","Developer Preview"]
    }
  };

  const cfg = config[role] || config.Supervisor;
  title.textContent = cfg.title;
  subtitle.textContent = cfg.subtitle;
  panel.innerHTML = `<div class="role-banner"><h3>${esc(role)} View${previewRole ? " (Preview)" : ""}</h3><p>${esc(cfg.subtitle)}</p><div class="role-list">${cfg.actions.map(a=>`<button type="button" class="role-action-btn" onclick="roleAction('${a[1]}')">${esc(a[0])}</button>`).join("")}</div></div>`;
  if(scope){
    scope.innerHTML = `<div class="scope-grid">${cfg.scope.map(s=>`<div class="scope-card"><b>${esc(s)}</b><span>${esc(role)} access</span></div>`).join("")}</div>
    <p>
      <span class="role-permission-tag">Create Forms</span>
      <span class="role-permission-tag ${canViewCrew()?'':'blocked'}">Crew / Area View</span>
      <span class="role-permission-tag ${canViewAll()?'':'blocked'}">All Records</span>
      <span class="role-permission-tag ${canAdmin()?'':'blocked'}">Admin Tools</span>
    </p>`;
  }

  const adminBtn=document.getElementById("adminNavButton");
  if(adminBtn) adminBtn.style.display=canAdmin()?"block":"none";
}

function canWrite(){
  return canCreate();
}

function canViewAllForms(){
  return canReviewForms();
}
function setFormsViewMode(mode){
  if(mode==="all" && !canViewAllForms()){alert("Superintendent, Manager or Admin access required.");return;}
  formsViewMode=mode;localStorage.setItem("uds_forms_view_mode",mode);renderSavedForms();
}
function getVisibleForms(){
  if(canViewAllForms() && formsViewMode==="all") return savedForms;
  const email=currentUser?.email||"";
  return savedForms.filter(f=>!email || f.created_by===email);
}
function updateFormsManagerControls(){
  const box=document.getElementById("formsManagerControls");
  if(box) box.style.display=canViewAllForms()?"block":"none";
}

async function checkInstallerStatus(){
  if(!isAdmin()){
    alert("Admin role required.");
    return;
  }
  const checks = [
    {name:"user_roles", fn:()=>supabaseClient.from("user_roles").select("id").limit(1)},
    {name:"development_entries", fn:()=>supabaseClient.from("development_entries").select("id").limit(1)},
    {name:"development_actions", fn:()=>supabaseClient.from("development_actions").select("id").limit(1)},
    {name:"development_photos", fn:()=>supabaseClient.from("development_photos").select("id").limit(1)}
  ];

  let html = "";
  for(const c of checks){
    const { error } = await c.fn();
    html += error
      ? `<p class="installer-bad">✗ ${c.name}: ${esc(error.message)}</p>`
      : `<p class="installer-ok">✓ ${c.name}: OK</p>`;
  }
  installerStatus.innerHTML = html;
}



function newForm(){
  const d = new Date().toISOString().split("T")[0];
  setTimeout(() => {
    if(document.getElementById("formDate")) document.getElementById("formDate").value = d;
    renderSelectedForm();
  }, 20);
}

function renderSelectedForm(){
  const type = document.getElementById("formType")?.value || "pjo";
  if(type === "pjo") renderPJOForm();
  else if(type === "cascaded") renderPlaceholderForm("Cascaded Coaching");
  else if(type === "lif") renderPlaceholderForm("Leaders in Field");
  else renderPlaceholderForm("Custom Field Form");
}

function renderPlaceholderForm(title){
  dynamicFormArea.innerHTML = `
    <div class="form-template">
      <div class="form-header-dayan">
        <div class="form-logo"><span>D</span>AYAN</div>
        <div class="form-title"><h2>${esc(title)}</h2><p>Template ready to configure</p></div>
      </div>
      <div class="form-section">
        <h3>${esc(title)}</h3>
        <label>Date<input id="formDate" type="date"></label>
        <label>Area / Heading<input id="formHeading" placeholder="EXL XD44 DN31"></label>
        <label>Coach / Observer<input id="formCoach"></label>
        <label>Employee / Crew<input id="formEmployee"></label>
        <label>Notes<textarea id="formNotes"></textarea></label>
      </div>
      <button type="button" class="save-btn" onclick="saveFillableForm()">Save ${esc(title)}</button>
    </div>
  `;
}

function yn(name){
  return `
    <div class="yes-no">
      <label class="form-check"><input type="radio" name="${name}" value="Yes"> Yes / Тийм</label>
      <label class="form-check"><input type="radio" name="${name}" value="No"> No / Үгүй</label>
    </div>
  `;
}

function renderPJOForm(){
  dynamicFormArea.innerHTML = `
  <div class="form-template" id="currentFormPrintable">
    <div class="form-header-dayan">
      <div class="form-logo"><span>D</span>AYAN</div>
      <div class="form-title">
        <h2>PLANNED JOB OBSERVATION</h2>
        <p>Ажлын төлөвлөгөөт ажиглалт</p>
      </div>
    </div>

    <div class="form-section">
      <h3>Header Information</h3>
      <div class="form-grid">
        <label>Workplace / Ажлын байр<input id="pjo_workplace" placeholder="EXL XD44 DN31"></label>
        <label>Date of Observation<input id="pjo_date" type="date"></label>
        <label>Job / Task Observed<input id="pjo_task"></label>
        <label>Procedure Name and #<input id="pjo_procedure"></label>
        <label>Observer / Crew Trainer<input id="pjo_observer"></label>
        <label>Supervisor<input id="pjo_supervisor"></label>
      </div>
    </div>

    <div class="form-section">
      <h3>Reason for Observation</h3>
      <div class="form-check-grid">
        <label class="form-check"><input type="checkbox" id="pjo_reason_procedure"> Job Procedure / Practice Update</label>
        <label class="form-check"><input type="checkbox" id="pjo_reason_injury"> Recent Injury Associated with Job/Task</label>
        <label class="form-check"><input type="checkbox" id="pjo_reason_training"> Training Follow-up</label>
        <label class="form-check"><input type="checkbox" id="pjo_reason_experienced"> Experienced Worker Check</label>
        <label class="form-check"><input type="checkbox" id="pjo_reason_other"> Other</label>
      </div>
      <label>Other Reason<input id="pjo_reason_other_text"></label>
    </div>

    <div class="form-section">
      <h3>Type of Observation</h3>
      <div class="form-check-grid">
        <label class="form-check"><input type="checkbox" id="pjo_type_performance"> Performance Demonstration</label>
        <label class="form-check"><input type="checkbox" id="pjo_type_followup"> Follow-up</label>
      </div>
      <label>Original Date<input id="pjo_original_date" type="date"></label>
    </div>

    <div class="form-section">
      <h3>Employee Information</h3>
      <div class="form-grid">
        <label>Employee #1 Name<input id="pjo_emp1_name"></label>
        <label>Employee #1 Occupation<input id="pjo_emp1_occupation"></label>
        <label>Employee #1 Experience<input id="pjo_emp1_experience"></label>
        <label>Employee #2 Name<input id="pjo_emp2_name"></label>
        <label>Employee #2 Occupation<input id="pjo_emp2_occupation"></label>
        <label>Employee #2 Experience<input id="pjo_emp2_experience"></label>
      </div>
      <div class="form-question"><div class="form-question-title">Is worker trained and licensed?</div>${yn("pjo_trained")}</div>
      <div class="form-question"><div class="form-question-title">Training records verified?</div>${yn("pjo_training_records")}</div>
    </div>

    <div class="form-section">
      <h3>Observations / Ажиглалтууд</h3>
      ${pjoQuestion(1, "Could any practices or conditions observed result in personal injury or near miss? If yes, explain.", "q1")}
      ${pjoQuestion(2, "Could any practices or conditions observed result in property damage? If yes, explain.", "q2")}
      ${pjoQuestion(3, "Were all applicable procedures/standards followed during the observation? If no, explain.", "q3")}
      ${pjoQuestion(4, "What key points in the procedure/standard were noticed during the observation?", "q4", false)}
      ${pjoQuestion(5, "Was any positive recognition given to the employee(s) following the observation? If yes, what was said?", "q5")}
      ${pjoQuestion(6, "Was any corrective information and instruction given to the employee(s) during the observation? If yes, what was it?", "q6")}
      ${pjoQuestion(7, "Do the methods and practices observed need to be reviewed for efficiency and production capability?", "q7")}
      ${pjoQuestion(8, "What should we consider changing in the interest of safety? Ask employee(s) for their input.", "q8")}
      ${pjoQuestion(9, "Additional comments / observations.", "q9", false)}
      ${pjoQuestion(10, "Do procedures need to be revised? If yes, how?", "q10")}
      ${pjoQuestion(11, "Duration of Observation", "q11", false)}
      <div class="form-grid">
        <label>Start Time<input id="pjo_start_time" type="time"></label>
        <label>Stop Time<input id="pjo_stop_time" type="time"></label>
      </div>
    </div>

    <div class="form-section">
      <h3>Recommended Follow-up</h3>
      <label>Recommended Follow-up<textarea id="pjo_followup"></textarea></label>
      <label>Responsible Person<input id="pjo_responsible"></label>
      <label>Due Date<input id="pjo_due_date" type="date"></label>
      <label>Completion Signature & Date<input id="pjo_completion"></label>
    </div>

    <div class="form-section">
      <h3>Please Consider While Observing</h3>
      <div class="form-check-grid">
        ${check("pjo_obs_ptw","Point Safety System / PTW")}
        ${check("pjo_obs_procedures","Procedures and Safe Storage")}
        ${check("pjo_obs_ppe","Personal Protective Equipment")}
        ${check("pjo_obs_ergonomics","Ergonomics / Position")}
        ${check("pjo_obs_incidents","Previous Incidents / Special Rules")}
        ${check("pjo_obs_training","Training Requirements")}
        ${check("pjo_obs_materials","Materials")}
        ${check("pjo_obs_housekeeping","Housekeeping")}
        ${check("pjo_obs_isolation","Isolation / Lock Out Tag Out")}
        ${check("pjo_obs_equipment","Equipment / Tools")}
        ${check("pjo_obs_electrical","Electrical Hazards")}
        ${check("pjo_obs_fire","Fire Hazards")}
        ${check("pjo_obs_emergency","Emergency Exits / First Aid / Eyewash")}
        ${check("pjo_obs_extinguisher","Fire Extinguishers")}
      </div>
    </div>

    <div class="form-section">
      <h3>Signatures</h3>
      <div class="form-grid">
        ${sig("Employee #1 Name / Signature", "pjo_sig_emp1")}
        ${sig("Employee #2 Name / Signature", "pjo_sig_emp2")}
        ${sig("Observer / Crew Trainer", "pjo_sig_observer")}
        ${sig("Supervisor", "pjo_sig_supervisor")}
        ${sig("Superintendent / Area Manager", "pjo_sig_manager")}
        ${sig("Safety Coordinator", "pjo_sig_safety")}
      </div>
    </div>

    <div class="form-section">
      <h3>Photos / Evidence</h3>
      <label>Attach Photos<input id="pjo_photos" type="file" accept="image/*" multiple></label>
      <label>General Notes<textarea id="pjo_notes"></textarea></label>
    </div>

    <button type="button" class="save-btn" onclick="saveFillableForm()">Save PJO</button>
    <button type="button" class="secondary" onclick="printCurrentForm()">Print / PDF</button>
  </div>
  `;
  const d = new Date().toISOString().split("T")[0];
  const dateEl = document.getElementById("pjo_date");
  if(dateEl && !dateEl.value) dateEl.value = d;
}

function pjoQuestion(num, text, id, yesno=true){
  return `
    <div class="form-question">
      <div class="form-question-title">${num}. ${esc(text)}</div>
      ${yesno ? yn("pjo_"+id) : ""}
      <textarea id="pjo_${id}_comment" placeholder="Comments / Тайлбар"></textarea>
    </div>
  `;
}

function check(id,label){
  return `<label class="form-check"><input type="checkbox" id="${id}"> ${esc(label)}</label>`;
}

function sig(label,id){
  return `<div class="signature-box"><div class="signature-line"></div><label>${esc(label)}<input id="${id}" placeholder="Type name / signed"></label></div>`;
}

function collectPJO(){
  const ids = Array.from(document.querySelectorAll("#currentFormPrintable input, #currentFormPrintable textarea, #currentFormPrintable select"));
  const data = {};
  ids.forEach(el => {
    if(el.type === "checkbox") data[el.id] = el.checked;
    else if(el.type === "radio"){
      if(el.checked) data[el.name] = el.value;
    } else if(el.type !== "file") data[el.id] = el.value;
  });
  return data;
}

function saveFillableForm(){
  if(!canWrite()){
    alert("Viewer role is read-only.");
    return;
  }
  const type = document.getElementById("formType")?.value || "pjo";
  const data = type === "pjo" ? collectPJO() : {};
  const title = type === "pjo" ? "Planned Job Observation" : document.getElementById("formType")?.selectedOptions[0]?.textContent || "Form";

  const doc = {
    id:"form_"+Date.now(),
    type,
    title,
    data,
    created_at:new Date().toISOString(),
    created_by:currentUser?.email || "",
    synced:false
  };

  savedForms.unshift(doc);
  saveFormsLocal();
  renderSavedForms();
  alert("Form saved locally.");
}

function saveFormsLocal(){
  localStorage.setItem("uds_enterprise_forms", JSON.stringify(savedForms));
}


function printSavedForms(){
  const win = window.open("", "_blank");
  if(!win){
    alert("Popup blocked. Allow popups for this site.");
    return;
  }

  const rows = savedForms.map(f => `
    <tr>
      <td>${esc(f.title)}</td>
      <td>${esc(f.type)}</td>
      <td>${new Date(f.created_at).toLocaleString()}</td>
      <td>${esc(f.created_by)}</td>
    </tr>
  `).join("");

  win.document.write(`
    <!DOCTYPE html>
    <html>
    <head>
      <title>Saved Forms List</title>
      <style>
        body{font-family:Arial,sans-serif;margin:20px;color:#172033}
        table{width:100%;border-collapse:collapse}
        th,td{border:1px solid #94a3b8;padding:8px;text-align:left}
        th{background:#e5e7eb}
      </style>
    </head>
    <body>
      <h1>UDS Development Pro - Saved Forms</h1>
      <table>
        <thead><tr><th>Title</th><th>Type</th><th>Created</th><th>Created By</th></tr></thead>
        <tbody>${rows || "<tr><td colspan='4'>No saved forms.</td></tr>"}</tbody>
      </table>
    </body>
    </html>
  `);
  win.document.close();
  win.focus();
  setTimeout(() => win.print(), 500);
}


function renderSavedForms(){
  const el = document.getElementById("savedFormsList");
  if(!el) return;
  el.innerHTML = savedForms.length ? savedForms.map(f => `
    <div class="form-doc-card">
      <b>${esc(f.title)}</b>
      <span class="badge">${esc(f.type)}</span>
      <p>${new Date(f.created_at).toLocaleString()}</p>
      <p>Created by: ${esc(f.created_by)}</p>
      <button type="button" onclick="viewSavedForm('${f.id}')">View</button>
    </div>
  `).join("") : "<div class='notice'>No saved forms yet.</div>";
}

function viewSavedForm(id){
  const f = savedForms.find(x => x.id === id);
  if(!f) return;
  alert(`${f.title}\\nCreated: ${new Date(f.created_at).toLocaleString()}\\nSaved locally.`);
}


function printCurrentForm(){
  const current = document.getElementById("currentFormPrintable");
  if(!current){
    alert("Open a form first, then print.");
    return;
  }

  const win = window.open("", "_blank");
  if(!win){
    alert("Popup blocked. Allow popups for this site or use browser Print.");
    return;
  }

  win.document.write(`
    <!DOCTYPE html>
    <html>
    <head>
      <title>UDS Form Print</title>
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <style>
        body{font-family:Arial,sans-serif;color:#172033;margin:20px}
        .form-template{box-shadow:none!important;border-radius:0!important}
        .form-header-dayan{display:flex;justify-content:space-between;border-bottom:3px solid #7f1d1d;padding-bottom:10px;margin-bottom:12px}
        .form-logo{font-size:28px;font-weight:900;color:#1e3a8a}
        .form-logo span{color:#991b1b}
        .form-title{text-align:right}
        .form-title h2{margin:0;color:#7f1d1d}
        .form-section{border:1px solid #cbd5e1;padding:10px;margin:10px 0;page-break-inside:avoid}
        .form-grid,.form-check-grid{display:grid;grid-template-columns:1fr 1fr;gap:8px}
        label{font-weight:700}
        input,textarea,select{border:0;border-bottom:1px solid #94a3b8;font-size:14px;width:100%;min-height:24px}
        textarea{min-height:60px}
        button,.quick{display:none!important}
        .yes-no{display:grid;grid-template-columns:1fr 1fr;gap:6px}
        .form-check{display:flex;gap:6px;align-items:center}
        @media print{body{margin:10mm}}
      </style>
    </head>
    <body>${current.outerHTML}</body>
    </html>
  `);
  win.document.close();
  win.focus();
  setTimeout(() => win.print(), 500);
}


function aiSummarizeForm(){
  const type = document.getElementById("formType")?.value || "pjo";
  const data = type === "pjo" ? collectPJO() : {};
  showTab("ai");
  rawNote.value = "Summarize this completed form and identify follow-up actions: " + JSON.stringify(data);
  aiAskQuestion();
}

function renderAll(){applyRoleView();renderSavedForms();applyRoleView();renderDevRolePreview();renderSavedForms();renderDashboard();renderActions();renderGallery();renderMineMap();checkSupabase()}
function renderDashboard(){let today=new Date().toISOString().split("T")[0],todays=entries.filter(e=>e.date===today),open=actions.filter(a=>a.status!=="Closed");tileHeadings.textContent=todays.length;tileMetres.textContent=sum(todays,"metresAdvanced").toFixed(1);tileBolts.textContent=sum(todays,"boltsInstalled");tileShotcrete.textContent=sum(todays,"shotcreteM3").toFixed(1);tileDelay.textContent=sum(todays,"delayHours").toFixed(1);tileActions.textContent=open.length;recentLogs.innerHTML=entries.slice(0,5).map(logCard).join("");headingDashboard.innerHTML=Object.entries(groupBy(entries,"heading")).map(([h,arr])=>`<div class="item"><b>${esc(h)}</b><br>${arr.length} entries | ${sum(arr,"metresAdvanced").toFixed(1)}m | ${sum(arr,"boltsInstalled")} bolts | ${sum(arr,"delayHours").toFixed(1)} delay hrs</div>`).join("")}
function logCard(e){return `<div class="item"><b>${esc(e.heading)}</b><span class="badge">${esc(e.shift)}</span><span class="badge">${esc(e.activity)}</span><span class="badge ${e.synced?'synced':'unsynced'}">${e.synced?'Synced':'Offline'}</span><p><b>Job:</b> ${esc(e.job)}</p><p>${e.metresAdvanced||0}m | ${e.boltsInstalled||0} bolts | ${e.shotcreteM3||0}m³ | Photos: ${(e.photos||[]).length}</p></div>`}
function renderGallery(){let photos=[];entries.forEach((e,ei)=>(e.photos||[]).forEach((p,pi)=>photos.push({src:p,heading:e.heading,date:e.date,ei,pi})));galleryGrid.innerHTML=photos.length?photos.map((p,i)=>`<div class="gallery-card"><img src="${p.src}" onclick="openGalleryPhoto(${i})"><b>${esc(p.heading)}</b><br><small>${esc(p.date)}</small></div>`).join(""):"<div class='notice'>No photos yet.</div>";window._galleryPhotos=photos}
function openGalleryPhoto(i){modalPhotos=(window._galleryPhotos||[]).map(p=>p.src);modalIndex=i;showModalPhoto()}
function renderMineMap(){let groups=groupBy(entries,"heading");mineMap.innerHTML=Object.keys(groups).length?Object.entries(groups).map(([h,arr])=>`<div class="map-card"><h3>${esc(h)}</h3><p>${arr.length} entries<br>${sum(arr,"metresAdvanced").toFixed(1)}m advanced<br>${sum(arr,"boltsInstalled")} bolts</p><button onclick="showHeadingHistory('${escAttr(h)}')">Open History</button></div>`).join(""):"<div class='notice'>No headings recorded yet.</div>"}
function showHeadingHistory(h){let arr=entries.filter(e=>e.heading===h);headingHistory.innerHTML=`<h3>${esc(h)} History</h3>`+arr.map(logCard).join("")}
function renderActions(){actionList.innerHTML=actions.map(a=>`<div class="item"><b>${esc(a.priority)}: ${esc(a.actionText)}</b><span class="badge ${a.synced?'synced':'unsynced'}">${a.synced?'Synced':'Offline'}</span><br>Heading: ${esc(a.heading)}<br>Owner: ${esc(a.owner)}<br>Due: ${esc(a.dueDate)} | Status: ${esc(a.status)}</div>`).join("")}
function generateReport(){let d=val("reportDate"),todays=entries.filter(e=>e.date===d),open=actions.filter(a=>a.status!=="Closed"),m=sum(todays,"metresAdvanced"),b=sum(todays,"boltsInstalled"),sc=sum(todays,"shotcreteM3"),delay=sum(todays,"delayHours");reportOutput.innerHTML=`<h2>UDS Daily Development Report</h2><p><b>Date:</b> ${esc(d)}</p><p>${todays.length} headings, ${m.toFixed(1)}m advanced, ${b} bolts, ${sc.toFixed(1)}m³ shotcrete, ${delay.toFixed(1)} delay hours, ${open.length} open actions.</p><hr>`+todays.map(e=>`<h3>${esc(e.heading)}</h3><p><b>Job:</b> ${esc(e.job)}</p><p><b>Next:</b> ${esc(e.nextShift)}</p>`).join("<hr>")}
function exportActions(){let rows=[["Priority","Heading","Action","Owner","Due Date","Status"],...actions.map(a=>[a.priority,a.heading,a.actionText,a.owner,a.dueDate,a.status])],csv=rows.map(r=>r.map(x=>`"${String(x||"").replaceAll('"','""')}"`).join(",")).join("\\n");download("UDS_Development_Action_Register.csv",csv,"text/csv")}
function exportBackup(){download("UDS_Development_Log_Backup.json",JSON.stringify({entries,actions},null,2),"application/json")}function clearLocalData(){if(!confirm("Clear all local app data?"))return;entries=[];actions=[];saveLocal();renderAll()}function saveLocal(){localStorage.setItem("uds_pro_entries",JSON.stringify(entries));localStorage.setItem("uds_pro_actions",JSON.stringify(actions))}
function clearEntry(){["heading","levelArea","crew","supervisor","foreman","personnel","roundChainage","metresAdvanced","boltsInstalled","cableBolts","meshInstalled","shotcreteM3","shotcreteThickness","equipment","delayHours","job","delays","nextShift","safetyObservation","goodCatch","notes"].forEach(id=>document.getElementById(id).value="");["ptha","lif","scaled","groundSupport","boltPattern","shotcreteQuality","ventilation","servicesClear","barricades","reentry"].forEach(id=>document.getElementById(id).checked=false);clearPendingPhotos()}function clearAction(){["actionHeading","actionText","owner","dueDate"].forEach(id=>document.getElementById(id).value="")}
function closePhotoModal(){photoModal.classList.remove("active")}function showModalPhoto(){modalImage.src=modalPhotos[modalIndex]||"";photoModal.classList.add("active")}function prevModalPhoto(){if(!modalPhotos.length)return;modalIndex=(modalIndex-1+modalPhotos.length)%modalPhotos.length;showModalPhoto()}function nextModalPhoto(){if(!modalPhotos.length)return;modalIndex=(modalIndex+1)%modalPhotos.length;showModalPhoto()}function downloadModalPhoto(){download("UDS_photo.jpg",dataUrlToBlob(modalImage.src),"image/jpeg")}async function shareModalPhoto(){try{let blob=dataUrlToBlob(modalImage.src),file=new File([blob],"UDS_photo.jpg",{type:blob.type});if(navigator.share&&navigator.canShare({files:[file]}))await navigator.share({files:[file],title:"UDS Photo"});else alert("Share not available. Use Download.")}catch(e){alert("Share not available.")}}
function download(n,c,t){let b=c instanceof Blob?c:new Blob([c],{type:t}),u=URL.createObjectURL(b),a=document.createElement("a");a.href=u;a.download=n;a.click();URL.revokeObjectURL(u)}function groupBy(arr,key){return arr.reduce((o,e)=>{let k=e[key]||"Not recorded";(o[k]=o[k]||[]).push(e);return o},{})}function val(id){return document.getElementById(id).value}function chk(id){return document.getElementById(id).checked}function num(id){return Number(document.getElementById(id).value||0)}function sum(arr,key){return arr.reduce((s,e)=>s+(Number(e[key])||0),0)}function esc(x){return String(x||"").replace(/[&<>"']/g,m=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[m]))}function escAttr(x){return String(x||"").replace(/'/g,"&#39;").replace(/"/g,"&quot;")}


/* Enterprise 3.1 overrides */

function fillCurrentFormFromData(data){
  if(!data) return;
  Object.entries(data).forEach(([key,value])=>{
    const byId = document.getElementById(key);
    if(byId){
      if(byId.type === "checkbox") byId.checked = !!value;
      else byId.value = value ?? "";
      return;
    }
    const radios = document.querySelectorAll(`input[name="${CSS.escape(key)}"]`);
    radios.forEach(r => { if(r.value === value) r.checked = true; });
  });
}

function editSavedForm(id){
  const f = savedForms.find(x => x.id === id);
  if(!f) return alert("Form not found.");
  showTab("forms");
  if(document.getElementById("formType")) document.getElementById("formType").value = f.type || "pjo";
  renderSelectedForm();
  setTimeout(()=>fillCurrentFormFromData(f.data), 50);
}

function viewSavedForm(id){
  const f = savedForms.find(x => x.id === id);
  if(!f) return alert("Form not found.");
  printSingleSavedForm(id, false);
}

function duplicateSavedForm(id){
  const f = savedForms.find(x => x.id === id);
  if(!f) return alert("Form not found.");
  const copy = JSON.parse(JSON.stringify(f));
  copy.id = "form_" + Date.now();
  copy.created_at = new Date().toISOString();
  copy.title = (copy.title || "Form") + " - Copy";
  copy.created_by = currentUser?.email || copy.created_by || "";
  savedForms.unshift(copy);
  saveFormsLocal();
  renderSavedForms();
}

function deleteSavedForm(id){
  const f = savedForms.find(x => x.id === id);
  if(!f) return;
  if(!confirm("Delete this saved form from this device?")) return;
  savedForms = savedForms.filter(x => x.id !== id);
  saveFormsLocal();
  renderSavedForms();
}

function getVal(data, key){
  const v = data?.[key];
  if(v === true) return "☑";
  if(v === false) return "☐";
  return v || "";
}
function ynVal(data, key){
  const v = data?.[key];
  return {
    yes: v === "Yes" ? "☑" : "☐",
    no: v === "No" ? "☑" : "☐"
  };
}

function buildPJOPrintHTML(f){
  const d = f.data || {};
  const q = (num, text, key, yesno=true) => {
    const yn = ynVal(d, "pjo_"+key);
    return `<tr>
      <td style="width:68%">${num}. ${text}<br><b>Comments:</b> ${esc(d["pjo_"+key+"_comment"] || "")}</td>
      <td style="width:16%;text-align:center">${yesno ? yn.yes+" Yes / Тийм" : ""}</td>
      <td style="width:16%;text-align:center">${yesno ? yn.no+" No / Үгүй" : ""}</td>
    </tr>`;
  };

  return `
  <div class="pjo-print-page">
    <table class="pjo-print-table">
      <tr>
        <td style="width:28%;font-size:22px;font-weight:900;color:#1e3a8a"><span style="color:#991b1b">D</span>AYAN</td>
        <td colspan="3" class="pjo-print-title">АЖЛЫН ТӨЛӨВЛӨГӨӨТ АЖИГЛАЛТ<br>PLANNED JOB OBSERVATION</td>
      </tr>
      <tr>
        <td><b>Workplace:</b><br>${esc(d.pjo_workplace)}</td>
        <td><b>Date of observation:</b><br>${esc(d.pjo_date)}</td>
        <td><b>Job/task observed:</b><br>${esc(d.pjo_task)}</td>
        <td><b>Procedure name and #:</b><br>${esc(d.pjo_procedure)}</td>
      </tr>
      <tr>
        <td colspan="4"><b>Reason for observation:</b>
          ${getVal(d,"pjo_reason_procedure")} Job Procedure / Practice Update &nbsp;
          ${getVal(d,"pjo_reason_injury")} Recent Injury &nbsp;
          ${getVal(d,"pjo_reason_training")} Training Follow-up &nbsp;
          ${getVal(d,"pjo_reason_experienced")} Experienced Worker Check &nbsp;
          ${getVal(d,"pjo_reason_other")} Other: ${esc(d.pjo_reason_other_text)}
        </td>
      </tr>
      <tr>
        <td colspan="2"><b>Type of Observation:</b>
          ${getVal(d,"pjo_type_performance")} Performance Demonstration &nbsp;
          ${getVal(d,"pjo_type_followup")} Follow-up
        </td>
        <td colspan="2"><b>Observer:</b> ${esc(d.pjo_observer)}<br><b>Supervisor:</b> ${esc(d.pjo_supervisor)}</td>
      </tr>
    </table>

    <table class="pjo-print-table" style="margin-top:8px">
      <tr><th colspan="4">EMPLOYEE(S) TO BE OBSERVED</th></tr>
      <tr>
        <td><b>Employee #1 Name</b><br>${esc(d.pjo_emp1_name)}</td>
        <td><b>Occupation</b><br>${esc(d.pjo_emp1_occupation)}</td>
        <td><b>Employee #2 Name</b><br>${esc(d.pjo_emp2_name)}</td>
        <td><b>Occupation</b><br>${esc(d.pjo_emp2_occupation)}</td>
      </tr>
      <tr>
        <td colspan="2"><b>Is worker trained and licensed?</b> ${ynVal(d,"pjo_trained").yes} Yes ${ynVal(d,"pjo_trained").no} No</td>
        <td colspan="2"><b>Training records verified?</b> ${ynVal(d,"pjo_training_records").yes} Yes ${ynVal(d,"pjo_training_records").no} No</td>
      </tr>
    </table>

    <table class="pjo-print-table" style="margin-top:8px">
      <tr><th colspan="3">OBSERVATIONS / АЖИГЛАЛТУУД</th></tr>
      ${q(1,"Could any practices or conditions observed result in personal injury or near miss? If yes, explain.","q1")}
      ${q(2,"Could any practices or conditions observed result in property damage? If yes, explain.","q2")}
      ${q(3,"Were all applicable procedures/standards followed during the observation? If no, explain.","q3")}
      ${q(4,"What key points in the procedure/standard were noticed during the observation?","q4",false)}
      ${q(5,"Was any positive recognition given to the employee(s) following the observation?","q5")}
      ${q(6,"Was any corrective information and instruction given to the employee(s) during the observation?","q6")}
      ${q(7,"Do the methods and practices observed need review for efficiency and production capability?","q7")}
      ${q(8,"What should we consider changing in the interest of safety? Ask employee(s) for input.","q8")}
      ${q(9,"Additional comments / observations.","q9",false)}
      ${q(10,"Do procedures need to be revised? If yes, how?","q10")}
    </table>

    <table class="pjo-print-table" style="margin-top:8px">
      <tr>
        <td><b>Duration:</b> Start ${esc(d.pjo_start_time)} / Stop ${esc(d.pjo_stop_time)}</td>
        <td><b>Responsible Person:</b><br>${esc(d.pjo_responsible)}</td>
        <td><b>Due Date:</b><br>${esc(d.pjo_due_date)}</td>
      </tr>
      <tr><td colspan="3"><b>Recommended Follow-up:</b><br>${esc(d.pjo_followup)}</td></tr>
    </table>

    <table class="pjo-print-table" style="margin-top:8px">
      <tr><th colspan="3">SIGNATURES</th></tr>
      <tr><td>Employee #1<br><br>${esc(d.pjo_sig_emp1)}</td><td>Employee #2<br><br>${esc(d.pjo_sig_emp2)}</td><td>Observer / Crew Trainer<br><br>${esc(d.pjo_sig_observer)}</td></tr>
      <tr><td>Supervisor<br><br>${esc(d.pjo_sig_supervisor)}</td><td>Superintendent / Area Manager<br><br>${esc(d.pjo_sig_manager)}</td><td>Safety Coordinator<br><br>${esc(d.pjo_sig_safety)}</td></tr>
      <tr><td colspan="3"><b>General Notes:</b><br>${esc(d.pjo_notes)}</td></tr>
    </table>
    <div style="text-align:center;margin-top:8px;color:#7f1d1d;font-weight:900">SAFETY - FIRST, LAST, AND ALWAYS</div>
  </div>`;
}

function printSingleSavedForm(id, autoPrint=true){
  const f = savedForms.find(x => x.id === id);
  if(!f) return alert("Form not found.");
  const win = window.open("", "_blank");
  if(!win) return alert("Popup blocked. Allow popups for this site.");

  const content = f.type === "pjo" ? buildPJOPrintHTML(f) : `
    <h1>${esc(f.title)}</h1>
    <p><b>Created:</b> ${new Date(f.created_at).toLocaleString()}</p>
    <p><b>Created By:</b> ${esc(f.created_by)}</p>
    <table>${Object.entries(f.data||{}).map(([k,v])=>`<tr><th>${esc(k)}</th><td>${esc(typeof v==="boolean"?(v?"Yes":"No"):v)}</td></tr>`).join("")}</table>
  `;

  win.document.write(`<!DOCTYPE html>
    <html><head><title>${esc(f.title)}</title>
    <style>
      body{font-family:Arial,sans-serif;margin:10px;color:#111}
      table{width:100%;border-collapse:collapse}
      th,td{border:1px solid #222;padding:5px;text-align:left;vertical-align:top}
      th{background:#e5e7eb}
      .pjo-print-title{text-align:center;font-weight:900;color:#7f1d1d;font-size:16px}
      .pjo-print-table{width:100%;border-collapse:collapse;font-size:11px}
      .pjo-print-table th,.pjo-print-table td{border:1px solid #222;padding:4px;vertical-align:top}
      @media print{@page{size:A4 landscape;margin:8mm}body{margin:0}.pjo-print-page{page-break-after:auto}}
    </style></head><body>${content}</body></html>`);
  win.document.close();
  win.focus();
  if(autoPrint) setTimeout(()=>win.print(),500);
}

function printCurrentForm(){
  const data = collectCurrentForm();
  const type = document.getElementById("formType")?.value || "pjo";
  const title = document.getElementById("formType")?.selectedOptions[0]?.textContent || "Form";
  const temp = {id:"current", type, title, data, created_at:new Date().toISOString(), created_by:currentUser?.email||""};
  const win = window.open("", "_blank");
  if(!win) return alert("Popup blocked. Allow popups for this site.");
  const content = type === "pjo" ? buildPJOPrintHTML(temp) : document.getElementById("currentFormPrintable")?.outerHTML || "";
  win.document.write(`<!DOCTYPE html><html><head><title>${esc(title)}</title>
    <style>
      body{font-family:Arial,sans-serif;margin:10px;color:#111}
      .pjo-print-title{text-align:center;font-weight:900;color:#7f1d1d;font-size:16px}
      .pjo-print-table{width:100%;border-collapse:collapse;font-size:11px}
      .pjo-print-table th,.pjo-print-table td{border:1px solid #222;padding:4px;vertical-align:top}
      @media print{@page{size:A4 landscape;margin:8mm}body{margin:0}}
    </style></head><body>${content}</body></html>`);
  win.document.close();
  win.focus();
  setTimeout(()=>win.print(),500);
}


function renderSavedForms(){
  const el = document.getElementById("savedFormsList");
  if(!el) return;
  if(typeof updateFormsManagerControls === "function") updateFormsManagerControls();
  const visible = typeof getVisibleForms === "function" ? getVisibleForms() : savedForms;
  const badge = (typeof canViewAllForms === "function" && canViewAllForms())
    ? `<div class="form-filter-badge">Viewing: ${formsViewMode === "all" ? "All Forms" : "My Forms"}</div>`
    : "";
  el.innerHTML = badge + (visible.length ? visible.map(f => `
    <div class="form-doc-card">
      <b>${esc(f.title || "Form")}</b>
      <span class="badge">${esc(f.type || "")}</span>
      <p>${new Date(f.created_at).toLocaleString()}</p>
      <p>Created by: ${esc(f.created_by || "")}</p>
      <div class="doc-actions">
        <button type="button" onclick="viewSavedForm('${f.id}')">View</button>
        <button type="button" onclick="editSavedForm('${f.id}')">Edit</button>
        <button type="button" onclick="printSingleSavedForm('${f.id}')">Print</button>
        <button type="button" class="secondary" onclick="duplicateSavedForm('${f.id}')">Copy</button>
        <button type="button" class="danger" onclick="deleteSavedForm('${f.id}')">Delete</button>
      </div>
    </div>
  `).join("") : "<div class='notice'>No saved forms yet.</div>");
}



/* Enterprise 3.2 Admin Dashboard + View-As Fix */
function getActualRoleName(){
  return currentUserRole?.role || "Supervisor";
}
function isActualAdmin(){
  return getActualRoleName() === "Admin";
}
function getRoleName(){
  if(isActualAdmin() && previewRole) return previewRole;
  return getActualRoleName();
}
function setPreviewRole(role){
  if(!isActualAdmin()){
    alert("Only Admin can preview other roles.");
    return;
  }
  previewRole = (role === "Admin" || role === "Actual") ? null : role;
  localStorage.setItem("uds_preview_role", previewRole || "");
  applyRoleView();
  renderDevRolePreview();
}
function loadPreviewRole(){
  const stored = localStorage.getItem("uds_preview_role") || "";
  previewRole = stored && ["Manager","Superintendent","Supervisor"].includes(stored) ? stored : null;
}
function canAdmin(){
  return isActualAdmin() && !previewRole;
}
function canManageUsers(){
  return isActualAdmin();
}
function roleLevel(role){
  return {Supervisor:1,Superintendent:2,Manager:3,Admin:4}[role] || 1;
}
function canCreate(){ return roleLevel(getRoleName()) >= 1; }
function canViewCrew(){ return roleLevel(getRoleName()) >= 2; }
function canViewAll(){ return roleLevel(getRoleName()) >= 3 || isActualAdmin(); }
function canReviewForms(){ return roleLevel(getRoleName()) >= 2 || isActualAdmin(); }
function canWrite(){ return canCreate(); }
function canViewAllForms(){ return canReviewForms(); }

function renderDevRolePreview(){
  const existing = document.getElementById("devRolePreview");
  if(existing) existing.remove();

  if(!isActualAdmin()) return;

  const dashboard = document.getElementById("dashboard");
  const titleCard = dashboard?.querySelector(".section-title");
  if(!dashboard || !titleCard) return;

  const current = previewRole || "Admin";
  const roles = ["Admin","Manager","Superintendent","Supervisor"];
  const div = document.createElement("div");
  div.id = "devRolePreview";
  div.className = "view-as-panel";
  div.innerHTML = `
    <h3>Admin View-As Mode</h3>
    <p>You are logged in as Admin. Switch views without changing your real database role.</p>
    <div class="view-as-buttons">
      ${roles.map(r => `<button type="button" class="${current===r?'active':''}" onclick="setPreviewRole('${r}')">${r}</button>`).join("")}
    </div>
  `;
  titleCard.insertAdjacentElement("afterend", div);
}

function roleAction(action){
  if(action==="entry"){showTab("entry");return;}
  if(action==="forms"){showTab("forms");return;}
  if(action==="gallery"){showTab("gallery");return;}
  if(action==="map"){showTab("map");return;}
  if(action==="ai"){showTab("ai");return;}
  if(action==="report"){showTab("report");return;}
  if(action==="actions"){showTab("actions");return;}
  if(action==="admin"){showTab("admin");return;}
  if(action==="dashboard"){showTab("dashboard");return;}
  if(action==="installer"){showTab("admin");setTimeout(()=>checkInstallerStatus && checkInstallerStatus(),150);return;}
}

function applyRoleView(){
  const role = getRoleName();
  const actual = getActualRoleName();
  const isPreview = isActualAdmin() && !!previewRole;

  const title = document.getElementById("roleDashboardTitle");
  const subtitle = document.getElementById("roleDashboardSubtitle");
  const panel = document.getElementById("roleViewPanel");
  const scope = document.getElementById("roleScopePanel");
  if(!title || !panel) return;

  const config = {
    Supervisor:{
      title:"Supervisor Dashboard",
      subtitle:"My shift entries, my forms, my photos, actions and AI handover.",
      actions:[["Development Entry","entry"],["Complete Forms","forms"],["My Actions","actions"],["My Photos","gallery"],["Shift Report","report"],["AI Assistant","ai"]],
      scope:["Own Entries","Own Forms","Own Photos","Own Actions"]
    },
    Superintendent:{
      title:"Superintendent Dashboard",
      subtitle:"Area-level review of supervisors, headings, forms, delays and actions.",
      actions:[["Area Production","dashboard"],["Supervisor Entries","dashboard"],["Forms Review","forms"],["Heading History","map"],["Open Actions","actions"],["AI Daily Summary","ai"]],
      scope:["Area Entries","Supervisor Forms","Area Photos","KPI / Delays"]
    },
    Manager:{
      title:"Manager Dashboard",
      subtitle:"Department-wide production, safety, forms, action and AI trend review.",
      actions:[["Production Dashboard","dashboard"],["All Forms","forms"],["All Actions","actions"],["All Photos","gallery"],["AI Executive Summary","ai"],["Reports","report"]],
      scope:["All Entries","All Forms","All Photos","Executive Trends"]
    },
    Admin:{
      title:"Admin Dashboard",
      subtitle:"System administration, users, roles, database health, installer status and all records.",
      actions:[["User Management","admin"],["System Installation Status","installer"],["All Production Entries","dashboard"],["All Forms","forms"],["All Actions","actions"],["AI / Reports","ai"]],
      scope:["Users / Roles","Database Health","All Records","Developer View-As"]
    }
  };

  const cfg = config[role] || config.Supervisor;
  title.textContent = cfg.title;
  subtitle.textContent = cfg.subtitle;

  panel.innerHTML = `
    <div class="role-banner">
      <h3>${esc(role)} View${isPreview ? " (Preview)" : ""}</h3>
      <p>${esc(cfg.subtitle)}</p>
      ${isPreview ? `<p><b>Actual Login:</b> ${esc(actual)} — previewing ${esc(role)}</p>` : ""}
      <div class="role-list">
        ${cfg.actions.map(a=>`<button type="button" class="role-action-btn" onclick="roleAction('${a[1]}')">${esc(a[0])}</button>`).join("")}
      </div>
    </div>`;

  if(scope){
    scope.innerHTML = `<div class="scope-grid">${cfg.scope.map(s=>`<div class="scope-card"><b>${esc(s)}</b><span>${esc(role)} access</span></div>`).join("")}</div>
      <p>
        <span class="role-permission-tag">Create Forms</span>
        <span class="role-permission-tag ${canViewCrew()?'':'blocked'}">Crew / Area View</span>
        <span class="role-permission-tag ${canViewAll()?'':'blocked'}">All Records</span>
        <span class="role-permission-tag ${canAdmin()?'':'blocked'}">Admin Tools</span>
      </p>`;
  }

  const adminBtn = document.getElementById("adminNavButton");
  if(adminBtn) adminBtn.style.display = isActualAdmin() ? "block" : "none";
}

function renderAll(){
  applyRoleView();
  renderDevRolePreview();
  if(typeof renderSavedForms === "function") renderSavedForms();
  if(typeof renderDashboard === "function") renderDashboard();
  if(typeof renderActions === "function") renderActions();
}



/* Enterprise 3.4 Entries Register + Full Report View */
function getAllEntriesForRole(){
  // Local-first for now. Higher roles see all local entries; supervisors see their own when created_by exists.
  const role = getRoleName ? getRoleName() : "Supervisor";
  if(["Admin","Manager","Superintendent"].includes(role)) return entries || [];
  const email = currentUser?.email || "";
  return (entries || []).filter(e => !e.created_by_email || e.created_by_email === email || !email);
}

function roleAction(action){
  if(action==="entry"){showTab("entry");return;}
  if(action==="forms"){showTab("forms");return;}
  if(action==="gallery"){showTab("gallery");return;}
  if(action==="map"){showTab("map");return;}
  if(action==="ai"){showTab("ai");return;}
  if(action==="report"){showTab("report");return;}
  if(action==="actions"){showTab("actions");return;}
  if(action==="admin"){showTab("admin");return;}
  if(action==="entries" || action==="allEntries" || action==="dashboard"){
    showTab("entriesRegister");
    renderEntriesRegister();
    return;
  }
  if(action==="installer"){showTab("admin");setTimeout(()=>checkInstallerStatus && checkInstallerStatus(),150);return;}
}

function scopeAction(label){
  const key = String(label || "").toLowerCase();
  if(key.includes("form")){ showTab("forms"); return; }
  if(key.includes("photo")){ showTab("gallery"); return; }
  if(key.includes("action")){ showTab("actions"); return; }
  if(key.includes("user") || key.includes("role") || key.includes("database") || key.includes("admin") || key.includes("system")){ showTab("admin"); return; }
  if(key.includes("trend") || key.includes("executive") || key.includes("ai")){ showTab("ai"); return; }
  if(key.includes("entry") || key.includes("entries") || key.includes("production") || key.includes("record")){ 
    showTab("entriesRegister"); 
    renderEntriesRegister();
    return; 
  }
  showTab("entriesRegister");
  renderEntriesRegister();
}

function renderEntriesRegister(){
  const el = document.getElementById("entriesRegisterList");
  if(!el) return;

  const q = (document.getElementById("entrySearch")?.value || "").toLowerCase();
  const shift = document.getElementById("entryShiftFilter")?.value || "";
  const from = document.getElementById("entryDateFrom")?.value || "";
  const to = document.getElementById("entryDateTo")?.value || "";

  let list = getAllEntriesForRole().slice().sort((a,b)=>{
    const ad = (a.date || a.entry_date || "") + " " + (a.time || a.entry_time || "");
    const bd = (b.date || b.entry_date || "") + " " + (b.time || b.entry_time || "");
    return bd.localeCompare(ad);
  });

  list = list.filter(e => {
    const date = e.date || e.entry_date || "";
    const text = JSON.stringify(e).toLowerCase();
    if(q && !text.includes(q)) return false;
    if(shift && (e.shift || "") !== shift) return false;
    if(from && date < from) return false;
    if(to && date > to) return false;
    return true;
  });

  el.innerHTML = list.length ? list.map((e,idx) => {
    const id = e.id || e.local_id || e.created_at || idx;
    const photos = getEntryPhotos(e).length;
    return `
      <div class="entry-card">
        <h3>${esc(e.heading || e.heading_drive || "No Heading")}</h3>
        <div class="entry-meta">
          <span class="entry-pill">${esc(e.date || e.entry_date || "")}</span>
          <span class="entry-pill">${esc(e.time || e.entry_time || "")}</span>
          <span class="entry-pill">${esc(e.shift || "")}</span>
          <span class="entry-pill">${esc(e.activity || e.job || "")}</span>
          <span class="entry-pill">${photos} photo${photos===1?"":"s"}</span>
        </div>
        <p>${esc((e.notes || e.generalNotes || e.next_shift || "").slice(0,180))}</p>
        <button type="button" onclick="openEntryReport('${escAttr(String(id))}')">Open Full Report</button>
      </div>
    `;
  }).join("") : "<div class='notice'>No entries found.</div>";
}

function clearEntryFilters(){
  ["entrySearch","entryShiftFilter","entryDateFrom","entryDateTo"].forEach(id=>{
    const el=document.getElementById(id);
    if(el) el.value="";
  });
  renderEntriesRegister();
}

function findEntryById(id){
  return (entries || []).find((e,idx) => String(e.id || e.local_id || e.created_at || idx) === String(id));
}

function getEntryPhotos(entry){
  if(!entry) return [];
  if(Array.isArray(entry.photos)) return entry.photos;
  if(Array.isArray(entry.photo_urls)) return entry.photo_urls.map(u=>({data:u,url:u}));
  if(Array.isArray(entry.photoUrls)) return entry.photoUrls.map(u=>({data:u,url:u}));
  if(entry.photo_url) return [{data:entry.photo_url,url:entry.photo_url}];
  return [];
}

function openEntryReport(id){
  const entry = findEntryById(id);
  if(!entry){
    alert("Entry not found.");
    return;
  }
  showTab("entryReportView");
  renderEntryReport(entry);
}

function renderEntryReport(e){
  const el = document.getElementById("entryReportContent");
  if(!el) return;

  const photos = getEntryPhotos(e);
  const safety = [
    ["PTHA", e.ptha],
    ["LIF", e.lif],
    ["Scaling Complete", e.scaled || e.scaling],
    ["Ground Support Complete", e.ground_support || e.groundSupport],
    ["Bolt Pattern Verified", e.bolt_pattern || e.boltPattern],
    ["Shotcrete Quality Checked", e.shotcrete_quality || e.shotcreteQuality],
    ["Ventilation Adequate", e.ventilation],
    ["Services Clear", e.services_clear || e.servicesClear],
    ["Barricades / Controls", e.barricades],
    ["Re-entry Confirmed", e.reentry || e.re_entry]
  ];

  el.innerHTML = `
    <div class="entry-report" id="printableEntryReport">
      <h2>${esc(e.heading || e.heading_drive || "Development Entry")}</h2>
      <p><b>Date:</b> ${esc(e.date || e.entry_date || "")} &nbsp; <b>Time:</b> ${esc(e.time || e.entry_time || "")} &nbsp; <b>Shift:</b> ${esc(e.shift || "")}</p>

      <table class="report-table">
        <tr><th>Level / Area</th><td>${esc(e.level_area || e.area || "")}</td></tr>
        <tr><th>Activity / Job</th><td>${esc(e.activity || e.job || "")}</td></tr>
        <tr><th>Round / Chainage</th><td>${esc(e.round_chainage || e.chainage || "")}</td></tr>
        <tr><th>Metres Advanced</th><td>${esc(e.metres_advanced || e.metres || 0)}</td></tr>
        <tr><th>Bolts Installed</th><td>${esc(e.bolts_installed || e.bolts || 0)}</td></tr>
        <tr><th>Mesh Installed</th><td>${esc(e.mesh_installed || e.mesh || "")}</td></tr>
        <tr><th>Shotcrete m³</th><td>${esc(e.shotcrete_m3 || e.shotcrete || 0)}</td></tr>
        <tr><th>Equipment</th><td>${esc(e.equipment || "")}</td></tr>
        <tr><th>Ground Conditions</th><td>${esc(e.ground_condition || e.groundCondition || "")}</td></tr>
        <tr><th>Delays</th><td>${esc(e.delays || "")}</td></tr>
        <tr><th>Next Shift Plan</th><td>${esc(e.next_shift || e.nextShift || "")}</td></tr>
        <tr><th>General Notes</th><td>${esc(e.notes || e.generalNotes || "")}</td></tr>
        <tr><th>Created By</th><td>${esc(e.created_by_email || e.created_by || "")}</td></tr>
      </table>

      <h3>Safety / Quality Checks</h3>
      <table class="report-table">
        ${safety.map(([k,v])=>`<tr><th>${esc(k)}</th><td>${v ? "Yes" : "No"}</td></tr>`).join("")}
      </table>

      <h3>Photos</h3>
      <div class="photo-grid">
        ${photos.length ? photos.map((p,i)=>{
          const src = p.data || p.url || p;
          return `<div><img src="${src}" alt="Entry photo ${i+1}"><p>Photo ${i+1}</p></div>`;
        }).join("") : "<p>No photos attached.</p>"}
      </div>
    </div>
  `;
}

function printEntryReport(){
  const report = document.getElementById("printableEntryReport");
  if(!report){
    alert("Open an entry report first.");
    return;
  }
  const win = window.open("", "_blank");
  if(!win){
    alert("Popup blocked. Allow popups for this site.");
    return;
  }
  win.document.write(`<!DOCTYPE html><html><head><title>Entry Report</title>
    <style>
      body{font-family:Arial,sans-serif;margin:20px;color:#172033}
      table{width:100%;border-collapse:collapse;margin:12px 0}
      th,td{border:1px solid #94a3b8;padding:8px;text-align:left;vertical-align:top}
      th{background:#e5e7eb;width:32%}
      img{max-width:48%;margin:6px;border:1px solid #ccc}
      @media print{@page{size:A4 portrait;margin:10mm}}
    </style></head><body>${report.outerHTML}</body></html>`);
  win.document.close();
  win.focus();
  setTimeout(()=>win.print(),500);
}

/* Override role cards so All Entries opens the real register */
function applyRoleView(){
  const role = getRoleName();
  const actual = getActualRoleName ? getActualRoleName() : (currentUserRole?.role || "Supervisor");
  const isPreview = typeof isActualAdmin === "function" && isActualAdmin() && !!previewRole;

  const title = document.getElementById("roleDashboardTitle");
  const subtitle = document.getElementById("roleDashboardSubtitle");
  const panel = document.getElementById("roleViewPanel");
  const scope = document.getElementById("roleScopePanel");
  if(!title || !panel) return;

  const config = {
    Supervisor:{
      title:"Supervisor Dashboard",
      subtitle:"My shift entries, my forms, my photos, actions and AI handover.",
      actions:[["Development Entry","entry"],["My Entries","entries"],["Complete Forms","forms"],["My Actions","actions"],["My Photos","gallery"],["AI Assistant","ai"]],
      scope:[["Own Entries","entries"],["Own Forms","forms"],["Own Photos","gallery"],["Own Actions","actions"]]
    },
    Superintendent:{
      title:"Superintendent Dashboard",
      subtitle:"Area-level review of supervisors, headings, forms, delays and actions.",
      actions:[["Area Entries","entries"],["Forms Review","forms"],["Heading History","map"],["Open Actions","actions"],["AI Daily Summary","ai"]],
      scope:[["Area Entries","entries"],["Supervisor Forms","forms"],["Area Photos","gallery"],["KPI / Delays","dashboard"]]
    },
    Manager:{
      title:"Manager Dashboard",
      subtitle:"Department-wide production, safety, forms, action and AI trend review.",
      actions:[["All Entries","entries"],["All Forms","forms"],["All Actions","actions"],["All Photos","gallery"],["AI Executive Summary","ai"],["Reports","report"]],
      scope:[["All Entries","entries"],["All Forms","forms"],["All Photos","gallery"],["Executive Trends","ai"]]
    },
    Admin:{
      title:"Admin Dashboard",
      subtitle:"System administration, users, roles, database health, installer status and all records.",
      actions:[["User Management","admin"],["All Entries","entries"],["All Forms","forms"],["All Actions","actions"],["All Photos","gallery"],["System Installation Status","installer"]],
      scope:[["Users / Roles","admin"],["Database Health","admin"],["All Records","entries"],["Developer View-As","dashboard"]]
    }
  };

  const cfg = config[role] || config.Supervisor;
  title.textContent = cfg.title;
  subtitle.textContent = cfg.subtitle;

  panel.innerHTML = `
    <div class="role-banner">
      <h3>${esc(role)} View${isPreview ? " (Preview)" : ""}</h3>
      <p>${esc(cfg.subtitle)}</p>
      ${isPreview ? `<p><b>Actual Login:</b> ${esc(actual)} — previewing ${esc(role)}</p>` : ""}
      <div class="role-list">
        ${cfg.actions.map(a=>`<button type="button" class="role-action-btn" onclick="roleAction('${a[1]}')">${esc(a[0])}</button>`).join("")}
      </div>
    </div>`;

  if(scope){
    scope.innerHTML = `
      <div class="scope-grid">
        ${cfg.scope.map(s=>`
          <button type="button" class="scope-card-btn" onclick="roleAction('${s[1]}')">
            <b>${esc(s[0])}</b>
            <span>${esc(role)} access</span>
          </button>
        `).join("")}
      </div>
      <p>
        <button type="button" class="role-permission-tag" onclick="roleAction('forms')">Create Forms</button>
        <button type="button" class="role-permission-tag ${canViewCrew && canViewCrew()?'':'blocked'}" onclick="roleAction('entries')">Crew / Area View</button>
        <button type="button" class="role-permission-tag ${canViewAll && canViewAll()?'':'blocked'}" onclick="roleAction('entries')">All Records</button>
        <button type="button" class="role-permission-tag ${canAdmin && canAdmin()?'':'blocked'}" onclick="roleAction('admin')">Admin Tools</button>
      </p>`;
  }

  const adminBtn = document.getElementById("adminNavButton");
  if(adminBtn) adminBtn.style.display = (typeof isActualAdmin === "function" && isActualAdmin()) ? "block" : "none";
}



/* Enterprise 3.5 Bilingual + Official Forms + Signature Pad */
let appLang = localStorage.getItem("uds_lang") || "en";
let activeSignatureField = null;
let signatureDrawing = false;
let signatureCtx = null;

const I18N = {
  en:{home:"Home",entry:"Entry",forms:"Forms",map:"Map",ai:"AI",more:"More",logout:"Logout",sync:"Sync",formsCentre:"Forms Centre",savedForms:"Saved Forms"},
  mn:{home:"Нүүр",entry:"Бүртгэл",forms:"Маягт",map:"Зураглал",ai:"AI",more:"Бусад",logout:"Гарах",sync:"Синк",formsCentre:"Маягтын төв",savedForms:"Хадгалсан маягт"}
};
function t(k){ return (I18N[appLang] && I18N[appLang][k]) || I18N.en[k] || k; }
function setLanguage(lang){
  appLang = lang === "mn" ? "mn" : "en";
  localStorage.setItem("uds_lang", appLang);
  applyLanguage();
  if(typeof renderSelectedForm === "function") renderSelectedForm();
  if(typeof renderAll === "function") renderAll();
}
function applyLanguage(){
  const sel=document.getElementById("languageSelect");
  if(sel) sel.value=appLang;
  document.querySelectorAll(".top-nav button").forEach(btn=>{
    const id=btn.dataset.tab;
    if(id==="dashboard") btn.textContent=t("home");
    if(id==="entry") btn.textContent=t("entry");
    if(id==="forms") btn.textContent=t("forms");
    if(id==="map") btn.textContent=t("map");
    if(id==="ai") btn.textContent=t("ai");
    if(id==="more") btn.textContent=t("more");
  });
  document.querySelectorAll(".header-logout").forEach(b=>b.textContent=t("logout"));
  document.querySelectorAll(".header-sync").forEach(b=>b.textContent=t("sync"));
}

function openSignaturePad(fieldId, title){
  activeSignatureField = fieldId;
  const modal = document.getElementById("signatureModal");
  const canvas = document.getElementById("signatureCanvas");
  const titleEl = document.getElementById("signatureTitle");
  if(!modal || !canvas) return alert("Signature pad not available.");
  if(titleEl) titleEl.textContent = title || "Signature";
  modal.classList.remove("hidden");
  signatureCtx = canvas.getContext("2d");
  signatureCtx.fillStyle = "white";
  signatureCtx.fillRect(0,0,canvas.width,canvas.height);
  signatureCtx.strokeStyle = "#111827";
  signatureCtx.lineWidth = 4;
  signatureCtx.lineCap = "round";
  signatureCtx.lineJoin = "round";
  const existing = document.getElementById(fieldId)?.value;
  if(existing){
    const img = new Image();
    img.onload = () => signatureCtx.drawImage(img,0,0,canvas.width,canvas.height);
    img.src = existing;
  }
}
function closeSignaturePad(){document.getElementById("signatureModal")?.classList.add("hidden");activeSignatureField=null;}
function clearSignaturePad(){const c=document.getElementById("signatureCanvas");if(c&&signatureCtx){signatureCtx.fillStyle="white";signatureCtx.fillRect(0,0,c.width,c.height);}}
function sigPos(e){const c=document.getElementById("signatureCanvas");const r=c.getBoundingClientRect();const t=e.touches&&e.touches[0]?e.touches[0]:e;return{x:(t.clientX-r.left)*(c.width/r.width),y:(t.clientY-r.top)*(c.height/r.height)}}
function sigStart(e){e.preventDefault();signatureDrawing=true;const p=sigPos(e);signatureCtx.beginPath();signatureCtx.moveTo(p.x,p.y)}
function sigMove(e){if(!signatureDrawing)return;e.preventDefault();const p=sigPos(e);signatureCtx.lineTo(p.x,p.y);signatureCtx.stroke()}
function sigEnd(){signatureDrawing=false}
function saveSignaturePad(){
  const c=document.getElementById("signatureCanvas");
  if(!c||!activeSignatureField)return;
  const data=c.toDataURL("image/png");
  const hidden=document.getElementById(activeSignatureField);
  if(hidden) hidden.value=data;
  const prev=document.getElementById(activeSignatureField+"_preview");
  if(prev) prev.innerHTML=`<img src="${data}" alt="signature">`;
  closeSignaturePad();
}
function initSignaturePad(){
  const c=document.getElementById("signatureCanvas");
  if(!c||c.dataset.ready)return;
  c.dataset.ready="1";
  c.addEventListener("mousedown",sigStart);c.addEventListener("mousemove",sigMove);window.addEventListener("mouseup",sigEnd);
  c.addEventListener("touchstart",sigStart,{passive:false});c.addEventListener("touchmove",sigMove,{passive:false});window.addEventListener("touchend",sigEnd);
}
setTimeout(()=>{initSignaturePad();applyLanguage();},500);

function sigField(label,id){
  return `<div class="signature-box">
    <label>${esc(label)}</label>
    <input type="hidden" id="${id}">
    <div class="signature-preview" id="${id}_preview">${appLang==="mn"?"Гарын үсэг оруулаагүй":"No signature captured"}</div>
    <div class="signature-btn-row">
      <button type="button" onclick="openSignaturePad('${id}','${escAttr(label)}')">${appLang==="mn"?"Гарын үсэг":"Sign"}</button>
      <button type="button" class="secondary" onclick="document.getElementById('${id}').value='';document.getElementById('${id}_preview').innerHTML='${appLang==="mn"?"Гарын үсэг оруулаагүй":"No signature captured"}';">${appLang==="mn"?"Арилгах":"Clear"}</button>
    </div>
  </div>`;
}

function renderSelectedForm(){
  const type=document.getElementById("formType")?.value||"pjo";
  if(type==="pjo") renderPJOForm();
  else if(type==="cascaded") renderCascadingCoachingForm();
  else renderPlaceholderForm(document.getElementById("formType")?.selectedOptions[0]?.textContent||"Form");
}

function renderCascadingCoachingForm(){
  const today=new Date().toISOString().split("T")[0];
  const en=appLang==="en";
  dynamicFormArea.innerHTML=`
  <div class="form-template" id="currentFormPrintable">
    <div class="form-header-dayan">
      <div class="form-logo"><span>D</span>AYAN</div>
      <div class="form-title">
        <h2>${en?"SAFETY CASCADING COACHING":"АЮУЛГҮЙ АЖИЛЛАГААНЫ ШАТАЛСАН КӨҮЧИНГ"}</h2>
        <p>${en?"АЮУЛГҮЙ АЖИЛЛАГААНЫ ШАТАЛСАН КӨҮЧИНГ":"SAFETY CASCADING COACHING"}</p>
      </div>
    </div>
    <div class="form-section"><h3>${en?"Header":"Ерөнхий мэдээлэл"}</h3><div class="form-grid">
      <label>${en?"Date":"Огноо"}<input id="scc_date" type="date" value="${today}"></label>
      <label>${en?"Learner Name":"Суралцагчийн нэр"}<input id="scc_learner"></label>
      <label>${en?"Coach #1":"I көүчийн нэр"}<input id="scc_coach1"></label>
      <label>${en?"Coach #2":"II көүчийн нэр"}<input id="scc_coach2"></label>
      <label>${en?"Department / Team":"Хэлтэс / Баг"}<input id="scc_department"></label>
      <label>${en?"Job Title":"Албан тушаал"}<input id="scc_job_title"></label>
    </div></div>
    <div class="form-section"><h3>${en?"Safety Process Conducted During Coaching":"Көүчингийн явцад хийгдсэн аюулгүй ажиллагааны процесс"}</h3><div class="form-check-grid">
      ${check("scc_process_preshift",en?"Pre-Shift Meeting":"Ээлжийн өмнөх хурал")}
      ${check("scc_process_discussion",en?"Safety Discussion":"Аюулгүй ажиллагааны хэлэлцүүлэг")}
      ${check("scc_process_crm","CRM")}
      ${check("scc_process_ptha",en?"Pre-Task Hazard Assessment":"Ажлын өмнөх аюул эрсдэлийн үнэлгээ")}
      ${check("scc_process_other",en?"Other":"Бусад")}
    </div><label>${en?"Other":"Бусад"}<input id="scc_process_other_text"></label></div>
    <div class="form-section"><h3>${en?"Learner Self-Reflection":"Суралцагчийн өөрийн үнэлгээ"}</h3>
      <label>${en?"What went well? Write 3–4 items.":"Юу сайн болсон бэ? 3–4 зүйл бичнэ үү."}<textarea id="scc_self_went_well"></textarea></label>
      <label>${en?"What would you change or improve? Write 1–2 items.":"Юуг өөрчилж сайжруулах вэ? 1–2 зүйл бичнэ үү."}<textarea id="scc_self_improvements"></textarea></label>
    </div>
    <div class="form-section"><h3>${en?"Coaching Discussion #1":"I Көүчинг хэлэлцүүлэг"}</h3>
      <label>${en?"Coach provides positive feedback. Write 3–4 items which went well.":"Көүч эерэг санал өгнө. Сайн болсон 3–4 зүйлийг бичнэ үү."}<textarea id="scc_discussion1"></textarea></label>
      <label>${en?"What may be done better in the future? Write 1–2 improvements.":"Цаашид юуг сайжруулах вэ? 1–2 сайжруулалт бичнэ үү."}<textarea id="scc_discussion1_improve"></textarea></label>
    </div>
    <div class="form-section"><h3>${en?"Coaching Discussion #2":"II Көүчинг хэлэлцүүлэг"}</h3>
      <label>${en?"Reinforce Coach #1 feedback and add improvement opportunity.":"I көүчийн өгсөн зөвлөмжийг бататгаж, нэмэлт сайжруулах боломжийг бичнэ үү."}<textarea id="scc_discussion2"></textarea></label>
    </div>
    <div class="form-section"><h3>${en?"Summarize Coaching Session":"Көүчингийн дүгнэлт"}</h3>
      <label>${en?"Summarize the conversation and agreed improvement actions.":"Ярилцлагыг нэгтгэн дүгнэж, тохирсон сайжруулалтын ажлуудыг бичнэ үү."}<textarea id="scc_summary"></textarea></label>
      <label>${en?"Key Improvement Actions":"Гол сайжруулах ажлууд"}<textarea id="scc_actions"></textarea></label>
    </div>
    <div class="form-section"><h3>${en?"Signatures":"Гарын үсэг"}</h3><div class="form-grid">
      ${sigField(en?"Learner Signature":"Суралцагчийн гарын үсэг","scc_sig_learner")}
      ${sigField(en?"Coach #1 Signature":"I көүчийн гарын үсэг","scc_sig_coach1")}
      ${sigField(en?"Coach #2 Signature":"II көүчийн гарын үсэг","scc_sig_coach2")}
    </div></div>
    <button type="button" class="save-btn" onclick="saveFillableForm()">${en?"Save Safety Cascading Coaching":"Шаталсан көүчинг хадгалах"}</button>
    <button type="button" class="secondary" onclick="printCurrentForm()">${en?"Print / PDF":"Хэвлэх / PDF"}</button>
  </div>`;
}

function collectCurrentForm(){
  const fields=Array.from(document.querySelectorAll("#currentFormPrintable input,#currentFormPrintable textarea,#currentFormPrintable select"));
  const data={};
  fields.forEach(el=>{
    if(el.type==="checkbox") data[el.id]=el.checked;
    else if(el.type==="radio"){ if(el.checked) data[el.name]=el.value; }
    else if(el.type!=="file") data[el.id]=el.value;
  });
  return data;
}
function saveFillableForm(){
  if(typeof canWrite==="function"&&!canWrite()){alert("Read-only role.");return;}
  const type=document.getElementById("formType")?.value||"pjo";
  const title=document.getElementById("formType")?.selectedOptions[0]?.textContent||"Form";
  savedForms.unshift({id:"form_"+Date.now(),type,title,data:collectCurrentForm(),created_at:new Date().toISOString(),created_by:currentUser?.email||"",role:typeof getRoleName==="function"?getRoleName():""});
  saveFormsLocal();renderSavedForms();alert(title+"\\n"+(appLang==="mn"?"Орон нутгийн санах ойд хадгалсан.":"Saved locally."));
}

function buildSCCPrintHTML(f){
  const d=f.data||{};
  const cb=id=>d[id]?"☑":"☐";
  const sig=id=>d[id]?`<img class="print-signature-img" src="${d[id]}">`:"";
  return `<div>
    <table class="official-print-table">
      <tr><td style="width:22%;font-size:22px;font-weight:900;color:#1e3a8a"><span style="color:#991b1b">D</span>AYAN</td><td colspan="3" style="text-align:center;font-size:16px;font-weight:900">АЮУЛГҮЙ АЖИЛЛАГААНЫ ШАТАЛСАН КӨҮЧИНГ /<br>SAFETY CASCADING COACHING</td></tr>
      <tr class="official-light"><td><b>Огноо / Date</b><br>${esc(d.scc_date)}</td><td><b>Нэр / Name</b><br>${esc(d.scc_learner)}</td><td><b>Гарын үсэг / Signature</b><br>${sig("scc_sig_learner")}</td><td><b>Албан тушаал / Job title</b><br>${esc(d.scc_job_title)}</td></tr>
      <tr><td><b>Суралцагчийн нэр / Name of Learner</b></td><td colspan="3">${esc(d.scc_learner)}</td></tr>
      <tr><td><b>I көүчийн нэр / Name of Coach #1</b></td><td>${esc(d.scc_coach1)}</td><td><b>Signature</b></td><td>${sig("scc_sig_coach1")}</td></tr>
      <tr><td><b>II көүчийн нэр / Name of Coach #2</b></td><td>${esc(d.scc_coach2)}</td><td><b>Signature</b></td><td>${sig("scc_sig_coach2")}</td></tr>
      <tr><td><b>Хэлтэс / Department</b></td><td colspan="3">${esc(d.scc_department)}</td></tr>
      <tr class="official-grey"><td colspan="4">Уулзалтын үеэр аюулгүй ажиллагааны ямар процесс явагдсан бэ? / Which safety process was conducted during the coaching session?</td></tr>
      <tr><td>${cb("scc_process_preshift")} Pre-Shift Meeting</td><td>${cb("scc_process_discussion")} Safety Discussion</td><td>${cb("scc_process_crm")} CRM</td><td>${cb("scc_process_ptha")} Pre-Task Hazard Assessment<br>${cb("scc_process_other")} Other: ${esc(d.scc_process_other_text)}</td></tr>
      <tr class="official-grey"><td colspan="4">Supervisor Self-Reflection / Суралцагчийн өөрийн үнэлгээ</td></tr>
      <tr><td colspan="4"><b>What went well?</b><br>${esc(d.scc_self_went_well)}</td></tr>
      <tr><td colspan="4"><b>Suggested improvements</b><br>${esc(d.scc_self_improvements)}</td></tr>
      <tr class="official-grey"><td colspan="4">I Coaching Discussion / I Көүчинг хэлэлцүүлэг</td></tr>
      <tr><td colspan="4"><b>Positive feedback / What went well</b><br>${esc(d.scc_discussion1)}</td></tr>
      <tr><td colspan="4"><b>Improvements</b><br>${esc(d.scc_discussion1_improve)}</td></tr>
      <tr class="official-grey"><td colspan="4">II Coaching Discussion / II Көүчинг хэлэлцүүлэг</td></tr>
      <tr><td colspan="4">${esc(d.scc_discussion2)}</td></tr>
      <tr class="official-grey"><td colspan="4">Summarize Coaching Session / Көүчингийн дүгнэлт</td></tr>
      <tr><td colspan="4"><b>Summary</b><br>${esc(d.scc_summary)}<br><br><b>Key Improvement Actions</b><br>${esc(d.scc_actions)}</td></tr>
    </table></div>`;
}

function printCurrentForm(){
  const type=document.getElementById("formType")?.value||"pjo";
  const title=document.getElementById("formType")?.selectedOptions[0]?.textContent||"Form";
  const f={type,title,data:collectCurrentForm(),created_at:new Date().toISOString(),created_by:currentUser?.email||""};
  let content="";
  if(type==="cascaded") content=buildSCCPrintHTML(f);
  else if(type==="pjo" && typeof buildPJOPrintHTML==="function") content=buildPJOPrintHTML(f);
  else content=document.getElementById("currentFormPrintable")?.outerHTML||"";
  const win=window.open("","_blank");
  if(!win) return alert("Popup blocked. Allow popups for this site.");
  win.document.write(`<!DOCTYPE html><html><head><title>${esc(title)}</title><style>
    body{font-family:Arial,sans-serif;margin:8px;color:#111}
    .official-print-table{width:100%;border-collapse:collapse;font-size:10.5px;line-height:1.15}
    .official-print-table td,.official-print-table th{border:1px solid #111;padding:4px;vertical-align:top}
    .official-grey{background:#737373!important;color:white!important;font-weight:900}
    .official-light{background:#e5e5e5!important}
    .print-signature-img{max-width:190px;max-height:55px}
    .pjo-print-title{text-align:center;font-weight:900;color:#7f1d1d;font-size:16px}
    .pjo-print-table{width:100%;border-collapse:collapse;font-size:11px}
    .pjo-print-table th,.pjo-print-table td{border:1px solid #222;padding:4px;vertical-align:top}
    @media print{@page{size:A4 landscape;margin:7mm}body{margin:0}}
  </style></head><body>${content}</body></html>`);
  win.document.close();win.focus();setTimeout(()=>win.print(),500);
}

function printSingleSavedForm(id, autoPrint=true){
  const f=savedForms.find(x=>x.id===id);
  if(!f)return alert("Form not found.");
  let content="";
  if(f.type==="cascaded") content=buildSCCPrintHTML(f);
  else if(f.type==="pjo" && typeof buildPJOPrintHTML==="function") content=buildPJOPrintHTML(f);
  else content=`<h1>${esc(f.title)}</h1><pre>${esc(JSON.stringify(f.data,null,2))}</pre>`;
  const win=window.open("","_blank");
  if(!win)return alert("Popup blocked.");
  win.document.write(`<!DOCTYPE html><html><head><title>${esc(f.title)}</title><style>
    body{font-family:Arial,sans-serif;margin:8px;color:#111}
    .official-print-table{width:100%;border-collapse:collapse;font-size:10.5px;line-height:1.15}
    .official-print-table td,.official-print-table th{border:1px solid #111;padding:4px;vertical-align:top}
    .official-grey{background:#737373!important;color:white!important;font-weight:900}
    .official-light{background:#e5e5e5!important}
    .print-signature-img{max-width:190px;max-height:55px}
    .pjo-print-title{text-align:center;font-weight:900;color:#7f1d1d;font-size:16px}
    .pjo-print-table{width:100%;border-collapse:collapse;font-size:11px}
    .pjo-print-table th,.pjo-print-table td{border:1px solid #222;padding:4px;vertical-align:top}
    @media print{@page{size:A4 landscape;margin:7mm}body{margin:0}}
  </style></head><body>${content}</body></html>`);
  win.document.close();win.focus();if(autoPrint)setTimeout(()=>win.print(),500);
}



/* Enterprise 4.0 Build 1 - Stable Document Centre only */
function e40DocNumber(form){
  if(form.doc_number) return form.doc_number;
  const type = String(form.type || "FORM").toUpperCase();
  const prefix = type === "PJO" ? "PJO" : type.includes("CASC") ? "COACH" : type.slice(0,6);
  const year = new Date(form.created_at || Date.now()).getFullYear();
  return `${prefix}-${year}-${String((savedForms || []).indexOf(form)+1).padStart(6,"0")}`;
}
function e40StatusClass(status){
  return "doc-status-" + String(status || "Draft").toLowerCase().replaceAll(" ","-");
}
function renderDocumentCentre(){
  const el = document.getElementById("documentCentreList");
  if(!el) return;

  const docs = (typeof getVisibleForms === "function") ? getVisibleForms() : (savedForms || []);
  el.innerHTML = docs.length ? docs.map(f => `
    <div class="document-card">
      <h3>${esc(e40DocNumber(f))} — ${esc(f.title || "Saved Form")}</h3>
      <div class="doc-meta">
        <span class="doc-pill ${e40StatusClass(f.status)}">${esc(f.status || "Draft")}</span>
        <span class="doc-pill">${esc(f.type || "Form")}</span>
        <span class="doc-pill">${new Date(f.created_at || Date.now()).toLocaleString()}</span>
        <span class="doc-pill">${esc(f.created_by || currentUser?.email || "")}</span>
      </div>
      <div class="doc-actions">
        <button type="button" onclick="e40ViewDocument('${f.id}')">View</button>
        <button type="button" onclick="e40EditDocument('${f.id}')">Edit</button>
        <button type="button" onclick="e40PrintDocument('${f.id}')">Print</button>
        <button type="button" onclick="e40SetStatus('${f.id}','Submitted')">Submit</button>
        <button type="button" onclick="e40SetStatus('${f.id}','Approved')">Approve</button>
      </div>
    </div>
  `).join("") : "<div class='notice'>No saved documents yet.</div>";
}
function e40FindDoc(id){
  return (savedForms || []).find(f => String(f.id) === String(id));
}
function e40ViewDocument(id){
  const f = e40FindDoc(id);
  if(!f) return alert("Document not found.");
  if(typeof viewSavedForm === "function") return viewSavedForm(id);
  alert(`${f.title || "Document"}\\n${JSON.stringify(f.data || {}, null, 2)}`);
}
function e40EditDocument(id){
  if(typeof editSavedForm === "function") return editSavedForm(id);
  alert("Edit is available in the Forms tab.");
}
function e40PrintDocument(id){
  if(typeof printSingleSavedForm === "function") return printSingleSavedForm(id);
  e40ViewDocument(id);
}
function e40SetStatus(id,status){
  const f = e40FindDoc(id);
  if(!f) return alert("Document not found.");
  f.status = status;
  f.status_updated_at = new Date().toISOString();
  f.status_updated_by = currentUser?.email || "";
  if(typeof saveFormsLocal === "function") saveFormsLocal();
  else localStorage.setItem("uds_enterprise_forms", JSON.stringify(savedForms || []));
  renderDocumentCentre();
  if(typeof renderSavedForms === "function") renderSavedForms();
}
function printDocumentRegister(){
  const docs = (typeof getVisibleForms === "function") ? getVisibleForms() : (savedForms || []);
  const rows = docs.map(f => `<tr><td>${esc(e40DocNumber(f))}</td><td>${esc(f.title || "")}</td><td>${esc(f.status || "Draft")}</td><td>${new Date(f.created_at || Date.now()).toLocaleString()}</td><td>${esc(f.created_by || "")}</td></tr>`).join("");
  const win = window.open("", "_blank");
  if(!win) return alert("Popup blocked. Allow popups for this site.");
  win.document.write(`<!DOCTYPE html><html><head><title>Document Register</title><style>body{font-family:Arial;margin:20px}table{width:100%;border-collapse:collapse}td,th{border:1px solid #999;padding:8px;text-align:left}</style></head><body><h1>Document Register</h1><table><tr><th>Document #</th><th>Title</th><th>Status</th><th>Created</th><th>Created By</th></tr>${rows}</table></body></html>`);
  win.document.close();
  setTimeout(() => win.print(), 500);
}

/* Only route docs; do not override login/auth */
const oldRoleAction_e40 = typeof roleAction === "function" ? roleAction : null;
function roleAction(action){
  if(action === "documents" || action === "docs"){
    showTab("documents");
    renderDocumentCentre();
    return;
  }
  if(oldRoleAction_e40) return oldRoleAction_e40(action);
}

const oldShowTab_e40 = typeof showTab === "function" ? showTab : null;
if(oldShowTab_e40){
  showTab = function(id){
    oldShowTab_e40(id);
    if(id === "documents") renderDocumentCentre();
  }
}



/* Enterprise 4.0 Build 2 - Official Print Template Overrides */
function e40v(d,k){ return d && d[k] ? d[k] : ""; }
function e40cb(v){ return v ? "☑" : "☐"; }
function e40sig(d,k){ return d && d[k] ? `<img class="print-signature-img" src="${d[k]}">` : ""; }
function e40yn(d,k){
  return {
    yes: d && d[k] === "Yes" ? "☑" : "☐",
    no: d && d[k] === "No" ? "☑" : "☐"
  };
}
function e40safe(text){
  return typeof esc === "function" ? esc(text || "") : String(text || "").replace(/[&<>"']/g, m => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
}

function buildPJOPrintHTML(f){
  const d = f.data || {};
  const yn = k => e40yn(d, k);
  const row = (num, mn, en, key, yesno=true, h=44) => {
    const ans = yn("pjo_" + key);
    return `<tr>
      <td style="width:7%;text-align:center;font-weight:900">${num}</td>
      <td style="width:63%;height:${h}px"><b>${mn}</b><br>${en}<br><span style="font-size:9px">${e40safe(d["pjo_"+key+"_comment"])}</span></td>
      <td style="width:15%;text-align:center">${yesno ? `<span class="official-check">${ans.yes}</span><br>Тийм / Yes` : ""}</td>
      <td style="width:15%;text-align:center">${yesno ? `<span class="official-check">${ans.no}</span><br>Үгүй / No` : ""}</td>
    </tr>`;
  };

  const reason = `
    ${e40cb(d.pjo_reason_procedure)} Ажлын журам / Job Procedure/Practice Update&nbsp;&nbsp;
    ${e40cb(d.pjo_reason_injury)} Ажилтай холбоотой осол / Recent injury associated with job/task&nbsp;&nbsp;
    ${e40cb(d.pjo_reason_training)} Сургалтын мөрөөр / Training follow-up&nbsp;&nbsp;
    ${e40cb(d.pjo_reason_experienced)} Туршлагатай ажилтны шалгалт / Experienced worker check&nbsp;&nbsp;
    ${e40cb(d.pjo_reason_other)} Бусад / Other: ${e40safe(d.pjo_reason_other_text)}
  `;

  const consider = `
  <table class="official-table">
    <tr class="official-grey"><td colspan="4">ДАРААХ ЗҮЙЛСИЙГ АЖИГЛАЛТ ХИЙХДЭЭ АНХААРНА УУ / PLEASE CONSIDER THE FOLLOWING WHILE OBSERVING</td></tr>
    <tr>
      <td><b>ХҮМҮҮС / People</b><br>5 Point Safety System<br>Procedures and Practices<br>PPE<br>Ergonomics<br>Previous Incidents<br>Special Rules<br>Training Requirements</td>
      <td><b>МАТЕРИАЛ / Material</b><br>Handling<br>Procedures<br>Safe Storage<br>WHMIS Requirements</td>
      <td><b>ТӨХӨӨРӨМЖ / Equipment / Tools</b><br>Pre-Use Checks<br>Legislation<br>Maintenance<br>Guarding<br>Electrical Hazards<br>Suitable for the Job<br>Availability<br>Lock Out / Tag Out</td>
      <td><b>БАЙГАЛЬ ОРЧИН / Environment</b><br>Fire Hazards<br>Emergency Exits<br>Dust / Gas / Noise<br>Housekeeping<br>Lighting<br>Emergency<br>First Aid Supplies<br>Eye Wash<br>Fire Extinguishers</td>
    </tr>
  </table>`;

  return `
  <div class="official-print-root">
    <div class="official-page">
      <table class="official-table">
        <tr>
          <td style="width:23%" class="official-logo"><span>D</span>AYAN</td>
          <td colspan="3" class="official-title">АЖЛЫН ТӨЛӨВЛӨГӨӨТ АЖИГЛАЛТ<br>PLANNED JOB OBSERVATION</td>
        </tr>
        <tr>
          <td colspan="2"><b>Ажлын байр / Workplace</b><br>${e40safe(d.pjo_workplace)}</td>
          <td colspan="2"><b>Ажиглалт хийсэн огноо / Date of observation</b><br>${e40safe(d.pjo_date)}</td>
        </tr>
        <tr><td colspan="4"><b>Ажиглалт хийх шалтгаан / Reason for observation</b><br>${reason}</td></tr>
        <tr>
          <td><b>Ажиглалтын төрөл / Type of observation</b><br>${e40cb(d.pjo_type_performance)} Performance Demonstration<br>${e40cb(d.pjo_type_followup)} Follow-up</td>
          <td><b>Ажигласан ажил / Job/task observed</b><br>${e40safe(d.pjo_task)}</td>
          <td><b>Журмын нэр/дугаар / Procedure name and #</b><br>${e40safe(d.pjo_procedure)}</td>
          <td><b>Журмыг хянасан уу? / Procedure reviewed?</b><br>${yn("pjo_procedure_reviewed").yes} Yes &nbsp; ${yn("pjo_procedure_reviewed").no} No</td>
        </tr>
        <tr class="official-grey"><td colspan="4">АЖИГЛАЛТ ХИЙХ АЖИЛТАН / WORKER(S) TO BE OBSERVED</td></tr>
        <tr class="official-light">
          <td><b>Ажилтан #1 / Worker #1</b><br>${e40safe(d.pjo_emp1_name)}</td>
          <td><b>Мэргэжил / Occupation</b><br>${e40safe(d.pjo_emp1_occupation)}</td>
          <td><b>Туршлага / Experience</b><br>${e40safe(d.pjo_emp1_experience)}</td>
          <td><b>Сургагдсан уу? / Trained & licensed?</b><br>${yn("pjo_trained").yes} Yes &nbsp; ${yn("pjo_trained").no} No</td>
        </tr>
        <tr class="official-light">
          <td><b>Ажилтан #2 / Worker #2</b><br>${e40safe(d.pjo_emp2_name)}</td>
          <td><b>Мэргэжил / Occupation</b><br>${e40safe(d.pjo_emp2_occupation)}</td>
          <td><b>Туршлага / Experience</b><br>${e40safe(d.pjo_emp2_experience)}</td>
          <td><b>Сургалтын бүртгэл шалгасан уу? / Training records verified?</b><br>${yn("pjo_training_records").yes} Yes &nbsp; ${yn("pjo_training_records").no} No</td>
        </tr>
        <tr class="official-grey"><td colspan="4">АЖИГЛАЛТУУД / OBSERVATIONS</td></tr>
      </table>
      <table class="official-table">
        ${row(1,"Хүн гэмтэх эсвэл осолд дөхсөн тохиолдолд хүргэж болох нөхцөл ажиглагдсан уу?","Could any practices or conditions observed result in personal injury or near miss?","q1")}
        ${row(2,"Эд хөрөнгийн хохирол учруулж болох нөхцөл ажиглагдсан уу?","Could any practices or conditions observed result in property damage?","q2")}
        ${row(3,"Холбогдох журам, стандартыг мөрдсөн байсан уу?","Were all applicable procedures/standards followed during the observation?","q3")}
        ${row(4,"Журам/стандартын гол заалтууд юу байсан бэ?","What key points in the procedure/standard were noticed during the observation?","q4",false,48)}
        ${row(5,"Ажилтанд эерэг үнэлгээ өгсөн үү?","Was any positive recognition given to the employee(s) following the observation?","q5")}
        ${row(6,"Залруулах мэдээлэл, зааварчилгаа өгсөн үү?","Was any corrective information and instruction given to the employee(s)?","q6")}
        ${row(7,"Үр ашиг, бүтээмжийг сайжруулах боломж байна уу?","Do the methods and practices need review for efficiency and production capability?","q7")}
      </table>
      <div class="print-footer"><span>SAFETY - FIRST, LAST, AND ALWAYS</span><span>Page 1 of 2</span></div>
    </div>

    <div class="official-page">
      <table class="official-table">
        <tr><td class="official-logo"><span>D</span>AYAN</td><td colspan="3" class="official-title">АЖЛЫН ТӨЛӨВЛӨГӨӨТ АЖИГЛАЛТ<br>PLANNED JOB OBSERVATION</td></tr>
        <tr class="official-grey"><td colspan="4">АЖИГЛАЛТУУДЫН ҮРГЭЛЖЛЭЛ / OBSERVATIONS CONTINUED</td></tr>
      </table>
      <table class="official-table">
        ${row(8,"Аюулгүй ажиллагааг сайжруулахын тулд юуг өөрчлөх шаардлагатай вэ?","What should we consider changing in the interest of safety? Ask employee(s) for input.","q8",false,62)}
        ${row(9,"Нэмэлт санал/ажиглалт","Additional comments / observations.","q9",false,62)}
        ${row(10,"Журмыг шинэчлэх шаардлагатай юу?","Do procedures need to be revised? If yes, how?","q10",true,52)}
        <tr>
          <td colspan="2"><b>Ажиглалтын хугацаа / Duration of observation</b><br>${e40safe(d.pjo_duration)}</td>
          <td><b>Эхлэх / Start</b><br>${e40safe(d.pjo_start_time)}</td>
          <td><b>Дуусах / Stop</b><br>${e40safe(d.pjo_stop_time)}</td>
        </tr>
        <tr>
          <td colspan="2"><b>Дараах мөрдөх зөвлөмж / Recommended follow-up</b><br>${e40safe(d.pjo_followup)}</td>
          <td><b>Хариуцах эзэн / Responsible person</b><br>${e40safe(d.pjo_responsible)}</td>
          <td><b>Дуусах огноо / Due date</b><br>${e40safe(d.pjo_due_date)}</td>
        </tr>
      </table>
      ${consider}
      <table class="official-table" style="margin-top:12px;border:0">
        <tr><td style="border:0;text-align:center"><div class="print-line">${e40safe(d.pjo_emp1_name)}</div>Worker #1 Name</td><td style="border:0;text-align:center"><div class="print-line">${e40sig(d,"pjo_sig_emp1")}</div>Worker #1 Signature</td></tr>
        <tr><td style="border:0;text-align:center"><div class="print-line">${e40safe(d.pjo_emp2_name)}</div>Worker #2 Name</td><td style="border:0;text-align:center"><div class="print-line">${e40sig(d,"pjo_sig_emp2")}</div>Worker #2 Signature</td></tr>
        <tr><td style="border:0;text-align:center"><div class="print-line">${e40safe(d.pjo_observer)}</div>Observer / Crew Trainer Name</td><td style="border:0;text-align:center"><div class="print-line">${e40sig(d,"pjo_sig_observer")}</div>Observer / Crew Trainer Signature</td></tr>
        <tr><td style="border:0;text-align:center"><div class="print-line">${e40safe(d.pjo_supervisor)}</div>Supervisor Name</td><td style="border:0;text-align:center"><div class="print-line">${e40sig(d,"pjo_sig_supervisor")}</div>Supervisor Signature</td></tr>
        <tr><td style="border:0;text-align:center"><div class="print-line"></div>Superintendent / Area Manager Name</td><td style="border:0;text-align:center"><div class="print-line">${e40sig(d,"pjo_sig_manager")}</div>Superintendent / Area Manager Signature</td></tr>
        <tr><td style="border:0;text-align:center"><div class="print-line"></div>Safety Coordinator Name</td><td style="border:0;text-align:center"><div class="print-line">${e40sig(d,"pjo_sig_safety")}</div>Safety Coordinator Signature</td></tr>
      </table>
      <div class="print-footer"><span>SAFETY - FIRST, LAST, AND ALWAYS</span><span>Page 2 of 2</span></div>
    </div>
  </div>`;
}

function buildSCCPrintHTML(f){
  const d = f.data || {};
  return `
  <div class="official-print-root">
    <div class="official-page">
      <table class="official-table">
        <tr>
          <td style="border:0;width:22%" class="official-logo"><span>D</span>AYAN</td>
          <td colspan="3" style="border:0" class="official-title">АЮУЛГҮЙ АЖИЛЛАГААНЫ ШАТАЛСАН КӨҮЧИНГ/<br>SAFETY CASCADING COACHING</td>
        </tr>
        <tr class="official-light">
          <td><b>Огноо / Date</b><br>${e40safe(d.scc_date)}</td>
          <td><b>Нэр / Name</b></td>
          <td><b>Гарын үсэг / Signature</b></td>
          <td><b>Албан тушаал / Job title</b><br>${e40safe(d.scc_job_title)}</td>
        </tr>
        <tr><td><b>Суралцагчийн нэр / Name of Learner</b></td><td>${e40safe(d.scc_learner)}</td><td>${e40sig(d,"scc_sig_learner")}</td><td></td></tr>
        <tr><td><b>I көүчийн нэр / Name of Coach #1</b></td><td>${e40safe(d.scc_coach1)}</td><td>${e40sig(d,"scc_sig_coach1")}</td><td></td></tr>
        <tr><td><b>II көүчийн нэр / Name of Coach #2</b></td><td>${e40safe(d.scc_coach2)}</td><td>${e40sig(d,"scc_sig_coach2")}</td><td></td></tr>
        <tr><td><b>Хэлтэс / Department<br>Багийн нэр / Team Name</b></td><td colspan="3">${e40safe(d.scc_department)} ${e40safe(d.scc_team)}</td></tr>
        <tr class="official-grey"><td colspan="4">Уулзалтын үеэр аюулгүй ажиллагааны ямар процесс явагдсан бэ? / Which safety process was conducted during the coaching session?</td></tr>
        <tr>
          <td>${e40cb(d.scc_process_preshift)} Ээлжийн өмнөх хурал / Pre-Shift Meeting</td>
          <td>${e40cb(d.scc_process_discussion)} Аюулгүй ажиллагааны хэлэлцүүлэг / Safety Discussion</td>
          <td>${e40cb(d.scc_process_crm)} НЭУ / CRM</td>
          <td>${e40cb(d.scc_process_ptha)} Ажлын өмнөх аюул эрсдэлийн үнэлгээ / Pre-Task Hazard Assessment<br>${e40cb(d.scc_process_other)} Бусад / Other: ${e40safe(d.scc_process_other_text)}</td>
        </tr>
        <tr class="official-grey"><td colspan="4">Ахлах ажилтан, таны хувьд дээрхээс аль процесс нь сайн явагдсан бэ? / Supervisor, what went well?</td></tr>
        <tr><td colspan="4" style="height:150px">${e40safe(d.scc_self_went_well)}</td></tr>
        <tr class="official-grey"><td colspan="4">Ахлах ажилтан өөртөө анализ хийх / Supervisor Self-analysis: Identify 1-2 opportunities from the items above.</td></tr>
        <tr><td colspan="4" style="height:150px">${e40safe(d.scc_self_improvements)}</td></tr>
      </table>
      <div class="print-footer"><span></span><span>Page 1 of 2</span></div>
    </div>

    <div class="official-page">
      <table class="official-table">
        <tr>
          <td style="border:0;width:22%" class="official-logo"><span>D</span>AYAN</td>
          <td colspan="3" style="border:0" class="official-title">АЮУЛГҮЙ АЖИЛЛАГААНЫ ШАТАЛСАН КӨҮЧИНГ/<br>SAFETY CASCADING COACHING</td>
        </tr>
        <tr class="official-grey"><td colspan="4">I КӨҮЧИЙН ХЭЛЭЛЦҮҮЛЭГ / 1 COACHING DISCUSSION:</td></tr>
        <tr><td colspan="4">Суралцагчаас өөрийн удирдсан аюулгүй ажиллагааны процессийн талаар санал бодлыг асуу. / Ask the Learner to self-reflect and provide feedback on the safety process.</td></tr>
        <tr><td colspan="4" style="height:155px">${e40safe(d.scc_discussion1)}</td></tr>
        <tr><td colspan="4"><b>COACH:</b> Цаашид юуг сайжруулах вэ? / What may the learner do in the future to become even better?</td></tr>
        <tr><td colspan="4" style="height:95px">${e40safe(d.scc_discussion1_improve)}</td></tr>
        <tr class="official-grey"><td colspan="4">II КӨҮЧИЙН ХЭЛЭЛЦҮҮЛЭГ / 2 COACHING DISCUSSION:</td></tr>
        <tr><td colspan="4">I көүчийн өгсөн зөвлөмжийг бататгаж нэмэлт санал өгнө. / Reinforce Coach #1 and provide additional feedback.</td></tr>
        <tr><td colspan="4" style="height:135px">${e40safe(d.scc_discussion2)}</td></tr>
        <tr class="official-grey"><td colspan="4">КӨҮЧИНГИЙН ДҮГНЭЛТ / SUMMARIZE COACHING SESSION:</td></tr>
        <tr><td colspan="4">I көүч нь яриаг нэгтгэн дүгнэж, сайжруулах ажлуудыг тохирно. / Coach #1 summarizes the conversation and agrees on key improvement actions.</td></tr>
        <tr><td colspan="4" style="height:140px">${e40safe(d.scc_summary)}<br><br><b>Key actions:</b><br>${e40safe(d.scc_actions)}</td></tr>
      </table>
      <div class="print-footer"><span></span><span>Page 2 of 2</span></div>
    </div>
  </div>`;
}

function printHTML(title,content){
  const win = window.open("", "_blank");
  if(!win) return alert("Popup blocked. Allow popups for this site.");
  win.document.write(`<!DOCTYPE html><html><head><meta charset="utf-8"><title>${e40safe(title)}</title><style>
    body{font-family:Arial,"Noto Sans",sans-serif;margin:0;color:#000;background:white}
    .official-page{box-sizing:border-box;width:100%;min-height:calc(297mm - 14mm);page-break-after:always}
    .official-page:last-child{page-break-after:auto}
    .official-table{width:100%;border-collapse:collapse;table-layout:fixed;font-size:9.6px;line-height:1.12;color:#000}
    .official-table td,.official-table th{border:1px solid #111;padding:3px;vertical-align:top;word-wrap:break-word}
    .official-title{text-align:center;font-weight:900;font-size:16px}.official-logo{font-size:24px;font-weight:900;color:#1e3a8a}.official-logo span{color:#991b1b}
    .official-grey{background:#6f6f6f!important;color:#fff!important;font-weight:900;-webkit-print-color-adjust:exact;print-color-adjust:exact}
    .official-light{background:#e5e5e5!important;-webkit-print-color-adjust:exact;print-color-adjust:exact}
    .official-check{font-size:13px;font-weight:900}.print-signature-img{max-width:180px;max-height:45px}.print-line{border-bottom:1px solid #111;height:34px;text-align:center}
    .print-footer{display:flex;justify-content:space-between;align-items:center;margin-top:6px;font-size:10px;font-weight:900}
    @media print{@page{size:A4 portrait;margin:7mm}body{margin:0!important;background:white!important}}
  </style></head><body>${content}</body></html>`);
  win.document.close();
  win.focus();
  setTimeout(()=>win.print(),500);
}

function printCurrentForm(){
  const type=document.getElementById("formType")?.value||"pjo";
  const title=document.getElementById("formType")?.selectedOptions[0]?.textContent||"Form";
  const f={type,title,data:collectCurrentForm ? collectCurrentForm() : {}};
  const content=type==="cascaded"?buildSCCPrintHTML(f):buildPJOPrintHTML(f);
  printHTML(title,content);
}

function printSingleSavedForm(id){
  const f=(savedForms||[]).find(x=>String(x.id)===String(id));
  if(!f) return alert("Document not found.");
  const content=f.type==="cascaded"?buildSCCPrintHTML(f):buildPJOPrintHTML(f);
  printHTML(f.doc_number||f.title||"Document",content);
}



/* Enterprise 4.0 Build 3 - navigation + cascaded coaching */
function b3safe(x){return typeof esc==="function"?esc(x||""):String(x||"").replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));}
function b3cb(v){return v?"☑":"☐";}
function b3sig(d,k){return d&&d[k]?`<img class="print-signature-img" src="${d[k]}">`:"";}
function b3val(d,k){return d&&d[k]?d[k]:"";}

function openUsersRoles(){showTab("adminUsersRoles");renderUsersRoles();}
function openDatabaseHealth(){showTab("databaseHealth");renderDatabaseHealth();}
function openAllRecords(){showTab("allRecords");renderAllRecords();}
function openDeveloperViewAs(){showTab("dashboard");if(typeof renderDevRolePreview==="function")renderDevRolePreview();}
function openAllEntries(){showTab("entriesRegister");if(typeof renderEntriesRegister==="function")renderEntriesRegister();}
function openAllForms(){showTab("documents");if(typeof renderDocumentCentre==="function")renderDocumentCentre();}
function openAllPhotos(){showTab("gallery");if(typeof renderGallery==="function")renderGallery();}
function openExecutiveTrends(){showTab("ai");}
function openAdminTools(){showTab("admin");}

const b3OldRoleAction=typeof roleAction==="function"?roleAction:null;
function roleAction(action){
 if(action==="usersRoles"||action==="users"||action==="roles")return openUsersRoles();
 if(action==="databaseHealth"||action==="database")return openDatabaseHealth();
 if(action==="allRecords"||action==="records")return openAllRecords();
 if(action==="developerViewAs"||action==="viewAs")return openDeveloperViewAs();
 if(action==="documents"||action==="formsReview"||action==="allForms")return openAllForms();
 if(action==="entries"||action==="allEntries"||action==="dashboard")return openAllEntries();
 if(action==="gallery"||action==="allPhotos")return openAllPhotos();
 if(action==="ai"||action==="trends"||action==="executiveTrends")return openExecutiveTrends();
 if(action==="admin"||action==="adminTools")return openAdminTools();
 if(b3OldRoleAction)return b3OldRoleAction(action);
}

function applyRoleView(){
 const role=typeof getRoleName==="function"?getRoleName():"Supervisor";
 const title=document.getElementById("roleDashboardTitle"),sub=document.getElementById("roleDashboardSubtitle"),panel=document.getElementById("roleViewPanel"),scope=document.getElementById("roleScopePanel");
 if(!title||!panel)return;
 const cfgs={
  Supervisor:{title:"Supervisor Dashboard",sub:"Create entries, complete official forms and manage your own records.",actions:[["Development Entry","entry"],["Official Forms","forms"],["My Documents","documents"],["My Entries","entries"]],scope:[["Own Entries","entries"],["Own Documents","documents"],["Own Photos","gallery"],["Own Actions","actions"]]},
  Superintendent:{title:"Superintendent Dashboard",sub:"Review area entries, documents, photos, actions and daily trends.",actions:[["Area Entries","entries"],["Document Centre","documents"],["Forms Review","documents"],["Open Actions","actions"]],scope:[["Area Entries","entries"],["Area Documents","documents"],["Area Photos","gallery"],["KPI / Delays","entries"]]},
  Manager:{title:"Manager Dashboard",sub:"Department-wide production, official documents, reports and AI trends.",actions:[["All Entries","entries"],["Document Centre","documents"],["All Forms","documents"],["All Photos","gallery"],["AI Executive Summary","ai"]],scope:[["All Entries","entries"],["All Documents","documents"],["All Photos","gallery"],["Executive Trends","ai"]]},
  Admin:{title:"Admin Dashboard",sub:"System administration, users, roles, database health and all official records.",actions:[["Users / Roles","usersRoles"],["Database Health","databaseHealth"],["All Records","allRecords"],["Document Centre","documents"],["Developer View-As","developerViewAs"],["Admin Tools","admin"]],scope:[["Users / Roles","usersRoles"],["Database Health","databaseHealth"],["All Records","allRecords"],["Developer View-As","developerViewAs"]]}
 };
 const cfg=cfgs[role]||cfgs.Supervisor;
 title.textContent=cfg.title;sub.textContent=cfg.sub;
 panel.innerHTML=`<div class="role-banner"><h3>${b3safe(role)} View${typeof previewRole!=="undefined"&&previewRole?" (Preview)":""}</h3><p>${b3safe(cfg.sub)}</p><div class="role-list">${cfg.actions.map(a=>`<button type="button" class="role-action-btn" onclick="roleAction('${a[1]}')">${b3safe(a[0])}</button>`).join("")}</div></div>`;
 if(scope)scope.innerHTML=`<div class="scope-grid">${cfg.scope.map(s=>`<button type="button" class="scope-card-btn" onclick="roleAction('${s[1]}')"><b>${b3safe(s[0])}</b><span>${b3safe(role)} access</span></button>`).join("")}</div><p><button type="button" class="role-permission-tag" onclick="roleAction('forms')">Create Forms</button><button type="button" class="role-permission-tag" onclick="roleAction('entries')">Crew / Area View</button><button type="button" class="role-permission-tag" onclick="roleAction('allRecords')">All Records</button><button type="button" class="role-permission-tag" onclick="roleAction('adminTools')">Admin Tools</button></p>`;
}

function renderUsersRoles(){
 const el=document.getElementById("usersRolesPanel");if(!el)return;
 el.innerHTML=`<div class="console-card"><h3>Users / Roles</h3><p>Current login: <b>${b3safe(currentUser?.email||"")}</b></p><div class="console-grid"><button class="console-button" onclick="showTab('admin')">Open Admin User Tools<span>Create users, assign roles, disable access.</span></button><button class="console-button" onclick="openDeveloperViewAs()">Developer View-As<span>Preview Manager, Superintendent and Supervisor views.</span></button><button class="console-button" onclick="openDatabaseHealth()">Database Health<span>Counts and app status.</span></button><button class="console-button" onclick="openAllRecords()">All Records<span>Entries, forms and actions.</span></button></div></div>`;
}
function renderDatabaseHealth(){
 const el=document.getElementById("databaseHealthPanel");if(!el)return;
 const ec=Array.isArray(window.entries)?window.entries.length:(typeof entries!=="undefined"&&Array.isArray(entries)?entries.length:0);
 const fc=typeof savedForms!=="undefined"&&Array.isArray(savedForms)?savedForms.length:0;
 const ac=typeof actions!=="undefined"&&Array.isArray(actions)?actions.length:0;
 el.innerHTML=`<div class="console-card"><h3>Database / App Health</h3><div class="console-grid"><div class="scope-card"><b>${ec}</b><span>Entries</span></div><div class="scope-card"><b>${fc}</b><span>Forms / Documents</span></div><div class="scope-card"><b>${ac}</b><span>Actions</span></div><div class="scope-card"><b>4.0 Build 3</b><span>App Version</span></div></div><p><b>Login:</b> ${b3safe(currentUser?.email||"Not signed in")}</p></div>`;
}
function renderAllRecords(){
 const el=document.getElementById("allRecordsPanel");if(!el)return;
 const q=(document.getElementById("allRecordsSearch")?.value||"").toLowerCase(), rec=[];
 if(typeof entries!=="undefined"&&Array.isArray(entries))entries.forEach((e,i)=>rec.push({kind:"Entry",title:e.heading||e.heading_drive||"Development Entry",date:e.date||e.entry_date||e.created_at||"",text:JSON.stringify(e),open:`openEntryReport&&openEntryReport('${b3safe(String(e.id||e.local_id||e.created_at||i))}')`}));
 if(typeof savedForms!=="undefined"&&Array.isArray(savedForms))savedForms.forEach(f=>rec.push({kind:"Form",title:(f.doc_number?f.doc_number+" — ":"")+(f.title||"Saved Form"),date:f.created_at||"",text:JSON.stringify(f),open:`e40ViewDocument?e40ViewDocument('${f.id}'):viewSavedForm('${f.id}')`}));
 const out=rec.filter(r=>!q||(r.kind+" "+r.title+" "+r.date+" "+r.text).toLowerCase().includes(q));
 el.innerHTML=out.length?out.map(r=>`<div class="record-card"><h3>${b3safe(r.title)}</h3><div class="doc-meta"><span class="doc-pill">${b3safe(r.kind)}</span><span class="doc-pill">${b3safe(r.date)}</span></div><button onclick="${r.open}">Open Record</button></div>`).join(""):"<div class='notice'>No matching records.</div>";
}

function renderSCCForm(){
 const today=new Date().toISOString().split("T")[0];
 dynamicFormArea.innerHTML=`<div class="form-template" id="currentFormPrintable"><div class="form-header-dayan"><div class="form-logo"><span>D</span>AYAN</div><div class="form-title"><h2>АЮУЛГҮЙ АЖИЛЛАГААНЫ ШАТАЛСАН КӨҮЧИНГ</h2><p>SAFETY CASCADING COACHING</p></div></div><div class="form-section"><h3>Header / Ерөнхий мэдээлэл</h3><div class="form-grid"><label>Огноо / Date<input id="scc_date" type="date" value="${today}"></label><label>Суралцагчийн нэр / Name of Learner<input id="scc_learner"></label><label>Суралцагчийн албан тушаал / Learner Job Title<input id="scc_learner_job_title"></label><label>I көүчийн нэр / Name of Coach #1<input id="scc_coach1"></label><label>I көүчийн албан тушаал / Coach #1 Job Title<input id="scc_coach1_job_title"></label><label>II көүчийн нэр / Name of Coach #2<input id="scc_coach2"></label><label>II көүчийн албан тушаал / Coach #2 Job Title<input id="scc_coach2_job_title"></label><label>Хэлтэс / Department<input id="scc_department"></label><label>Багийн нэр / Team Name<input id="scc_team"></label></div></div><div class="form-section"><h3>Safety Process</h3><div class="form-check-grid">${typeof check==="function"?check("scc_process_preshift","Ээлжийн өмнөх хурал / Pre-Shift Meeting"):""}${typeof check==="function"?check("scc_process_discussion","Аюулгүй ажиллагааны хэлэлцүүлэг / Safety Discussion"):""}${typeof check==="function"?check("scc_process_crm","НЭУ / CRM"):""}${typeof check==="function"?check("scc_process_ptha","Ажлын өмнөх аюул эрсдэлийн үнэлгээ / Pre-Task Hazard Assessment"):""}${typeof check==="function"?check("scc_process_other","Бусад / Other"):""}</div><label>Бусад / Other<input id="scc_process_other_text"></label></div><div class="form-section"><label>Supervisor, what went well?<textarea id="scc_self_went_well"></textarea></label><label>Supervisor Self-analysis: suggested improvements<textarea id="scc_self_improvements"></textarea></label><label>1 Coaching Discussion<textarea id="scc_discussion1"></textarea></label><label>Coach: suggested improvements<textarea id="scc_discussion1_improve"></textarea></label><label>2 Coaching Discussion<textarea id="scc_discussion2"></textarea></label><label>Summarize Coaching Session<textarea id="scc_summary"></textarea></label><label>Key Improvement Actions<textarea id="scc_actions"></textarea></label></div><div class="form-section"><h3>Signatures</h3><div class="form-grid">${typeof sigField==="function"?sigField("Learner Signature","scc_sig_learner"):""}${typeof sigField==="function"?sigField("Coach #1 Signature","scc_sig_coach1"):""}${typeof sigField==="function"?sigField("Coach #2 Signature","scc_sig_coach2"):""}</div></div><button type="button" class="save-btn" onclick="saveFillableForm()">Save Safety Cascading Coaching</button><button type="button" class="secondary" onclick="printCurrentForm()">Official Print / PDF</button></div>`;
}
const b3OldRenderSelectedForm=typeof renderSelectedForm==="function"?renderSelectedForm:null;
function renderSelectedForm(){const type=document.getElementById("formType")?.value||"pjo";if(type==="cascaded")return renderSCCForm();if(b3OldRenderSelectedForm)return b3OldRenderSelectedForm();}

function buildSCCPrintHTML(f){
 const d=f.data||{}, learnerJob=d.scc_learner_job_title||d.scc_job_title||"";
 return `<div class="official-print-root"><div class="official-page"><table class="official-table"><tr><td style="border:0;width:22%" class="official-logo"><span>D</span>AYAN</td><td colspan="3" style="border:0" class="official-title">АЮУЛГҮЙ АЖИЛЛАГААНЫ ШАТАЛСАН КӨҮЧИНГ/<br>SAFETY CASCADING COACHING</td></tr><tr class="official-light"><td><b>Огноо / Date</b><br>${b3safe(d.scc_date)}</td><td><b>Нэр / Name</b></td><td><b>Гарын үсэг / Signature</b></td><td><b>Албан тушаал / Job title</b></td></tr><tr><td><b>Суралцагчийн нэр/<br>Name of Learner</b></td><td>${b3safe(d.scc_learner)}</td><td>${b3sig(d,"scc_sig_learner")}</td><td>${b3safe(learnerJob)}</td></tr><tr><td><b>I көүчийн нэр/<br>Name of Coach #1</b></td><td>${b3safe(d.scc_coach1)}</td><td>${b3sig(d,"scc_sig_coach1")}</td><td>${b3safe(d.scc_coach1_job_title)}</td></tr><tr><td><b>II көүчийн нэр/<br>Name of Coach #2</b></td><td>${b3safe(d.scc_coach2)}</td><td>${b3sig(d,"scc_sig_coach2")}</td><td>${b3safe(d.scc_coach2_job_title)}</td></tr><tr><td><b>Хэлтэс/ Department<br>Багийн нэр/ Team Name</b></td><td colspan="3">${b3safe(d.scc_department)} ${b3safe(d.scc_team)}</td></tr></table><table class="official-table" style="margin-top:12px"><tr class="official-grey"><td colspan="5">Уулзалтын үеэр аюулгүй ажиллагааны ямар процесс явагдсан бэ? (Холбогдох нүдийг чагталж эсвэл тайлбарлаж бич)<br>Which safety process was conducted during the coaching session? (Mark a box or write in)</td></tr><tr><td>${b3cb(d.scc_process_preshift)} Ээлжийн өмнөх хурал/<br>Pre-Shift Meeting:</td><td>${b3cb(d.scc_process_discussion)} Аюулгүй ажиллагааны хэлэлцүүлэг/<br>Safety Discussion:</td><td>${b3cb(d.scc_process_crm)} НЭУ/ CRM:</td><td>${b3cb(d.scc_process_ptha)} Ажлын өмнөх аюул эрсдэлийн үнэлгээ/<br>Pre-Task Hazard Assessment:</td><td>${b3cb(d.scc_process_other)} Бусад/ Other:<br>${b3safe(d.scc_process_other_text)}</td></tr><tr class="official-grey"><td colspan="5">Ахлах ажилтан, таны хувьд дээрхээс аль процесс нь сайн явагдсан бэ? Үүний дараа “Уулзалтын үеэр аль нь буюу ямар үйл явц нь сайн явагдсан бэ?” гэж өөрөөсөө асуу. (Сайн явагдсан 3-4 зүйлийг тодорхойлж бич)<br>Supervisor, what went well? Upon completion of the Safety Process, ask yourself: “What key elements or behaviors do you believe went well during the safety process?” (Write below 3-4 self-feedback items which went well)</td></tr><tr><td colspan="5" style="height:155px">${b3safe(d.scc_self_went_well)}</td></tr><tr class="official-grey"><td colspan="5">Ахлах ажилтан, өөртөө анализ хийх: Дээрхээс өөрөөр юу илүү сайн байх боломж байсныг 1-2 жишээгээр тодорхойлж бич. Аюулгүй ажиллагааны процессыг сайжруулахын тулд цаашдаа юуг өөрчлөхөөр байна, юуг өөрөөр хийхээр байгаагаа тодорхойлж бич. (Санал болгох 1-2 сайжруулалтыг бич)<br>Supervisor, Self-analysis: Identify 1-2 opportunities within What Went Well items above, which could be even better if something were done differently. Write below what would you change, or do differently in the future during similar safety processes to be even better? (Write below 1-2 suggested improvements)</td></tr><tr><td colspan="5" style="height:160px">${b3safe(d.scc_self_improvements)}</td></tr></table><div class="print-footer"><span></span><span>Page 1 of 2</span></div></div><div class="official-page"><table class="official-table"><tr><td style="border:0;width:22%" class="official-logo"><span>D</span>AYAN</td><td colspan="3" style="border:0" class="official-title">АЮУЛГҮЙ АЖИЛЛАГААНЫ ШАТАЛСАН КӨҮЧИНГ/<br>SAFETY CASCADING COACHING</td></tr></table><table class="official-table" style="margin-top:12px"><tr class="official-grey"><td>I КӨҮЧИЙН ХЭЛЭЛЦҮҮЛЭГ/ 1 COACHING DISCUSSION:</td></tr><tr><td>Суралцагчаас өөрийн удирдаж явуулсан процессийн талаар санал бодлыг нь асуу. “Таны удирдаж явуулсан процесс ямар явагдсан гэж бодож байна?” эсвэл “Үүний аль хэсэг нь сайн явагдсан гэж бодож байна?” гэж асууна. Көүч нь суралцагчийн сайн явуулсан процесс дээр эерэг үнэлгээ өгнө. (Сайн явагдсан 3-4 зүйлийг тодорхойлж бич)<br>Ask the Learner to self-reflect and provide feedback on the safety process which they delivered. Ask: “How do you think that went?” or “What went well for you during that?” The Coach then provides positive feedback to the Learner on what went well. <br><i>(Write below 3-4 items which went well)</i></td></tr><tr><td style="height:145px">${b3safe(d.scc_discussion1)}</td></tr><tr><td><b>КӨҮЧ:</b> Уг СУРАЛЦАГЧИЙГ энэ төрлийн аюулгүй ажиллагааны процессыг илүү сайн болгохын тулд юу хийвэл дээр гэж та бодож байна? (Санал болгох 1-2 сайжруулалт бич)<br><b>COACH:</b> What do you think the LEARNER may do in the future to become even better in this type of safety process? <br><i>(Write 1-2 suggested improvements below)</i></td></tr><tr><td style="height:95px">${b3safe(d.scc_discussion1_improve)}</td></tr></table><table class="official-table" style="margin-top:24px"><tr class="official-grey"><td>II КӨҮЧИЙН ХЭЛЭЛЦҮҮЛЭГ/ 2 COACHING DISCUSSION:</td></tr><tr><td>I көүчийн өгсөн зөвлөмжийг дахин хэрэгжүүлж, юу сайн болсон талаар нэмэлт санал бодлоо хуваалцах шаардлагатай бол сайжруулах боломжийг өөрийн зүгээс өг. (Сайжруулалт хийх боломжит зүйлсийг бич)<br>Re-enforce the coaching provided by Coach #1, provide additional feedback on what went well and if appropriate an improvement opportunity from your perspective. <i>(Write improvement opportunity below)</i></td></tr><tr><td style="height:145px">${b3safe(d.scc_discussion2)}</td></tr><tr class="official-grey"><td>КӨҮЧИНГ ХЭЛЭЛЦҮҮЛГИЙН ДҮГНЭЛТ/ SUMMARIZE COACHING SESSION:</td></tr><tr><td>I көүч нь суралцагчтай хийсэн ярилцлагаа нэгтгэн дүгнэж, цаашдаа аюулгүй ажиллагааны процесс дээр сайжруулалт хийхэд авах гол арга хэмжээний талаар ярилцаж тохирно. (Сайжруулалт хийхэд авах гол арга хэмжээг бич)<br>Coach #1 summarizes the conversation with the Learner, and they agree on key improvement actions to be undertaken during future safety processes. <i>(Write key improvement actions below)</i></td></tr><tr><td style="height:140px">${b3safe(d.scc_summary)}<br><br>${b3safe(d.scc_actions)}</td></tr></table><div class="print-footer"><span></span><span>Page 2 of 2</span></div></div></div>`;
}

const b3OldShowTab=typeof showTab==="function"?showTab:null;
if(b3OldShowTab){showTab=function(id){b3OldShowTab(id);if(id==="adminUsersRoles")renderUsersRoles();if(id==="databaseHealth")renderDatabaseHealth();if(id==="allRecords")renderAllRecords();if(id==="documents"&&typeof renderDocumentCentre==="function")renderDocumentCentre();}}



/* Enterprise 4.0 Build 4 - Cascaded Coaching bullet and alignment print fix */
function b4safe(x){
  return typeof esc==="function" ? esc(x||"") : String(x||"").replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
}
function b4cb(v){return v?"☑":"☐";}
function b4sig(d,k){return d&&d[k]?`<img class="print-signature-img" src="${d[k]}">`:"";}

function b4Bullets(text){
  text = String(text || "").trim();
  if(!text) return "";
  let lines = text
    .split(/\n+/)
    .map(s => s.trim())
    .filter(Boolean)
    .map(s => s.replace(/^[-•*\u2022]\s*/, "").trim())
    .filter(Boolean);

  // If user typed sentences in one paragraph, keep paragraph unless obvious semicolon list
  if(lines.length === 1 && lines[0].includes(";")){
    lines = lines[0].split(";").map(s=>s.trim()).filter(Boolean);
  }

  if(lines.length <= 1){
    return `<div class="single-answer">${b4safe(lines[0] || text)}</div>`;
  }
  return `<ul>${lines.map(s=>`<li>${b4safe(s)}</li>`).join("")}</ul>`;
}

function buildSCCPrintHTML(f){
  const d=f.data||{}, learnerJob=d.scc_learner_job_title||d.scc_job_title||"";
  return `
  <div class="official-print-root">
    <div class="official-page">
      <table class="official-table">
        <tr>
          <td style="border:0;width:22%" class="official-logo"><span>D</span>AYAN</td>
          <td colspan="3" style="border:0" class="official-title">АЮУЛГҮЙ АЖИЛЛАГААНЫ ШАТАЛСАН КӨҮЧИНГ/<br>SAFETY CASCADING COACHING</td>
        </tr>
        <tr class="official-light">
          <td><b>Огноо/ Date</b><br>${b4safe(d.scc_date)}</td>
          <td><b>Нэр/ Name</b></td>
          <td><b>Гарын үсэг/ Signature</b></td>
          <td><b>Албан тушаал/ Job title</b></td>
        </tr>
        <tr>
          <td><b>Суралцагчийн нэр/<br>Name of Learner</b></td>
          <td class="scc-header-answer">${b4safe(d.scc_learner)}</td>
          <td class="scc-header-answer">${b4sig(d,"scc_sig_learner")}</td>
          <td class="scc-header-answer">${b4safe(learnerJob)}</td>
        </tr>
        <tr>
          <td><b>I көүчийн нэр/<br>Name of Coach #1</b></td>
          <td class="scc-header-answer">${b4safe(d.scc_coach1)}</td>
          <td class="scc-header-answer">${b4sig(d,"scc_sig_coach1")}</td>
          <td class="scc-header-answer">${b4safe(d.scc_coach1_job_title)}</td>
        </tr>
        <tr>
          <td><b>II көүчийн нэр/<br>Name of Coach #2</b></td>
          <td class="scc-header-answer">${b4safe(d.scc_coach2)}</td>
          <td class="scc-header-answer">${b4sig(d,"scc_sig_coach2")}</td>
          <td class="scc-header-answer">${b4safe(d.scc_coach2_job_title)}</td>
        </tr>
        <tr>
          <td><b>Хэлтэс/ Department<br>Багийн нэр/ Team Name</b></td>
          <td colspan="3" class="scc-header-answer">${b4safe(d.scc_department)} ${b4safe(d.scc_team)}</td>
        </tr>
      </table>

      <table class="official-table" style="margin-top:12px">
        <tr class="official-grey">
          <td colspan="5">Уулзалтын үеэр аюулгүй ажиллагааны ямар процесс явагдсан бэ? (Холбогдох нүдийг чагталж эсвэл тайлбарлаж бич)<br>
          Which safety process was conducted during the coaching session? (Mark a box or write in)</td>
        </tr>
        <tr>
          <td>${b4cb(d.scc_process_preshift)} Ээлжийн өмнөх хурал/<br>Pre-Shift Meeting:</td>
          <td>${b4cb(d.scc_process_discussion)} Аюулгүй ажиллагааны хэлэлцүүлэг/<br>Safety Discussion:</td>
          <td>${b4cb(d.scc_process_crm)} НЭУ/ CRM:</td>
          <td>${b4cb(d.scc_process_ptha)} Ажлын өмнөх аюул эрсдэлийн үнэлгээ/<br>Pre-Task Hazard Assessment:</td>
          <td>${b4cb(d.scc_process_other)} Бусад/ Other:<br>${b4safe(d.scc_process_other_text)}</td>
        </tr>
        <tr class="official-grey">
          <td colspan="5">Ахлах ажилтан, таны хувьд дээрхээс аль процесс нь сайн явагдсан бэ? Үүний дараа “Уулзалтын үеэр аль нь буюу ямар үйл явц нь сайн явагдсан бэ?” гэж өөрөөсөө асуу. (Сайн явагдсан 3-4 зүйлийг тодорхойлж бич)<br>
          Supervisor, what went well? Upon completion of the Safety Process, ask yourself: “What key elements or behaviors do you believe went well during the safety process?” (Write below 3-4 self-feedback items which went well)</td>
        </tr>
        <tr><td colspan="5" class="answer-cell" style="height:155px">${b4Bullets(d.scc_self_went_well)}</td></tr>
        <tr class="official-grey">
          <td colspan="5">Ахлах ажилтан, өөртөө анализ хийх: Дээрхээс өөрөөр юу илүү сайн байх боломж байсныг 1-2 жишээгээр тодорхойлж бич. Аюулгүй ажиллагааны процессыг сайжруулахын тулд цаашдаа юуг өөрчлөхөөр байна, юуг өөрөөр хийхээр байгаагаа тодорхойлж бич. (Санал болгох 1-2 сайжруулалтыг бич)<br>
          Supervisor, Self-analysis: Identify 1-2 opportunities within What Went Well items above, which could be even better if something were done differently. Write below what would you change, or do differently in the future during similar safety processes to be even better? (Write below 1-2 suggested improvements)</td>
        </tr>
        <tr><td colspan="5" class="answer-cell" style="height:160px">${b4Bullets(d.scc_self_improvements)}</td></tr>
      </table>
      <div class="print-footer"><span></span><span>Page 1 of 2</span></div>
    </div>

    <div class="official-page">
      <table class="official-table">
        <tr>
          <td style="border:0;width:22%" class="official-logo"><span>D</span>AYAN</td>
          <td colspan="3" style="border:0" class="official-title">АЮУЛГҮЙ АЖИЛЛАГААНЫ ШАТАЛСАН КӨҮЧИНГ/<br>SAFETY CASCADING COACHING</td>
        </tr>
      </table>

      <table class="official-table" style="margin-top:12px">
        <tr class="official-grey"><td>I КӨҮЧИЙН ХЭЛЭЛЦҮҮЛЭГ/ 1 COACHING DISCUSSION:</td></tr>
        <tr><td>Суралцагчаас өөрийн удирдаж явуулсан процессийн талаар санал бодлыг нь асуу. “Таны удирдаж явуулсан процесс ямар явагдсан гэж бодож байна?” эсвэл “Үүний аль хэсэг нь сайн явагдсан гэж бодож байна?” гэж асууна. Көүч нь суралцагчийн сайн явуулсан процесс дээр эерэг үнэлгээ өгнө. (Сайн явагдсан 3-4 зүйлийг тодорхойлж бич)<br>Ask the Learner to self-reflect and provide feedback on the safety process which they delivered. Ask: “How do you think that went?” or “What went well for you during that?” The Coach then provides positive feedback to the Learner on what went well. <br><i>(Write below 3-4 items which went well)</i></td></tr>
        <tr><td class="answer-cell" style="height:145px">${b4Bullets(d.scc_discussion1)}</td></tr>
        <tr><td><b>КӨҮЧ:</b> Уг СУРАЛЦАГЧИЙГ энэ төрлийн аюулгүй ажиллагааны процессыг илүү сайн болгохын тулд юу хийвэл дээр гэж та бодож байна? (Санал болгох 1-2 сайжруулалт бич)<br><b>COACH:</b> What do you think the LEARNER may do in the future to become even better in this type of safety process? <br><i>(Write 1-2 suggested improvements below)</i></td></tr>
        <tr><td class="answer-cell" style="height:95px">${b4Bullets(d.scc_discussion1_improve)}</td></tr>
      </table>

      <table class="official-table" style="margin-top:24px">
        <tr class="official-grey"><td>II КӨҮЧИЙН ХЭЛЭЛЦҮҮЛЭГ/ 2 COACHING DISCUSSION:</td></tr>
        <tr><td>I көүчийн өгсөн зөвлөмжийг дахин хэрэгжүүлж, юу сайн болсон талаар нэмэлт санал бодлоо хуваалцах шаардлагатай бол сайжруулах боломжийг өөрийн зүгээс өг. (Сайжруулалт хийх боломжит зүйлсийг бич)<br>Re-enforce the coaching provided by Coach #1, provide additional feedback on what went well and if appropriate an improvement opportunity from your perspective. <i>(Write improvement opportunity below)</i></td></tr>
        <tr><td class="answer-cell" style="height:145px">${b4Bullets(d.scc_discussion2)}</td></tr>
        <tr class="official-grey"><td>КӨҮЧИНГ ХЭЛЭЛЦҮҮЛГИЙН ДҮГНЭЛТ/ SUMMARIZE COACHING SESSION:</td></tr>
        <tr><td>I көүч нь суралцагчтай хийсэн ярилцлагаа нэгтгэн дүгнэж, цаашдаа аюулгүй ажиллагааны процесс дээр сайжруулалт хийхэд авах гол арга хэмжээний талаар ярилцаж тохирно. (Сайжруулалт хийхэд авах гол арга хэмжээг бич)<br>Coach #1 summarizes the conversation with the Learner, and they agree on key improvement actions to be undertaken during future safety processes. <i>(Write key improvement actions below)</i></td></tr>
        <tr><td class="answer-cell" style="height:140px">${b4Bullets((d.scc_summary||"") + "\\n" + (d.scc_actions||""))}</td></tr>
      </table>
      <div class="print-footer"><span></span><span>Page 2 of 2</span></div>
    </div>
  </div>`;
}

// Override print HTML to include Build 4 answer formatting in print window
function printHTML(title,content){
  const win=window.open("","_blank");
  if(!win) return alert("Popup blocked. Allow popups for this site.");
  win.document.write(`<!DOCTYPE html><html><head><meta charset="utf-8"><title>${b4safe(title)}</title><style>
    body{font-family:Arial,"Noto Sans",sans-serif;margin:0;color:#000;background:white}
    .official-page{box-sizing:border-box;width:100%;min-height:calc(297mm - 14mm);page-break-after:always}
    .official-page:last-child{page-break-after:auto}
    .official-table{width:100%;border-collapse:collapse;table-layout:fixed;font-size:9.6px;line-height:1.12;color:#000}
    .official-table td,.official-table th{border:1px solid #111;padding:3px;vertical-align:top;word-wrap:break-word}
    .official-title{text-align:center;font-weight:900;font-size:16px}
    .official-logo{font-size:24px;font-weight:900;color:#1e3a8a}.official-logo span{color:#991b1b}
    .official-grey{background:#6f6f6f!important;color:#fff!important;font-weight:900;-webkit-print-color-adjust:exact;print-color-adjust:exact}
    .official-light{background:#e5e5e5!important;-webkit-print-color-adjust:exact;print-color-adjust:exact}
    .print-signature-img{max-width:180px;max-height:45px}
    .print-footer{display:flex;justify-content:space-between;align-items:center;margin-top:6px;font-size:10px;font-weight:900}
    .answer-cell{font-size:12px;font-weight:700;line-height:1.45;vertical-align:middle!important;padding:10px 14px!important}
    .answer-cell ul{margin:0;padding-left:24px}.answer-cell li{margin:5px 0}.answer-cell .single-answer{text-align:center}
    .scc-header-answer{font-size:12px;font-weight:700;text-align:center;vertical-align:middle!important}
    @media print{@page{size:A4 portrait;margin:7mm}body{margin:0!important;background:white!important}}
  </style></head><body>${content}</body></html>`);
  win.document.close();
  win.focus();
  setTimeout(()=>win.print(),500);
}



/* Enterprise 5.4 Forms Engine */
const E54_DAYAN_LOGO = `data:image/png;base64,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`;
let e54CurrentFormType = localStorage.getItem("e54_current_form_type") || "pjo";

const E54_FORMS = [
  {type:"pjo", title:"Planned Job Observation", subtitle:"Official two-page PJO template", official:true},
  {type:"cascaded", title:"Safety Cascading Coaching", subtitle:"Official two-page coaching template", official:true},
  {type:"lif", title:"Leaders in the Field", subtitle:"Temporary digital form until original is added", official:false},
  {type:"safety_coaching", title:"Safety Coaching", subtitle:"Temporary digital form until original is added", official:false},
  {type:"incident", title:"Incident Investigation", subtitle:"Temporary digital form until original is added", official:false},
  {type:"near_miss", title:"Near Miss / Hazard Report", subtitle:"Temporary digital form until original is added", official:false},
  {type:"equipment", title:"Equipment Inspection", subtitle:"Temporary digital form until original is added", official:false},
  {type:"vehicle", title:"Vehicle Inspection", subtitle:"Temporary digital form until original is added", official:false},
  {type:"toolbox", title:"Toolbox Talk", subtitle:"Temporary digital form until original is added", official:false}
];

function e54safe(x){
  return typeof esc==="function" ? esc(x||"") : String(x||"").replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
}
function e54LogoCell(){
  if(E54_DAYAN_LOGO) return `<img class="print-logo-img" src="${E54_DAYAN_LOGO}" alt="Dayan Contract Mining Logo">`;
  return `<span class="official-logo"><span>D</span>AYAN</span>`;
}
function e54PatchLogo(content){
  if(!content || !E54_DAYAN_LOGO) return content;
  content = content.replace(/<td([^>]*)class="official-logo"([^>]*)><span>D<\/span>AYAN<\/td>/g, `<td$1class="official-logo"$2>${e54LogoCell()}</td>`);
  content = content.replace(/<td([^>]*)class='official-logo'([^>]*)><span>D<\/span>AYAN<\/td>/g, `<td$1class="official-logo"$2>${e54LogoCell()}</td>`);
  content = content.replace(/<td([^>]*)><span style="color:#991b1b">D<\/span>AYAN<\/td>/g, `<td$1>${e54LogoCell()}</td>`);
  return content;
}
function e54cb(v){return v?"☑":"☐";}
function e54sig(d,k){return d&&d[k]?`<img class="print-signature-img" src="${d[k]}">`:"";}
function e54bullets(text){
  text=String(text||"").trim();
  if(!text) return "";
  let lines=text.split(/\n+/).map(s=>s.trim()).filter(Boolean).map(s=>s.replace(/^[-•*\u2022]\s*/,"").trim()).filter(Boolean);
  if(lines.length===1 && lines[0].includes(";")) lines=lines[0].split(";").map(s=>s.trim()).filter(Boolean);
  if(lines.length<=1) return `<div class="single-answer">${e54safe(lines[0]||text)}</div>`;
  return `<ul>${lines.map(s=>`<li>${e54safe(s)}</li>`).join("")}</ul>`;
}

function e54ResizeTextareas(){
  document.querySelectorAll("#currentFormPrintable textarea").forEach(t=>{
    t.style.overflow="hidden"; t.style.resize="none";
    t.style.height="auto"; t.style.height=Math.max(92,t.scrollHeight+4)+"px";
    if(!t.dataset.e54ready){
      t.dataset.e54ready="1";
      t.addEventListener("input",()=>{t.style.height="auto";t.style.height=Math.max(92,t.scrollHeight+4)+"px";});
    }
  });
}

function e54EnsureFormSelect(){
  const sel=document.getElementById("formType");
  if(!sel) return;
  sel.innerHTML=E54_FORMS.map(f=>`<option value="${f.type}">${f.title}</option>`).join("");
  sel.value=e54CurrentFormType;
  sel.onchange=()=>{e54CurrentFormType=sel.value;localStorage.setItem("e54_current_form_type",e54CurrentFormType);renderSelectedForm();};
}

function e54FormsLauncher(){
  return `<div class="forms-engine-toolbar">
    <button type="button" onclick="renderSelectedForm()">Open Selected Form</button>
    <button type="button" class="secondary" onclick="showSavedForms()">Saved Forms</button>
    <button type="button" class="secondary" onclick="printCurrentForm()">Print Current Form</button>
  </div>
  <div class="forms-engine-grid">
    ${E54_FORMS.map(f=>`<button type="button" class="form-tile ${f.official?"official":"pending"}" onclick="e54OpenForm('${f.type}')">
      <b>${f.title} ${f.official?'<span class="form-status-pill">Official</span>':'<span class="form-status-pill" style="background:#e5e7eb;color:#374151">Pending</span>'}</b>
      <span>${f.subtitle}</span>
    </button>`).join("")}
  </div>`;
}
function e54OpenForm(type){
  e54CurrentFormType=type;
  localStorage.setItem("e54_current_form_type",type);
  const sel=document.getElementById("formType"); if(sel) sel.value=type;
  renderSelectedForm();
  setTimeout(()=>document.getElementById("currentFormPrintable")?.scrollIntoView({behavior:"smooth",block:"start"}),100);
}

function e54RenderPlaceholderForm(type){
  const def=E54_FORMS.find(f=>f.type===type)||{title:"Form"};
  const area=document.getElementById("dynamicFormArea")||window.dynamicFormArea;
  if(!area) return;
  area.innerHTML=`<div class="form-template" id="currentFormPrintable">
    <div class="form-header-dayan"><div class="form-logo"><span>D</span>AYAN</div><div class="form-title"><h2>${e54safe(def.title)}</h2><p>Temporary fillable form until official paper layout is added</p></div></div>
    <div class="placeholder-form-note"><b>${e54safe(def.title)}</b><br>This form is available, but the official original has not been built yet. Use this temporary digital form for now.</div>
    <div class="form-section">
      <div class="form-grid">
        <label>Date<input id="${type}_date" type="date" value="${new Date().toISOString().split("T")[0]}"></label>
        <label>Completed By<input id="${type}_completed_by" value="${e54safe(currentUser?.email||"")}"></label>
        <label>Department / Area<input id="${type}_department"></label>
        <label>Heading / Location<input id="${type}_location"></label>
      </div>
      <label>Details<textarea id="${type}_details" placeholder="Enter notes, observations, coaching points or inspection details"></textarea></label>
      <label>Actions / Follow-up<textarea id="${type}_actions" placeholder="Enter required actions or follow-up"></textarea></label>
    </div>
    <button type="button" class="save-btn" onclick="saveFillableForm()">Save Form</button>
    <button type="button" class="secondary" onclick="printCurrentForm()">Print / PDF</button>
  </div>`;
  e54ResizeTextareas();
}

const e54OriginalRenderPJO = typeof renderPJOForm==="function" ? renderPJOForm : null;
const e54OriginalRenderSCC = typeof renderSCCForm==="function" ? renderSCCForm : null;

function e54RenderPJOFallback(){
  const today=new Date().toISOString().split("T")[0];
  const area=document.getElementById("dynamicFormArea")||window.dynamicFormArea;
  if(!area) return;
  area.innerHTML=`<div class="form-template" id="currentFormPrintable">
    <div class="form-header-dayan"><div class="form-logo"><span>D</span>AYAN</div><div class="form-title"><h2>АЖЛЫН ТӨЛӨВЛӨГӨӨТ АЖИГЛАЛТ</h2><p>PLANNED JOB OBSERVATION</p></div></div>
    <div class="form-section"><h3>Header / Ерөнхий мэдээлэл</h3><div class="form-grid">
      <label>Workplace<input id="pjo_workplace"></label>
      <label>Date of Observation<input id="pjo_date" type="date" value="${today}"></label>
      <label>Job/task observed<input id="pjo_task"></label>
      <label>Procedure name and #<input id="pjo_procedure"></label>
      <label>Observer<input id="pjo_observer"></label>
      <label>Supervisor<input id="pjo_supervisor"></label>
    </div></div>
    <div class="form-section"><h3>Reason for Observation</h3><div class="form-check-grid">
      ${typeof check==="function"?check("pjo_reason_procedure","Job Procedure / Practice Update"):""}
      ${typeof check==="function"?check("pjo_reason_injury","Recent injury associated with job/task"):""}
      ${typeof check==="function"?check("pjo_reason_training","Training follow-up"):""}
      ${typeof check==="function"?check("pjo_reason_experienced","Experienced worker check"):""}
      ${typeof check==="function"?check("pjo_reason_other","Other"):""}
    </div><label>Other<input id="pjo_reason_other_text"></label></div>
    <div class="form-section"><h3>Worker(s)</h3><div class="form-grid">
      <label>Worker #1<input id="pjo_emp1_name"></label><label>Occupation<input id="pjo_emp1_occupation"></label><label>Experience<input id="pjo_emp1_experience"></label>
      <label>Worker #2<input id="pjo_emp2_name"></label><label>Occupation<input id="pjo_emp2_occupation"></label><label>Experience<input id="pjo_emp2_experience"></label>
    </div></div>
    <div class="form-section"><h3>Observations</h3>
      <label>1. Injury / Near Miss Potential<textarea id="pjo_q1_comment"></textarea></label>
      <label>2. Property Damage Potential<textarea id="pjo_q2_comment"></textarea></label>
      <label>3. Procedures / Standards Followed<textarea id="pjo_q3_comment"></textarea></label>
      <label>4. Key Procedure Points<textarea id="pjo_q4_comment"></textarea></label>
      <label>5. Positive Recognition<textarea id="pjo_q5_comment"></textarea></label>
      <label>6. Corrective Information<textarea id="pjo_q6_comment"></textarea></label>
      <label>7. Efficiency / Production Capability<textarea id="pjo_q7_comment"></textarea></label>
      <label>8. Safety Improvement<textarea id="pjo_q8_comment"></textarea></label>
      <label>9. Additional Comments<textarea id="pjo_q9_comment"></textarea></label>
      <label>10. Procedure Revision<textarea id="pjo_q10_comment"></textarea></label>
    </div>
    <div class="form-section"><h3>Follow-up</h3><div class="form-grid">
      <label>Duration<input id="pjo_duration"></label><label>Start<input id="pjo_start_time" type="time"></label><label>Stop<input id="pjo_stop_time" type="time"></label>
      <label>Responsible person<input id="pjo_responsible"></label><label>Due date<input id="pjo_due_date" type="date"></label>
    </div><label>Recommended Follow-up<textarea id="pjo_followup"></textarea></label></div>
    <button type="button" class="save-btn" onclick="saveFillableForm()">Save PJO</button>
    <button type="button" class="secondary" onclick="printCurrentForm()">Print / PDF</button>
  </div>`;
  e54ResizeTextareas();
}

function renderSelectedForm(){
  e54EnsureFormSelect();
  const sel=document.getElementById("formType");
  const type=sel?.value||e54CurrentFormType||"pjo";
  e54CurrentFormType=type;
  localStorage.setItem("e54_current_form_type",type);

  const formsSection=document.getElementById("forms");
  if(formsSection && !document.getElementById("e54FormsLauncher")){
    const firstCard=formsSection.querySelector(".form-card");
    if(firstCard) firstCard.insertAdjacentHTML("afterend", `<div id="e54FormsLauncher">${e54FormsLauncher()}</div>`);
  }

  if(type==="pjo"){
    if(e54OriginalRenderPJO) e54OriginalRenderPJO();
    else e54RenderPJOFallback();
  } else if(type==="cascaded"){
    if(e54OriginalRenderSCC) e54OriginalRenderSCC();
    else e54RenderPlaceholderForm("cascaded");
  } else {
    e54RenderPlaceholderForm(type);
  }
  setTimeout(e54ResizeTextareas,80);
}

function newForm(){
  const area=document.getElementById("dynamicFormArea")||window.dynamicFormArea;
  if(area) area.innerHTML="";
  renderSelectedForm();
}
function showSavedForms(){
  if(typeof renderSavedForms==="function") renderSavedForms();
  document.getElementById("savedFormsList")?.scrollIntoView({behavior:"smooth",block:"start"});
}

function e54GenericPrintHTML(f){
  const d=f.data||{};
  const rows=Object.entries(d).map(([k,v])=>`<tr><td style="width:30%"><b>${e54safe(k)}</b></td><td>${e54safe(String(v||""))}</td></tr>`).join("");
  return `<div class="official-page"><table class="official-table"><tr><td style="border:0;width:22%" class="official-logo">${e54LogoCell()}</td><td colspan="3" style="border:0" class="official-title">${e54safe(f.title||"Form")}</td></tr>${rows}</table></div>`;
}

function printHTML(title,content){
  content=e54PatchLogo(content||"");
  const win=window.open("","_blank");
  if(!win) return alert("Popup blocked. Allow popups for this site.");
  win.document.write(`<!DOCTYPE html><html><head><meta charset="utf-8"><title>${e54safe(title)}</title><style>
    body{font-family:Arial,"Noto Sans",sans-serif;margin:0;color:#000;background:white}
    .print-toolbar{position:sticky;top:0;z-index:9999;background:#0f172a;color:white;padding:10px;display:flex;gap:10px;align-items:center;justify-content:space-between;font-family:Arial,sans-serif}
    .print-toolbar button{border:0;border-radius:8px;padding:8px 14px;font-weight:900;cursor:pointer}
    .print-main{background:#2563eb;color:white}.print-close{background:#475569;color:white}
    .official-page{box-sizing:border-box;width:100%;min-height:calc(297mm - 14mm);page-break-after:always;padding:0}
    .official-page:last-child{page-break-after:auto}
    .official-table{width:100%;border-collapse:collapse;table-layout:fixed;font-size:9.6px;line-height:1.12;color:#000}
    .official-table td,.official-table th{border:1px solid #111;padding:3px;vertical-align:top;word-wrap:break-word}
    .official-title{text-align:center;font-weight:900;font-size:16px}
    .official-logo{text-align:left;vertical-align:middle!important}
    .print-logo-img{max-width:205px;max-height:52px;object-fit:contain;display:block}
    .official-grey{background:#6f6f6f!important;color:#fff!important;font-weight:900;-webkit-print-color-adjust:exact;print-color-adjust:exact}
    .official-light{background:#e5e5e5!important;-webkit-print-color-adjust:exact;print-color-adjust:exact}
    .print-signature-img{max-width:180px;max-height:45px}
    .print-line{border-bottom:1px solid #111;height:34px;text-align:center}
    .print-footer{display:flex;justify-content:space-between;align-items:center;margin-top:6px;font-size:10px;font-weight:900}
    .answer-cell,.smart-answer{font-size:12px;font-weight:700;line-height:1.42;vertical-align:top!important;padding:10px 14px!important;white-space:normal}
    .answer-cell ul,.smart-answer ul{margin:0;padding-left:24px}.answer-cell li,.smart-answer li{margin:4px 0;break-inside:avoid}.single-answer{text-align:left}
    .scc-header-answer{font-size:12px;font-weight:700;text-align:center;vertical-align:middle!important}
    @media print{@page{size:A4 portrait;margin:7mm}body{margin:0!important;background:white!important}.print-toolbar{display:none!important}}
  </style></head><body>
    <div class="print-toolbar"><strong>Print Preview — ${e54safe(title)}</strong><div><button class="print-close" onclick="window.close()">Back / Close</button><button class="print-main" onclick="window.print()">Print / Save PDF</button></div></div>
    ${content}
  </body></html>`);
  win.document.close();
  win.focus();
}

function printCurrentForm(){
  const type=document.getElementById("formType")?.value||e54CurrentFormType||"pjo";
  const title=E54_FORMS.find(f=>f.type===type)?.title || "Form";
  const data=typeof collectCurrentForm==="function"?collectCurrentForm():{};
  const f={type,title,data};
  let content="";
  if(type==="cascaded" && typeof buildSCCPrintHTML==="function") content=buildSCCPrintHTML(f);
  else if(type==="pjo" && typeof buildPJOPrintHTML==="function") content=buildPJOPrintHTML(f);
  else content=e54GenericPrintHTML(f);
  printHTML(title,content);
}

function printSingleSavedForm(id){
  const f=(typeof savedForms!=="undefined"?savedForms:[]).find(x=>String(x.id)===String(id));
  if(!f) return alert("Document not found.");
  let content="";
  if(f.type==="cascaded" && typeof buildSCCPrintHTML==="function") content=buildSCCPrintHTML(f);
  else if(f.type==="pjo" && typeof buildPJOPrintHTML==="function") content=buildPJOPrintHTML(f);
  else content=e54GenericPrintHTML(f);
  printHTML(f.doc_number||f.title||"Document",content);
}

const e54OldSCC=typeof buildSCCPrintHTML==="function"?buildSCCPrintHTML:null;
if(e54OldSCC) buildSCCPrintHTML=function(f){return e54PatchLogo(e54OldSCC(f));};
const e54OldPJO=typeof buildPJOPrintHTML==="function"?buildPJOPrintHTML:null;
if(e54OldPJO) buildPJOPrintHTML=function(f){return e54PatchLogo(e54OldPJO(f));};

const e54OldShowTab=typeof showTab==="function"?showTab:null;
if(e54OldShowTab){
  showTab=function(id){
    e54OldShowTab(id);
    if(id==="forms") setTimeout(()=>{e54EnsureFormSelect();renderSelectedForm();},120);
    if(id==="documents"&&typeof renderDocumentCentre==="function") renderDocumentCentre();
  };
}

setTimeout(()=>{
  e54EnsureFormSelect();
  if(document.querySelector(".tab.active")?.id==="forms") renderSelectedForm();
},700);



/* Enterprise 5.6 Final Button Fix - simple and stable */
var E56_FORMS = [
  {type:"pjo", title:"Planned Job Observation", subtitle:"Official two-page PJO template", official:true},
  {type:"cascaded", title:"Safety Cascading Coaching", subtitle:"Official two-page coaching template", official:true},
  {type:"lif", title:"Leaders in the Field", subtitle:"Temporary digital form until original is added", official:false},
  {type:"incident", title:"Incident Investigation", subtitle:"Temporary digital form until original is added", official:false},
  {type:"near_miss", title:"Near Miss / Hazard Report", subtitle:"Temporary digital form until original is added", official:false},
  {type:"equipment", title:"Equipment Inspection", subtitle:"Temporary digital form until original is added", official:false},
  {type:"vehicle", title:"Vehicle Inspection", subtitle:"Temporary digital form until original is added", official:false},
  {type:"toolbox", title:"Toolbox Talk", subtitle:"Temporary digital form until original is added", official:false}
];
function e56safe(x){return typeof esc==="function"?esc(x||""):String(x||"").replace(/[&<>"']/g,function(m){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m];});}
function e56Resize(){document.querySelectorAll("#currentFormPrintable textarea").forEach(function(t){t.style.overflow="hidden";t.style.resize="none";t.style.height="auto";t.style.height=Math.max(92,t.scrollHeight+4)+"px";if(!t.dataset.e56){t.dataset.e56="1";t.addEventListener("input",function(){t.style.height="auto";t.style.height=Math.max(92,t.scrollHeight+4)+"px";});}});}
function e56FormsHome(){
  var sec=document.getElementById("forms"); if(!sec) return;
  Array.from(sec.children).forEach(function(ch){ if(!ch.classList.contains("section-title")) ch.style.display="none"; });
  var root=document.getElementById("e56FormsRoot");
  if(!root){ root=document.createElement("div"); root.id="e56FormsRoot"; sec.appendChild(root); }
  root.style.display="block";
  root.innerHTML='<div class="e56-header"><h3>Create New Form</h3><p>Tap a form below. Saved forms are managed from the Records tab.</p></div>'+
    '<div class="e56-grid">'+E56_FORMS.map(function(f){
      return '<button type="button" class="e56-tile '+(f.official?'':'pending')+'" onclick="e56OpenForm(\''+f.type+'\')">'+
      '<b>'+f.title+' <span class="e56-pill '+(f.official?'':'pending')+'">'+(f.official?'Official':'Pending')+'</span></b><span>'+f.subtitle+'</span></button>';
    }).join('')+'</div><div id="e56FormMount"></div>';
}
function e56OpenForm(type){
  localStorage.setItem("e56_current_form",type);
  var root=document.getElementById("e56FormMount"); if(!root) return;
  root.style.display="block"; root.innerHTML="";
  var old=window.dynamicFormArea; window.dynamicFormArea=root;
  try{
    if(type==="pjo" && typeof renderPJOForm==="function") renderPJOForm();
    else if(type==="cascaded" && typeof renderSCCForm==="function") renderSCCForm();
    else e56Placeholder(type);
  }catch(err){ console.error(err); e56Placeholder(type); }
  window.dynamicFormArea=old;
  if(type==="pjo") setTimeout(e56AddPJOSignatures,50);
  setTimeout(e56Resize,80);
  root.scrollIntoView({behavior:"smooth",block:"start"});
}
function e56Placeholder(type){
  var root=document.getElementById("e56FormMount")||window.dynamicFormArea;
  var def=E56_FORMS.find(function(f){return f.type===type;})||{title:"Form"};
  root.innerHTML='<div class="form-template" id="currentFormPrintable"><div class="form-header-dayan"><div class="form-logo"><span>D</span>AYAN</div><div class="form-title"><h2>'+e56safe(def.title)+'</h2><p>Temporary fillable form until official layout is added</p></div></div>'+
  '<div class="form-section"><div class="form-grid"><label>Date<input id="'+type+'_date" type="date" value="'+new Date().toISOString().split("T")[0]+'"></label><label>Completed By<input id="'+type+'_completed_by" value="'+e56safe((window.currentUser&&window.currentUser.email)||"")+'"></label><label>Department / Area<input id="'+type+'_department"></label><label>Heading / Location<input id="'+type+'_location"></label></div><label>Details<textarea id="'+type+'_details"></textarea></label><label>Actions / Follow-up<textarea id="'+type+'_actions"></textarea></label></div><div class="e56-actions"><button type="button" class="save-btn" onclick="saveFillableForm()">Save Form</button><button type="button" onclick="printCurrentForm()">Print / PDF</button></div></div>';
}
function e56AddPJOSignatures(){
  var root=document.getElementById("e56FormMount"); if(!root||root.querySelector("#pjo_sig_supervisor")) return;
  var form=root.querySelector("#currentFormPrintable"); if(!form||typeof sigField!=="function") return;
  var div=document.createElement("div"); div.className="form-section";
  div.innerHTML='<h3>Signatures / Гарын үсэг</h3><div class="form-grid">'+sigField("Worker #1 Signature","pjo_sig_emp1")+sigField("Worker #2 Signature","pjo_sig_emp2")+sigField("Observer / Crew Trainer Signature","pjo_sig_observer")+sigField("Supervisor Signature","pjo_sig_supervisor")+sigField("Superintendent / Area Manager Signature","pjo_sig_manager")+sigField("Safety Coordinator Signature","pjo_sig_safety")+'</div>';
  var btn=form.querySelector(".save-btn"); if(btn&&btn.parentElement) btn.parentElement.insertAdjacentElement("beforebegin",div); else form.appendChild(div);
}
var e56OldShowTab=window.showTab;
window.showTab=function(id){
  if(typeof e56OldShowTab==="function") e56OldShowTab(id);
  if(id==="forms") setTimeout(e56FormsHome,80);
  if(id==="documents") setTimeout(e56RecordsHome,80);
};
function e56RecordsHome(){
  var sec=document.getElementById("documents"); if(!sec) return;
  sec.innerHTML='<div class="section-title"><h2>Records</h2><p>Saved forms, drafts and printed documents</p></div><div class="e56-search"><label>Search Records<input id="e56Search" placeholder="Search saved forms..." oninput="e56RecordsList()"></label><div class="e56-actions"><button type="button" onclick="showTab(\'forms\')">Create New Form</button><button type="button" onclick="e56PrintFormsList()">Print Forms List</button></div></div><div id="e56Records"></div>';
  e56RecordsList();
}
function e56RecordsList(){
  var el=document.getElementById("e56Records"); if(!el) return;
  var q=(document.getElementById("e56Search")||{value:""}).value.toLowerCase();
  var docs=(window.savedForms||[]).filter(function(f){return !q||JSON.stringify(f).toLowerCase().indexOf(q)>=0;});
  if(!docs.length){el.innerHTML='<div class="notice">No saved forms yet.</div>';return;}
  el.innerHTML=docs.map(function(f){return '<div class="e56-record-card"><h3>'+e56safe(f.doc_number||f.title||f.type||"Saved Form")+'</h3><div class="doc-meta"><span class="doc-pill">'+e56safe(f.title||f.type||"Form")+'</span><span class="doc-pill">'+e56safe(f.status||"Draft")+'</span><span class="doc-pill">'+e56safe(f.created_at?new Date(f.created_at).toLocaleString():"")+'</span></div><div class="e56-actions"><button type="button" onclick="printSingleSavedForm(\''+f.id+'\')">View</button><button type="button" onclick="editSavedForm&&editSavedForm(\''+f.id+'\')">Edit</button><button type="button" onclick="printSingleSavedForm(\''+f.id+'\')">Print</button></div></div>';}).join("");
}
var e56OldPrintHTML=window.printHTML;
window.printHTML=function(title,content){
  var win=window.open("","_blank"); if(!win) return alert("Popup blocked. Allow popups for this site.");
  win.document.write('<!DOCTYPE html><html><head><meta charset="utf-8"><title>'+e56safe(title)+'</title><style>body{font-family:Arial,"Noto Sans",sans-serif;margin:0;color:#000;background:white}.print-toolbar{position:sticky;top:0;z-index:9999;background:#0f172a;color:white;padding:10px;display:flex;gap:10px;align-items:center;justify-content:space-between;font-family:Arial,sans-serif}.print-toolbar button{border:0;border-radius:8px;padding:8px 14px;font-weight:900;cursor:pointer}.print-main{background:#2563eb;color:white}.print-close{background:#475569;color:white}.official-page{box-sizing:border-box;width:100%;min-height:calc(297mm - 14mm);page-break-after:always;padding:0}.official-page:last-child{page-break-after:auto}.official-table{width:100%;border-collapse:collapse;table-layout:fixed;font-size:9.6px;line-height:1.12;color:#000}.official-table td,.official-table th{border:1px solid #111;padding:3px;vertical-align:top;word-wrap:break-word}.official-title{text-align:center;font-weight:900;font-size:16px}.official-grey{background:#6f6f6f!important;color:#fff!important;font-weight:900;-webkit-print-color-adjust:exact;print-color-adjust:exact}.official-light{background:#e5e5e5!important;-webkit-print-color-adjust:exact;print-color-adjust:exact}.print-signature-img{max-width:180px;max-height:45px}.print-line{border-bottom:1px solid #111;height:34px;text-align:center}.print-footer{display:flex;justify-content:space-between;align-items:center;margin-top:6px;font-size:10px;font-weight:900}.answer-cell,.smart-answer{font-size:12px;font-weight:700;line-height:1.42;vertical-align:top!important;padding:10px 14px!important;white-space:normal}.answer-cell ul,.smart-answer ul{margin:0;padding-left:24px}.answer-cell li,.smart-answer li{margin:4px 0;break-inside:avoid}.single-answer{text-align:left}.scc-header-answer{font-size:12px;font-weight:700;text-align:center;vertical-align:middle!important}@media print{@page{size:A4 portrait;margin:7mm}body{margin:0!important;background:white!important}.print-toolbar{display:none!important}}</style></head><body><div class="print-toolbar"><strong>Print Preview — '+e56safe(title)+'</strong><div><button class="print-close" onclick="window.close()">Back / Close</button><button class="print-main" onclick="window.print()">Print / Save PDF</button></div></div>'+content+'</body></html>');
  win.document.close(); win.focus();
};
window.printCurrentForm=function(){
  var type=localStorage.getItem("e56_current_form")||"pjo";
  var title=(E56_FORMS.find(function(f){return f.type===type;})||{title:"Form"}).title;
  var data=typeof collectCurrentForm==="function"?collectCurrentForm():{};
  var f={type:type,title:title,data:data};
  var content="";
  if(type==="pjo"&&typeof buildPJOPrintHTML==="function") content=buildPJOPrintHTML(f);
  else if(type==="cascaded"&&typeof buildSCCPrintHTML==="function") content=buildSCCPrintHTML(f);
  else content=e56GenericPrint(f);
  printHTML(title,content);
};
window.printSingleSavedForm=function(id){
  var f=(window.savedForms||[]).find(function(x){return String(x.id)===String(id);});
  if(!f) return alert("Document not found.");
  var content="";
  if(f.type==="pjo"&&typeof buildPJOPrintHTML==="function") content=buildPJOPrintHTML(f);
  else if(f.type==="cascaded"&&typeof buildSCCPrintHTML==="function") content=buildSCCPrintHTML(f);
  else content=e56GenericPrint(f);
  printHTML(f.doc_number||f.title||"Document",content);
};
function e56GenericPrint(f){
  var rows=Object.entries(f.data||{}).map(function(kv){return '<tr><td style="width:30%"><b>'+e56safe(kv[0])+'</b></td><td>'+e56safe(String(kv[1]||""))+'</td></tr>';}).join("");
  return '<div class="official-page"><table class="official-table"><tr><td colspan="4" class="official-title">'+e56safe(f.title||"Form")+'</td></tr>'+rows+'</table></div>';
}
function e56PrintFormsList(){
  var rows=(window.savedForms||[]).map(function(f){return '<tr><td>'+e56safe(f.doc_number||f.id||"")+'</td><td>'+e56safe(f.title||f.type||"Form")+'</td><td>'+e56safe(f.status||"Draft")+'</td><td>'+e56safe(f.created_at||"")+'</td></tr>';}).join("");
  printHTML("Saved Forms List",'<div class="official-page"><table class="official-table"><tr><td colspan="4" class="official-title">Saved Forms List</td></tr><tr class="official-grey"><td>Document #</td><td>Title</td><td>Status</td><td>Date</td></tr>'+rows+'</table></div>');
}
setTimeout(function(){var a=document.querySelector(".tab.active");if(a&&a.id==="forms")e56FormsHome();if(a&&a.id==="documents")e56RecordsHome();},700);



/* Enterprise 5.7 Stability + Diagnostics */
window.E57_LAST_ERROR=window.E57_LAST_ERROR||"";window.addEventListener("error",function(e){window.E57_LAST_ERROR=(e.message||"Unknown error")+"\n"+(e.filename||"")+":"+(e.lineno||"");try{localStorage.setItem("e57_last_error",window.E57_LAST_ERROR)}catch(x){}});window.addEventListener("unhandledrejection",function(e){window.E57_LAST_ERROR="Promise rejection: "+((e.reason&&e.reason.message)||e.reason||"Unknown");try{localStorage.setItem("e57_last_error",window.E57_LAST_ERROR)}catch(x){}});
function e57safe(x){return typeof esc==="function"?esc(x||""):String(x||"").replace(/[&<>"']/g,function(m){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]})}
function e57DraftKey(){var t=localStorage.getItem("e56_current_form")||localStorage.getItem("e57_current_form")||"form";var u=(window.currentUser&&window.currentUser.email)||"local";return "e57_draft_"+u+"_"+t}
function e57SetStatus(text,cls){var b=document.getElementById("e57StatusBar");if(!b)return;b.innerHTML='<span class="e57-status '+(cls||"")+'">'+e57safe(text)+'</span><span class="e57-status '+(navigator.onLine?'saved':'offline')+'">'+(navigator.onLine?'Online':'Offline — local save')+'</span>'}
function e57AddFormStatus(){var f=document.getElementById("currentFormPrintable");if(!f||document.getElementById("e57StatusBar"))return;var d=document.createElement("div");d.className="e57-statusbar";d.id="e57StatusBar";d.innerHTML='<span class="e57-status">Draft ready</span>';f.insertBefore(d,f.firstChild.nextSibling||f.firstChild);var s=document.createElement("div");s.className="form-section";s.id="e57WorkflowStatus";s.innerHTML='<h3>Form Status</h3><div class="form-grid"><label>Status<select id="form_status" class="e57-form-status-select"><option>Draft</option><option>Submitted</option><option>Reviewed</option><option>Approved</option><option>Closed</option></select></label><label>Reviewed By<input id="reviewed_by"></label><label>Approved By<input id="approved_by"></label><label>Closed Date<input id="closed_date" type="date"></label></div>';var fs=f.querySelector(".form-section");if(fs)fs.insertAdjacentElement("beforebegin",s);else f.appendChild(s)}
function e57SaveDraft(){try{var data=typeof collectCurrentForm==="function"?collectCurrentForm():{};localStorage.setItem(e57DraftKey(),JSON.stringify({saved_at:new Date().toISOString(),data:data}));e57SetStatus("Saved locally "+new Date().toLocaleTimeString(),"saved")}catch(err){window.E57_LAST_ERROR=err.message||String(err);e57SetStatus("Autosave error","error")}}
function e57LoadDraft(){try{var raw=localStorage.getItem(e57DraftKey());if(!raw)return;var data=(JSON.parse(raw).data)||{};Object.keys(data).forEach(function(k){var el=document.getElementById(k);if(!el)return;if(el.type==="checkbox")el.checked=!!data[k];else if(el.tagName!=="CANVAS")el.value=data[k]||""});e57SetStatus("Draft restored","saved")}catch(err){}}
function e57WireAutosave(){var f=document.getElementById("currentFormPrintable");if(!f||f.dataset.e57Autosave)return;f.dataset.e57Autosave="1";e57AddFormStatus();e57LoadDraft();var timer=null;function go(){e57SetStatus("Saving…","");clearTimeout(timer);timer=setTimeout(e57SaveDraft,450)}f.addEventListener("input",go);f.addEventListener("change",go);e57SetStatus("Autosave on","saved")}
function e57AddPJOSignatures(){var root=document.getElementById("e56FormMount")||document.getElementById("dynamicFormArea")||document;if(root.querySelector("#pjo_sig_supervisor"))return;var form=root.querySelector("#currentFormPrintable");if(!form||typeof sigField!=="function")return;var div=document.createElement("div");div.className="form-section";div.id="pjoSignatureSection";div.innerHTML='<h3>Signatures / Гарын үсэг</h3><div class="form-grid">'+sigField("Worker #1 Signature","pjo_sig_emp1")+sigField("Worker #2 Signature","pjo_sig_emp2")+sigField("Observer / Crew Trainer Signature","pjo_sig_observer")+sigField("Supervisor Signature","pjo_sig_supervisor")+sigField("Superintendent / Area Manager Signature","pjo_sig_manager")+sigField("Safety Coordinator Signature","pjo_sig_safety")+'</div>';var btn=form.querySelector(".save-btn");if(btn&&btn.parentElement)btn.parentElement.insertAdjacentElement("beforebegin",div);else form.appendChild(div)}
var e57OldOpenForm=window.e56OpenForm;if(typeof e57OldOpenForm==="function"){window.e56OpenForm=function(type){localStorage.setItem("e57_current_form",type);e57OldOpenForm(type);setTimeout(function(){if(type==="pjo")e57AddPJOSignatures();e57WireAutosave()},180)}}
var e57OldRenderSelectedForm=window.renderSelectedForm;if(typeof e57OldRenderSelectedForm==="function"){window.renderSelectedForm=function(){e57OldRenderSelectedForm();setTimeout(function(){var type=localStorage.getItem("e56_current_form")||localStorage.getItem("e57_current_form")||"";if(type==="pjo")e57AddPJOSignatures();e57WireAutosave()},180)}}
function e57DiagnosticsPanel(){var forms="unknown",entries="unknown",drafts=0;try{forms=(typeof savedForms!=="undefined"&&savedForms)?savedForms.length:"unknown"}catch(e){}try{entries=JSON.parse(localStorage.getItem("dailyEntries")||"[]").length}catch(e){}try{for(var i=0;i<localStorage.length;i++){if(localStorage.key(i).indexOf("e57_draft_")===0)drafts++}}catch(e){}return '<div class="e57-panel"><h3>Diagnostics</h3><p>Use this if buttons stop working or sync looks wrong.</p><div class="e57-diagnostics-grid"><div class="e57-diag-card"><b>App Version</b>Enterprise 5.7</div><div class="e57-diag-card"><b>User</b>'+e57safe((window.currentUser&&window.currentUser.email)||"Not logged in")+'</div><div class="e57-diag-card"><b>Role</b>'+e57safe(window.currentRole||window.userRole||"Unknown")+'</div><div class="e57-diag-card"><b>Connection</b>'+e57safe(navigator.onLine?"Online":"Offline")+'</div><div class="e57-diag-card"><b>Saved Forms</b>'+e57safe(forms)+'</div><div class="e57-diag-card"><b>Saved Entries</b>'+e57safe(entries)+'</div><div class="e57-diag-card"><b>Local Drafts</b>'+e57safe(drafts)+'</div><div class="e57-diag-card"><b>Supabase</b>'+e57safe(window.supabaseClient||window.supabase?"Loaded":"Not detected")+'</div></div><h4>Last JavaScript Error</h4><div class="e57-errorbox">'+e57safe(window.E57_LAST_ERROR||localStorage.getItem("e57_last_error")||"No error recorded")+'</div><div class="e56-actions"><button type="button" onclick="e57CopyDiagnostics()">Copy Diagnostics</button><button type="button" onclick="localStorage.removeItem(\'e57_last_error\');window.E57_LAST_ERROR=\'\';showTab(\'admin\')">Clear Error</button></div></div>'}
function e57CopyDiagnostics(){var text="UDS Enterprise 5.7 Diagnostics\nUser: "+((window.currentUser&&window.currentUser.email)||"Not logged in")+"\nOnline: "+navigator.onLine+"\nError: "+(window.E57_LAST_ERROR||localStorage.getItem("e57_last_error")||"None");if(navigator.clipboard)navigator.clipboard.writeText(text).then(function(){alert("Diagnostics copied")});else alert(text)}
var e57OldShowTab=window.showTab;window.showTab=function(id){if(typeof e57OldShowTab==="function")e57OldShowTab(id);if(id==="admin"||id==="more"){setTimeout(function(){var sec=document.getElementById(id);if(sec&&!document.getElementById("e57DiagPanel")){var w=document.createElement("div");w.id="e57DiagPanel";w.innerHTML=e57DiagnosticsPanel();sec.appendChild(w)}},120)}if(id==="documents")setTimeout(e57EnhanceRecords,160)};
function e57EnhanceRecords(){var sec=document.getElementById("documents");if(!sec||document.getElementById("e57RecordsFilters"))return;var search=sec.querySelector(".e56-search")||sec.querySelector(".e60-search")||sec.querySelector(".e55-records-filter");if(!search)return;var filters=document.createElement("div");filters.id="e57RecordsFilters";filters.className="e57-panel";filters.innerHTML='<h3>Record Filters</h3><div class="e57-record-filter-grid"><label>Type<select id="e57FilterType" onchange="e57ApplyRecordFilters()"><option value="">All</option><option value="pjo">PJO</option><option value="cascaded">Cascaded Coaching</option><option value="lif">LIF</option><option value="incident">Incident</option><option value="near_miss">Near Miss</option></select></label><label>Status<select id="e57FilterStatus" onchange="e57ApplyRecordFilters()"><option value="">All</option><option>Draft</option><option>Submitted</option><option>Reviewed</option><option>Approved</option><option>Closed</option></select></label><label>From<input id="e57FilterFrom" type="date" onchange="e57ApplyRecordFilters()"></label><label>To<input id="e57FilterTo" type="date" onchange="e57ApplyRecordFilters()"></label></div>';search.insertAdjacentElement("afterend",filters)}
function e57ApplyRecordFilters(){var type=(document.getElementById("e57FilterType")||{}).value||"";var status=(document.getElementById("e57FilterStatus")||{}).value||"";var cards=document.querySelectorAll(".e56-record-card,.e60-record-card,.e55-record-card");cards.forEach(function(card){var txt=card.textContent.toLowerCase();var show=true;if(type&&txt.indexOf(type.replace("_"," "))<0&&txt.indexOf(type)<0)show=false;if(status&&txt.indexOf(status.toLowerCase())<0)show=false;card.style.display=show?"":"none"})}
setTimeout(function(){var type=localStorage.getItem("e56_current_form")||localStorage.getItem("e57_current_form")||"";if(type==="pjo")e57AddPJOSignatures();if(document.getElementById("currentFormPrintable"))e57WireAutosave()},1000);



/* Enterprise 5.8 - PJO Signature Match */
function e58safe(x){return typeof esc==='function'?esc(x||''):String(x||'').replace(/[&<>"']/g,function(m){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m];});}
function e58PjoCard(title,nameId,sigId){
  var sig = (typeof sigField==='function') ? sigField(title,sigId) : '<div class="signature-box"><label>'+e58safe(title)+'</label><input type="hidden" id="'+sigId+'"><div class="signature-preview" id="'+sigId+'_preview">No signature captured</div></div>';
  return '<div class="pjo-signature-card"><div class="pjo-signature-title">'+e58safe(title)+'</div><label class="pjo-name-label">Typed Name / Нэр<input id="'+nameId+'" placeholder="Type name here"></label>'+sig+'</div>';
}
function e58RemoveOldPjoSigs(root){
  if(!root) return;
  var old=root.querySelector('#pjoSignatureSection'); if(old) old.remove();
  ['pjo_sig_emp1','pjo_sig_emp2','pjo_sig_observer','pjo_sig_supervisor','pjo_sig_manager','pjo_sig_safety'].forEach(function(id){
    var el=root.querySelector('#'+id); if(!el) return;
    var box=el.closest('.pjo-signature-card,.signature-box,.form-section');
    if(box) box.remove();
  });
}
function e58AddPjoSigs(){
  var root=document.getElementById('e56FormMount')||document.getElementById('dynamicFormArea')||document;
  var form=root.querySelector('#currentFormPrintable'); if(!form) return;
  e58RemoveOldPjoSigs(root);
  var sec=document.createElement('div'); sec.className='form-section'; sec.id='pjoSignatureSection';
  sec.innerHTML='<h3>Signatures / Гарын үсэг</h3><p class="pjo-signature-help">Type the name first, then tap Sign. Apple Pencil or finger can be used.</p><div class="pjo-signature-grid">'+
    e58PjoCard('Worker #1 Signature','pjo_name_emp1','pjo_sig_emp1')+
    e58PjoCard('Worker #2 Signature','pjo_name_emp2','pjo_sig_emp2')+
    e58PjoCard('Observer / Crew Trainer Signature','pjo_name_observer','pjo_sig_observer')+
    e58PjoCard('Supervisor Signature','pjo_name_supervisor','pjo_sig_supervisor')+
    e58PjoCard('Superintendent / Area Manager Signature','pjo_name_manager','pjo_sig_manager')+
    e58PjoCard('Safety Coordinator Signature','pjo_name_safety','pjo_sig_safety')+
    '</div>';
  var btn=form.querySelector('.save-btn');
  if(btn&&btn.parentElement) btn.parentElement.insertAdjacentElement('beforebegin',sec); else form.appendChild(sec);
}
var e58Old56=window.e56OpenForm;
if(typeof e58Old56==='function') window.e56OpenForm=function(type){e58Old56(type); if(type==='pjo') setTimeout(e58AddPjoSigs,250);};
var e58OldRender=window.renderSelectedForm;
if(typeof e58OldRender==='function') window.renderSelectedForm=function(){e58OldRender(); var t=localStorage.getItem('e56_current_form')||localStorage.getItem('e57_current_form')||''; if(t==='pjo') setTimeout(e58AddPjoSigs,250);};
var e58OldPjo=window.renderPJOForm;
if(typeof e58OldPjo==='function') window.renderPJOForm=function(){e58OldPjo(); setTimeout(e58AddPjoSigs,80);};
setTimeout(function(){var t=localStorage.getItem('e56_current_form')||localStorage.getItem('e57_current_form')||''; if(t==='pjo'||document.querySelector('#currentFormPrintable [id^="pjo_"]')) e58AddPjoSigs();},1000);
