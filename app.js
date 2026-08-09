const $ = (id) => document.getElementById(id);
const storeKey = 'money-journal-data-v1';
const categories = { expense: [['食費','🍚'],['日用品','🧺'],['交通','🚃'],['趣味','🎨'],['交際','☕'],['固定費','🏠'],['医療','💊'],['その他','⋯']], income: [['給与','💼'],['副収入','✨'],['おこづかい','🎁'],['その他','⋯']] };
let filter = 'all'; let selectedType = 'expense';
let data = load();

function load(){ const initial={transactions:[],goal:{name:'貯金目標',target:0,saved:0},categories:{expense:[],income:[]}}; try { const saved=JSON.parse(localStorage.getItem(storeKey)); return saved ? {...initial,...saved,goal:{...initial.goal,...saved.goal},categories:{...initial.categories,...saved.categories}} : initial; } catch { return initial; } }
function persist(){ localStorage.setItem(storeKey, JSON.stringify(data)); }
function yen(value){ return new Intl.NumberFormat('ja-JP',{style:'currency',currency:'JPY',maximumFractionDigits:0}).format(value); }
function dateValue(date = new Date()){ const offset=date.getTimezoneOffset()*60000; return new Date(date-offset).toISOString().slice(0,10); }
function monthValue(date = new Date()){ return dateValue(date).slice(0,7); }
function currentMonth(){ return $('monthInput').value || monthValue(); }
function formatMonth(month){ const [year, m] = month.split('-'); return `${year}年${Number(m)}月`; }
function allCategories(type){ return [...categories[type].map(([name])=>name), ...(data.categories[type]||[])]; }
function categoryOptions(type, selected=''){ const names=allCategories(type); if(selected && !names.includes(selected)) names.push(selected); $('category').innerHTML=names.map(name=>`<option value="${escapeHtml(name)}" ${name===selected?'selected':''}>${escapeHtml(name)}</option>`).join('')+'<option value="__new__">＋ 新しいカテゴリを追加</option>'; toggleNewCategory(); }
function iconFor(category){ return Object.values(categories).flat().find(([name])=>name===category)?.[1] || '◌'; }

function render(){
  const month=currentMonth(); $('currentMonth').textContent=formatMonth(month);
  const list=data.transactions.filter(t=>t.date.startsWith(month));
  const income=list.filter(t=>t.type==='income').reduce((s,t)=>s+t.amount,0);
  const expense=list.filter(t=>t.type==='expense').reduce((s,t)=>s+t.amount,0);
  $('monthlyIncome').textContent=yen(income); $('monthlyExpense').textContent=yen(expense); $('monthlyBalance').textContent=yen(income-expense);
  const expenses=list.filter(t=>t.type==='expense'); const totalByCategory={}; expenses.forEach(t=>totalByCategory[t.category]=(totalByCategory[t.category]||0)+t.amount);
  const top=Object.entries(totalByCategory).sort((a,b)=>b[1]-a[1])[0]; $('topCategory').textContent=top?.[0]||'—'; $('topCategoryAmount').textContent=yen(top?.[1]||0); $('transactionCount').textContent=`${list.length}件`;
  const {name,target,saved}=data.goal; $('goalTitle').textContent=name||'貯金目標'; $('savedAmount').textContent=yen(saved||0); $('goalAmount').textContent=target?`目標 ${yen(target)}`:'目標を設定'; const percent=target?Math.min(100,(saved/target)*100):0; $('goalProgress').style.width=`${percent}%`; $('goalNote').textContent=target?(saved>=target?'目標達成です！おめでとうございます。':`目標まであと ${yen(Math.max(0,target-saved))}`):'まずは目標を設定しましょう';
  const visible=filter==='all'?list:list.filter(t=>t.type===filter); const container=$('transactionList'); container.innerHTML=visible.sort((a,b)=>b.date.localeCompare(a.date)||b.createdAt-a.createdAt).map(t=>`<article class="transaction" data-id="${t.id}"><span class="category-icon">${iconFor(t.category)}</span><div class="transaction-info"><strong>${escapeHtml(t.memo)||t.category}</strong><span>${t.category} · ${new Date(t.date+'T00:00:00').toLocaleDateString('ja-JP',{month:'numeric',day:'numeric'})}</span></div><span class="transaction-amount ${t.type}">${t.type==='income'?'+':'−'}${yen(t.amount)}</span></article>`).join('');
  $('emptyState').hidden=visible.length>0; $('filterButton').textContent=(filter==='all'?'すべて':filter==='income'?'収入':'支出')+' ▾';
}
function escapeHtml(str=''){ return str.replace(/[&<>'"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c])); }
function openTransaction(transaction){ const editing=!!transaction; $('transactionDialogTitle').textContent=editing?'明細を編集':'明細を追加'; $('transactionId').value=transaction?.id||''; selectedType=transaction?.type||'expense'; $('amount').value=transaction?.amount||''; $('transactionDate').value=transaction?.date||dateValue(); $('memo').value=transaction?.memo||''; $('newCategoryName').value=''; setType(selectedType,transaction?.category); $('deleteTransaction').hidden=!editing; $('transactionDialog').showModal(); }
function setType(type, selectedCategory){ selectedType=type; document.querySelectorAll('.type-switch button').forEach(b=>b.classList.toggle('selected',b.dataset.type===type)); categoryOptions(type,selectedCategory); }
function toggleNewCategory(){ const adding=$('category').value==='__new__'; $('newCategoryRow').hidden=!adding; $('newCategoryName').required=adding; if(adding) $('newCategoryName').focus(); }

$('addTransaction').onclick=()=>openTransaction();
document.querySelectorAll('.type-switch button').forEach(b=>b.onclick=()=>setType(b.dataset.type));
$('category').onchange=toggleNewCategory;
$('transactionForm').addEventListener('submit',e=>{ e.preventDefault(); const amount=Number($('amount').value); if(!amount) return; const id=$('transactionId').value; let category=$('category').value; if(category==='__new__'){ category=$('newCategoryName').value.trim(); if(!category) return $('newCategoryName').focus(); if(!allCategories(selectedType).includes(category)) data.categories[selectedType].push(category); } const tx={id:id||crypto.randomUUID(),type:selectedType,amount,category,date:$('transactionDate').value,memo:$('memo').value.trim(),createdAt:id?data.transactions.find(t=>t.id===id).createdAt:Date.now()}; if(id) data.transactions=data.transactions.map(t=>t.id===id?tx:t); else data.transactions.push(tx); persist(); $('transactionDialog').close(); render(); });
$('deleteTransaction').onclick=()=>{ const id=$('transactionId').value; if(confirm('この明細を削除しますか？')){data.transactions=data.transactions.filter(t=>t.id!==id);persist();$('transactionDialog').close();render();} };
$('transactionList').onclick=e=>{ const row=e.target.closest('.transaction'); if(row) openTransaction(data.transactions.find(t=>t.id===row.dataset.id)); };
$('previousMonth').onclick=()=>changeMonth(-1); $('nextMonth').onclick=()=>changeMonth(1); $('monthPicker').onclick=()=>$('monthInput').showPicker?.() || $('monthInput').click(); $('monthInput').onchange=render;
function changeMonth(amount){ const [y,m]=currentMonth().split('-').map(Number); $('monthInput').value=`${new Date(y,m-1+amount,1).getFullYear()}-${String(new Date(y,m-1+amount,1).getMonth()+1).padStart(2,'0')}`;render(); }
$('filterButton').onclick=()=>{filter=filter==='all'?'expense':filter==='expense'?'income':'all';render();};
$('editGoal').onclick=()=>$('goalsButton').click(); $('goalsButton').onclick=()=>{const g=data.goal;$('goalNameInput').value=g.name==='貯金目標'?'':g.name;$('goalTargetInput').value=g.target||'';$('goalSavedInput').value=g.saved||'';$('goalDialog').showModal();};
$('goalForm').addEventListener('submit',e=>{e.preventDefault();data.goal={name:$('goalNameInput').value.trim()||'貯金目標',target:Number($('goalTargetInput').value),saved:Number($('goalSavedInput').value)};persist();$('goalDialog').close();render();});
$('settingsButton').onclick=()=>$('settingsDialog').showModal();
$('exportButton').onclick=()=>{const blob=new Blob([JSON.stringify(data,null,2)],{type:'application/json'});const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download=`家計簿バックアップ-${dateValue()}.json`;a.click();URL.revokeObjectURL(a.href);};
$('importInput').onchange=e=>{const reader=new FileReader();reader.onload=()=>{try{const backup=JSON.parse(reader.result);if(!Array.isArray(backup.transactions)||!backup.goal)throw Error();data=backup;persist();$('settingsDialog').close();render();alert('バックアップを復元しました。');}catch{alert('有効なバックアップファイルではありません。');}};if(e.target.files[0])reader.readAsText(e.target.files[0]);};
$('clearData').onclick=()=>{if(confirm('すべての明細と貯金目標を削除しますか？この操作は元に戻せません。')){data={transactions:[],goal:{name:'貯金目標',target:0,saved:0}};persist();$('settingsDialog').close();render();}};
$('analyticsButton').onclick=()=>alert('分析画面は次のアップデートで追加予定です。今月の内訳はホーム画面で確認できます。');
$('monthInput').value=monthValue(); render(); if('serviceWorker' in navigator) navigator.serviceWorker.register('./sw.js');
