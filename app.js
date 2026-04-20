// Service Year Planner v9.1 (fixed)
// Stable split build: index.html + app.js
(function () {
  'use strict';

  const App = {
    config: {
      storageKey: 'service-year-planner-v9-1',
      serviceYearStartMonth: 8, // September (0-based)
      navItems: [
        { id: 'calendar', icon: '📆', title: 'Календарь' },
        { id: 'weeks', icon: '🗓️', title: 'Недели' },
        { id: 'events', icon: '🎯', title: 'События' },
        { id: 'notes', icon: '📝', title: 'Заметки' },
        { id: 'settings', icon: '⚙️', title: 'Настройки' }
      ],
      layoutPresets: [
        { value: 'classic', label: '1. Classic' },
        { value: 'compact', label: '2. Compact' },
        { value: 'spacious', label: '3. Spacious' },
        { value: 'cards', label: '4. Cards' },
        { value: 'minimal', label: '5. Minimal' },
        { value: 'dense', label: '6. Dense' },
        { value: 'pill', label: '7. Pill' },
        { value: 'outline', label: '8. Outline' },
        { value: 'agenda', label: '9. Agenda' },
        { value: 'board', label: '10. Board' }
      ],
      monthNames: [
        'Январь', 'Февраль', 'Март', 'Апрель', 'Май', 'Июнь',
        'Июль', 'Август', 'Сентябрь', 'Октябрь', 'Ноябрь', 'Декабрь'
      ],
      dayNames: ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'],
      priorities: {
        normal: 'Обычный',
        important: 'Важный',
        critical: 'Критичный'
      }
    },

    els: {},

    state: {
      app: null,
      selectedScreen: 'calendar',
      selectedYear: new Date().getMonth() >= 8 ? new Date().getFullYear() : new Date().getFullYear() - 1,
      selectedWeekId: null,
      editingEventId: null,
      calendarMonth: new Date().getMonth(),
      calendarYear: new Date().getFullYear(),
      calendarEditingEntryId: null,
      calendarDetailId: null,
      calendarEventFilter: 'all',
      pdfExportType: 'month-grid',
      calendarEditorMode: 'create',
      calendarCreateDate: null,
      pdfRangeStart: '',
      pdfRangeEnd: '',
      exportType: 'json',
      exportRangeStart: '',
      exportRangeEnd: '',
      teamPanelHidden: false,
      noteSearch: '',
      weekSearch: '',
      draggingMenu: false
    },

    utils: {
      uid(prefix = 'id') {
        return `${prefix}_${Math.random().toString(36).slice(2, 10)}`;
      },

      iso(date) {
        const d = new Date(date);
        if (Number.isNaN(d.getTime())) return '';
        const y = d.getFullYear();
        const m = String(d.getMonth() + 1).padStart(2, '0');
        const day = String(d.getDate()).padStart(2, '0');
        return `${y}-${m}-${day}`;
      },

      parseLocalDate(value) {
        if (!value) return null;
        const parts = String(value).split('-').map(Number);
        if (parts.length !== 3 || parts.some(Number.isNaN)) return null;
        return new Date(parts[0], (parts[1] || 1) - 1, parts[2] || 1);
      },

      addDays(date, days) {
        const d = new Date(date);
        d.setDate(d.getDate() + days);
        return d;
      },

      startOfWeek(date) {
        const d = new Date(date);
        const day = (d.getDay() + 6) % 7;
        d.setDate(d.getDate() - day);
        d.setHours(0, 0, 0, 0);
        return d;
      },

      endOfWeek(date) {
        return this.addDays(this.startOfWeek(date), 6);
      },

      prettyDate(date) {
        const d = new Date(date);
        if (Number.isNaN(d.getTime())) return '—';
        return d.toLocaleDateString(App.state.app?.settings?.language || 'ru', {
          day: '2-digit',
          month: 'short'
        });
      },

      prettyDateLong(date) {
        const d = new Date(date);
        if (Number.isNaN(d.getTime())) return '—';
        return d.toLocaleDateString(App.state.app?.settings?.language || 'ru', {
          day: '2-digit',
          month: 'long',
          year: 'numeric'
        });
      },

      daysDiff(a, b) {
        const da = this.parseLocalDate(this.iso(a));
        const db = this.parseLocalDate(this.iso(b));
        if (!da || !db) return 0;
        return Math.round((da - db) / 86400000);
      },

      overlaps(startA, endA, startB, endB) {
        return startA <= endB && endA >= startB;
      },

      getServiceYearForDate(date) {
        const d = new Date(date);
        return d.getMonth() >= App.config.serviceYearStartMonth ? d.getFullYear() : d.getFullYear() - 1;
      },

      serviceYearLabel(year) {
        return `${year}/${year + 1}`;
      },

      serviceYearBounds(year) {
        return {
          start: new Date(year, App.config.serviceYearStartMonth, 1),
          end: new Date(year + 1, App.config.serviceYearStartMonth, 0)
        };
      },

      orderedServiceMonths() {
        return [8, 9, 10, 11, 0, 1, 2, 3, 4, 5, 6, 7];
      },

      escapeHtml(str) {
        return String(str).replace(/[&<>"']/g, (s) => ({
          '&': '&amp;',
          '<': '&lt;',
          '>': '&gt;',
          '"': '&quot;',
          "'": '&#39;'
        }[s]));
      },

      toast(message) {
        if (!App.els.toastWrap) return;
        const el = document.createElement('div');
        el.className = 'toast';
        el.textContent = message;
        App.els.toastWrap.appendChild(el);
        setTimeout(() => el.remove(), 3500);
      },

      weekIdForDate(date) {
        return this.iso(this.startOfWeek(date));
      },

      weekNumber(date) {
        const d = this.startOfWeek(date);
        d.setHours(0, 0, 0, 0);
        d.setDate(d.getDate() + 3);
        const firstThursday = new Date(d.getFullYear(), 0, 4);
        const week = 1 + Math.round(((d - this.startOfWeek(firstThursday)) / 86400000 - 3) / 7);
        return week;
      },

      downloadText(filename, text, mime = 'text/plain;charset=utf-8') {
        const blob = new Blob([text], { type: mime });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        a.remove();
        setTimeout(() => URL.revokeObjectURL(url), 2000);
      },

      slug(value) {
        return String(value || '').toLowerCase().trim().replace(/\s+/g, '-').replace(/[^a-z0-9\-а-яёіїєґ]/gi, '');
      },

      clampColor(color, fallback = '#1f7a45') {
        return /^#[0-9a-f]{6}$/i.test(String(color || '')) ? color : fallback;
      }
    },

    store: {
      ensureSettingsDefaults(settings = {}) {
        const out = { ...settings };
        if (typeof out.showTeamPanel !== 'boolean') out.showTeamPanel = true;
        if (!out.language) out.language = 'ru';
        if (!out.theme) out.theme = 'light';
        if (!out.layoutPreset) out.layoutPreset = 'classic';
        return out;
      },

      createDefaultData() {
        return {
          settings: this.ensureSettingsDefaults({}),
          serviceYears: {},
          events: [
            { id: 'evt_midweek', name: 'Серединное собрание', color: '#1f7a45', address: '', schedule: 'Ср 19:00' },
            { id: 'evt_weekend', name: 'Выходное служение', color: '#2563eb', address: '', schedule: 'Сб 10:00' }
          ],
          entries: [],
          meta: { version: '9.1' }
        };
      },

      migrate(appData) {
        const app = appData && typeof appData === 'object' ? appData : this.createDefaultData();
        app.settings = this.ensureSettingsDefaults(app.settings || {});
        if (!Array.isArray(app.events)) app.events = [];
        if (!Array.isArray(app.entries)) app.entries = [];
        if (!app.serviceYears || typeof app.serviceYears !== 'object') app.serviceYears = {};
        if (!app.meta || typeof app.meta !== 'object') app.meta = { version: '9.1' };
        app.events = app.events.map((item) => ({
          id: item.id || App.utils.uid('evt'),
          name: item.name || 'Без названия',
          color: App.utils.clampColor(item.color),
          address: item.address || '',
          schedule: item.schedule || ''
        }));
        app.entries = app.entries
          .filter((item) => item && item.start && item.end)
          .map((item) => ({
            id: item.id || App.utils.uid('entry'),
            eventId: item.eventId || '',
            start: App.utils.iso(item.start),
            end: App.utils.iso(item.end),
            title: item.title || '',
            note: item.note || ''
          }));
        Object.keys(app.serviceYears).forEach((year) => {
          const sy = app.serviceYears[year] || {};
          if (!sy.weeks || typeof sy.weeks !== 'object') sy.weeks = {};
          Object.keys(sy.weeks).forEach((weekId) => {
            const w = sy.weeks[weekId];
            if (!w) return;
            const start = App.utils.iso(w.start || weekId);
            const end = App.utils.iso(w.end || App.utils.addDays(App.utils.parseLocalDate(start), 6));
            sy.weeks[weekId] = {
              id: w.id || weekId,
              weekId,
              start,
              end,
              eventId: w.eventId || '',
              priority: w.priority || 'normal',
              flagLetter: !!w.flagLetter,
              flagS302: !!w.flagS302,
              note: w.note || ''
            };
          });
          app.serviceYears[year] = sy;
        });
        app.meta.version = '9.1';
        return app;
      },

      load() {
        try {
          const saved = localStorage.getItem(App.config.storageKey);
          App.state.app = saved ? this.migrate(JSON.parse(saved)) : this.createDefaultData();
        } catch (error) {
          console.error('Storage load failed', error);
          App.state.app = this.createDefaultData();
          App.utils.toast('Данные были повреждены. Загружены значения по умолчанию.');
        }
      },

      save() {
        localStorage.setItem(App.config.storageKey, JSON.stringify(App.state.app));
      }
    },

    data: {
      ensureServiceYear(year) {
        if (!App.state.app.serviceYears[year]) {
          App.state.app.serviceYears[year] = { weeks: {} };
        }
        return App.state.app.serviceYears[year];
      },

      getWeek(year, weekId) {
        const sy = this.ensureServiceYear(year);
        if (!sy.weeks[weekId]) {
          const start = App.utils.parseLocalDate(weekId);
          sy.weeks[weekId] = {
            id: weekId,
            weekId,
            start: App.utils.iso(start),
            end: App.utils.iso(App.utils.addDays(start, 6)),
            eventId: '',
            priority: 'normal',
            flagLetter: false,
            flagS302: false,
            note: ''
          };
        }
        return sy.weeks[weekId];
      },

      getWeeksForYear(year) {
        const bounds = App.utils.serviceYearBounds(year);
        const weeks = [];
        let cursor = App.utils.startOfWeek(bounds.start);
        const end = App.utils.endOfWeek(bounds.end);
        while (cursor <= end) {
          const weekId = App.utils.weekIdForDate(cursor);
          const week = this.getWeek(year, weekId);
          weeks.push(week);
          cursor = App.utils.addDays(cursor, 7);
        }
        return weeks;
      },

      addServiceYear(year) {
        const n = Number(year);
        if (!Number.isInteger(n) || n < 2000 || n > 2100) {
          App.utils.toast('Введите корректный год, например 2029.');
          return false;
        }
        this.ensureServiceYear(n);
        this.getWeeksForYear(n);
        App.store.save();
        App.state.selectedYear = n;
        App.utils.toast(`Добавлен служебный год ${App.utils.serviceYearLabel(n)}`);
        return true;
      },

      deleteEntry(id) {
        App.state.app.entries = App.state.app.entries.filter((entry) => entry.id !== id);
        App.store.save();
      },

      getEventById(id) {
        return App.state.app.events.find((item) => item.id === id) || null;
      },

      buildCalendarItemsForMonth(month, year) {
        const viewStart = new Date(year, month, 1);
        const viewEnd = new Date(year, month + 1, 0);
        const items = [];

        Object.values(App.state.app.serviceYears).forEach((serviceYear) => {
          Object.values(serviceYear.weeks || {}).forEach((week) => {
            if (!week.eventId) return;
            const start = App.utils.parseLocalDate(week.start);
            const end = App.utils.parseLocalDate(week.end);
            if (!App.utils.overlaps(start, end, viewStart, viewEnd)) return;
            const event = this.getEventById(week.eventId);
            items.push({
              id: `week:${week.weekId}`,
              source: 'week',
              start,
              end,
              eventId: week.eventId,
              title: event ? event.name : 'Событие',
              color: event?.color || '#1f7a45',
              note: week.note || '',
              meta: week
            });
          });
        });

        App.state.app.entries.forEach((entry) => {
          const start = App.utils.parseLocalDate(entry.start);
          const end = App.utils.parseLocalDate(entry.end);
          if (!start || !end) return;
          if (!App.utils.overlaps(start, end, viewStart, viewEnd)) return;
          const event = this.getEventById(entry.eventId);
          items.push({
            id: `entry:${entry.id}`,
            source: 'entry',
            start,
            end,
            eventId: entry.eventId,
            title: entry.title || event?.name || 'Событие',
            color: event?.color || '#1f7a45',
            note: entry.note || '',
            meta: entry
          });
        });

        if (App.state.calendarEventFilter !== 'all') {
          return items.filter((item) => item.eventId === App.state.calendarEventFilter);
        }
        return items.sort((a, b) => a.start - b.start || a.end - b.end);
      },

      collectIcsItems(startDate, endDate) {
        const start = App.utils.parseLocalDate(startDate);
        const end = App.utils.parseLocalDate(endDate);
        if (!start || !end) return [];
        const out = [];
        Object.values(App.state.app.serviceYears).forEach((serviceYear) => {
          Object.values(serviceYear.weeks || {}).forEach((week) => {
            if (!week.eventId) return;
            const ws = App.utils.parseLocalDate(week.start);
            const we = App.utils.parseLocalDate(week.end);
            if (!App.utils.overlaps(ws, we, start, end)) return;
            const event = this.getEventById(week.eventId);
            out.push({
              title: event?.name || 'Событие',
              description: week.note || '',
              location: event?.address || '',
              start: App.utils.iso(ws),
              end: App.utils.iso(App.utils.addDays(we, 1))
            });
          });
        });
        App.state.app.entries.forEach((entry) => {
          const es = App.utils.parseLocalDate(entry.start);
          const ee = App.utils.parseLocalDate(entry.end);
          if (!App.utils.overlaps(es, ee, start, end)) return;
          const event = this.getEventById(entry.eventId);
          out.push({
            title: entry.title || event?.name || 'Событие',
            description: entry.note || '',
            location: event?.address || '',
            start: App.utils.iso(es),
            end: App.utils.iso(App.utils.addDays(ee, 1))
          });
        });
        return out;
      }
    },

    ui: {
      cacheElements() {
        [
          'appRoot', 'desktopNav', 'toastWrap', 'offlineBanner', 'sideStatus',
          'screenTitle', 'screenSubtitle', 'weekSearch', 'yearSelect', 'eventFilter',
          'weekList', 'weekEditorTitle', 'weekEditorEmpty', 'weekEditor',
          'weekEventSelect', 'weekPrioritySelect', 'flagLetter', 'flagS302',
          'weekNoteInput', 'saveWeekBtn', 'monthLabel', 'calendarRangeLabel',
          'calendarGrid', 'prevMonthBtn', 'todayMonthBtn', 'nextMonthBtn',
          'calendarYearSelect', 'calendarLayoutPresetSelect', 'layoutPresetSelect',
          'calendarEditor', 'editorTitle', 'editorMeta', 'editorEventSelect',
          'editorStart', 'editorEnd', 'editorReadonly', 'editorCloseBtn',
          'editorCancelBtn', 'editorDeleteBtn', 'editorSaveBtn',
          'calendarServiceYearLabel', 'calendarPanelYearLabel', 'calendarQuickList',
          'calendarSideTitle', 'calendarSideMeta', 'calendarSideDetails',
          'calendarEventQuickFilter', 'toggleTeamPanelBtn', 'calendarLayout',
          'eventsList', 'eventNameInput', 'eventColorInput', 'eventAddressInput',
          'eventScheduleInput', 'resetEventBtn', 'saveEventBtn', 'noteSearch',
          'notesList', 'languageSelect', 'themeSelect', 'settingsPdfBtn',
          'backupBtn', 'resetAppBtn', 'themeBtn', 'exportBtn', 'importInput',
          'pdfModal', 'pdfModalCloseBtn', 'pdfCancelBtn', 'pdfExportConfirmBtn',
          'pdfRangeCard', 'pdfRangeStartInput', 'pdfRangeEndInput', 'pdfRangeHelp',
          'pdfHint', 'bottomNav', 'bottomNavRow', 'mobileOverlay',
          'mobileMenuToggleBtn', 'exportModal', 'exportModalCloseBtn',
          'exportCancelBtn', 'exportConfirmBtn', 'exportRangeCard',
          'exportRangeStartInput', 'exportRangeEndInput', 'exportRangeHelp',
          'addYearInput', 'addNextYearBtn', 'addYearBtn'
        ].forEach((id) => {
          App.els[id] = document.getElementById(id);
        });
      },

      renderAll() {
        this.applyTheme();
        this.applyLayout();
        this.renderNav();
        this.renderScreenHeader();
        this.renderCalendar();
        this.renderWeeks();
        this.renderEvents();
        this.renderNotes();
        this.renderSettings();
        this.renderStatus();
      },

      renderNav() {
        const buildButton = (item, mobile = false) => `
          <button class="${mobile ? 'bottom-nav-btn' : 'nav-btn'} ${App.state.selectedScreen === item.id ? 'active' : ''}" data-screen="${item.id}" type="button">
            <span class="icon">${item.icon}</span>
            <span class="label">${item.title}</span>
          </button>`;

        if (App.els.desktopNav) {
          App.els.desktopNav.innerHTML = App.config.navItems.map((item) => buildButton(item, false)).join('');
        }
        if (App.els.bottomNavRow) {
          App.els.bottomNavRow.innerHTML = App.config.navItems.map((item) => buildButton(item, true)).join('');
        }

        document.querySelectorAll('[data-screen]').forEach((btn) => {
          btn.addEventListener('click', () => {
            App.state.selectedScreen = btn.dataset.screen;
            App.ui.closeMobileMenu();
            App.ui.renderAll();
          });
        });

        document.querySelectorAll('.screen').forEach((screen) => {
          screen.classList.toggle('active', screen.id === App.state.selectedScreen);
        });
      },

      renderScreenHeader() {
        const map = {
          calendar: ['Календарь', 'Обзор месяца и событий по служебному году.'],
          weeks: ['Недели', 'Недельное планирование, заметки и приоритеты.'],
          events: ['События', 'Шаблоны событий для календаря и недель.'],
          notes: ['Заметки', 'Поиск и просмотр всех заметок по неделям.'],
          settings: ['Настройки', 'Тема, язык, экспорт, импорт и управление годами.']
        };
        const [title, subtitle] = map[App.state.selectedScreen] || ['Планировщик', ''];
        if (App.els.screenTitle) App.els.screenTitle.textContent = title;
        if (App.els.screenSubtitle) App.els.screenSubtitle.textContent = subtitle;
      },

      renderStatus() {
        const years = Object.keys(App.state.app.serviceYears).length;
        const weeks = Object.values(App.state.app.serviceYears).reduce((sum, sy) => sum + Object.keys(sy.weeks || {}).length, 0);
        const notes = Object.values(App.state.app.serviceYears).reduce((sum, sy) => sum + Object.values(sy.weeks || {}).filter((w) => w.note).length, 0);
        if (App.els.sideStatus) {
          App.els.sideStatus.innerHTML = `
            <div>Служебных лет: <strong>${years}</strong></div>
            <div>Недель в базе: <strong>${weeks}</strong></div>
            <div>Заметок: <strong>${notes}</strong></div>
            <div>Шаблонов событий: <strong>${App.state.app.events.length}</strong></div>
          `;
        }
      },

      renderYearOptions() {
        const currentSY = App.utils.getServiceYearForDate(new Date());
        App.data.ensureServiceYear(currentSY);
        App.data.getWeeksForYear(currentSY);
        const keys = Object.keys(App.state.app.serviceYears).map(Number).sort((a, b) => a - b);
        if (!keys.length) keys.push(currentSY);
        if (!keys.includes(App.state.selectedYear)) App.state.selectedYear = keys[keys.length - 1];
        const options = keys.map((year) => `<option value="${year}">${App.utils.serviceYearLabel(year)}</option>`).join('');
        ['yearSelect', 'calendarYearSelect'].forEach((id) => {
          const el = App.els[id];
          if (!el) return;
          el.innerHTML = options;
          if (id === 'yearSelect') el.value = String(App.state.selectedYear);
        });
      },

      renderLayoutOptions() {
        const options = App.config.layoutPresets.map((item) => `<option value="${item.value}">${item.label}</option>`).join('');
        ['layoutPresetSelect', 'calendarLayoutPresetSelect'].forEach((id) => {
          const el = App.els[id];
          if (!el) return;
          el.innerHTML = options;
          el.value = App.state.app.settings.layoutPreset;
        });
      },

      applyTheme() {
        document.documentElement.setAttribute('data-theme', App.state.app.settings.theme || 'light');
        if (App.els.themeSelect) App.els.themeSelect.value = App.state.app.settings.theme || 'light';
      },

      applyLayout() {
        document.documentElement.setAttribute('data-layout', App.state.app.settings.layoutPreset || 'classic');
        if (App.els.calendarLayout) {
          App.els.calendarLayout.classList.toggle('team-hidden', !App.state.app.settings.showTeamPanel || App.state.teamPanelHidden);
        }
      },

      buildMonthGrid(month, year) {
        const monthStart = new Date(year, month, 1);
        const monthEnd = new Date(year, month + 1, 0);
        const gridStart = App.utils.startOfWeek(monthStart);
        const gridEnd = App.utils.addDays(App.utils.startOfWeek(monthEnd), 41 - App.utils.daysDiff(App.utils.startOfWeek(monthEnd), gridStart));
        const weeks = [];
        let cursor = new Date(gridStart);
        while (cursor <= gridEnd) {
          const days = [];
          for (let i = 0; i < 7; i += 1) {
            const date = App.utils.addDays(cursor, i);
            days.push({
              date,
              iso: App.utils.iso(date),
              day: date.getDate(),
              month: date.getMonth(),
              inMonth: date.getMonth() === month,
              isWeekend: date.getDay() === 0 || date.getDay() === 6,
              isToday: App.utils.iso(date) === App.utils.iso(new Date())
            });
          }
          weeks.push({
            id: App.utils.weekIdForDate(cursor),
            start: new Date(cursor),
            number: App.utils.weekNumber(cursor),
            days
          });
          cursor = App.utils.addDays(cursor, 7);
        }
        return weeks;
      },

      renderCalendar() {
        this.renderYearOptions();
        this.renderLayoutOptions();
        const year = App.state.calendarYear;
        const month = App.state.calendarMonth;
        if (App.els.monthLabel) App.els.monthLabel.textContent = `${App.config.monthNames[month]} ${year}`;

        const monthStart = new Date(year, month, 1);
        const monthEnd = new Date(year, month + 1, 0);
        const serviceYear = App.utils.getServiceYearForDate(monthStart);
        if (App.els.calendarServiceYearLabel) App.els.calendarServiceYearLabel.textContent = `Служебный год: ${App.utils.serviceYearLabel(serviceYear)}`;
        if (App.els.calendarRangeLabel) App.els.calendarRangeLabel.textContent = `${App.utils.prettyDateLong(monthStart)} — ${App.utils.prettyDateLong(monthEnd)}`;
        if (App.els.calendarPanelYearLabel) App.els.calendarPanelYearLabel.textContent = `Контекст: ${App.utils.serviceYearLabel(serviceYear)}`;

        const filterOptions = ['<option value="all">Все события</option>']
          .concat(App.state.app.events.map((event) => `<option value="${event.id}">${App.utils.escapeHtml(event.name)}</option>`));
        if (App.els.calendarEventQuickFilter) {
          App.els.calendarEventQuickFilter.innerHTML = filterOptions.join('');
          App.els.calendarEventQuickFilter.value = App.state.calendarEventFilter;
        }
        if (App.els.eventFilter) {
          App.els.eventFilter.innerHTML = filterOptions.join('');
          App.els.eventFilter.value = App.state.calendarEventFilter;
        }

        const weeks = this.buildMonthGrid(month, year);
        const items = App.data.buildCalendarItemsForMonth(month, year);
        const itemsByWeek = new Map();
        weeks.forEach((week) => itemsByWeek.set(week.id, []));

        items.forEach((item) => {
          weeks.forEach((week) => {
            const weekStart = week.days[0].date;
            const weekEnd = week.days[6].date;
            if (App.utils.overlaps(item.start, item.end, weekStart, weekEnd)) {
              const leftIndex = Math.max(0, App.utils.daysDiff(item.start, weekStart));
              const rightIndex = Math.min(6, App.utils.daysDiff(item.end, weekStart));
              itemsByWeek.get(week.id).push({ ...item, leftIndex, rightIndex, span: rightIndex - leftIndex + 1 });
            }
          });
        });

        const header = `
          <div class="grid-cal">
            <div class="dow-row">
              <div class="dow-corner"></div>
              <div class="dow-days">${App.config.dayNames.map((name) => `<div class="dow">${name}</div>`).join('')}</div>
            </div>
            ${weeks.map((week) => {
              const bars = (itemsByWeek.get(week.id) || []).slice(0, 4);
              const extraCount = Math.max(0, (itemsByWeek.get(week.id) || []).length - 4);
              return `
                <div class="week-row" data-week-id="${week.id}">
                  <button class="week-num" data-open-week="${week.id}" type="button" title="Открыть неделю ${week.number}">W${week.number}</button>
                  <div class="week-days">
                    ${week.days.map((day) => `
                      <div class="day-cell ${day.inMonth ? '' : 'inactive'} ${day.isWeekend ? 'weekend' : ''} ${day.isToday ? 'today today-col' : ''}" data-day="${day.iso}">
                        <div>
                          <span class="day-num">${day.day}</span>
                          ${day.day === 1 ? `<span class="day-month">${App.config.monthNames[day.month].slice(0, 3)}</span>` : ''}
                        </div>
                        <button class="day-add-btn" data-add-date="${day.iso}" type="button" title="Добавить событие">+</button>
                      </div>
                    `).join('')}
                    ${bars.map((bar, rowIndex) => {
                      const left = `calc(${(bar.leftIndex / 7) * 100}% + 6px)`;
                      const width = `calc(${(bar.span / 7) * 100}% - 12px)`;
                      const top = 28 + rowIndex * 20;
                      return `
                        <button
                          class="event-bar"
                          data-item-id="${bar.id}"
                          type="button"
                          style="left:${left};width:${width};top:${top}px;background:${bar.color};"
                          title="${App.utils.escapeHtml(bar.title)}"
                        >
                          ${App.utils.escapeHtml(bar.title)}
                        </button>
                      `;
                    }).join('')}
                    ${extraCount ? `<div class="small" style="position:absolute;left:12px;bottom:6px">+ ещё ${extraCount}</div>` : ''}
                  </div>
                </div>`;
            }).join('')}
          </div>`;

        if (App.els.calendarGrid) App.els.calendarGrid.innerHTML = header;

        if (App.els.calendarYearSelect) {
          App.els.calendarYearSelect.innerHTML = Array.from({ length: 9 }, (_, i) => year - 4 + i)
            .map((y) => `<option value="${y}">${y}</option>`)
            .join('');
          App.els.calendarYearSelect.value = String(year);
        }

        const quickItems = items.slice(0, 12).map((item) => {
          const event = App.data.getEventById(item.eventId);
          return `
            <button class="side-item" type="button" data-item-id="${item.id}">
              <strong>${App.utils.escapeHtml(item.title)}</strong>
              <div class="small">${App.utils.prettyDate(item.start)} — ${App.utils.prettyDate(item.end)}</div>
              <div class="small">${App.utils.escapeHtml(event?.schedule || item.note || 'Без примечания')}</div>
            </button>`;
        }).join('');
        if (App.els.calendarQuickList) {
          App.els.calendarQuickList.innerHTML = quickItems || '<div class="empty">Нет событий в выбранном месяце.</div>';
        }

        const detail = items.find((item) => item.id === App.state.calendarDetailId) || items[0] || null;
        this.renderCalendarDetails(detail);

        document.querySelectorAll('[data-item-id]').forEach((btn) => {
          btn.addEventListener('click', () => {
            const item = items.find((entry) => entry.id === btn.dataset.itemId);
            App.state.calendarDetailId = item?.id || null;
            App.ui.renderCalendarDetails(item || null);
          });
        });

        document.querySelectorAll('[data-add-date]').forEach((btn) => {
          btn.addEventListener('click', () => {
            App.state.calendarEditorMode = 'create';
            App.state.calendarEditingEntryId = null;
            App.state.calendarCreateDate = btn.dataset.addDate;
            App.ui.openCalendarEditor({ start: btn.dataset.addDate, end: btn.dataset.addDate });
          });
        });

        document.querySelectorAll('[data-open-week]').forEach((btn) => {
          btn.addEventListener('click', () => {
            App.state.selectedScreen = 'weeks';
            App.state.selectedYear = App.utils.getServiceYearForDate(btn.dataset.openWeek);
            App.state.selectedWeekId = btn.dataset.openWeek;
            App.ui.renderAll();
          });
        });
      },

      renderCalendarDetails(item) {
        if (!App.els.calendarSideTitle || !App.els.calendarSideMeta || !App.els.calendarSideDetails) return;
        if (!item) {
          App.els.calendarSideTitle.textContent = 'Детали события';
          App.els.calendarSideMeta.textContent = '—';
          App.els.calendarSideDetails.innerHTML = '<div class="empty">Выберите событие в календаре.</div>';
          return;
        }
        const event = App.data.getEventById(item.eventId);
        App.els.calendarSideTitle.textContent = item.title;
        App.els.calendarSideMeta.textContent = `${App.utils.prettyDateLong(item.start)} — ${App.utils.prettyDateLong(item.end)}`;
        App.els.calendarSideDetails.innerHTML = `
          <div class="side-row"><div class="side-label">Тип</div><div class="side-value">${item.source === 'week' ? 'Неделя' : 'Запись'}</div></div>
          <div class="side-row"><div class="side-label">Цвет</div><div class="side-value"><span class="dot" style="background:${event?.color || item.color}"></span> ${event?.name || 'Без шаблона'}</div></div>
          <div class="side-row"><div class="side-label">Адрес</div><div class="side-value">${App.utils.escapeHtml(event?.address || '—')}</div></div>
          <div class="side-row"><div class="side-label">Расписание</div><div class="side-value">${App.utils.escapeHtml(event?.schedule || '—')}</div></div>
          <div class="side-row"><div class="side-label">Заметка</div><div class="side-value">${App.utils.escapeHtml(item.note || '—')}</div></div>
        `;
      },

      openCalendarEditor(prefill = {}) {
        if (!App.els.calendarEditor) return;
        App.els.calendarEditor.hidden = false;
        App.els.editorTitle.textContent = App.state.calendarEditorMode === 'edit' ? 'Редактирование события' : 'Новое событие';
        App.els.editorMeta.textContent = prefill.start && prefill.end ? `${prefill.start} — ${prefill.end}` : 'Выберите даты';
        const options = ['<option value="">Выберите шаблон</option>']
          .concat(App.state.app.events.map((event) => `<option value="${event.id}">${App.utils.escapeHtml(event.name)}</option>`));
        App.els.editorEventSelect.innerHTML = options.join('');
        App.els.editorStart.value = prefill.start || '';
        App.els.editorEnd.value = prefill.end || prefill.start || '';
        App.els.editorReadonly.textContent = 'Будет создана отдельная запись календаря.';
        App.els.editorDeleteBtn.style.display = App.state.calendarEditorMode === 'edit' ? '' : 'none';
      },

      closeCalendarEditor() {
        if (App.els.calendarEditor) App.els.calendarEditor.hidden = true;
        App.state.calendarEditingEntryId = null;
      },

      renderWeeks() {
        this.renderYearOptions();
        const year = App.state.selectedYear;
        const weeks = App.data.getWeeksForYear(year);
        const query = (App.state.weekSearch || '').trim().toLowerCase();
        const filtered = weeks.filter((week) => {
          const event = App.data.getEventById(week.eventId);
          const haystack = [week.note, event?.name, week.weekId, App.utils.prettyDate(week.start), App.utils.prettyDate(week.end)]
            .join(' ')
            .toLowerCase();
          const filterMatch = App.state.calendarEventFilter === 'all' || week.eventId === App.state.calendarEventFilter;
          return (!query || haystack.includes(query)) && filterMatch;
        });

        if (App.els.weekList) {
          App.els.weekList.innerHTML = filtered.map((week) => {
            const event = App.data.getEventById(week.eventId);
            return `
              <button class="week-item ${App.state.selectedWeekId === week.weekId ? 'active' : ''}" data-week-select="${week.weekId}" type="button">
                <div class="week-item-top">
                  <strong>${App.utils.prettyDate(week.start)} — ${App.utils.prettyDate(week.end)}</strong>
                  <span class="badge">W${App.utils.weekNumber(week.start)}</span>
                </div>
                <div class="pill-row" style="margin-top:8px">
                  <span class="pill"><span class="dot" style="background:${event?.color || '#cbd5e1'}"></span>${App.utils.escapeHtml(event?.name || 'Без события')}</span>
                  <span class="pill">${App.config.priorities[week.priority] || 'Обычный'}</span>
                  ${week.flagLetter ? '<span class="pill">Письмо</span>' : ''}
                  ${week.flagS302 ? '<span class="pill">S302</span>' : ''}
                </div>
                <div class="small" style="margin-top:8px">${App.utils.escapeHtml(week.note || 'Без заметки')}</div>
              </button>`;
          }).join('') || '<div class="empty">Совпадений не найдено.</div>';
        }

        document.querySelectorAll('[data-week-select]').forEach((btn) => {
          btn.addEventListener('click', () => {
            App.state.selectedWeekId = btn.dataset.weekSelect;
            App.ui.renderWeeks();
          });
        });

        const selected = filtered.find((week) => week.weekId === App.state.selectedWeekId) || filtered[0] || weeks[0] || null;
        App.state.selectedWeekId = selected?.weekId || null;
        if (!selected) {
          if (App.els.weekEditorEmpty) App.els.weekEditorEmpty.hidden = false;
          if (App.els.weekEditor) App.els.weekEditor.hidden = true;
          return;
        }

        if (App.els.weekEditorTitle) {
          App.els.weekEditorTitle.textContent = `Неделя ${App.utils.prettyDateLong(selected.start)} — ${App.utils.prettyDateLong(selected.end)}`;
        }
        if (App.els.weekEditorEmpty) App.els.weekEditorEmpty.hidden = true;
        if (App.els.weekEditor) App.els.weekEditor.hidden = false;

        const eventOptions = ['<option value="">Без события</option>']
          .concat(App.state.app.events.map((event) => `<option value="${event.id}">${App.utils.escapeHtml(event.name)}</option>`));
        if (App.els.weekEventSelect) {
          App.els.weekEventSelect.innerHTML = eventOptions.join('');
          App.els.weekEventSelect.value = selected.eventId || '';
        }
        if (App.els.weekPrioritySelect) App.els.weekPrioritySelect.value = selected.priority || 'normal';
        if (App.els.flagLetter) App.els.flagLetter.checked = !!selected.flagLetter;
        if (App.els.flagS302) App.els.flagS302.checked = !!selected.flagS302;
        if (App.els.weekNoteInput) App.els.weekNoteInput.value = selected.note || '';
      },

      renderEvents() {
        if (App.els.eventsList) {
          App.els.eventsList.innerHTML = App.state.app.events.map((event) => `
            <div class="event-row">
              <div>
                <strong>${App.utils.escapeHtml(event.name)}</strong>
                <div class="small">${App.utils.escapeHtml(event.schedule || 'Без расписания')}</div>
                <div class="small">${App.utils.escapeHtml(event.address || 'Адрес не указан')}</div>
              </div>
              <div style="display:grid;gap:8px;justify-items:end">
                <span class="pill"><span class="dot" style="background:${event.color}"></span>${event.color}</span>
                <button class="btn" type="button" data-edit-event="${event.id}">Редактировать</button>
              </div>
            </div>
          `).join('') || '<div class="empty">Пока нет шаблонов событий.</div>';
        }

        document.querySelectorAll('[data-edit-event]').forEach((btn) => {
          btn.addEventListener('click', () => {
            const event = App.data.getEventById(btn.dataset.editEvent);
            App.state.editingEventId = event?.id || null;
            if (App.els.eventNameInput) App.els.eventNameInput.value = event?.name || '';
            if (App.els.eventColorInput) App.els.eventColorInput.value = event?.color || '#1f7a45';
            if (App.els.eventAddressInput) App.els.eventAddressInput.value = event?.address || '';
            if (App.els.eventScheduleInput) App.els.eventScheduleInput.value = event?.schedule || '';
          });
        });
      },

      renderNotes() {
        const query = (App.state.noteSearch || '').trim().toLowerCase();
        const items = [];
        Object.keys(App.state.app.serviceYears).sort((a, b) => Number(a) - Number(b)).forEach((year) => {
          Object.values(App.state.app.serviceYears[year].weeks || {}).forEach((week) => {
            if (!week.note) return;
            const event = App.data.getEventById(week.eventId);
            const haystack = `${week.note} ${event?.name || ''} ${week.weekId}`.toLowerCase();
            if (query && !haystack.includes(query)) return;
            items.push({ year, week, event });
          });
        });
        if (App.els.notesList) {
          App.els.notesList.innerHTML = items.map(({ year, week, event }) => `
            <div class="note-row">
              <div>
                <strong>${App.utils.serviceYearLabel(Number(year))}</strong>
                <div class="small">${App.utils.prettyDate(week.start)} — ${App.utils.prettyDate(week.end)} · ${App.utils.escapeHtml(event?.name || 'Без события')}</div>
                <div style="margin-top:8px">${App.utils.escapeHtml(week.note)}</div>
              </div>
              <button class="btn" type="button" data-jump-week="${week.weekId}" data-jump-year="${year}">Открыть</button>
            </div>
          `).join('') || '<div class="empty">Нет заметок.</div>';
        }
        document.querySelectorAll('[data-jump-week]').forEach((btn) => {
          btn.addEventListener('click', () => {
            App.state.selectedScreen = 'weeks';
            App.state.selectedYear = Number(btn.dataset.jumpYear);
            App.state.selectedWeekId = btn.dataset.jumpWeek;
            App.ui.renderAll();
          });
        });
      },

      renderSettings() {
        if (App.els.languageSelect) App.els.languageSelect.value = App.state.app.settings.language || 'ru';
        if (App.els.addYearInput && !App.els.addYearInput.value) {
          App.els.addYearInput.value = String(Math.max(...Object.keys(App.state.app.serviceYears).map(Number), App.utils.getServiceYearForDate(new Date())) + 1);
        }
      },

      closeMobileMenu() {
        if (App.els.appRoot) App.els.appRoot.classList.remove('menu-open');
        if (App.els.mobileOverlay) App.els.mobileOverlay.hidden = true;
      },

      toggleMobileMenu() {
        if (!App.els.appRoot) return;
        const open = !App.els.appRoot.classList.contains('menu-open');
        App.els.appRoot.classList.toggle('menu-open', open);
        if (App.els.mobileOverlay) App.els.mobileOverlay.hidden = !open;
      }
    },

    actions: {
      saveWeek() {
        if (!App.state.selectedWeekId) return;
        const year = App.state.selectedYear;
        const week = App.data.getWeek(year, App.state.selectedWeekId);
        week.eventId = App.els.weekEventSelect?.value || '';
        week.priority = App.els.weekPrioritySelect?.value || 'normal';
        week.flagLetter = !!App.els.flagLetter?.checked;
        week.flagS302 = !!App.els.flagS302?.checked;
        week.note = App.els.weekNoteInput?.value.trim() || '';
        App.store.save();
        App.ui.renderAll();
        App.utils.toast('Неделя сохранена.');
      },

      resetEventForm() {
        App.state.editingEventId = null;
        if (App.els.eventNameInput) App.els.eventNameInput.value = '';
        if (App.els.eventColorInput) App.els.eventColorInput.value = '#1f7a45';
        if (App.els.eventAddressInput) App.els.eventAddressInput.value = '';
        if (App.els.eventScheduleInput) App.els.eventScheduleInput.value = '';
      },

      saveEvent() {
        const name = App.els.eventNameInput?.value.trim();
        if (!name) {
          App.utils.toast('Введите название события.');
          return;
        }
        const payload = {
          id: App.state.editingEventId || App.utils.uid('evt'),
          name,
          color: App.utils.clampColor(App.els.eventColorInput?.value),
          address: App.els.eventAddressInput?.value.trim() || '',
          schedule: App.els.eventScheduleInput?.value.trim() || ''
        };
        const index = App.state.app.events.findIndex((event) => event.id === payload.id);
        if (index >= 0) App.state.app.events[index] = payload;
        else App.state.app.events.push(payload);
        App.store.save();
        this.resetEventForm();
        App.ui.renderAll();
        App.utils.toast('Шаблон события сохранён.');
      },

      saveCalendarEntry() {
        const eventId = App.els.editorEventSelect?.value || '';
        const start = App.els.editorStart?.value || '';
        const end = App.els.editorEnd?.value || '';
        if (!eventId || !start || !end) {
          App.utils.toast('Выберите шаблон и даты.');
          return;
        }
        if (start > end) {
          App.utils.toast('Дата окончания не может быть раньше даты начала.');
          return;
        }
        const existingIndex = App.state.app.entries.findIndex((entry) => entry.id === App.state.calendarEditingEntryId);
        const event = App.data.getEventById(eventId);
        const payload = {
          id: App.state.calendarEditingEntryId || App.utils.uid('entry'),
          eventId,
          start,
          end,
          title: event?.name || 'Событие',
          note: ''
        };
        if (existingIndex >= 0) App.state.app.entries[existingIndex] = payload;
        else App.state.app.entries.push(payload);
        App.store.save();
        App.ui.closeCalendarEditor();
        App.ui.renderAll();
        App.utils.toast('Календарное событие сохранено.');
      },

      exportJson() {
        const filename = `service-year-planner-${App.utils.iso(new Date())}.json`;
        App.utils.downloadText(filename, JSON.stringify(App.state.app, null, 2), 'application/json;charset=utf-8');
      },

      exportIcs() {
        let start = App.els.exportRangeStartInput?.value || '';
        let end = App.els.exportRangeEndInput?.value || '';
        if (!start || !end) {
          const monthStart = App.utils.iso(new Date(App.state.calendarYear, App.state.calendarMonth, 1));
          const monthEnd = App.utils.iso(new Date(App.state.calendarYear, App.state.calendarMonth + 1, 0));
          start = start || monthStart;
          end = end || monthEnd;
        }
        if (start > end) {
          App.utils.toast('Проверьте диапазон дат для .ics.');
          return;
        }
        const items = App.data.collectIcsItems(start, end);
        const escape = (s) => String(s || '').replace(/\\/g, '\\\\').replace(/\n/g, '\\n').replace(/,/g, '\\,').replace(/;/g, '\\;');
        const lines = [
          'BEGIN:VCALENDAR',
          'VERSION:2.0',
          'PRODID:-//Service Year Planner//RU//'
        ];
        items.forEach((item) => {
          lines.push(
            'BEGIN:VEVENT',
            `UID:${App.utils.uid('ics')}`,
            `DTSTAMP:${App.utils.iso(new Date()).replace(/-/g, '')}T000000Z`,
            `DTSTART;VALUE=DATE:${item.start.replace(/-/g, '')}`,
            `DTEND;VALUE=DATE:${item.end.replace(/-/g, '')}`,
            `SUMMARY:${escape(item.title)}`,
            `DESCRIPTION:${escape(item.description)}`,
            `LOCATION:${escape(item.location)}`,
            'END:VEVENT'
          );
        });
        lines.push('END:VCALENDAR');
        App.utils.downloadText(`service-year-planner-${start}-${end}.ics`, `${lines.join('\r\n')}\r\n`, 'text/calendar;charset=utf-8');
        App.utils.toast('Файл .ics подготовлен.');
      },

      importJson(file) {
        if (!file) return;
        const reader = new FileReader();
        reader.onload = () => {
          try {
            const parsed = JSON.parse(String(reader.result || '{}'));
            App.state.app = App.store.migrate(parsed);
            App.store.save();
            App.ui.renderAll();
            App.utils.toast('JSON успешно импортирован.');
          } catch (error) {
            console.error(error);
            App.utils.toast('Не удалось импортировать JSON.');
          }
          if (App.els.importInput) App.els.importInput.value = '';
        };
        reader.readAsText(file, 'utf-8');
      },

      resetApp() {
        App.state.app = App.store.createDefaultData();
        const sy = App.utils.getServiceYearForDate(new Date());
        App.data.addServiceYear(sy);
        App.store.save();
        App.ui.renderAll();
        App.utils.toast('Приложение сброшено.');
      },

      openPdf() {
        if (App.els.pdfModal) App.els.pdfModal.hidden = false;
      },

      closePdf() {
        if (App.els.pdfModal) App.els.pdfModal.hidden = true;
      },

      doPrint() {
        this.closePdf();
        window.print();
      }
    },

    bind() {
      App.els.weekSearch?.addEventListener('input', (e) => {
        App.state.weekSearch = e.target.value;
        App.ui.renderWeeks();
      });
      App.els.noteSearch?.addEventListener('input', (e) => {
        App.state.noteSearch = e.target.value;
        App.ui.renderNotes();
      });
      App.els.yearSelect?.addEventListener('change', (e) => {
        App.state.selectedYear = Number(e.target.value);
        App.state.selectedWeekId = null;
        App.ui.renderWeeks();
      });
      App.els.eventFilter?.addEventListener('change', (e) => {
        App.state.calendarEventFilter = e.target.value;
        App.ui.renderAll();
      });
      App.els.calendarEventQuickFilter?.addEventListener('change', (e) => {
        App.state.calendarEventFilter = e.target.value;
        App.ui.renderAll();
      });
      App.els.saveWeekBtn?.addEventListener('click', () => App.actions.saveWeek());
      App.els.resetEventBtn?.addEventListener('click', () => App.actions.resetEventForm());
      App.els.saveEventBtn?.addEventListener('click', () => App.actions.saveEvent());
      App.els.themeBtn?.addEventListener('click', () => {
        App.state.app.settings.theme = App.state.app.settings.theme === 'dark' ? 'light' : 'dark';
        App.store.save();
        App.ui.renderAll();
      });
      App.els.themeSelect?.addEventListener('change', (e) => {
        App.state.app.settings.theme = e.target.value;
        App.store.save();
        App.ui.renderAll();
      });
      App.els.languageSelect?.addEventListener('change', (e) => {
        App.state.app.settings.language = e.target.value;
        App.store.save();
        App.ui.renderAll();
      });
      App.els.layoutPresetSelect?.addEventListener('change', (e) => {
        App.state.app.settings.layoutPreset = e.target.value;
        App.store.save();
        App.ui.renderAll();
      });
      App.els.calendarLayoutPresetSelect?.addEventListener('change', (e) => {
        App.state.app.settings.layoutPreset = e.target.value;
        App.store.save();
        App.ui.renderAll();
      });
      App.els.prevMonthBtn?.addEventListener('click', () => {
        const date = new Date(App.state.calendarYear, App.state.calendarMonth - 1, 1);
        App.state.calendarMonth = date.getMonth();
        App.state.calendarYear = date.getFullYear();
        App.ui.renderCalendar();
      });
      App.els.todayMonthBtn?.addEventListener('click', () => {
        const now = new Date();
        App.state.calendarMonth = now.getMonth();
        App.state.calendarYear = now.getFullYear();
        App.ui.renderCalendar();
      });
      App.els.nextMonthBtn?.addEventListener('click', () => {
        const date = new Date(App.state.calendarYear, App.state.calendarMonth + 1, 1);
        App.state.calendarMonth = date.getMonth();
        App.state.calendarYear = date.getFullYear();
        App.ui.renderCalendar();
      });
      App.els.calendarYearSelect?.addEventListener('change', (e) => {
        App.state.calendarYear = Number(e.target.value);
        App.ui.renderCalendar();
      });
      App.els.toggleTeamPanelBtn?.addEventListener('click', () => {
        App.state.teamPanelHidden = !App.state.teamPanelHidden;
        App.state.app.settings.showTeamPanel = !App.state.teamPanelHidden;
        App.store.save();
        App.ui.applyLayout();
      });
      App.els.editorCloseBtn?.addEventListener('click', () => App.ui.closeCalendarEditor());
      App.els.editorCancelBtn?.addEventListener('click', () => App.ui.closeCalendarEditor());
      App.els.editorSaveBtn?.addEventListener('click', () => App.actions.saveCalendarEntry());
      App.els.editorDeleteBtn?.addEventListener('click', () => {
        if (!App.state.calendarEditingEntryId) return;
        App.data.deleteEntry(App.state.calendarEditingEntryId);
        App.ui.closeCalendarEditor();
        App.ui.renderAll();
        App.utils.toast('Событие удалено.');
      });
      App.els.settingsPdfBtn?.addEventListener('click', () => App.actions.openPdf());
      App.els.pdfModalCloseBtn?.addEventListener('click', () => App.actions.closePdf());
      App.els.pdfCancelBtn?.addEventListener('click', () => App.actions.closePdf());
      App.els.pdfExportConfirmBtn?.addEventListener('click', () => App.actions.doPrint());
      App.els.exportBtn?.addEventListener('click', () => {
        if (App.els.exportModal) App.els.exportModal.hidden = false;
      });
      App.els.exportModalCloseBtn?.addEventListener('click', () => {
        if (App.els.exportModal) App.els.exportModal.hidden = true;
      });
      App.els.exportCancelBtn?.addEventListener('click', () => {
        if (App.els.exportModal) App.els.exportModal.hidden = true;
      });
      App.els.exportConfirmBtn?.addEventListener('click', () => {
        if (App.state.exportType === 'ics') App.actions.exportIcs();
        else App.actions.exportJson();
        if (App.els.exportModal) App.els.exportModal.hidden = true;
      });
      document.querySelectorAll('[data-export-type]').forEach((btn) => {
        btn.addEventListener('click', () => {
          App.state.exportType = btn.dataset.exportType;
          document.querySelectorAll('[data-export-type]').forEach((node) => node.classList.toggle('active', node === btn));
          if (App.els.exportRangeCard) App.els.exportRangeCard.style.display = App.state.exportType === 'ics' ? 'block' : 'none';
        });
      });
      document.querySelectorAll('[data-pdf-type]').forEach((btn) => {
        btn.addEventListener('click', () => {
          App.state.pdfExportType = btn.dataset.pdfType;
          document.querySelectorAll('[data-pdf-type]').forEach((node) => node.classList.toggle('active', node === btn));
          const needsRange = ['custom-range-calendar', 'custom-range'].includes(App.state.pdfExportType);
          if (App.els.pdfRangeCard) App.els.pdfRangeCard.style.display = needsRange ? 'block' : 'none';
        });
      });
      App.els.backupBtn?.addEventListener('click', () => App.actions.exportJson());
      App.els.importInput?.addEventListener('change', (e) => App.actions.importJson(e.target.files?.[0] || null));
      App.els.resetAppBtn?.addEventListener('click', () => {
        if (window.confirm('Сбросить данные приложения?')) App.actions.resetApp();
      });
      App.els.mobileMenuToggleBtn?.addEventListener('click', () => App.ui.toggleMobileMenu());
      App.els.mobileOverlay?.addEventListener('click', () => App.ui.closeMobileMenu());
      App.els.addYearBtn?.addEventListener('click', () => {
        if (App.data.addServiceYear(Number(App.els.addYearInput?.value))) App.ui.renderAll();
      });
      App.els.addNextYearBtn?.addEventListener('click', () => {
        const years = Object.keys(App.state.app.serviceYears).map(Number);
        const nextYear = (years.length ? Math.max(...years) : App.utils.getServiceYearForDate(new Date())) + 1;
        if (App.data.addServiceYear(nextYear)) {
          if (App.els.addYearInput) App.els.addYearInput.value = String(nextYear + 1);
          App.ui.renderAll();
        }
      });
      window.addEventListener('online', () => App.els.offlineBanner?.classList.remove('show'));
      window.addEventListener('offline', () => App.els.offlineBanner?.classList.add('show'));
      if (!navigator.onLine) App.els.offlineBanner?.classList.add('show');
      window.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
          App.ui.closeCalendarEditor();
          App.actions.closePdf();
          if (App.els.exportModal) App.els.exportModal.hidden = true;
          App.ui.closeMobileMenu();
        }
      });
    },

    init() {
      this.ui.cacheElements();
      this.store.load();
      const currentSY = this.utils.getServiceYearForDate(new Date());
      this.data.ensureServiceYear(currentSY);
      this.data.getWeeksForYear(currentSY);
      this.state.selectedYear = currentSY;
      this.state.teamPanelHidden = !this.state.app.settings.showTeamPanel;
      this.ui.renderAll();
      this.bind();

      if ('serviceWorker' in navigator) {
        window.addEventListener('load', () => {
          navigator.serviceWorker.register('./sw.js').catch(() => {
            /* optional worker */
          });
        });
      }
    }
  };

  window.App = App;
  App.init();
})();
