const vaultName = 'wiz-news-access-v1';
const repository = 'https://api.github.com/repos/motomocards/wiz-kk-website';
const utf8 = new TextEncoder();
function base64(bytes) {
  let text = '';
  for (const byte of bytes) text += String.fromCharCode(byte);
  return btoa(text);
}
const decode64 = text => Uint8Array.from(atob(text), c => c.charCodeAt(0));
async function vaultKey(password, salt) {
  const source = await crypto.subtle.importKey('raw',utf8.encode(password),'PBKDF2',false,['deriveKey']);
  return crypto.subtle.deriveKey({name:'PBKDF2',hash:'SHA-256',iterations:600000,salt},source,
    {name:'AES-GCM',length:256},false,['encrypt','decrypt']);
}
async function api(path, method='GET', payload) {
  const response = await fetch(repository+path,{method,cache:'no-store',credentials:'omit',redirect:'error',
    headers:{Authorization:'Bearer '+token,Accept:'application/vnd.github+json','Content-Type':'application/json'},
    body:payload && JSON.stringify(payload)});
  if (!response.ok) throw new Error('GitHub '+response.status);
  return response.json();
}
function configure(setup) {
  field('setup').hidden = !setup;
  field('access').required = setup;
  field('password').minLength = setup ? 12 : 1;
  field('password').autocomplete = setup ? 'new-password' : 'current-password';
  field('enter').textContent = setup ? 'このブラウザに接続を保存' : 'ログイン';
  field('reconnect').hidden = setup;
}
configure(!localStorage.getItem(vaultName));
field('reconnect').onclick = () => configure(true);
field('login').onsubmit = async event => {
  event.preventDefault();
  const auth = field('auth-status'), setup = !field('setup').hidden;
  field('enter').disabled = true;
  try {
    const password = field('password').value;
    let vault;
    if (setup) {
      token = field('access').value.trim();
      const salt = crypto.getRandomValues(new Uint8Array(16)), iv = crypto.getRandomValues(new Uint8Array(12));
      const key = await vaultKey(password,salt);
      const encrypted = await crypto.subtle.encrypt({name:'AES-GCM',iv},key,utf8.encode(token));
      vault = JSON.stringify({salt:base64(salt),iv:base64(iv),data:base64(new Uint8Array(encrypted))});
    } else {
      const saved = JSON.parse(localStorage.getItem(vaultName));
      const key = await vaultKey(password,decode64(saved.salt));
      token = new TextDecoder().decode(await crypto.subtle.decrypt({name:'AES-GCM',iv:decode64(saved.iv)},key,decode64(saved.data)));
    }
    if (!(await api('')).permissions?.push) throw new Error('権限');
    const files = (await api('/contents?ref=main')).filter(file=>/^wiz-post-[A-Za-z0-9-]+\.json$/.test(file.name));
    files.sort((a,b)=>b.name.localeCompare(a.name));
    const items = await Promise.all(files.map(async file=>{
      const blob = await api('/git/blobs/'+file.sha);
      return JSON.parse(new TextDecoder().decode(decode64(blob.content)));
    }));
    if (vault) localStorage.setItem(vaultName,vault);
    entries.clear(); versions.clear(); picker.length = 1;
    files.forEach((file,i)=>{
      const path = '/'+file.name;
      entries.set(path,items[i]); versions.set(path,file.sha); picker.add(new Option(items[i].title,path));
    });
    field('login').reset(); field('login').hidden = true;
    field('panel').hidden = false; auth.textContent = ''; picker.onchange();
  } catch (error) {
    token = '';
    auth.textContent = error.name === 'OperationError' ? 'パスワードを確認してください。' : '接続できません。通信状態とサイト専用トークンの権限・期限を確認してください。';
  } finally {field('enter').disabled = false;}
};
field('logout').onclick = () => location.reload();
field('delete-post').onclick = () => writePost(picker.value,null);
async function writePost(path,item) {
  if (!token || !/^\/wiz-post-[a-zA-Z0-9-]+\.json$/.test(path) || field('save').disabled) return;
  const existing = entries.get(path);
  if (!item && !existing) return;
  const status = field('list-status'), controls = [picker,field('save'),field('delete-post'),field('logout')];
  controls.forEach(control=>control.disabled=true);
  field('editor').inert = true;
  try {
    const change = {branch:'main',message:(item?'Publish news: ':'Delete news: ')+(item || existing).title};
    if (existing) change.sha = versions.get(path);
    if (item) change.content = base64(utf8.encode(JSON.stringify(item)));
    const result = await api('/contents'+path,item?'PUT':'DELETE',change);
    if (item) {
      versions.set(path,result.content.sha); entries.set(path,item);
      if (!existing) picker.add(new Option(item.title,path),1);
      picker.value = path; picker.selectedOptions[0].textContent = item.title;
    } else {
      versions.delete(path); entries.delete(path); picker.selectedOptions[0].remove(); picker.value = '';
    }
    picker.onchange();
    status.textContent = '「'+(item || existing).title+'」を'+(item?'保存':'削除')+'しました。公開ページに順次反映されます。';
  } catch (error) {
    status.textContent = '変更を確定できませんでした。公開状況と接続設定を確認してください。'+error.message;
  } finally {
    controls.forEach(control=>control.disabled=false);field('editor').inert=false;
    status.scrollIntoView({block:'center'});
  }
}
