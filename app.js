
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

window.onload=async()=>{document.querySelectorAll("button[data-tab]").forEach(b=>b.addEventListener("click",()=>showTab(b.dataset.tab)));document.querySelectorAll("button[data-go]").forEach(b=>b.addEventListener("click",()=>showTab(b.dataset.go)));const n=new Date(),t=n.toISOString().split("T")[0];date.value=t;reportDate.value=t;aiDate.value=t;time.value=n.toTimeString().slice(0,5);loadPreviewRole();await initAuth();applyLanguage();renderAll();checkSupabase();if("serviceWorker"in navigator)navigator.serviceWorker.register("service-worker.js?v=4.0b3")};
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
async function syncEntry(e){let body={entry_date:e.date,entry_time:e.time,shift:e.shift,heading:e.heading,level_area:e.levelArea,activity:e.activity,round_chainage:e.roundChainage,metres_advanced:e.metresAdvanced,bolts_installed:e.boltsInstalled,mesh_installed:e.meshInstalled,shotcrete_m3:e.shotcreteM3,shotcrete_thickness:e.shotcreteThickness,equipment:e.equipment,ground_condition:e.groundCondition,job:e.job,delays:e.delays,next_shift:e.nextShift,notes:extraNotes(e),ptha:e.checks.ptha,lif:e.checks.lif,scaled:e.checks.scaled,ground_support:e.checks.groundSupport,bolt_pattern:e.checks.boltPattern,shotcrete_quality:e.checks.shotcreteQuality,ventilation:e.checks.ventilation,services_clear:e.checks.servicesClear,barricades:e.checks.barricades,reentry:e.checks.reentry,synced_by:"UDS Development Pro Enterprise 4.0 Build 3",created_by:currentUser?.id||null,created_by_email:currentUser?.email||""};let r=await fetch(`${SUPABASE_URL}/rest/v1/development_entries`,{method:"POST",headers:await getAuthHeaders({"Prefer":"return=representation"}),body:JSON.stringify(body)});if(!r.ok)throw new Error(await r.text());let s=(await r.json())[0];e.cloud_id=s.id;for(let i=0;i<(e.photos||[]).length;i++){let u=await uploadPhoto(e.photos[i],s.id,i);await insertPhoto(s.id,u)}e.synced=true}
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
