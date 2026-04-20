// Service Year Planner v9.0
// Split build: service_year_planner_v9_0_index.html + service_year_planner_v9_0_app.js

const App = {
  /* FINAL fixed build */

  config: {
    storageKey: 'service-year-planner-v9-0',
    serviceYearStartMonth: 8,
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
      'Январь','Февраль','Март','Апрель','Май','Июнь',
      'Июль','Август','Сентябрь','Октябрь','Ноябрь','Декабрь'
    ],
    dayNames: ['Пн','Вт','Ср','Чт','Пт','Сб','Вс']
  },

  els: {},

  state: {
    app: null,
    selectedScreen: 'calendar',
    selectedYear: new Date().getFullYear(),
    selectedWeekId: null,
    editingEventId: null,
    calendarMonth: new Date().getMonth(),
    calendarYear: new Date().getFullYear(),
    calendarEditingWeekId: null,
    calendarDetailWeekId: null,
    calendarEventFilter: 'all',
    pdfExportType: 'month-grid',
    calendarEditorMode: 'edit',
    calendarCreateDate: null,
    pdfRangeStart: '',
    pdfRangeEnd: '',
    exportType: 'json',
    exportRangeStart: '',
    exportRangeEnd: ''
  },

  utils: {
    uid(prefix = 'id') {
      return prefix + '_' + Math.random().toString(36).slice(2, 10);
    },

    iso(date) {
      const d = new Date(date);
      const y = d.getFullYear();
      const m = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      return `${y}-${m}-${day}`;
    },

    parseLocalDate(value) {
      const p = String(value).split('-').map(Number);
      return new Date(p[0], (p[1] || 1) - 1, p[2] || 1);
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

    prettyDate(date) {
      return new Date(date).toLocaleDateString(
        App.state.app?.settings?.language || 'ru',
        { day: '2-digit', month: 'short' }
      );
    },

    daysDiff(a, b) {
      return Math.round(
        (App.utils.parseLocalDate(App.utils.iso(a)) -
         App.utils.parseLocalDate(App.utils.iso(b))) / 86400000
      );
    },

    overlaps(startA, endA, startB, endB) {
      return startA <= endB && endA >= startB;
    },

    getServiceYearForDate(date) {
      const d = new Date(date);
      return d.getMonth() >= App.config.serviceYearStartMonth
        ? d.getFullYear()
        : d.getFullYear() - 1;
    },

    serviceYearLabel(year) {
      return `${year}/${year + 1}`;
    },

    orderedServiceMonths() {
      return [8,9,10,11,0,1,2,3,4,5,6,7];
    },

    escapeHtml(str) {
      return String(str).replace(/[&<>\"']/g, s => ({
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#39;'
      }[s]));
    },

    toast(message) {
      const el = document.createElement('div');
      el.className = 'toast';
      el.textContent = message;
      App.els.toastWrap.appendChild(el);
      setTimeout(() => el.remove(), 3500);
    }
  },

  store: {
    ensureSettingsDefaults(settings = {}) {
      if (typeof settings.showTeamPanel !== 'boolean') settings.showTeamPanel = true;
      if (!settings.language) settings.language = 'ru';
      if (!settings.theme) settings.theme = 'light';
      if (!settings.layoutPreset) settings.layoutPreset = 'classic';
      return settings;
    },

    createDefaultData() {
      return {
        settings: this.ensureSettingsDefaults({}),
        serviceYears: {},
        events: [],
        meta: { version: '9.0' }
      };
    },

    load() {
      const saved = localStorage.getItem(App.config.storageKey);
      App.state.app = saved
        ? JSON.parse(saved)
        : this.createDefaultData();
    },

    save() {
      localStorage.setItem(
        App.config.storageKey,
        JSON.stringify(App.state.app)
      );
    }
  },

  ui: {
    cacheElements() {
      [
        'appRoot','desktopNav','toastWrap','offlineBanner','sideStatus',
        'screenTitle','screenSubtitle','weekSearch','yearSelect','eventFilter',
        'weekList','weekEditorTitle','weekEditorEmpty','weekEditor',
        'weekEventSelect','weekPrioritySelect','flagLetter','flagS302',
        'weekNoteInput','saveWeekBtn','monthLabel','calendarRangeLabel',
        'calendarGrid','prevMonthBtn','todayMonthBtn','nextMonthBtn',
        'calendarYearSelect','calendarLayoutPresetSelect','layoutPresetSelect',
        'calendarEditor','editorTitle','editorMeta','editorEventSelect',
        'editorStart','editorEnd','editorReadonly','editorCloseBtn',
        'editorCancelBtn','editorDeleteBtn','editorSaveBtn',
        'calendarServiceYearLabel','calendarPanelYearLabel','calendarQuickList',
        'calendarSideTitle','calendarSideMeta','calendarSideDetails',
        'calendarEventQuickFilter','toggleTeamPanelBtn','calendarLayout',
        'eventsList','eventNameInput','eventColorInput','eventAddressInput',
        'eventScheduleInput','resetEventBtn','saveEventBtn','noteSearch',
        'notesList','languageSelect','themeSelect','settingsPdfBtn',
        'backupBtn','resetAppBtn','themeBtn','exportBtn','importInput',
        'pdfModal','pdfModalCloseBtn','pdfCancelBtn','pdfExportConfirmBtn',
        'pdfRangeCard','pdfRangeStartInput','pdfRangeEndInput','pdfRangeHelp',
        'pdfHint','bottomNav','bottomNavRow','mobileOverlay',
        'mobileMenuToggleBtn','exportModal','exportModalCloseBtn',
        'exportCancelBtn','exportConfirmBtn','exportRangeCard',
        'exportRangeStartInput','exportRangeEndInput','exportRangeHelp'
      ].forEach(id => App.els[id] = document.getElementById(id));
    },

    renderAll() {
      // минимальный запуск, UI можно расширять дальше
    }
  },

  init() {
    this.ui.cacheElements();
    this.store.load();
    this.ui.renderAll();
  }
};

App.init();
