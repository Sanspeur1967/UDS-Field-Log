
let currentUser = null;

async function supabaseAuthRequest(endpoint, body){
  const r = await fetch(`${SUPABASE_URL}/auth/v1/${endpoint}`, {
    method:"POST",
    headers:{"apikey":SUPABASE_ANON_KEY,"Content-Type":"application/json"},
    body:JSON.stringify(body)
  });
  const data = await r.json();
  if(!r.ok) throw new Error(data.msg || data.error_description || data.error || JSON.stringify(data));
  return data;
}
function setSession(data){
  if(data.access_token){
    localStorage.setItem("uds_access_token", data.access_token);
    localStorage.setItem("uds_refresh_token", data.refresh_token || "");
    localStorage.setItem("uds_user", JSON.stringify(data.user || {}));
    currentUser = data.user || {};
  }
  updateAuthUI();
}
function getAccessToken(){return localStorage.getItem("uds_access_token") || ""}
function secureHeaders(extra={}){
  return {"apikey":SUPABASE_ANON_KEY,"Authorization":"Bearer "+getAccessToken(),"Content-Type":"application/json",...extra}
}
function updateAuthUI(){
  const token = getAccessToken();
  const user = JSON.parse(localStorage.getItem("uds_user") || "{}");
  currentUser = user;
  if(token){
    authScreen.classList.add("hidden");
    currentUserEmail.textContent = user.email || "Signed in";
  }else{
    authScreen.classList.remove("hidden");
    currentUserEmail.textContent = "Not signed in";
  }
}
async function loginUser(){
  authMessage.textContent = "Logging in...";
  try{
    const data = await supabaseAuthRequest("token?grant_type=password", {email:loginEmail.value.trim(), password:loginPassword.value});
    setSession(data);
    authMessage.textContent = "";
    renderAll();
  }catch(e){authMessage.textContent = e.message}
}
async function signupUser(){
  authMessage.textContent = "Creating user...";
  try{
    await supabaseAuthRequest("signup", {email:loginEmail.value.trim(), password:loginPassword.value});
    authMessage.textContent = "User created. Check email if confirmation is enabled, then login.";
  }catch(e){authMessage.textContent = e.message}
}
function logoutUser(){
  localStorage.removeItem("uds_access_token");
  localStorage.removeItem("uds_refresh_token");
  localStorage.removeItem("uds_user");
  currentUser = null;
  updateAuthUI();
}

let entries=JSON.parse(localStorage.getItem("uds_pro_entries")||localStorage.getItem("uds_v2_entries")||"[]");
let actions=JSON.parse(localStorage.getItem("uds_pro_actions")||localStorage.getItem("uds_v2_actions")||"[]");
let pendingPhotos=[], modalPhotos=[], modalIndex=0, markupIndex=null, markupTool="circle", markupImage=null;

window.onload=()=>{document.querySelectorAll("button[data-tab]").forEach(b=>b.addEventListener("click",()=>showTab(b.dataset.tab)));document.querySelectorAll("button[data-go]").forEach(b=>b.addEventListener("click",()=>showTab(b.dataset.go)));const n=new Date(),t=n.toISOString().split("T")[0];date.value=t;reportDate.value=t;aiDate.value=t;time.value=n.toTimeString().slice(0,5);updateAuthUI();renderAll();checkSupabase();if("serviceWorker"in navigator)navigator.serviceWorker.register("service-worker.js?v=9.0")};
function showTab(id){document.querySelectorAll(".tab").forEach(t=>t.classList.remove("active"));document.querySelectorAll("button[data-tab]").forEach(b=>b.classList.remove("active"));document.getElementById(id).classList.add("active");let n=document.querySelector(`button[data-tab='${id}']`);if(n)n.classList.add("active");if(id==="gallery")renderGallery();if(id==="map")renderMineMap();window.scrollTo(0,0)}
function supabaseReady(){return SUPABASE_URL.includes("supabase.co")&&SUPABASE_ANON_KEY.length>20}
function headers(extra={}){return getAccessToken()?secureHeaders(extra):{"apikey":SUPABASE_ANON_KEY,"Authorization":"Bearer "+SUPABASE_ANON_KEY,"Content-Type":"application/json",...extra}}
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
async function saveEntry(){let e=buildEntry();if(!e.heading||!e.job){alert("Add Heading / Drive and Job Being Performed.");return}entries.unshift(e);saveLocal();clearEntry();renderAll();if(supabaseReady()&&navigator.onLine)await syncAll();else alert("Saved offline.")}
function saveAction(){let a={local_id:"a_"+Date.now(),cloud_id:null,heading:val("actionHeading"),actionText:val("actionText"),owner:val("owner"),priority:val("priority"),dueDate:val("dueDate"),status:val("status"),synced:false,createdAt:new Date().toISOString()};if(!a.actionText){alert("Enter the action required.");return}actions.unshift(a);saveLocal();clearAction();renderAll();if(supabaseReady()&&navigator.onLine)syncAll();else alert("Action saved offline.")}

async function syncAll(){if(!supabaseReady()){alert("Supabase key is not configured yet.");return}if(!navigator.onLine){alert("No internet.");return}syncStatus.textContent="Syncing...";try{for(const e of entries.filter(x=>!x.synced))await syncEntry(e);for(const a of actions.filter(x=>!x.synced))await syncAction(a);saveLocal();renderAll();syncStatus.textContent="Sync complete";alert("Sync complete.")}catch(err){syncStatus.textContent="Sync failed";alert("Sync failed: "+err.message)}}
async function syncEntry(e){let body={entry_date:e.date,entry_time:e.time,shift:e.shift,heading:e.heading,level_area:e.levelArea,activity:e.activity,round_chainage:e.roundChainage,metres_advanced:e.metresAdvanced,bolts_installed:e.boltsInstalled,mesh_installed:e.meshInstalled,shotcrete_m3:e.shotcreteM3,shotcrete_thickness:e.shotcreteThickness,equipment:e.equipment,ground_condition:e.groundCondition,job:e.job,delays:e.delays,next_shift:e.nextShift,notes:extraNotes(e),ptha:e.checks.ptha,lif:e.checks.lif,scaled:e.checks.scaled,ground_support:e.checks.groundSupport,bolt_pattern:e.checks.boltPattern,shotcrete_quality:e.checks.shotcreteQuality,ventilation:e.checks.ventilation,services_clear:e.checks.servicesClear,barricades:e.checks.barricades,reentry:e.checks.reentry,synced_by:"UDS Development Pro v9",created_by:currentUser?.id||null,created_by_email:currentUser?.email||""};let r=await fetch(`${SUPABASE_URL}/rest/v1/development_entries`,{method:"POST",headers:headers({"Prefer":"return=representation"}),body:JSON.stringify(body)});if(!r.ok)throw new Error(await r.text());let s=(await r.json())[0];e.cloud_id=s.id;for(let i=0;i<(e.photos||[]).length;i++){let u=await uploadPhoto(e.photos[i],s.id,i);await insertPhoto(s.id,u)}e.synced=true}
function extraNotes(e){return `Crew: ${e.crew||""}; Supervisor: ${e.supervisor||""}; Foreman: ${e.foreman||""}; Personnel: ${e.personnel||0}; Cable bolts: ${e.cableBolts||0}; Delay type: ${e.delayType||""}; Delay hours: ${e.delayHours||0}; Safety observation: ${e.safetyObservation||""}; Good catch: ${e.goodCatch||""}; Notes: ${e.notes||""}`}
async function uploadPhoto(d,id,i){let blob=dataUrlToBlob(d),path=`${id}/${Date.now()}_${i}.jpg`;let r=await fetch(`${SUPABASE_URL}/storage/v1/object/${PHOTO_BUCKET}/${path}`,{method:"POST",headers:{"apikey":SUPABASE_ANON_KEY,"Authorization":"Bearer "+SUPABASE_ANON_KEY,"Content-Type":blob.type,"x-upsert":"true"},body:blob});if(!r.ok)throw new Error(await r.text());return `${SUPABASE_URL}/storage/v1/object/public/${PHOTO_BUCKET}/${path}`}
async function insertPhoto(id,u){let r=await fetch(`${SUPABASE_URL}/rest/v1/development_photos`,{method:"POST",headers:headers(),body:JSON.stringify({development_entry_id:id,photo_url:u,caption:""})});if(!r.ok)throw new Error(await r.text())}
async function syncAction(a){let body={heading:a.heading,priority:a.priority,action_text:a.actionText,owner:a.owner,due_date:a.dueDate||null,status:a.status,created_by:currentUser?.id||null,created_by_email:currentUser?.email||""};let r=await fetch(`${SUPABASE_URL}/rest/v1/development_actions`,{method:"POST",headers:headers({"Prefer":"return=representation"}),body:JSON.stringify(body)});if(!r.ok)throw new Error(await r.text());a.cloud_id=(await r.json())[0].id;a.synced=true}
async function loadCloudCount(){if(!supabaseReady()){alert("Supabase key is not configured yet.");return}try{let r=await fetch(`${SUPABASE_URL}/rest/v1/development_entries?select=id`,{headers:headers()});if(!r.ok)throw new Error(await r.text());alert(`Cloud has ${(await r.json()).length} development entries.`)}catch(e){alert("Could not check cloud: "+e.message)}}

async function callAI(task,payload){if(!supabaseReady()){alert("Supabase key is not configured.");return}aiOutput.textContent="Working...";try{let r=await fetch(`${SUPABASE_URL}/functions/v1/${AI_FUNCTION_NAME}`,{method:"POST",headers:headers(),body:JSON.stringify({task,payload})});let data=await r.json();aiStatus.textContent="AI function working.";aiOutput.textContent=data.result||JSON.stringify(data,null,2)}catch(e){aiStatus.textContent="AI error.";aiOutput.textContent="AI error: "+e.message}}
function allPayload(){return{entries,actions,question:val("rawNote"),date:val("aiDate")||val("reportDate")}} function aiPayloadForDate(){let d=val("aiDate")||val("reportDate");return{date:d,entries:entries.filter(e=>e.date===d),actions:actions.filter(a=>a.status!=="Closed")}}
function aiDailyReport(){callAI("daily_report",aiPayloadForDate())} function aiShiftHandover(){callAI("shift_handover",aiPayloadForDate())} function aiTrendAnalysis(){callAI("trend_analysis",allPayload())} function aiSupervisorDashboard(){callAI("supervisor_dashboard",allPayload())} function aiAskQuestion(){callAI("voice_ai_assistant",allPayload())} function aiSafetySummary(){callAI("safety_summary",aiPayloadForDate())} function testAI(){callAI("test",{message:"Confirm UDS AI Edge Function is working."})}

function renderAll(){renderDashboard();renderActions();renderGallery();renderMineMap();checkSupabase()}
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
