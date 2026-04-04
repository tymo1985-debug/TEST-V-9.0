// Service Year Planner v9.0
// Split build: service_year_planner_v9_0_index.html + service_year_planner_v9_0_app.js

const App={/* FINAL v8.5 bugfixes: drawer clickability above bottom nav, single print dialog, local date handling */
    config:{
      storageKey:'service-year-planner-v9-0',
      serviceYearStartMonth:8,
      navItems:[
        {id:'calendar',icon:'📆',title:'Календарь'},
        {id:'weeks',icon:'🗓️',title:'Недели'},
        {id:'events',icon:'🎯',title:'События'},
        {id:'notes',icon:'📝',title:'Заметки'},
        {id:'settings',icon:'⚙️',title:'Настройки'}
      ],
      layoutPresets:[
        {value:'classic',label:'1. Classic'},{value:'compact',label:'2. Compact'},{value:'spacious',label:'3. Spacious'},{value:'cards',label:'4. Cards'},{value:'minimal',label:'5. Minimal'},{value:'dense',label:'6. Dense'},{value:'pill',label:'7. Pill'},{value:'outline',label:'8. Outline'},{value:'agenda',label:'9. Agenda'},{value:'board',label:'10. Board'}
      ],
      monthNames:['Январь','Февраль','Март','Апрель','Май','Июнь','Июль','Август','Сентябрь','Октябрь','Ноябрь','Декабрь'],
      dayNames:['Пн','Вт','Ср','Чт','Пт','Сб','Вс']
    },
    els:{},
    state:{app:null,selectedScreen:'calendar',selectedYear:new Date().getFullYear(),selectedWeekId:null,editingEventId:null,calendarMonth:new Date().getMonth(),calendarYear:new Date().getFullYear(),calendarEditingWeekId:null,calendarDetailWeekId:null,calendarEventFilter:'all',pdfExportType:'month-grid',calendarEditorMode:'edit',calendarCreateDate:null,pdfRangeStart:'',pdfRangeEnd:'',exportType:'json',exportRangeStart:'',exportRangeEnd:''},
    utils:{
      uid(prefix='id'){return prefix+'_'+Math.random().toString(36).slice(2,10)},
      iso(date){const d=new Date(date);const y=d.getFullYear();const m=String(d.getMonth()+1).padStart(2,'0');const day=String(d.getDate()).padStart(2,'0');return `${y}-${m}-${day}`},
      parseLocalDate(value){const p=String(value).split('-').map(Number);return new Date(p[0],(p[1] || 1)-1,p[2] || 1)},
      addDays(date,days){const d=new Date(date);d.setDate(d.getDate()+days);return d},
      startOfWeek(date){const d=new Date(date);const day=(d.getDay()+6)%7;d.setDate(d.getDate()-day);d.setHours(0,0,0,0);return d},
      prettyDate(date){return new Date(date).toLocaleDateString(App.state.app?.settings?.language || 'ru',{day:'2-digit',month:'short'})},
      daysDiff(a,b){return Math.round((App.utils.parseLocalDate(App.utils.iso(a))-App.utils.parseLocalDate(App.utils.iso(b)))/86400000)},
      overlaps(startA,endA,startB,endB){return startA<=endB&&endA>=startB},
      getServiceYearForDate(date){const d=new Date(date);return d.getMonth()>=App.config.serviceYearStartMonth?d.getFullYear():d.getFullYear()-1},
      serviceYearLabel(year){return `${year}/${year+1}`},
      actualYearForServiceMonth(serviceYear,month){return month>=App.config.serviceYearStartMonth?serviceYear:serviceYear+1},
      actualDateForServiceMonth(serviceYear,month,day=1){return new Date(App.utils.actualYearForServiceMonth(serviceYear,month),month,day)},
      orderedServiceMonths(){return [8,9,10,11,0,1,2,3,4,5,6,7]},
      escapeHtml(str){return String(str).replace(/[&<>"']/g, s => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[s]))},
      toast(message){const el=document.createElement('div');el.className='toast';el.textContent=message;App.els.toastWrap.appendChild(el);setTimeout(()=>el.remove(),3500)}
    },
    store:{
      ensureSettingsDefaults(settings){settings=settings || {};if(typeof settings.showTeamPanel!=='boolean')settings.showTeamPanel=true;if(!settings.language)settings.language='ru';if(!settings.theme)settings.theme='light';if(!settings.layoutPreset)settings.layoutPreset='classic';return settings},
 buildServiceYear(year){
  year = Number(year);
  const startBoundary = new Date(year, App.config.serviceYearStartMonth, 1);
  const endBoundary = new Date(year+1, App.config.serviceYearStartMonth-1, 31);
  let current = App.utils.startOfWeek(startBoundary);
  const endWeek = App.utils.addDays(App.utils.startOfWeek(endBoundary), 6);
  const weeks = [];
  while(current <= endWeek){
    const weekStart = new Date(current);
    const weekEnd = App.utils.addDays(weekStart, 6);
    weeks.push({
      id: App.utils.uid('week'),
      year,
      weekNo: weeks.length + 1,
      startDate: App.utils.iso(weekStart),
      endDate: App.utils.iso(weekEnd),
      assignedEventId: '',
      priority: 'normal',
      flags: {letter:false, s302:false},
      note: '',
      updatedAt: new Date().toISOString()
    });
    current = App.utils.addDays(current, 7);
  }
  return {id:String(year), year, weeks};
 },
      createDefaultData(){const years=[2025,2026,2027,2028];const events=[{id:App.utils.uid('evt'),name:'Встреча выходного дня',color:'#1f7a45',address:'Основной зал',schedule:'Сб 10:00, Вс 10:00'},{id:App.utils.uid('evt'),name:'Собрание в будни',color:'#2563eb',address:'Малый зал',schedule:'Ср 19:00'},{id:App.utils.uid('evt'),name:'Особое событие',color:'#9333ea',address:'Выездная площадка',schedule:'По плану'},{id:App.utils.uid('evt'),name:'Уроки',color:'#ef4444',address:'Учебная комната',schedule:'По расписанию'}];const serviceYears={};years.forEach(year=>{const startBoundary=new Date(year,8,1);const endBoundary=new Date(year+1,7,31);let current=App.utils.startOfWeek(startBoundary);const endWeek=App.utils.addDays(App.utils.startOfWeek(endBoundary),6);const weeks=[];while(current<=endWeek){const weekStart=new Date(current),weekEnd=App.utils.addDays(weekStart,6);const assigned=weeks.length%5===0?events[3].id:(weeks.length%4===0?events[1].id:(weeks.length%3===0?events[0].id:''));weeks.push({id:App.utils.uid('week'),year,weekNo:weeks.length+1,startDate:App.utils.iso(weekStart),endDate:App.utils.iso(weekEnd),assignedEventId:assigned,priority:weeks.length%9===0?'critical':(weeks.length%4===0?'important':'normal'),flags:{letter:weeks.length%6===0,s302:weeks.length%8===0},note:weeks.length%5===0?'Подготовить материалы и проверить назначения на неделю.':'',updatedAt:new Date().toISOString()});current=App.utils.addDays(current,7)}serviceYears[year]={id:String(year),year,weeks}});return{settings:App.store.ensureSettingsDefaults({language:'ru',theme:'light',showTeamPanel:true,layoutPreset:'classic'}),serviceYears,events,meta:{version:8.5,createdAt:new Date().toISOString(),updatedAt:new Date().toISOString()}}},
      normalize(data){data.settings=App.store.ensureSettingsDefaults(data.settings);if(!data.meta)data.meta={version:8.5,createdAt:new Date().toISOString(),updatedAt:new Date().toISOString()};const validEventIds=new Set((data.events || []).map(e=>e.id));Object.keys(data.serviceYears || {}).forEach(yearKey=>{const yearObj=data.serviceYears[yearKey];yearObj.weeks=(yearObj.weeks || []).sort((a,b)=>a.startDate.localeCompare(b.startDate));yearObj.weeks.forEach((w,idx)=>{w.year=Number(yearKey);w.weekNo=idx+1;w.flags=w.flags || {letter:false,s302:false};w.priority=w.priority || 'normal';w.note=w.note || '';if(w.assignedEventId&&!validEventIds.has(w.assignedEventId))w.assignedEventId=''})});return data},
      importBackupSchema(backup){const meetings=Array.isArray(backup.meetings)?backup.meetings:[];const serviceYears={},eventMap=new Map(),events=[];meetings.forEach(m=>{const key=String(m.name || '').trim();if(!key || eventMap.has(key))return;const parts=[];if(m.wd&&m.tWD)parts.push(`${m.wd} ${m.tWD}`);if(m.we&&m.tWE)parts.push(`${m.we} ${m.tWE}`);const ev={id:App.utils.uid('evt'),name:key,color:m.color || '#1f7a45',address:m.addr || '',schedule:parts.join(', ')};eventMap.set(key,ev.id);events.push(ev)});Object.entries(backup.data || {}).forEach(([yearKey,rows])=>{const serviceYear=Number(yearKey);const boundary=App.utils.startOfWeek(new Date(serviceYear,8,1));const weeks=[];(rows || []).forEach((row,idx)=>{const fallbackStart=App.utils.addDays(boundary,idx*7),fallbackEnd=App.utils.addDays(fallbackStart,6),meetingName=String(row.m || '').trim();weeks.push({id:App.utils.uid('week'),year:serviceYear,weekNo:idx+1,startDate:row.s || App.utils.iso(fallbackStart),endDate:row.e || App.utils.iso(fallbackEnd),assignedEventId:eventMap.get(meetingName) || '',priority:'normal',flags:{letter:false,s302:false},note:row.nt || '',updatedAt:new Date().toISOString()})});serviceYears[serviceYear]={id:String(serviceYear),year:serviceYear,weeks}});return App.store.normalize({settings:App.store.ensureSettingsDefaults({language:'ru',theme:'light',showTeamPanel:true,layoutPreset:'classic'}),serviceYears,events,meta:{version:8.5,createdAt:new Date().toISOString(),updatedAt:new Date().toISOString()}})},
      load(){const saved=localStorage.getItem(App.config.storageKey);App.state.app=saved?App.store.normalize(JSON.parse(saved)):App.store.createDefaultData();const now=new Date(),sy=App.utils.getServiceYearForDate(now);App.state.selectedYear=App.state.app.serviceYears[sy]?sy:Number(Object.keys(App.state.app.serviceYears)[0]);App.state.calendarYear=App.state.selectedYear;App.state.calendarMonth=now.getMonth();App.ui.applyTheme()},
      save(){App.state.app.meta.updatedAt=new Date().toISOString();localStorage.setItem(App.config.storageKey,JSON.stringify(App.state.app));App.ui.renderAll()},
      getWeeks(){return App.state.app?.serviceYears?.[App.state.selectedYear]?.weeks || []},
      getAllWeeks(){return Object.values(App.state.app?.serviceYears || {}).flatMap(y=>y.weeks)},
      getWeekById(id){return App.store.getAllWeeks().find(w=>w.id===id)},
      getEventById(id){return App.state.app?.events?.find(e=>e.id===id)}
    },
    ui:{
      applyTheme(){App.state.app.settings=App.store.ensureSettingsDefaults(App.state.app.settings);document.documentElement.setAttribute('data-theme',App.state.app.settings.theme || 'light');document.documentElement.setAttribute('data-layout',App.state.app.settings.layoutPreset || 'classic')},
      cacheElements(){['appRoot','desktopNav','toastWrap','offlineBanner','sideStatus','screenTitle','screenSubtitle','weekSearch','yearSelect','eventFilter','weekList','weekEditorTitle','weekEditorEmpty','weekEditor','weekEventSelect','weekPrioritySelect','flagLetter','flagS302','weekNoteInput','saveWeekBtn','monthLabel','calendarRangeLabel','calendarGrid','prevMonthBtn','todayMonthBtn','nextMonthBtn','calendarYearSelect','calendarLayoutPresetSelect','layoutPresetSelect','calendarEditor','editorTitle','editorMeta','editorEventSelect','editorStart','editorEnd','editorReadonly','editorCloseBtn','editorCancelBtn','editorDeleteBtn','editorSaveBtn','calendarServiceYearLabel','calendarPanelYearLabel','calendarQuickList','calendarSideTitle','calendarSideMeta','calendarSideDetails','calendarEventQuickFilter','toggleTeamPanelBtn','calendarLayout','eventsList','eventNameInput','eventColorInput','eventAddressInput','eventScheduleInput','resetEventBtn','saveEventBtn','noteSearch','notesList','languageSelect','themeSelect','settingsPdfBtn','backupBtn','resetAppBtn','themeBtn','exportBtn','importInput','pdfModal','pdfModalCloseBtn','pdfCancelBtn','pdfExportConfirmBtn','pdfRangeCard','pdfRangeStartInput','pdfRangeEndInput','pdfRangeHelp','pdfHint','bottomNav','bottomNavRow','mobileOverlay','mobileMenuToggleBtn','addYearInput','addNextYearBtn','addYearBtn','exportModal','exportModalCloseBtn','exportCancelBtn','exportConfirmBtn','exportRangeCard','exportRangeStartInput','exportRangeEndInput','exportRangeHelp'].forEach(id=>App.els[id]=document.getElementById(id))},
      setDrawer(open){App.els.appRoot.classList.toggle('menu-open',open);document.body.classList.toggle('menu-open',open);App.els.mobileOverlay.hidden=!open},
      syncLayoutSelectors(){const value=App.state.app.settings.layoutPreset || 'classic';const html=App.config.layoutPresets.map(p=>`<option value="${p.value}">${p.label}</option>`).join('');App.els.layoutPresetSelect.innerHTML=html;App.els.layoutPresetSelect.value=value;App.els.calendarLayoutPresetSelect.innerHTML=html;App.els.calendarLayoutPresetSelect.value=value},
      renderNav(){App.els.desktopNav.innerHTML='';App.config.navItems.forEach(item=>{const btn=document.createElement('button');btn.className='nav-btn'+(App.state.selectedScreen===item.id?' active':'');btn.type='button';btn.innerHTML=`<span>${item.icon}</span><span>${item.title}</span>`;btn.addEventListener('click',()=>{App.state.selectedScreen=item.id;if(window.innerWidth<=1200)App.ui.setDrawer(false);App.ui.renderAll()});App.els.desktopNav.appendChild(btn)});App.els.bottomNavRow.innerHTML='';App.config.navItems.forEach(item=>{const btn=document.createElement('button');btn.className='bottom-nav-btn'+(App.state.selectedScreen===item.id?' active':'');btn.type='button';btn.innerHTML=`<span class="icon">${item.icon}</span><span class="label">${item.title}</span>`;btn.addEventListener('click',()=>{App.state.selectedScreen=item.id;App.ui.setDrawer(false);App.ui.renderAll()});App.els.bottomNavRow.appendChild(btn)})},
      renderScreens(){document.querySelectorAll('.screen').forEach(s=>s.classList.toggle('active',s.id===App.state.selectedScreen));if(App.state.selectedScreen!=='calendar')App.ui.closeCalendarEditor()},
      subtitleForScreen(screen){if(screen==='calendar' || screen==='weeks')return `Служебный год: ${App.utils.serviceYearLabel(App.state.selectedYear)}`;if(screen==='events')return 'Шаблоны событий';if(screen==='notes')return 'Недельные заметки';return 'Внешний вид и экспорт'},
      currentWeek(){const today=new Date();return App.store.getAllWeeks().find(w=>{const s=new Date(w.startDate),e=new Date(w.endDate);e.setHours(23,59,59,999);return today>=s&&today<=e}) || App.store.getWeeks()[0]},
      populateEditorEventSelect(selectedId=''){const options=['<option value="">Выбери событие</option>'].concat((App.state.app.events || []).map(e=>`<option value="${e.id}">${App.utils.escapeHtml(e.name)}</option>`));App.els.editorEventSelect.innerHTML=options.join('');App.els.editorEventSelect.value=selectedId || ''},
      renderWeekFilters(){const years=Object.keys(App.state.app.serviceYears).sort((a,b)=>Number(a)-Number(b));const yearOptions=years.map(y=>`<option value="${y}">${App.utils.serviceYearLabel(Number(y))}</option>`).join('');App.els.yearSelect.innerHTML=yearOptions;App.els.yearSelect.value=String(App.state.selectedYear);App.els.calendarYearSelect.innerHTML=yearOptions;App.els.calendarYearSelect.value=String(App.state.calendarYear);const options=[`<option value="all">Все события</option>`].concat(App.state.app.events.map(e=>`<option value="${e.id}">${App.utils.escapeHtml(e.name)}</option>`));App.els.eventFilter.innerHTML=options.join('');App.els.weekEventSelect.innerHTML=[`<option value="">Без события</option>`].concat(App.state.app.events.map(e=>`<option value="${e.id}">${App.utils.escapeHtml(e.name)}</option>`)).join('');App.els.calendarEventQuickFilter.innerHTML=options.join('');App.els.calendarEventQuickFilter.value=App.state.calendarEventFilter;App.ui.populateEditorEventSelect(App.els.editorEventSelect?.value || '');App.ui.syncLayoutSelectors()},
      renderWeeks(){const query=App.els.weekSearch.value.trim().toLowerCase();const filterEvent=App.els.eventFilter.value || 'all';const weeks=App.store.getWeeks().filter(w=>{const event=App.store.getEventById(w.assignedEventId);const hit=!query || [String(w.weekNo),w.note || '',event?.name || '',w.startDate,w.endDate].join(' ').toLowerCase().includes(query);const eventOk=filterEvent==='all' || w.assignedEventId===filterEvent;return hit&&eventOk});App.els.weekList.innerHTML=weeks.length?'':'<div class="empty">Ничего не найдено.</div>';weeks.forEach(w=>{const event=App.store.getEventById(w.assignedEventId);const item=document.createElement('div');item.className='week-item'+(App.state.selectedWeekId===w.id?' active':'');item.innerHTML=`<div class="week-item-top"><div><div class="week-title">Неделя ${w.weekNo}</div><div class="week-sub">${App.utils.prettyDate(w.startDate)} — ${App.utils.prettyDate(w.endDate)}</div></div><span class="badge">${w.priority}</span></div><div class="pill-row"><span class="pill"><span class="dot" style="background:${event?.color || '#64748b'}"></span>${App.utils.escapeHtml(event?.name || 'Без события')}</span>${w.flags.letter?'<span class="pill">Письмо</span>':''}${w.flags.s302?'<span class="pill">S302</span>':''}</div><div class="small">${App.utils.escapeHtml((w.note || '').slice(0,100) || '—')}</div>`;item.addEventListener('click',()=>{App.state.selectedWeekId=w.id;App.ui.renderWeeks();App.ui.renderWeekEditor()});App.els.weekList.appendChild(item)});if(!App.state.selectedWeekId&&weeks[0])App.state.selectedWeekId=weeks[0].id;App.ui.renderWeekEditor()},
      renderWeekEditor(){const w=App.store.getWeekById(App.state.selectedWeekId);App.els.weekEditor.hidden=!w;App.els.weekEditorEmpty.hidden=!!w;if(!w)return;App.els.weekEditorTitle.textContent=`Неделя ${w.weekNo} • ${App.utils.prettyDate(w.startDate)} — ${App.utils.prettyDate(w.endDate)}`;App.els.weekEventSelect.value=w.assignedEventId || '';App.els.weekPrioritySelect.value=w.priority || 'normal';App.els.flagLetter.checked=!!w.flags?.letter;App.els.flagS302.checked=!!w.flags?.s302;App.els.weekNoteInput.value=w.note || ''},
      visibleMonthItems(month=App.state.calendarMonth,year=App.state.calendarYear){const actualYear=App.utils.actualYearForServiceMonth(year,month);const monthStart=new Date(actualYear,month,1),monthEnd=new Date(actualYear,month+1,0);return App.store.getAllWeeks().filter(item=>item.assignedEventId&&App.store.getEventById(item.assignedEventId)&&App.utils.overlaps(App.utils.parseLocalDate(item.startDate),App.utils.parseLocalDate(item.endDate),monthStart,monthEnd)).sort((a,b)=>a.startDate.localeCompare(b.startDate) || a.endDate.localeCompare(b.endDate))},
      closeCalendarEditor(){App.state.calendarEditingWeekId=null;App.state.calendarEditorMode='edit';App.state.calendarCreateDate=null;App.els.calendarEditor.hidden=true},
      openCalendarEditor(week){if(!week)return;App.state.calendarEditorMode='edit';App.state.calendarCreateDate=null;App.state.calendarEditingWeekId=week.id;const event=App.store.getEventById(week.assignedEventId);App.els.editorTitle.textContent=App.ui.calendarItemLabel(week);App.els.editorMeta.textContent=`${week.startDate} — ${week.endDate}`;App.ui.populateEditorEventSelect(week.assignedEventId || '');App.els.editorStart.value=week.startDate;App.els.editorEnd.value=week.endDate;App.els.editorReadonly.textContent=event?`${event.address || '—'} • ${event.schedule || '—'}`:`Период события: ${week.startDate} — ${week.endDate}`;App.els.editorDeleteBtn.hidden=false;App.els.calendarEditor.hidden=false},
      openCalendarCreateEditor(dayIso){App.state.calendarEditorMode='create';App.state.calendarCreateDate=dayIso;App.state.calendarEditingWeekId=null;App.els.editorTitle.textContent='Новое событие';App.els.editorMeta.textContent=dayIso;App.ui.populateEditorEventSelect('');App.els.editorStart.value=dayIso;App.els.editorEnd.value=dayIso;App.els.editorReadonly.textContent='Нажми на день, выбери шаблон события и сохрани.';App.els.editorDeleteBtn.hidden=true;App.els.calendarEditor.hidden=false},
      calendarItemLabel(item){const event=App.store.getEventById(item?.assignedEventId);return event?.name || `Неделя ${item?.weekNo || '—'}`},
      renderCalendarSidebar(){const serviceYear=App.state.calendarYear;App.els.calendarServiceYearLabel.textContent=`Служебный год: ${App.utils.serviceYearLabel(serviceYear)}`;App.els.calendarPanelYearLabel.textContent=`Служебный год: ${App.utils.serviceYearLabel(serviceYear)}`;const weeks=App.store.getAllWeeks().filter(w=>w.year===serviceYear);const filtered=App.state.calendarEventFilter==='all'?weeks:weeks.filter(w=>w.assignedEventId===App.state.calendarEventFilter);const assigned=filtered.filter(w=>w.assignedEventId&&App.store.getEventById(w.assignedEventId)).length;const notes=filtered.filter(w=>(w.note || '').trim()).length;const critical=filtered.filter(w=>w.priority==='critical').length;App.els.calendarQuickList.innerHTML=`<div class="side-item"><strong>Недели</strong><div>${filtered.length}</div></div><div class="side-item"><strong>События</strong><div>${assigned}</div></div><div class="side-item"><strong>Заметки</strong><div>${notes}</div></div><div class="side-item"><strong>Критичные</strong><div>${critical}</div></div>`;const item=App.store.getWeekById(App.state.calendarDetailWeekId) || App.ui.currentWeek();const event=item?App.store.getEventById(item.assignedEventId):null;App.els.calendarSideTitle.textContent=item?App.ui.calendarItemLabel(item):'Детали события';App.els.calendarSideMeta.textContent=item?`${item.startDate} — ${item.endDate}`:'Выберите событие в календаре';App.els.calendarSideDetails.innerHTML=item?`<div class="side-row"><div><div class="side-label">Неделя</div><div class="side-value">${item.weekNo}</div></div><div><div class="side-label">Приоритет</div><div class="side-value">${item.priority}</div></div></div><div class="side-row"><div><div class="side-label">Событие</div><div class="side-value">${App.utils.escapeHtml(event?.name || 'Нет назначенного события')}</div></div></div><div class="side-row"><div><div class="side-label">Адрес</div><div class="side-value">${App.utils.escapeHtml(event?.address || '—')}</div></div></div><div class="side-row"><div><div class="side-label">Расписание</div><div class="side-value">${App.utils.escapeHtml(event?.schedule || '—')}</div></div></div><div class="side-row"><div><div class="side-label">Заметка</div><div class="side-value">${App.utils.escapeHtml(item.note || '—')}</div></div></div>`:'<div class="side-row"><div class="side-label">Детали события</div><div class="side-value">Выберите событие в календаре</div></div>'},
      renderTeamPanelState(){const visible=!!App.state.app.settings.showTeamPanel;App.els.calendarLayout.classList.toggle('team-hidden',!visible);App.els.toggleTeamPanelBtn.textContent=visible?'Скрыть панель команды':'Показать панель команды'},
      renderCalendar(){const today=new Date(),todayIso=App.utils.iso(today);const todayCol=(today.getDay()+6)%7;const actualYear=App.utils.actualYearForServiceMonth(App.state.calendarYear,App.state.calendarMonth);const monthStart=new Date(actualYear,App.state.calendarMonth,1),monthEnd=new Date(actualYear,App.state.calendarMonth+1,0),gridStart=App.utils.startOfWeek(monthStart);const filteredWeeks=App.state.calendarEventFilter==='all'?App.store.getAllWeeks():App.store.getAllWeeks().filter(item=>item.assignedEventId===App.state.calendarEventFilter);const scheduledItems=filteredWeeks.filter(item=>item.assignedEventId&&App.store.getEventById(item.assignedEventId));App.els.monthLabel.textContent=`${App.config.monthNames[App.state.calendarMonth]} ${actualYear}`;App.els.calendarRangeLabel.textContent=`${App.utils.prettyDate(monthStart)} — ${App.utils.prettyDate(monthEnd)}`;const wrap=document.createElement('div');wrap.className='grid-cal';const head=document.createElement('div');head.className='dow-row';head.innerHTML='<div class="dow-corner"></div><div class="dow-days">'+App.config.dayNames.map(n=>`<div class="dow">${n}</div>`).join('')+'</div>';wrap.appendChild(head);for(let row=0;row<6;row++){const rowStart=App.utils.addDays(gridStart,row*7),rowEnd=App.utils.addDays(rowStart,6),rowItem=scheduledItems.find(item=>App.utils.iso(rowStart)>=item.startDate&&App.utils.iso(rowStart)<=item.endDate);const rowEl=document.createElement('div');rowEl.className='week-row';const weekLabel=document.createElement('div');weekLabel.className='week-num';weekLabel.textContent=rowItem?.weekNo || '•';
weekLabel.style.cursor=rowItem?'pointer':'default';
weekLabel.title=rowItem?'Перейти к неделе':'';
weekLabel.addEventListener('click',e=>{e.stopPropagation();if(!rowItem)return;App.state.selectedScreen='weeks';App.state.selectedYear=rowItem.year;App.state.selectedWeekId=rowItem.id;App.ui.setDrawer(false);App.ui.renderAll();});rowEl.appendChild(weekLabel);const daysEl=document.createElement('div');daysEl.className='week-days';for(let col=0;col<7;col++){const d=App.utils.addDays(rowStart,col),dIso=App.utils.iso(d),inCurrentMonth=d.getMonth()===App.state.calendarMonth&&d.getFullYear()===actualYear,isWeekend=col>=5;const cell=document.createElement('div');cell.className='day-cell'+(inCurrentMonth?'':' inactive')+(dIso===todayIso?' today':'')+(isWeekend?' weekend':'')+(col===todayCol?' today-col':'');const isBoundary=d.getDate()===1 || (row===0&&!inCurrentMonth);const monthLabel=isBoundary?`<span class="day-month">${App.config.monthNames[d.getMonth()].slice(0,3)}</span>`:'';cell.innerHTML=`<span class="day-num">${d.getDate()}</span>${monthLabel}`;
cell.dataset.iso=dIso;
const addBtn=document.createElement('button');
addBtn.type='button';
addBtn.className='day-add-btn';
addBtn.textContent='+';
addBtn.title='Добавить событие';
addBtn.addEventListener('click',ev=>{ev.stopPropagation();App.ui.openCalendarCreateEditor(dIso);});
cell.appendChild(addBtn);cell.addEventListener('click',()=>App.ui.openCalendarCreateEditor(dIso));daysEl.appendChild(cell)}const rowItems=scheduledItems.filter(item=>App.utils.overlaps(App.utils.parseLocalDate(item.startDate),App.utils.parseLocalDate(item.endDate),rowStart,rowEnd)).sort((a,b)=>a.startDate.localeCompare(b.startDate) || a.endDate.localeCompare(b.endDate));const lanes=[];rowItems.forEach(item=>{const itemStart=App.utils.parseLocalDate(item.startDate),itemEnd=App.utils.parseLocalDate(item.endDate);const segStart=itemStart<rowStart?rowStart:itemStart,segEnd=itemEnd>rowEnd?rowEnd:itemEnd;const startCol=App.utils.daysDiff(segStart,rowStart),endCol=App.utils.daysDiff(segEnd,rowStart);let laneIndex=0;while(lanes[laneIndex]!==undefined&&lanes[laneIndex]>=startCol)laneIndex++;lanes[laneIndex]=endCol;const event=App.store.getEventById(item.assignedEventId);const bar=document.createElement('div');bar.className='event-bar';bar.style.background=event.color || '#7d8da1';bar.style.top=`${34+laneIndex*24}px`;bar.style.left=`calc(${startCol} * (100% / 7) + 6px)`;bar.style.width=`calc(${(endCol-startCol+1)} * (100% / 7) - 12px)`;bar.textContent=App.ui.calendarItemLabel(item);bar.title=`${App.ui.calendarItemLabel(item)} • ${item.startDate} — ${item.endDate}`;
// resize handles (within week row)
const hL=document.createElement('div');hL.className='event-handle left';
const hR=document.createElement('div');hR.className='event-handle right';
bar.appendChild(hL);bar.appendChild(hR);
hL.addEventListener('pointerdown',ev=>App.ui.startResizeDrag(ev,item.id,'start',App.utils.iso(rowStart),App.utils.iso(rowEnd),bar));
hR.addEventListener('pointerdown',ev=>App.ui.startResizeDrag(ev,item.id,'end',App.utils.iso(rowStart),App.utils.iso(rowEnd),bar));bar.addEventListener('click',e=>{e.stopPropagation();App.state.calendarDetailWeekId=item.id;App.ui.openCalendarEditor(item);App.ui.renderCalendarSidebar()});daysEl.appendChild(bar)});const rowHeight=88+Math.max(0,(lanes.length || 1)-1)*24;daysEl.style.minHeight=`${rowHeight}px`;rowEl.style.minHeight=`${rowHeight}px`;rowEl.appendChild(daysEl);wrap.appendChild(rowEl)}App.els.calendarGrid.innerHTML='';App.els.calendarGrid.appendChild(wrap);if(App.state.calendarEditorMode==='edit'&&App.state.calendarEditingWeekId){const current=App.store.getWeekById(App.state.calendarEditingWeekId);if(current)App.ui.openCalendarEditor(current);else App.ui.closeCalendarEditor()}App.ui.renderCalendarSidebar();App.ui.renderTeamPanelState()},
      renderEvents(){App.els.eventsList.innerHTML='';if(!App.state.app.events.length){App.els.eventsList.innerHTML='<div class="empty">Пока нет событий.</div>';return}App.state.app.events.forEach(ev=>{const count=App.store.getAllWeeks().filter(w=>w.assignedEventId===ev.id).length;const row=document.createElement('div');row.className='event-row';row.innerHTML=`<div><div><span class="dot" style="background:${ev.color}"></span> <strong>${App.utils.escapeHtml(ev.name)}</strong></div><div class="small">${App.utils.escapeHtml(ev.address || '—')} • ${App.utils.escapeHtml(ev.schedule || '—')}</div><div class="small">${count} недель</div></div><div style="display:flex;gap:8px"><button class="btn" data-action="edit" type="button">✏️</button><button class="btn danger" data-action="delete" type="button">🗑️</button></div>`;row.querySelector('[data-action="edit"]').addEventListener('click',()=>{App.state.editingEventId=ev.id;App.els.eventNameInput.value=ev.name;App.els.eventColorInput.value=ev.color;App.els.eventAddressInput.value=ev.address || '';App.els.eventScheduleInput.value=ev.schedule || '';App.state.selectedScreen='events';App.ui.renderAll()});row.querySelector('[data-action="delete"]').addEventListener('click',()=>{App.state.app.events=App.state.app.events.filter(e=>e.id!==ev.id);App.store.getAllWeeks().forEach(w=>{if(w.assignedEventId===ev.id)w.assignedEventId=''});if(App.state.editingEventId===ev.id)App.ui.clearEventForm();App.store.save();App.utils.toast('Удалено')});App.els.eventsList.appendChild(row)})},
      renderNotes(){const q=App.els.noteSearch.value.trim().toLowerCase();const notes=App.store.getAllWeeks().filter(w=>(w.note || '').trim()).filter(w=>{const event=App.store.getEventById(w.assignedEventId);return !q || [w.note,String(w.weekNo),event?.name || '',String(w.year)].join(' ').toLowerCase().includes(q)});App.els.notesList.innerHTML='';if(!notes.length){App.els.notesList.innerHTML='<div class="empty">Пока нет заметок.</div>';return}notes.sort((a,b)=>a.startDate.localeCompare(b.startDate)).forEach(w=>{const event=App.store.getEventById(w.assignedEventId);const row=document.createElement('div');row.className='note-row';row.innerHTML=`<div><strong>${App.utils.serviceYearLabel(w.year)} • Неделя ${w.weekNo}</strong><div class="small">${App.utils.escapeHtml(event?.name || 'Без события')}</div><div style="margin-top:8px">${App.utils.escapeHtml(w.note)}</div></div><button class="btn" type="button">↗</button>`;row.querySelector('button').addEventListener('click',()=>{App.state.selectedYear=w.year;App.state.selectedWeekId=w.id;App.state.selectedScreen='weeks';App.ui.renderAll()});App.els.notesList.appendChild(row)})},
      renderSettings(){App.els.languageSelect.value=App.state.app.settings.language;App.els.themeSelect.value=App.state.app.settings.theme;App.ui.syncLayoutSelectors()},
      renderDashboard(){App.els.sideStatus.textContent=`Служебный год: ${App.utils.serviceYearLabel(App.state.selectedYear)} • ${App.store.getWeeks().length} недель • ${App.state.app.events.length} событий`},
      clearEventForm(){App.state.editingEventId=null;App.els.eventNameInput.value='';App.els.eventColorInput.value='#1f7a45';App.els.eventAddressInput.value='';App.els.eventScheduleInput.value=''},
      renderAll(){App.state.app.settings=App.store.ensureSettingsDefaults(App.state.app.settings);App.ui.renderDashboard();App.ui.renderNav();App.ui.renderScreens();App.ui.renderWeekFilters();App.ui.renderCalendar();App.ui.renderWeeks();App.ui.renderEvents();App.ui.renderNotes();App.ui.renderSettings();App.ui.applyTheme();App.els.screenTitle.textContent=App.config.navItems.find(x=>x.id===App.state.selectedScreen)?.title || '';App.els.screenSubtitle.textContent=App.ui.subtitleForScreen(App.state.selectedScreen)}
    },
    pdf:{
      monthsSpanRange(monthCount){const actualYear=App.utils.actualYearForServiceMonth(App.state.calendarYear,App.state.calendarMonth);return {start:App.utils.iso(new Date(actualYear,App.state.calendarMonth,1)),end:App.utils.iso(new Date(actualYear,App.state.calendarMonth+monthCount,0))}},
      resolveDateRange(){if(App.state.pdfExportType==='half-year-agenda')return App.pdf.monthsSpanRange(6);if(App.state.pdfExportType==='year-agenda')return App.pdf.monthsSpanRange(12);if(App.state.pdfExportType==='custom-range' || App.state.pdfExportType==='custom-range-calendar'){const start=App.state.pdfRangeStart || App.utils.iso(new Date(App.utils.actualYearForServiceMonth(App.state.calendarYear,App.state.calendarMonth),App.state.calendarMonth,1));const end=App.state.pdfRangeEnd || start;return start<=end?{start,end}:{start:end,end:start}}const actualYear=App.utils.actualYearForServiceMonth(App.state.calendarYear,App.state.calendarMonth);return{start:App.utils.iso(new Date(actualYear,App.state.calendarMonth,1)),end:App.utils.iso(new Date(actualYear,App.state.calendarMonth+1,0))}},
      itemsInRange(startIso,endIso){const start=App.utils.parseLocalDate(startIso),end=App.utils.parseLocalDate(endIso);return App.store.getAllWeeks().filter(item=>item.assignedEventId&&App.store.getEventById(item.assignedEventId)&&App.utils.overlaps(App.utils.parseLocalDate(item.startDate),App.utils.parseLocalDate(item.endDate),start,end)).sort((a,b)=>a.startDate.localeCompare(b.startDate) || a.endDate.localeCompare(b.endDate))},
      formatRangeLabel(startIso,endIso){return `${App.utils.prettyDate(startIso)} — ${App.utils.prettyDate(endIso)}`},
      iterateMonthsInRange(startIso,endIso){const start=App.utils.parseLocalDate(startIso),end=App.utils.parseLocalDate(endIso),cursor=new Date(start.getFullYear(),start.getMonth(),1),last=new Date(end.getFullYear(),end.getMonth(),1),months=[];while(cursor<=last){months.push({year:cursor.getFullYear(),month:cursor.getMonth()});cursor.setMonth(cursor.getMonth()+1)}return months},
      monthItemsForPdf(month,year){const monthStart=new Date(year,month,1),monthEnd=new Date(year,month+1,0);return App.store.getAllWeeks().filter(item=>item.assignedEventId&&App.store.getEventById(item.assignedEventId)&&App.utils.overlaps(App.utils.parseLocalDate(item.startDate),App.utils.parseLocalDate(item.endDate),monthStart,monthEnd)).sort((a,b)=>a.startDate.localeCompare(b.startDate) || a.endDate.localeCompare(b.endDate))},
      updateRangeUi(){const custom=App.state.pdfExportType==='custom-range' || App.state.pdfExportType==='custom-range-calendar';App.els.pdfRangeCard.style.display=custom?'block':'none';if(!App.state.pdfRangeStart || !App.state.pdfRangeEnd){const range=App.pdf.resolveDateRange();App.state.pdfRangeStart=range.start;App.state.pdfRangeEnd=range.end}App.els.pdfRangeStartInput.value=App.state.pdfRangeStart;App.els.pdfRangeEndInput.value=App.state.pdfRangeEnd;App.els.pdfRangeHelp.textContent=App.state.pdfExportType==='custom-range-calendar'?'Будет напечатана календарная сетка по всем месяцам выбранного диапазона.':App.state.pdfExportType==='custom-range'?'Выбери любые даты начала и конца периода для печати списка событий.':App.state.pdfExportType==='half-year-agenda'?'Будет напечатан список событий за 6 месяцев.':App.state.pdfExportType==='year-agenda'?'Будет напечатан список событий за 12 месяцев.':'Если нужен произвольный период, выбери режим периода.'},
      baseStyles(title){return `<!DOCTYPE html><html lang="ru"><head><meta charset="UTF-8"><title>${title}</title><style>@page{size:A4 portrait;margin:14mm;}body{font-family:Inter,Segoe UI,Arial,sans-serif;color:#1f2937;margin:0;}h1,h2,h3,h4{margin:0;}.pdf-head{display:flex;justify-content:space-between;align-items:flex-start;gap:16px;margin-bottom:18px;}.pdf-title{font-size:26px;line-height:1.05;margin-bottom:6px;}.pdf-sub{color:#64748b;font-size:13px;}.pdf-chip{display:inline-flex;align-items:center;gap:6px;border:1px solid #d7dee5;border-radius:999px;padding:6px 10px;font-size:12px;color:#334155;background:#f8fafc;}.pdf-grid{width:100%;border-collapse:collapse;table-layout:fixed;margin-bottom:16px;}.pdf-grid th,.pdf-grid td{border:1px solid #dbe2ea;vertical-align:top;}.pdf-grid th{padding:8px 6px;background:#f8fafc;font-size:12px;color:#475569;font-weight:600;}.pdf-grid td{height:102px;padding:6px;}.pdf-date{font-size:12px;color:#334155;margin-bottom:6px;}.pdf-muted{color:#64748b;}.pdf-badge{display:block;border-radius:999px;padding:3px 8px;color:white;font-size:11px;margin-bottom:4px;white-space:nowrap;text-overflow:ellipsis;}.pdf-list{display:grid;gap:12px;}.pdf-card{border:1px solid #dbe2ea;border-radius:16px;padding:12px 14px;}.pdf-card strong{display:block;margin-bottom:6px;}.pdf-card small{color:#64748b;}.pdf-table{width:100%;border-collapse:collapse;}.pdf-table th,.pdf-table td{border-bottom:1px solid #e5e7eb;padding:9px 8px;text-align:left;font-size:12px;}.pdf-table th{color:#475569;font-weight:600;background:#f8fafc;}.pdf-foot{margin-top:18px;color:#64748b;font-size:11px;}

/* === v8.5d enhancements === */
.week-row:hover .week-days{
  background: color-mix(in srgb, var(--accent) 6%, transparent);
}

/* Today: highlight whole weekday column */
.day-cell.today-col{
  background: linear-gradient(to bottom, color-mix(in srgb, var(--accent) 8%, transparent), transparent 55%);
}
.day-cell.today-col.weekend{
  background: linear-gradient(to bottom, color-mix(in srgb, var(--accent) 10%, transparent), transparent 55%);
}

/* Quick add (+) on day hover */
.day-add-btn{
  position:absolute;
  right:8px;
  top:8px;
  width:26px;
  height:26px;
  border-radius:999px;
  border:1px solid var(--line);
  background:var(--surface);
  color:var(--text);
  display:none;
  align-items:center;
  justify-content:center;
  cursor:pointer;
  box-shadow: var(--shadow);
}
.day-cell:hover .day-add-btn{display:flex;}
@media (hover:none){
  .day-add-btn{display:flex;opacity:.78;}
}

/* Resize handles for events */
.event-bar.resizing{outline:2px solid color-mix(in srgb,var(--accent) 35%, transparent);}
.event-handle{
  position:absolute;
  top:0;
  width:12px;
  height:100%;
  cursor:ew-resize;
  opacity:0;
}
.event-handle.left{left:-2px;}
.event-handle.right{right:-2px;}
.event-bar:hover .event-handle{opacity:1;}

</style></head><body>`},
      buildMonthGrid(){const actualYear=App.utils.actualYearForServiceMonth(App.state.calendarYear,App.state.calendarMonth);const monthName=App.config.monthNames[App.state.calendarMonth];const title=`${monthName} ${actualYear}`;const monthStart=new Date(actualYear,App.state.calendarMonth,1);const start=App.utils.startOfWeek(monthStart);const items=App.ui.visibleMonthItems();let html=App.pdf.baseStyles(title);html+=`<div class="pdf-head"><div><div class="pdf-title">${title}</div><div class="pdf-sub">${App.utils.prettyDate(monthStart)} — ${App.utils.prettyDate(new Date(actualYear,App.state.calendarMonth+1,0))}</div></div><div class="pdf-chip">Служебный год: ${App.utils.serviceYearLabel(App.state.calendarYear)}</div></div>`;html+='<table class="pdf-grid"><thead><tr>'+App.config.dayNames.map(d=>`<th>${d}</th>`).join('')+'</tr></thead><tbody>';for(let row=0;row<6;row++){html+='<tr>';for(let col=0;col<7;col++){const day=App.utils.addDays(start,row*7+col),dayIso=App.utils.iso(day),dayItems=items.filter(item=>dayIso>=item.startDate&&dayIso<=item.endDate).slice(0,4);html+=`<td><div class="pdf-date ${day.getMonth()===App.state.calendarMonth&&day.getFullYear()===actualYear?'':'pdf-muted'}">${day.getDate()}</div>${dayItems.map(item=>{const ev=App.store.getEventById(item.assignedEventId);return `<span class="pdf-badge" style="background:${ev?.color || '#64748b'}">${App.utils.escapeHtml(App.ui.calendarItemLabel(item))}</span>`}).join('')}</td>`}html+='</tr>'}html+='</tbody></table><div class="pdf-foot">Generated from Service Year Planner</div></body></html>';return{title:`${monthName}-${actualYear}-calendar`,html}},
      buildCalendarRange(){const range=App.pdf.resolveDateRange(),months=App.pdf.iterateMonthsInRange(range.start,range.end);let html=App.pdf.baseStyles('calendar-range');html+=`<div class="pdf-head"><div><div class="pdf-title">Календарь периода</div><div class="pdf-sub">${App.pdf.formatRangeLabel(range.start,range.end)}</div></div><div class="pdf-chip">${months.length} мес.</div></div>`;months.forEach((entry,idx)=>{const monthStart=new Date(entry.year,entry.month,1),monthEnd=new Date(entry.year,entry.month+1,0),gridStart=App.utils.startOfWeek(monthStart),items=App.pdf.monthItemsForPdf(entry.month,entry.year);if(idx>0)html+='<div style="page-break-before:always;"></div>';html+=`<div class="pdf-head"><div><div class="pdf-title" style="font-size:22px;">${App.config.monthNames[entry.month]} ${entry.year}</div><div class="pdf-sub">${App.utils.prettyDate(monthStart)} — ${App.utils.prettyDate(monthEnd)}</div></div></div>`;html+='<table class="pdf-grid"><thead><tr>'+App.config.dayNames.map(d=>`<th>${d}</th>`).join('')+'</tr></thead><tbody>';for(let row=0;row<6;row++){html+='<tr>';for(let col=0;col<7;col++){const day=App.utils.addDays(gridStart,row*7+col),dayIso=App.utils.iso(day),dayItems=items.filter(item=>dayIso>=item.startDate&&dayIso<=item.endDate).slice(0,4);html+=`<td><div class="pdf-date ${day.getMonth()===entry.month&&day.getFullYear()===entry.year?'':'pdf-muted'}">${day.getDate()}</div>${dayItems.map(item=>{const ev=App.store.getEventById(item.assignedEventId);return `<span class="pdf-badge" style="background:${ev?.color || '#64748b'}">${App.utils.escapeHtml(App.ui.calendarItemLabel(item))}</span>`}).join('')}</td>`}html+='</tr>'}html+='</tbody></table>'});html+='<div class="pdf-foot">Generated from Service Year Planner</div></body></html>';return{title:`calendar-${range.start}-${range.end}`,html}},
      buildRangeAgenda(){const range=App.pdf.resolveDateRange(),items=App.pdf.itemsInRange(range.start,range.end);let html=App.pdf.baseStyles('agenda');html+=`<div class="pdf-head"><div><div class="pdf-title">Список событий</div><div class="pdf-sub">${App.pdf.formatRangeLabel(range.start,range.end)}</div></div><div class="pdf-chip">${items.length} событий</div></div>`;html+='<div class="pdf-list">'+(items.length?items.map(item=>{const ev=App.store.getEventById(item.assignedEventId);return `<div class="pdf-card"><strong>${App.utils.escapeHtml(App.ui.calendarItemLabel(item))}</strong><small>${item.startDate} — ${item.endDate}</small><div style="margin-top:8px;font-size:13px;">${App.utils.escapeHtml(ev?.address || '—')} • ${App.utils.escapeHtml(ev?.schedule || '—')}</div>${item.note?`<div style="margin-top:8px;color:#475569;font-size:12px;">${App.utils.escapeHtml(item.note)}</div>`:''}</div>`}).join(''):'<div class="pdf-card">Пока нет событий в выбранном периоде.</div>')+'</div><div class="pdf-foot">Generated from Service Year Planner</div></body></html>';return{title:`events-${range.start}-${range.end}`,html}},
      buildYearOverview(){const year=App.state.selectedYear;const months=App.utils.orderedServiceMonths().map(idx=>{const name=App.config.monthNames[idx],monthStart=App.utils.actualDateForServiceMonth(year,idx,1),monthEnd=new Date(App.utils.actualYearForServiceMonth(year,idx),idx+1,0),items=App.store.getAllWeeks().filter(item=>App.utils.overlaps(App.utils.parseLocalDate(item.startDate),App.utils.parseLocalDate(item.endDate),monthStart,monthEnd)),withNotes=items.filter(item=>(item.note || '').trim()).length;return{name,items,withNotes}});let html=App.pdf.baseStyles(String(year));html+=`<div class="pdf-head"><div><div class="pdf-title">Годовой обзор</div><div class="pdf-sub">${App.utils.serviceYearLabel(year)}</div></div><div class="pdf-chip">${months.reduce((sum,m)=>sum+m.items.length,0)} событий</div></div>`;html+='<table class="pdf-table"><thead><tr><th>Месяц</th><th>События</th><th>Заметки</th><th>Обзор</th></tr></thead><tbody>'+months.map(month=>`<tr><td>${month.name}</td><td>${month.items.length}</td><td>${month.withNotes}</td><td>${month.items.slice(0,3).map(item=>App.utils.escapeHtml(App.ui.calendarItemLabel(item))).join(', ') || '—'}</td></tr>`).join('')+'</tbody></table><div class="pdf-foot">Generated from Service Year Planner</div></body></html>';return{title:`${year}-overview`,html}},
      buildNotesReport(){const year=App.state.selectedYear,notes=App.store.getAllWeeks().filter(w=>w.year===year&&(w.note || '').trim()).sort((a,b)=>a.startDate.localeCompare(b.startDate));let html=App.pdf.baseStyles(String(year));html+=`<div class="pdf-head"><div><div class="pdf-title">Отчёт по заметкам</div><div class="pdf-sub">${App.utils.serviceYearLabel(year)}</div></div><div class="pdf-chip">${notes.length} заметок</div></div>`;html+='<div class="pdf-list">'+(notes.length?notes.map(item=>{const ev=App.store.getEventById(item.assignedEventId);return `<div class="pdf-card"><strong>Неделя ${item.weekNo} • ${item.startDate} — ${item.endDate}</strong><small>${App.utils.escapeHtml(ev?.name || 'Без события')}</small><div style="margin-top:8px;font-size:13px;color:#334155;">${App.utils.escapeHtml(item.note)}</div></div>`}).join(''):'<div class="pdf-card">Пока нет заметок.</div>')+'</div><div class="pdf-foot">Generated from Service Year Planner</div></body></html>';return{title:`${year}-notes`,html}},
      buildPayload(){if(App.state.pdfExportType==='custom-range-calendar')return App.pdf.buildCalendarRange();if(['month-agenda','half-year-agenda','year-agenda','custom-range'].includes(App.state.pdfExportType))return App.pdf.buildRangeAgenda();if(App.state.pdfExportType==='year-overview')return App.pdf.buildYearOverview();if(App.state.pdfExportType==='notes-report')return App.pdf.buildNotesReport();return App.pdf.buildMonthGrid()},
      openModal(){if(!App.state.pdfRangeStart || !App.state.pdfRangeEnd){const range=App.pdf.resolveDateRange();App.state.pdfRangeStart=range.start;App.state.pdfRangeEnd=range.end}App.els.pdfModal.hidden=false;document.querySelectorAll('[data-pdf-type]').forEach(btn=>btn.classList.toggle('active',btn.dataset.pdfType===App.state.pdfExportType));App.pdf.updateRangeUi()},
      closeModal(){App.els.pdfModal.hidden=true},
      fallbackOpenPrint(payload){const w=window.open('','_blank');if(!w){App.utils.toast('Браузер заблокировал печать. Разреши всплывающие окна для этого сайта.');return}w.document.open();const scriptTag='<scr'+'ipt>window.onload=()=>{setTimeout(()=>{window.focus();window.print();},120)};<\\/scr'+'ipt>';w.document.write(payload.html+scriptTag);w.document.close()},
      export(){const payload=App.pdf.buildPayload();const frame=document.createElement('iframe');let printStarted=false;frame.style.position='fixed';frame.style.right='0';frame.style.bottom='0';frame.style.width='0';frame.style.height='0';frame.style.border='0';frame.onload=()=>{if(printStarted)return;printStarted=true;try{setTimeout(()=>{try{frame.contentWindow.focus();frame.contentWindow.print();App.utils.toast('Открыл печатную версию. В системном окне выбери «Сохранить как PDF».')}catch(err){App.pdf.fallbackOpenPrint(payload)}},180)}catch(err){App.pdf.fallbackOpenPrint(payload)}};frame.srcdoc=payload.html;document.body.appendChild(frame);App.pdf.closeModal();setTimeout(()=>frame.remove(),60000)}
    },
    
 ,
 export:{
  escapeIcsText(value){
    return String(value??'')
      .replace(/\\/g,'\\\\')
      .replace(/\n/g,'\\n')
      .replace(/;/g,'\\;')
      .replace(/,/g,'\\,');
  },
  dtStamp(){
    const d=new Date();
    const pad=n=>String(n).padStart(2,'0');
    return `${d.getUTCFullYear()}${pad(d.getUTCMonth()+1)}${pad(d.getUTCDate())}T${pad(d.getUTCHours())}${pad(d.getUTCMinutes())}${pad(d.getUTCSeconds())}Z`;
  },
  addOneDay(iso){
    const d=App.utils.parseLocalDate(iso);
    d.setDate(d.getDate()+1);
    return App.utils.iso(d);
  },
  resolveDefaultRange(){
    // Default: current visible month
    const actualYear=App.utils.actualYearForServiceMonth(App.state.calendarYear,App.state.calendarMonth);
    const start=App.utils.iso(new Date(actualYear,App.state.calendarMonth,1));
    const end=App.utils.iso(new Date(actualYear,App.state.calendarMonth+1,0));
    return {start,end};
  },
  itemsInRange(startIso,endIso){
    const start=App.utils.parseLocalDate(startIso),end=App.utils.parseLocalDate(endIso);
    return App.store.getAllWeeks()
      .filter(item=>item.assignedEventId && App.store.getEventById(item.assignedEventId))
      .filter(item=>App.utils.overlaps(App.utils.parseLocalDate(item.startDate),App.utils.parseLocalDate(item.endDate),start,end))
      .sort((a,b)=>a.startDate.localeCompare(b.startDate)||a.endDate.localeCompare(b.endDate));
  },
  buildIcs(startIso,endIso){
    const items=App.export.itemsInRange(startIso,endIso);
    const stamp=App.export.dtStamp();
    const lines=[];
    lines.push('BEGIN:VCALENDAR');
    lines.push('VERSION:2.0');
    lines.push('PRODID:-//Service Year Planner//EN');
    lines.push('CALSCALE:GREGORIAN');
    lines.push('METHOD:PUBLISH');
    lines.push(`X-WR-CALNAME:${App.export.escapeIcsText('Service Year Planner')}`);
    lines.push('X-WR-TIMEZONE:UTC');

    items.forEach(item=>{
      const ev=App.store.getEventById(item.assignedEventId);
      const uid=`${item.id}@service-year-planner`;
      const dtStart=item.startDate.replace(/-/g,'');
      const dtEnd=App.export.addOneDay(item.endDate).replace(/-/g,''); // exclusive
      const summary=App.export.escapeIcsText(ev?.name||'Событие');
      const location=App.export.escapeIcsText(ev?.address||'');
      const descParts=[];
      if(ev?.schedule) descParts.push(`Расписание: ${ev.schedule}`);
      if(item.note) descParts.push(`Заметка: ${item.note}`);
      descParts.push(`Период: ${item.startDate} — ${item.endDate}`);
      const description=App.export.escapeIcsText(descParts.join('\n'));

      lines.push('BEGIN:VEVENT');
      lines.push(`UID:${uid}`);
      lines.push(`DTSTAMP:${stamp}`);
      lines.push(`DTSTART;VALUE=DATE:${dtStart}`);
      lines.push(`DTEND;VALUE=DATE:${dtEnd}`);
      lines.push(`SUMMARY:${summary}`);
      if(location) lines.push(`LOCATION:${location}`);
      lines.push(`DESCRIPTION:${description}`);
      lines.push('END:VEVENT');
    });

    lines.push('END:VCALENDAR');
    return lines.join('\r\n');
  },
  downloadBlob(text, filename, mime){
    const blob=new Blob([text],{type:mime});
    const a=document.createElement('a');
    a.href=URL.createObjectURL(blob);
    a.download=filename;
    a.click();
    URL.revokeObjectURL(a.href);
  },
  openModal(){
    const S=App.state;
    // init range
    if(!S.exportRangeStart || !S.exportRangeEnd){
      const r=App.export.resolveDefaultRange();
      S.exportRangeStart=r.start;
      S.exportRangeEnd=r.end;
    }
    App.els.exportModal.hidden=false;
    document.querySelectorAll('[data-export-type]').forEach(btn=>btn.classList.toggle('active', btn.dataset.exportType===S.exportType));
    App.export.updateRangeUi();
  },
  closeModal(){
    App.els.exportModal.hidden=true;
  },
  updateRangeUi(){
    const S=App.state;
    const show = S.exportType==='ics';
    App.els.exportRangeCard.style.display = show ? 'block' : 'none';
    App.els.exportRangeStartInput.value = S.exportRangeStart;
    App.els.exportRangeEndInput.value = S.exportRangeEnd;
    App.els.exportRangeHelp.textContent = show
      ? 'Для .ics будет экспортирован выбранный диапазон дат (включая обе даты).'
      : 'JSON содержит все данные приложения.';
  },
  confirm(){
    const S=App.state, U=App.utils;
    if(S.exportType==='json'){
      const data=JSON.stringify(S.app,null,2);
      App.export.downloadBlob(data, `service-year-planner-${U.iso(new Date())}.json`, 'application/json');
      U.toast('Файл JSON экспортирован');
      App.export.closeModal();
      return;
    }
    // ics
    let start=S.exportRangeStart, end=S.exportRangeEnd;
    if(!start || !end) return U.toast('Укажи начало и конец периода');
    if(end<start){const t=start; start=end; end=t;}
    const ics=App.export.buildIcs(start,end);
    App.export.downloadBlob(ics, `service-year-planner-${start}-to-${end}.ics`, 'text/calendar;charset=utf-8');
    U.toast('Файл .ics создан (Google/Apple)');
    App.export.closeModal();
  }
 }
bind:{
      events(){const E=App.els,S=App.state,U=App.utils,Store=App.store,UI=App.ui,PDF=App.pdf,Export=App.export;E.yearSelect.addEventListener('change',()=>{S.selectedYear=Number(E.yearSelect.value);S.selectedWeekId=null;UI.renderAll()});E.calendarYearSelect.addEventListener('change',()=>{S.calendarYear=Number(E.calendarYearSelect.value);UI.renderCalendar()});E.calendarLayoutPresetSelect.addEventListener('change',()=>{S.app.settings.layoutPreset=E.calendarLayoutPresetSelect.value;Store.save()});E.layoutPresetSelect.addEventListener('change',()=>{S.app.settings.layoutPreset=E.layoutPresetSelect.value;Store.save()});E.eventFilter.addEventListener('change',UI.renderWeeks);E.weekSearch.addEventListener('input',UI.renderWeeks);E.noteSearch.addEventListener('input',UI.renderNotes);E.calendarEventQuickFilter.addEventListener('change',()=>{S.calendarEventFilter=E.calendarEventQuickFilter.value;UI.renderCalendar()});E.toggleTeamPanelBtn.addEventListener('click',()=>{S.app.settings.showTeamPanel=!S.app.settings.showTeamPanel;Store.save()});E.prevMonthBtn.addEventListener('click',()=>{const old=S.calendarMonth;S.calendarMonth=(S.calendarMonth+11)%12;if(old===8)S.calendarYear--;UI.renderCalendar()});E.nextMonthBtn.addEventListener('click',()=>{const old=S.calendarMonth;S.calendarMonth=(S.calendarMonth+1)%12;if(old===7)S.calendarYear++;UI.renderCalendar()});E.todayMonthBtn.addEventListener('click',()=>{const now=new Date();S.calendarMonth=now.getMonth();S.calendarYear=U.getServiceYearForDate(now);UI.renderCalendar()});E.editorCloseBtn.addEventListener('click',UI.closeCalendarEditor);E.editorCancelBtn.addEventListener('click',UI.closeCalendarEditor);E.editorDeleteBtn.addEventListener('click',()=>{const item=Store.getWeekById(S.calendarEditingWeekId);if(!item)return UI.closeCalendarEditor();item.assignedEventId='';item.updatedAt=new Date().toISOString();S.calendarDetailWeekId=null;UI.closeCalendarEditor();Store.save();U.toast('Событие удалено из календаря')});E.editorSaveBtn.addEventListener('click',()=>{let startDate=E.editorStart.value,endDate=E.editorEnd.value;const assignedEventId=E.editorEventSelect.value;if(!assignedEventId)return U.toast('Выбери событие');if(!startDate || !endDate)return U.toast('Нужно указать начало и конец.');if(endDate<startDate){const s=startDate;startDate=endDate;endDate=s}if(S.calendarEditorMode==='create'){const itemYear=U.getServiceYearForDate(U.parseLocalDate(startDate));if(!S.app.serviceYears[itemYear])S.app.serviceYears[itemYear]={id:String(itemYear),year:itemYear,weeks:[]};const newItem={id:U.uid('week'),year:itemYear,weekNo:0,startDate,endDate,assignedEventId,priority:'normal',flags:{letter:false,s302:false},note:'',updatedAt:new Date().toISOString()};S.app.serviceYears[itemYear].weeks.push(newItem);S.app.serviceYears[itemYear].weeks.sort((a,b)=>a.startDate.localeCompare(b.startDate));S.app.serviceYears[itemYear].weeks.forEach((w,idx)=>w.weekNo=idx+1);S.calendarDetailWeekId=newItem.id;UI.closeCalendarEditor();Store.save();U.toast('Событие добавлено');return}const item=Store.getWeekById(S.calendarEditingWeekId);if(!item)return UI.closeCalendarEditor();const oldYear=item.year;item.startDate=startDate;item.endDate=endDate;item.assignedEventId=assignedEventId;item.year=U.getServiceYearForDate(U.parseLocalDate(startDate));item.updatedAt=new Date().toISOString();if(oldYear!==item.year){Object.values(S.app.serviceYears).forEach(y=>{y.weeks=y.weeks.filter(w=>w.id!==item.id)});if(!S.app.serviceYears[item.year])S.app.serviceYears[item.year]={id:String(item.year),year:item.year,weeks:[]};S.app.serviceYears[item.year].weeks.push(item)}S.app.serviceYears[item.year].weeks.sort((a,b)=>a.startDate.localeCompare(b.startDate));S.app.serviceYears[item.year].weeks.forEach((w,idx)=>w.weekNo=idx+1);S.calendarDetailWeekId=item.id;UI.closeCalendarEditor();Store.save();U.toast('Обновлено')});E.saveWeekBtn.addEventListener('click',()=>{const w=Store.getWeekById(S.selectedWeekId);if(!w)return;w.assignedEventId=E.weekEventSelect.value;w.priority=E.weekPrioritySelect.value;w.flags={letter:E.flagLetter.checked,s302:E.flagS302.checked};w.note=E.weekNoteInput.value.trim();w.updatedAt=new Date().toISOString();Store.save();U.toast('Сохранено')});E.saveEventBtn.addEventListener('click',()=>{const payload={name:E.eventNameInput.value.trim(),color:E.eventColorInput.value,address:E.eventAddressInput.value.trim(),schedule:E.eventScheduleInput.value.trim()};if(!payload.name)return U.toast('Название обязательно');if(S.editingEventId){Object.assign(Store.getEventById(S.editingEventId),payload);U.toast('Событие обновлено')}else{S.app.events.unshift({id:U.uid('evt'),...payload});U.toast('Событие создано')}UI.clearEventForm();Store.save()});E.resetEventBtn.addEventListener('click',UI.clearEventForm);E.themeBtn.addEventListener('click',()=>{S.app.settings.theme=S.app.settings.theme==='light'?'dark':'light';Store.save()});E.languageSelect.addEventListener('change',()=>{S.app.settings.language=E.languageSelect.value;Store.save()});E.themeSelect.addEventListener('change',()=>{S.app.settings.theme=E.themeSelect.value;Store.save()});E.settingsPdfBtn.addEventListener('click',PDF.openModal);E.pdfModalCloseBtn.addEventListener('click',PDF.closeModal);E.pdfCancelBtn.addEventListener('click',PDF.closeModal);E.pdfExportConfirmBtn.addEventListener('click',PDF.export);E.pdfModal.addEventListener('click',e=>{if(e.target===E.pdfModal)PDF.closeModal()});document.querySelectorAll('[data-pdf-type]').forEach(btn=>btn.addEventListener('click',()=>{S.pdfExportType=btn.dataset.pdfType;if(S.pdfExportType!=='custom-range'&&S.pdfExportType!=='custom-range-calendar'){const range=PDF.resolveDateRange();S.pdfRangeStart=range.start;S.pdfRangeEnd=range.end}PDF.openModal()}));E.pdfRangeStartInput.addEventListener('change',()=>{S.pdfRangeStart=E.pdfRangeStartInput.value});E.pdfRangeEndInput.addEventListener('change',()=>{S.pdfRangeEnd=E.pdfRangeEndInput.value});E.exportBtn.addEventListener('click',()=>{const data=JSON.stringify(S.app,null,2);const blob=new Blob([data],{type:'application/json'});const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download=`service-year-planner-${U.iso(new Date())}.json`;a.click();URL.revokeObjectURL(a.href);U.toast('Файл экспортирован')});E.backupBtn.addEventListener('click',()=>E.exportBtn.click());E.importInput.addEventListener('change',async e=>{const file=e.target.files[0];if(!file)return;try{const text=await file.text();const data=JSON.parse(text);if(data?.schema==='sp-backup-v2')S.app=Store.importBackupSchema(data);else if(data?.serviceYears&&data?.events)S.app=Store.normalize(data);else throw new Error('unknown');const sy=U.getServiceYearForDate(new Date());S.selectedYear=S.app.serviceYears[sy]?sy:Number(Object.keys(S.app.serviceYears)[0]);S.calendarYear=S.selectedYear;S.calendarMonth=new Date().getMonth();S.selectedScreen='calendar';UI.clearEventForm();UI.closeCalendarEditor();Store.save();U.toast('JSON успешно импортирован')}catch(err){console.error(err);U.toast('Ошибка импорта JSON')}e.target.value=''});E.resetAppBtn.addEventListener('click',()=>{S.app=Store.createDefaultData();const now=new Date();S.selectedYear=U.getServiceYearForDate(now);S.calendarYear=S.selectedYear;S.calendarMonth=now.getMonth();S.selectedWeekId=null;UI.clearEventForm();UI.closeCalendarEditor();Store.save();U.toast('Приложение сброшено')});
 // Add service year (Settings)
 const computeNextServiceYear = () => {
  const years = Object.keys(S.app.serviceYears || {}).map(Number).filter(n=>Number.isFinite(n));
  return years.length ? Math.max(...years) + 1 : U.getServiceYearForDate(new Date());
 };
 const addServiceYear = (raw) => {
  const year = Number(String(raw || '').trim());
  if(!Number.isFinite(year)) return U.toast('Введите год');
  if(year < 1900 || year > 2500) return U.toast('Неверный год');
  if(S.app.serviceYears && S.app.serviceYears[year]) return U.toast('Год уже существует');
  if(!S.app.serviceYears) S.app.serviceYears = {};
  S.app.serviceYears[year] = Store.buildServiceYear(year);
  if(!S.app.serviceYears[S.selectedYear]) S.selectedYear = year;
  if(!S.app.serviceYears[S.calendarYear]) S.calendarYear = year;
  if(E.addYearInput) E.addYearInput.value = '';
  Store.save();
  U.toast(`Год добавлен: ${U.serviceYearLabel(year)}`);
 };
 if(E.addNextYearBtn) E.addNextYearBtn.addEventListener('click', () => addServiceYear(computeNextServiceYear()));
 if(E.addYearBtn) E.addYearBtn.addEventListener('click', () => addServiceYear(E.addYearInput ? E.addYearInput.value : ''));
E.mobileMenuToggleBtn.addEventListener('click',()=>UI.setDrawer(!E.appRoot.classList.contains('menu-open')));E.mobileOverlay.addEventListener('click',()=>UI.setDrawer(false));window.addEventListener('resize',()=>{if(window.innerWidth>1200 || window.innerWidth<768)UI.setDrawer(false)})}
    },
    init(){this.ui.cacheElements();this.store.load();this.bind.events();this.ui.renderAll()}
  };
  App.init();

// === v8.5d enhancements runtime (hotkeys + resize) ===
App.state.resizeDrag={active:false,id:null,side:null,rowStartIso:null,rowEndIso:null,bar:null,tempStart:null,tempEnd:null};
App.ui.startResizeDrag=function(e,id,side,rowStartIso,rowEndIso,barEl){
  e.stopPropagation();
  e.preventDefault();
  const drag=App.state.resizeDrag;
  drag.active=true;drag.id=id;drag.side=side;drag.rowStartIso=rowStartIso;drag.rowEndIso=rowEndIso;drag.bar=barEl;
  const item=App.store.getWeekById(id);
  drag.tempStart=item.startDate;drag.tempEnd=item.endDate;
  barEl.classList.add('resizing');
  if(barEl.setPointerCapture && e.pointerId!=null){
    try{barEl.setPointerCapture(e.pointerId);}catch(_){ }
  }
};

(function(){
  function clamp(n,min,max){return Math.max(min,Math.min(max,n));}
  function isEditableTarget(){
    const tag=(document.activeElement?.tagName || '').toLowerCase();
    return ['input','textarea','select'].includes(tag);
  }

  document.addEventListener('pointermove', (e)=>{
    const drag=App.state.resizeDrag;
    if(!drag.active || !drag.bar) return;
    const daysEl = drag.bar.parentElement;
    if(!daysEl) return;
    const rect = daysEl.getBoundingClientRect();
    const w = rect.width/7;
    const col = clamp(Math.floor((e.clientX-rect.left)/w),0,6);
    const rowStart = App.utils.parseLocalDate(drag.rowStartIso);
    const targetIso = App.utils.iso(App.utils.addDays(rowStart,col));

    if(drag.side==='start'){
      drag.tempStart = targetIso;
      if(drag.tempStart>drag.tempEnd) drag.tempStart = drag.tempEnd;
    }else{
      drag.tempEnd = targetIso;
      if(drag.tempEnd<drag.tempStart) drag.tempEnd = drag.tempStart;
    }

    // Clamp within this row only
    if(drag.tempStart < drag.rowStartIso) drag.tempStart = drag.rowStartIso;
    if(drag.tempEnd > drag.rowEndIso) drag.tempEnd = drag.rowEndIso;

    const startCol = App.utils.daysDiff(App.utils.parseLocalDate(drag.tempStart), rowStart);
    const endCol = App.utils.daysDiff(App.utils.parseLocalDate(drag.tempEnd), rowStart);
    drag.bar.style.left = `calc(${startCol} * (100% / 7) + 6px)`;
    drag.bar.style.width = `calc(${(endCol-startCol+1)} * (100% / 7) - 12px)`;
    drag.bar.title = `${drag.bar.textContent} • ${drag.tempStart} — ${drag.tempEnd}`;
  }, true);

  document.addEventListener('pointerup', ()=>{
    const drag=App.state.resizeDrag;
    if(!drag.active) return;
    const item = App.store.getWeekById(drag.id);
    if(item){
      item.startDate = drag.tempStart;
      item.endDate = drag.tempEnd;
      item.updatedAt = new Date().toISOString();
      App.store.save();
      App.utils.toast('Период события обновлён');
    }
    if(drag.bar) drag.bar.classList.remove('resizing');
    drag.active=false;drag.id=null;drag.side=null;drag.rowStartIso=null;drag.rowEndIso=null;drag.bar=null;drag.tempStart=null;drag.tempEnd=null;
  }, true);

  // Hotkeys for month navigation
  document.addEventListener('keydown', (e)=>{
    if(isEditableTarget()) return;
    if(App.state.selectedScreen!=='calendar') return;
    if(e.key==='ArrowLeft'){e.preventDefault();App.els.prevMonthBtn.click();}
    if(e.key==='ArrowRight'){e.preventDefault();App.els.nextMonthBtn.click();}
    if(e.key==='Home'){e.preventDefault();App.els.todayMonthBtn.click();}
  });
})();


// offline/online banner
(function(){
  const banner=document.getElementById('offlineBanner');
  if(!banner) return;
  const sync=()=>banner.classList.toggle('show', !navigator.onLine);
  window.addEventListener('online', sync);
  window.addEventListener('offline', sync);
  sync();
})();

// drawer: allow page scroll under dim overlay, but close on tap outside sidebar
(function(){
  const root = document.getElementById('appRoot');
  const getSidebar = () => document.querySelector('.sidebar');
  const getMenuBtn = () => document.getElementById('mobileMenuToggleBtn');
  const isOpen = () => !!root && root.classList.contains('menu-open');
  let down = null;
  let moved = false;
  const threshold = 10; // px

  document.addEventListener('pointerdown', (e)=>{
    if(!isOpen()) return;
    const sb = getSidebar();
    const mb = getMenuBtn();
    if(sb && sb.contains(e.target)) return;
    if(mb && (mb===e.target || mb.contains(e.target))) return;
    down = {x:e.clientX, y:e.clientY};
    moved = false;
  }, true);

  document.addEventListener('pointermove', (e)=>{
    if(!isOpen() || !down) return;
    if(Math.abs(e.clientX-down.x) > threshold || Math.abs(e.clientY-down.y) > threshold) moved = true;
  }, true);

  document.addEventListener('pointerup', (e)=>{
    if(!isOpen() || !down) return;
    const sb = getSidebar();
    const mb = getMenuBtn();
    if(sb && sb.contains(e.target)) { down=null; return; }
    if(mb && (mb===e.target || mb.contains(e.target))) { down=null; return; }
    if(!moved){
      try{ App.ui.setDrawer(false); }catch(_){ }
      e.preventDefault();
      e.stopPropagation();
    }
    down = null;
  }, true);
})();
