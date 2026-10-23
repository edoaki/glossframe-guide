import {clientId, serviceURL} from './mobile-config.js';
const $=id=>document.getElementById(id);
const oauth='https://dash.cloudflare.com/oauth2/';
const callback=new URL('mobile.html',location.href).href.split('?')[0].split('#')[0];
const key='glossframe-mobile-v2';
let token='',accounts=[],saved={},job={},busy=false,expires=0;
try{saved=JSON.parse(localStorage.getItem(key)||'{}');if(!saved||typeof saved!=='object'||Array.isArray(saved))saved={};}catch{}
const persist=()=>{saved[job.account]=job;try{localStorage.setItem(key,JSON.stringify(saved));}catch{}};
function screen(id,step,message){for(const name of ['connect','password-step','building','complete'])$(name).hidden=name!==id;for(const [i,li]of [...document.querySelectorAll('[data-step]')].entries()){if(i===step)li.setAttribute('aria-current','step');else li.removeAttribute('aria-current');}$('notice').textContent=message;}
function error(message=''){$('error').textContent=message;$('error').hidden=!message;}
const bytes64=bytes=>btoa(String.fromCharCode(...bytes)).replaceAll('+','-').replaceAll('/','_').replaceAll('=','');
const random=()=>bytes64(crypto.getRandomValues(new Uint8Array(32)));
async function login(){
 if(busy)return;
 if(!clientId||!serviceURL){error('接続の公開準備中です。少し待ってから開き直してください。');return;}
 const verifier=random(),state=random();
 const challenge=bytes64(new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(verifier))));
 try{sessionStorage.setItem(key+'-oauth',JSON.stringify({verifier,state,time:Date.now()}));}catch{error('このブラウザで一時保存を許可してから再試行してください。');return;}
 const url=new URL(oauth+'auth');
 // Exact identifiers from the registered client; no refresh token is requested.
 url.search=new URLSearchParams({client_id:clientId,scope:'d1.write workers-scripts.edit workers-kv-storage.write ai.write account-settings.read',response_type:'code',redirect_uri:callback,state,code_challenge:challenge,code_challenge_method:'S256'});
 location.assign(url);
}
async function api(route,body={}){
 if(!token||Date.now()>=expires)throw new Error('接続の有効期限が切れました。接続し直して再開してください。');
 const res=await fetch(serviceURL+route,{method:'POST',headers:{'Content-Type':'application/json',Authorization:'Bearer '+token},body:JSON.stringify(body),signal:AbortSignal.timeout(120000)});
 const data=await res.json();if(!res.ok)throw new Error(data.error||'処理が完了しませんでした。');return data;
}
function selectAccount(){
 const account=$('account').value;
 job=saved[account]||{account,name:'glossframe-'+[...crypto.getRandomValues(new Uint8Array(12))].map(x=>x.toString(16).padStart(2,'0')).join('')};
 if(job.account!==account||!/^glossframe-[a-f0-9]{24}$/.test(job.name||''))job={account,name:'glossframe-'+[...crypto.getRandomValues(new Uint8Array(12))].map(x=>x.toString(16).padStart(2,'0')).join('')};
 persist();
 $('password-form').hidden=Boolean(job.ownerReady);
 $('resume').hidden=!job.ownerReady;
 $('password-step').append($('reconnect'));$('reconnect').hidden=false;
 screen('password-step',1,job.ownerReady?'前回の作成記録が見つかりました。同じ環境で再開できます。':'ログインとアカウントの取得が完了しました。作成の許可は各処理で確認します。');
 // Keep the account selector available even after owner registration.
 $('account').closest('label').hidden=false;
}
async function finish(){
 const {url}=await api('/verify',job);
 job.url=url;persist();
 $('open-app').href=url;screen('complete',3,'セットアップが完了しました。');
 const previous=token;token='';expires=0;
 fetch(oauth+'revoke',{method:'POST',headers:{'Content-Type':'application/x-www-form-urlencoded'},body:new URLSearchParams({client_id:clientId,token:previous,token_type_hint:'access_token'})}).catch(()=>{});
}
async function create(password=''){
 if(busy)return;busy=true;error();$('retry').hidden=true;
 screen('building',2,'作成中です。この画面で進み具合を確認できます。');
 const stage=(value,text)=>{$('progress').value=value;$('stage').textContent=text;};
 try{
  if(job.subdomain){stage(4,'公開URLを確認しています…');await finish();return;}
  stage(0,'単語帳と画像の保存場所を準備しています…');
  Object.assign(job,await api('/resources',job));persist();
  if(!job.ownerReady){stage(1,'アプリの鍵を登録しています…');await api('/database',{...job,password});job.ownerReady=true;persist();}
  password='';
  stage(2,'アプリのファイルを準備しています…');
  const upload=await api('/asset-session',job);let jwt=upload.jwt;
  for(const [i,hashes]of upload.buckets.entries()){
   stage(2+((i+1)/Math.max(1,upload.buckets.length)),'アプリのファイルを転送しています…');
   const result=await api('/asset-bucket',{...job,jwt:upload.jwt,hashes});if(result?.jwt)jwt=result.jwt;
  }
  stage(3,'あなたのCloudflareにアプリを公開しています…');
  Object.assign(job,await api('/publish',{...job,jwt}));persist();
  stage(4,'公開URLを確認しています…');await finish();stage(5,'完了しました。');
 }catch(e){
  error($('stage').textContent.replace(/…$/,'')+'で停止しました。'+e.message);
  if(!job.ownerReady){screen('password-step',1,'作成を再開できます。同じパスワードを入力してください。');$('password-form').hidden=false;}
  else{$('retry').hidden=false;$('stage').textContent='処理は停止しています。作成済みのデータは保持しています。';$('reconnect').hidden=false;$('building').append($('reconnect'));}
 }finally{password='';busy=false;}
}
$('login').onclick=login;$('reconnect').onclick=login;$('resume').onclick=()=>create();$('retry').onclick=()=>create();
$('account').onchange=selectAccount;
$('password-form').onsubmit=event=>{event.preventDefault();const password=$('password').value;if(password!==$('confirm').value){error('同じパスワードを2回入力してください。');return;}if(!event.target.reportValidity())return;$('password').value='';$('confirm').value='';create(password);};
$('copy-url').onclick=async()=>{try{await navigator.clipboard.writeText(job.url);$('copy-url').textContent='コピーしました';}catch{error('アプリを開いて、アドレスをコピーしてください。');}};
async function start(){
 const params=new URLSearchParams(location.search);
 const code=params.get('code'),state=params.get('state'),denied=params.has('error');
 if(location.search)history.replaceState(null,'',location.pathname);
 screen('connect',0,'Cloudflareに接続すると、ここへ戻って作成できます。');
 if(!code&&!denied)return;
 try{
  const pending=JSON.parse(sessionStorage.getItem(key+'-oauth')||'null');sessionStorage.removeItem(key+'-oauth');
  if(!pending||pending.state!==state||Date.now()-pending.time>600000||Date.now()<pending.time)throw new Error('接続の確認ができませんでした。もう一度接続してください。');
  if(denied)throw new Error('接続をキャンセルしました。必要なときに再開できます。');
  $('login').disabled=true;$('notice').textContent='Cloudflareとの接続を確認しています…';
  const res=await fetch(oauth+'token',{method:'POST',headers:{'Content-Type':'application/x-www-form-urlencoded'},body:new URLSearchParams({grant_type:'authorization_code',client_id:clientId,redirect_uri:callback,code,code_verifier:pending.verifier}),signal:AbortSignal.timeout(20000)});
  const data=await res.json();if(!res.ok||!data.access_token)throw new Error('接続できませんでした。もう一度接続してください。');
  token=data.access_token;expires=Date.now()+Math.min(Number(data.expires_in)||1800,3600)*1000;
  accounts=(await api('/accounts')).accounts;
  if(!accounts.length)throw new Error('利用できるCloudflareアカウントがありません。');
  $('account').replaceChildren(...accounts.map(x=>new Option(x.name,x.id)));selectAccount();
 }catch(e){error(e.message);screen('connect',0,'接続をやり直せます。作成記録は保持しています。');}finally{$('login').disabled=false;}
}
start();
