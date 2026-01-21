/**
 * Natural Calendar - Hybrid Calendar System
 * 13 Months aligned to Equinox (Solar) + Moon Phase Overlay (Lunar)
 * 
 * @author Natural Calendar Project
 * @license MIT
 */

'use strict';

// =============================================================================
// TYPE DEFINITIONS
// =============================================================================

/**
 * Represents a date in the Natural Calendar system
 */
interface NaturalDate {
  /** Year in Natural Calendar (Year 0 = 2025) */
  year: number;
  /** Month index (0-12 for months, -1 for Aeterna) */
  monthIndex: number;
  /** Name of the month or "Aeterna" for the Day Out of Time */
  monthName: string;
  /** Day of the month (1-28, or 0 for Aeterna) */
  day: number;
  /** Day of the year (0 for Aeterna, 1-364 for regular days) */
  dayOfYear: number;
}

/**
 * Represents moon phase data for a given date
 */
interface MoonData {
  /** Phase as a decimal (0-1, where 0 and 1 are New Moon) */
  phase: number;
  /** Human-readable phase name */
  phaseName: string;
  /** Illumination percentage (0-1) */
  illumination: number;
}

/**
 * View types for the calendar
 */
type CalendarView = 'year' | 'month' | 'week' | 'day';

// =============================================================================
// CONSTANTS
// =============================================================================

/** Names of the 13 months in the Natural Calendar */
const MONTH_NAMES: readonly string[] = [
  'Vernis', 'Germen', 'Flora', 'Sol', 'Aestus', 'Serere', 'Fructus',
  'Messis', 'Autumnus', 'Bruma', 'Niveus', 'Glacies', 'Renova'
] as const;

/** The Day Out of Time - occurs on the Vernal Equinox */
const DAY_OUT_OF_TIME = 'Aeterna';

/** Lunar cycle length in days */
const LUNAR_CYCLE_DAYS = 29.53058867;

/** Reference date for moon phase calculation (known New Moon) */
const MOON_REFERENCE_DATE = new Date('2000-01-06T12:24:01Z');

/** Milliseconds in a day */
const MS_PER_DAY = 1000 * 60 * 60 * 24;

// =============================================================================
// STATE
// =============================================================================

/** Currently selected date in Gregorian calendar */
let currentSelectedDate: Date = new Date();

/** Current calendar view */
let currentView: CalendarView = 'year';

/** Currently displayed context (year for year view, month for month view, etc.) */
let displayedYear: number | null = null;
let displayedMonth: number | null = null;
let displayedWeek: number | null = null;

// =============================================================================
// CORE CALENDAR LOGIC
// =============================================================================

/**
 * Converts a Gregorian date to Natural Calendar format
 * 
 * The Natural Calendar year begins on the Vernal Equinox (March 20th).
 * Each year has 13 months of 28 days each, plus one "Day Out of Time" (Aeterna).
 * 
 * @param date - The Gregorian date to convert
 * @returns The corresponding Natural Calendar date
 */
function convertGregorianToNatural(date: Date): NaturalDate {
  const year = date.getFullYear();
  const equinox = new Date(year, 2, 20); // March 20th

  let naturalYear = year;
  let equinoxDate = equinox;

  // If before this year's equinox, we're still in the previous Natural Year
  if (date < equinox) {
    naturalYear = year - 1;
    equinoxDate = new Date(year - 1, 2, 20);
  }

  const diffTime = date.getTime() - equinoxDate.getTime();
  const diffDays = Math.floor(diffTime / MS_PER_DAY);

  // Day 0: Aeterna (Day Out of Time)
  if (diffDays === 0) {
    return {
      year: naturalYear - 2025,
      monthIndex: -1,
      monthName: DAY_OUT_OF_TIME,
      day: 0,
      dayOfYear: 0
    };
  }

  // Day 365+: Leap year handling (rare extra Aeterna)
  if (diffDays > 364) {
    return {
      year: naturalYear - 2025,
      monthIndex: -1,
      monthName: 'Aeterna (+)',
      day: 0,
      dayOfYear: diffDays
    };
  }

  // Regular days: Calculate month and day
  const monthIndex = Math.floor((diffDays - 1) / 28);
  const dayOfMonth = ((diffDays - 1) % 28) + 1;
  const safeMonthIndex = Math.min(monthIndex, 12);

  return {
    year: naturalYear - 2025, // Year 0 = 2025, Year 1 = 2026
    monthIndex: safeMonthIndex,
    monthName: MONTH_NAMES[safeMonthIndex] ?? 'Unknown',
    day: dayOfMonth,
    dayOfYear: diffDays
  };
}

/**
 * Converts Natural Calendar date to Gregorian date
 */
function convertNaturalToGregorian(year: number, monthIndex: number, day: number): Date {
  const gregorianYear = year + 2025;
  const equinox = new Date(gregorianYear, 2, 20, 12, 0, 0);
  
  // Calculate days offset
  const dayOffset = monthIndex * 28 + day;
  
  const result = new Date(equinox);
  result.setDate(equinox.getDate() + dayOffset);
  return result;
}

/**
 * Calculates moon phase data for a given date
 * 
 * Uses astronomical calculation based on a known New Moon reference point.
 * 
 * @param date - The date to calculate moon phase for
 * @returns Moon phase data including phase, name, and illumination
 */
function getMoonData(date: Date): MoonData {
  const diffMs = date.getTime() - MOON_REFERENCE_DATE.getTime();
  const diffDays = diffMs / MS_PER_DAY;

  // Calculate phase as 0-1 value
  let phase = (diffDays % LUNAR_CYCLE_DAYS) / LUNAR_CYCLE_DAYS;
  if (phase < 0) phase += 1;

  // Calculate illumination using cosine function
  const illumination = (1 - Math.cos(phase * 2 * Math.PI)) / 2;

  // Determine phase name based on phase value
  let phaseName: string;
  if (phase < 0.03 || phase > 0.97) {
    phaseName = 'New Moon';
  } else if (phase < 0.25) {
    phaseName = 'Waxing Crescent';
  } else if (phase < 0.28) {
    phaseName = 'First Quarter';
  } else if (phase < 0.47) {
    phaseName = 'Waxing Gibbous';
  } else if (phase < 0.53) {
    phaseName = 'Full Moon';
  } else if (phase < 0.72) {
    phaseName = 'Waning Gibbous';
  } else if (phase < 0.75) {
    phaseName = 'Last Quarter';
  } else {
    phaseName = 'Waning Crescent';
  }

  return { phase, phaseName, illumination };
}

/**
 * Checks if two dates represent the same calendar day
 * 
 * @param d1 - First date
 * @param d2 - Second date
 * @returns True if both dates are the same day
 */
function isSameDay(d1: Date, d2: Date): boolean {
  return (
    d1.getFullYear() === d2.getFullYear() &&
    d1.getMonth() === d2.getMonth() &&
    d1.getDate() === d2.getDate()
  );
}

// =============================================================================
// UI HELPER FUNCTIONS
// =============================================================================

/**
 * Creates a moon phase dot element
 * 
 * @param moon - Moon phase data
 * @returns The moon dot element
 */
function createMoonDot(moon: MoonData): HTMLElement {
  const dot = document.createElement('div');
  dot.className = 'w-1.5 h-1.5 rounded-full mt-0.5';

  const phaseClasses: Record<string, string> = {
    'New Moon': 'bg-[#0a0a0a] border border-[#444]',
    'Waxing Crescent': 'bg-[#555]',
    'First Quarter': 'bg-[#888]',
    'Waxing Gibbous': 'bg-[#bbb]',
    'Full Moon': 'bg-white shadow-[0_0_4px_white]',
    'Waning Gibbous': 'bg-[#bbb]',
    'Last Quarter': 'bg-[#888]',
    'Waning Crescent': 'bg-[#555]'
  };

  const phaseClass = phaseClasses[moon.phaseName];
  if (phaseClass) dot.className += ' ' + phaseClass;

  return dot;
}

/**
 * Renders a visual representation of the moon phase (large version)
 */
function renderLargeMoonVisual(moon: MoonData): HTMLElement {
  const container = document.createElement('div');
  container.className = 'w-32 h-32 rounded-full relative overflow-hidden';
  
  const p = moon.phase;
  const offset = Math.cos(p * 2 * Math.PI) * 40;
  const isDark = document.body.classList.contains('dark');

  // Apply shadow based on phase
  if (p < 0.5) {
    container.style.background = isDark ? '#1a1a1a' : '#e5e7eb';
    container.style.boxShadow = `inset ${-offset * 2}px 0 20px -8px ${isDark ? '#fff' : '#000'}`;
  } else {
    container.style.background = isDark ? '#1a1a1a' : '#e5e7eb';
    container.style.boxShadow = `inset ${offset * 2}px 0 20px -8px ${isDark ? '#fff' : '#000'}`;
  }

  // Special cases for New and Full Moon
  if (moon.phaseName === 'New Moon') {
    container.style.background = isDark ? '#0a0a0a' : '#1f2937';
    container.style.boxShadow = 'none';
    container.style.border = `2px solid ${isDark ? '#333' : '#9ca3af'}`;
  }
  if (moon.phaseName === 'Full Moon') {
    container.style.background = isDark ? '#fff' : '#fbbf24';
    container.style.boxShadow = isDark ? '0 0 20px rgba(255,255,255,0.5)' : '0 0 20px rgba(251,191,36,0.5)';
  }
  
  return container;
}

/**
 * Updates the date display in the top bar
 */
function updateDateDisplay(): void {
  const dateDisplay = document.getElementById('dateDisplay');
  if (!dateDisplay) return;

  const natDate = convertGregorianToNatural(currentSelectedDate);
  
  switch (currentView) {
    case 'year':
      dateDisplay.textContent = `Natural Year ${natDate.year}`;
      break;
    case 'month':
      if (displayedMonth !== null) {
        dateDisplay.textContent = `${MONTH_NAMES[displayedMonth]} ${natDate.year}`;
      }
      break;
    case 'week':
      if (displayedMonth !== null && displayedWeek !== null) {
        dateDisplay.textContent = `Week ${displayedWeek + 1}, ${MONTH_NAMES[displayedMonth]} ${natDate.year}`;
      }
      break;
    case 'day':
      if (natDate.monthIndex >= 0) {
        dateDisplay.textContent = `${natDate.monthName} ${natDate.day}, Year ${natDate.year}`;
      }
      break;
  }
}

/**
 * Updates view button styles
 */
function updateViewButtons(): void {
  const buttons = {
    year: document.getElementById('viewYear'),
    month: document.getElementById('viewMonth'),
    week: document.getElementById('viewWeek'),
    day: document.getElementById('viewDay')
  };

  const isDark = document.body.classList.contains('dark');
  Object.entries(buttons).forEach(([view, button]) => {
    if (button) {
      if (view === currentView) {
        button.className = 'px-4 py-2 text-sm rounded-md transition-all bg-[#a8c7fa] text-black font-semibold';
      } else {
        if (isDark) {
          button.className = 'px-4 py-2 text-sm rounded-md transition-all text-slate-400 hover:text-white';
        } else {
          button.className = 'px-4 py-2 text-sm rounded-md transition-all text-gray-600 hover:text-gray-900';
        }
      }
    }
  });
}

// =============================================================================
// VIEW RENDERING FUNCTIONS
// =============================================================================

/**
 * Renders the Year View - Grid of 13 months (Aeterna hidden)
 */
function renderYearView(): void {
  const container = document.getElementById('calendarContainer');
  if (!container) return;

  const natDate = convertGregorianToNatural(currentSelectedDate);
  displayedYear = natDate.year;
  
  container.innerHTML = '';
  
  const grid = document.createElement('div');
  grid.className = 'grid grid-cols-[repeat(auto-fill,minmax(240px,1fr))] gap-6 max-w-[1800px] mx-auto';
  
  const gregorianYear = displayedYear + 2025;
  
  // 13 Months (Skip Aeterna)
  for (let m = 0; m < 13; m++) {
    const card = document.createElement('div');
    card.className = 'bg-card rounded-xl p-4 hover:bg-muted transition-all cursor-pointer shadow-[0_0_0_1px_rgba(0,0,0,0.1)] dark:shadow-[0_0_0_1px_rgba(255,255,255,0.1)]';
    
    // Click to go to month view
    card.onclick = (): void => {
      displayedMonth = m;
      currentView = 'month';
      updateViewButtons();
      updateDateDisplay();
      renderMonthView();
    };

    const title = document.createElement('div');
    title.className = 'text-center mb-3 font-medium text-sm uppercase tracking-wide text-accent';
    title.textContent = `${m + 1}. ${MONTH_NAMES[m]}`;
    card.appendChild(title);

    // Week Headers
    const header = document.createElement('div');
    header.className = 'grid grid-cols-4 gap-1 mb-2 text-[0.7rem] text-muted-foreground uppercase text-center font-bold tracking-wider';
    header.innerHTML = '<span>I</span><span>II</span><span>III</span><span class="text-accent-gold">Rest</span>';
    card.appendChild(header);

    const miniGrid = document.createElement('div');
    miniGrid.className = 'grid grid-cols-4 gap-1';

    // 28 days per month
    for (let d = 1; d <= 28; d++) {
      const dayCell = document.createElement('div');
      dayCell.className = 'aspect-square flex flex-col items-center justify-center rounded text-xs relative bg-muted/30 text-muted-foreground';
      dayCell.textContent = String(d);

      const cellDate = convertNaturalToGregorian(displayedYear, m, d);

      // Highlight today
      const today = new Date();
      if (isSameDay(cellDate, today)) {
        dayCell.classList.add('ring-1', 'ring-accent-gold', 'font-semibold', 'text-foreground');
      }

      // Highlight selected
      if (isSameDay(cellDate, currentSelectedDate)) {
        dayCell.classList.add('!bg-accent', '!text-accent-foreground', 'font-bold');
      }

      // Moon phase dot
      const moon = getMoonData(cellDate);
      const dot = createMoonDot(moon);
      dayCell.appendChild(dot);

      miniGrid.appendChild(dayCell);
    }

    card.appendChild(miniGrid);
    grid.appendChild(card);
  }

  container.appendChild(grid);
}

/**
 * Renders the Month View - Single month with 28 days in 4-column grid
 */
function renderMonthView(): void {
  const container = document.getElementById('calendarContainer');
  if (!container || displayedMonth === null) return;

  container.innerHTML = '';
  
  const wrapper = document.createElement('div');
  wrapper.className = 'w-full max-w-[1400px] mx-auto py-6';
  
  // Month title
  const title = document.createElement('h2');
  title.className = 'text-3xl font-light mb-6 text-center text-accent';
  title.textContent = MONTH_NAMES[displayedMonth];
  wrapper.appendChild(title);
  
  // Week headers
  const weekHeader = document.createElement('div');
  weekHeader.className = 'grid grid-cols-4 gap-4 mb-4 text-center font-semibold text-muted-foreground uppercase text-sm px-4';
  weekHeader.innerHTML = '<div>Day I</div><div>Day II</div><div>Day III</div><div class="text-accent-gold">Rest</div>';
  wrapper.appendChild(weekHeader);
  
  // Days grid
  const daysGrid = document.createElement('div');
  daysGrid.className = 'grid grid-cols-4 gap-4 px-4';
  
  for (let d = 1; d <= 28; d++) {
    const dayCell = document.createElement('div');
    dayCell.className = 'h-[180px] bg-card rounded-xl p-4 hover:bg-muted transition-all cursor-pointer flex flex-col items-center justify-center shadow-[0_0_0_1px_rgba(0,0,0,0.1)] dark:shadow-[0_0_0_1px_rgba(255,255,255,0.1)]';
    
    const cellDate = convertNaturalToGregorian(displayedYear!, displayedMonth, d);
    
    // Day number
    const dayNum = document.createElement('div');
    dayNum.className = 'text-2xl font-semibold mb-2';
    dayNum.textContent = String(d);
    dayCell.appendChild(dayNum);
    
    // Moon phase
    const moon = getMoonData(cellDate);
    
    // Visual moon phase circle (larger, more visible)
    const moonVisualContainer = document.createElement('div');
    moonVisualContainer.className = 'w-16 h-16 rounded-full relative overflow-hidden mb-2';
    
    const p = moon.phase;
    const offset = Math.cos(p * 2 * Math.PI) * 20;
    const isDark = document.body.classList.contains('dark');
    
    // Apply moon phase visualization
    if (p < 0.5) {
      // Waxing phases
      moonVisualContainer.style.background = isDark ? '#1a1a1a' : '#e5e7eb';
      moonVisualContainer.style.boxShadow = `inset ${-offset}px 0 15px -5px ${isDark ? '#fff' : '#000'}`;
    } else {
      // Waning phases
      moonVisualContainer.style.background = isDark ? '#1a1a1a' : '#e5e7eb';
      moonVisualContainer.style.boxShadow = `inset ${offset}px 0 15px -5px ${isDark ? '#fff' : '#000'}`;
    }
    
    // Special cases
    if (moon.phaseName === 'New Moon') {
      moonVisualContainer.style.background = isDark ? '#0a0a0a' : '#1f2937';
      moonVisualContainer.style.boxShadow = 'none';
      moonVisualContainer.style.border = `1px solid ${isDark ? '#333' : '#9ca3af'}`;
    }
    if (moon.phaseName === 'Full Moon') {
      moonVisualContainer.style.background = isDark ? '#fff' : '#fbbf24';
      moonVisualContainer.style.boxShadow = isDark ? '0 0 15px rgba(255,255,255,0.5)' : '0 0 15px rgba(251,191,36,0.5)';
    }
    
    dayCell.appendChild(moonVisualContainer);
    
    // Moon phase name
    const moonLabel = document.createElement('div');
    moonLabel.className = 'text-xs dark:text-slate-500 text-gray-600 mb-1 text-center';
    moonLabel.textContent = moon.phaseName;
    dayCell.appendChild(moonLabel);
    
    // Gregorian date
    const gregLabel = document.createElement('div');
    gregLabel.className = 'text-xs dark:text-slate-400 text-gray-500 mt-auto';
    gregLabel.textContent = cellDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    dayCell.appendChild(gregLabel);
    
    // Highlight today
    const today = new Date();
    if (isSameDay(cellDate, today)) {
      dayCell.classList.add('ring-2', 'ring-[#ffd700]', 'dark:!text-white', '!text-gray-900');
    }
    
    // Highlight selected
    if (isSameDay(cellDate, currentSelectedDate)) {
      dayCell.classList.add('!bg-[#a8c7fa]', '!text-black');
    }
    
    // Click to go to day view
    dayCell.onclick = (): void => {
      currentSelectedDate = cellDate;
      currentView = 'day';
      updateViewButtons();
      updateDateDisplay();
      renderDayView();
    };
    
    daysGrid.appendChild(dayCell);
  }
  
  wrapper.appendChild(daysGrid);
  container.appendChild(wrapper);
}

/**
 * Renders the Week View - 4 days in columns
 */
function renderWeekView(): void {
  const container = document.getElementById('calendarContainer');
  if (!container || displayedMonth === null || displayedWeek === null) return;

  container.innerHTML = '';
  
  const isDark = document.body.classList.contains('dark');
  const wrapper = document.createElement('div');
  wrapper.className = 'max-w-[1400px] mx-auto';
  
  // Week title
  const title = document.createElement('h2');
  title.className = `text-3xl font-light mb-6 text-center ${isDark ? 'text-white' : 'text-gray-900'}`;
  title.textContent = `Week ${displayedWeek + 1} of ${MONTH_NAMES[displayedMonth]}`;
  wrapper.appendChild(title);
  
  // Days grid
  const daysGrid = document.createElement('div');
  daysGrid.className = 'grid grid-cols-4 gap-6';
  
  const dayLabels = ['Day I', 'Day II', 'Day III', 'Rest Day'];
  
  for (let i = 0; i < 4; i++) {
    const dayNum = displayedWeek * 4 + i + 1;
    if (dayNum > 28) break;
    
    const isDark = document.body.classList.contains('dark');
    const dayCol = document.createElement('div');
    dayCol.className = `dark:bg-black/20 bg-gray-50 border dark:border-white/10 border-gray-200 rounded-xl p-6 dark:hover:bg-white/5 hover:bg-gray-100 transition-all cursor-pointer`;
    
    const cellDate = convertNaturalToGregorian(displayedYear!, displayedMonth, dayNum);
    
    // Day label
    const label = document.createElement('div');
    label.className = `text-sm uppercase tracking-wide mb-2 ${i === 3 ? 'text-[#ffd700]' : (isDark ? 'text-slate-400' : 'text-gray-600')}`;
    label.textContent = dayLabels[i];
    dayCol.appendChild(label);
    
    // Day number
    const dayNumber = document.createElement('div');
    dayNumber.className = `text-5xl font-bold mb-4 ${isDark ? 'text-white' : 'text-gray-900'}`;
    dayNumber.textContent = String(dayNum);
    dayCol.appendChild(dayNumber);
    
    // Gregorian date
    const gregDate = document.createElement('div');
    gregDate.className = `text-sm mb-4 ${isDark ? 'text-slate-400' : 'text-gray-500'}`;
    gregDate.textContent = cellDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    dayCol.appendChild(gregDate);
    
    // Moon phase
    const moon = getMoonData(cellDate);
    const moonContainer = document.createElement('div');
    moonContainer.className = `flex flex-col items-center gap-2 pt-4 border-t ${isDark ? 'border-white/10' : 'border-gray-200'}`;
    
    const moonVisual = renderLargeMoonVisual(moon);
    moonVisual.className = 'w-20 h-20 rounded-full relative overflow-hidden';
    moonContainer.appendChild(moonVisual);
    
    const moonLabel = document.createElement('div');
    moonLabel.className = `text-xs ${isDark ? 'text-slate-400' : 'text-gray-500'}`;
    moonLabel.textContent = moon.phaseName;
    moonContainer.appendChild(moonLabel);
    
    dayCol.appendChild(moonContainer);
    
    // Highlight today
    const today = new Date();
    if (isSameDay(cellDate, today)) {
      dayCol.classList.add('ring-2', 'ring-[#ffd700]');
    }
    
    // Highlight selected
    if (isSameDay(cellDate, currentSelectedDate)) {
      dayCol.classList.add('!bg-[#a8c7fa]/20', 'ring-2', 'ring-[#a8c7fa]');
    }
    
    // Click to go to day view
    dayCol.onclick = (): void => {
      currentSelectedDate = cellDate;
      currentView = 'day';
      updateViewButtons();
      updateDateDisplay();
      renderDayView();
    };
    
    daysGrid.appendChild(dayCol);
  }
  
  wrapper.appendChild(daysGrid);
  container.appendChild(wrapper);
}

/**
 * Renders the Day View - Detailed single day display
 */
function renderDayView(): void {
  const container = document.getElementById('calendarContainer');
  if (!container) return;

  container.innerHTML = '';
  
  const natDate = convertGregorianToNatural(currentSelectedDate);
  
  // Skip Aeterna in day view
  if (natDate.monthIndex === -1) {
    const isDark = document.body.classList.contains('dark');
    const msg = document.createElement('div');
    msg.className = `text-center ${isDark ? 'text-slate-400' : 'text-gray-600'} text-xl mt-20`;
    msg.textContent = 'Aeterna (Day Out of Time) - Not displayed';
    container.appendChild(msg);
    return;
  }
  
  const isDark = document.body.classList.contains('dark');
  const wrapper = document.createElement('div');
  wrapper.className = 'max-w-[800px] mx-auto';
  
  // Main card
  const card = document.createElement('div');
  card.className = `dark:bg-black/20 bg-white/80 border dark:border-white/10 border-gray-200 rounded-2xl p-12 shadow-lg`;
  
  // Natural Calendar Date
  const natDateDiv = document.createElement('div');
  natDateDiv.className = 'text-center mb-8';
  
  const monthName = document.createElement('div');
  monthName.className = `dark:text-[#a8c7fa] text-blue-600 text-2xl font-light mb-2`;
  monthName.textContent = natDate.monthName;
  natDateDiv.appendChild(monthName);
  
  const dayNum = document.createElement('div');
  dayNum.className = `text-8xl font-bold mb-2 ${isDark ? 'text-white' : 'text-gray-900'}`;
  dayNum.textContent = String(natDate.day);
  natDateDiv.appendChild(dayNum);
  
  const yearNum = document.createElement('div');
  yearNum.className = `dark:text-slate-400 text-gray-600 text-xl`;
  yearNum.textContent = `Natural Year ${natDate.year}`;
  natDateDiv.appendChild(yearNum);
  
  card.appendChild(natDateDiv);
  
  // Divider
  const divider = document.createElement('div');
  divider.className = `border-t dark:border-white/10 border-gray-200 my-8`;
  card.appendChild(divider);
  
  // Gregorian equivalent
  const gregDiv = document.createElement('div');
  gregDiv.className = 'text-center mb-8';
  
  const gregLabel = document.createElement('div');
  gregLabel.className = `dark:text-slate-500 text-gray-600 text-sm uppercase tracking-wide mb-2`;
  gregLabel.textContent = 'Gregorian Equivalent';
  gregDiv.appendChild(gregLabel);
  
  const gregDate = document.createElement('div');
  gregDate.className = `${isDark ? 'text-white' : 'text-gray-900'} text-xl`;
  gregDate.textContent = currentSelectedDate.toLocaleDateString('en-US', { 
    weekday: 'long', 
    month: 'long', 
    day: 'numeric', 
    year: 'numeric' 
  });
  gregDiv.appendChild(gregDate);
  
  card.appendChild(gregDiv);
  
  // Moon phase section
  const moonSection = document.createElement('div');
  moonSection.className = `flex flex-col items-center gap-4 pt-8 border-t dark:border-white/10 border-gray-200`;
  
  const moonTitle = document.createElement('div');
  moonTitle.className = `dark:text-slate-400 text-gray-600 text-sm uppercase tracking-wide`;
  moonTitle.textContent = 'Moon Phase';
  moonSection.appendChild(moonTitle);
  
  const moon = getMoonData(currentSelectedDate);
  const moonVisual = renderLargeMoonVisual(moon);
  moonSection.appendChild(moonVisual);
  
  const moonName = document.createElement('div');
  moonName.className = `${isDark ? 'text-white' : 'text-gray-900'} text-xl font-semibold`;
  moonName.textContent = moon.phaseName;
  moonSection.appendChild(moonName);
  
  const moonIllum = document.createElement('div');
  moonIllum.className = `dark:text-slate-400 text-gray-600 text-sm`;
  moonIllum.textContent = `${Math.round(moon.illumination * 100)}% Illumination`;
  moonSection.appendChild(moonIllum);
  
  card.appendChild(moonSection);
  
  // Additional info
  const infoDiv = document.createElement('div');
  infoDiv.className = `grid grid-cols-3 gap-4 mt-8 pt-8 border-t dark:border-white/10 border-gray-200 text-center`;
  
  const weekInfo = document.createElement('div');
  const weekNum = Math.floor((natDate.day - 1) / 4) + 1;
  const dayInWeek = ((natDate.day - 1) % 4) + 1;
  weekInfo.innerHTML = `<div class="${isDark ? 'text-slate-500' : 'text-gray-600'} text-xs uppercase mb-1">Week</div><div class="${isDark ? 'text-white' : 'text-gray-900'} text-lg">${weekNum} of 7</div>`;
  infoDiv.appendChild(weekInfo);
  
  const dayOfYearInfo = document.createElement('div');
  dayOfYearInfo.innerHTML = `<div class="${isDark ? 'text-slate-500' : 'text-gray-600'} text-xs uppercase mb-1">Day of Year</div><div class="${isDark ? 'text-white' : 'text-gray-900'} text-lg">${natDate.dayOfYear} of 364</div>`;
  infoDiv.appendChild(dayOfYearInfo);
  
  const lunarCycleInfo = document.createElement('div');
  const lunarDay = Math.round(moon.phase * LUNAR_CYCLE_DAYS);
  lunarCycleInfo.innerHTML = `<div class="${isDark ? 'text-slate-500' : 'text-gray-600'} text-xs uppercase mb-1">Lunar Cycle</div><div class="${isDark ? 'text-white' : 'text-gray-900'} text-lg">Day ${lunarDay}</div>`;
  infoDiv.appendChild(lunarCycleInfo);
  
  card.appendChild(infoDiv);
  
  wrapper.appendChild(card);
  container.appendChild(wrapper);
}

// =============================================================================
// NAVIGATION FUNCTIONS
// =============================================================================

/**
 * Navigate to previous period (context-dependent)
 */
function navigatePrevious(): void {
  const natDate = convertGregorianToNatural(currentSelectedDate);
  
  switch (currentView) {
    case 'year':
      if (displayedYear !== null) {
        displayedYear--;
        currentSelectedDate = convertNaturalToGregorian(displayedYear, 0, 1);
        renderYearView();
      }
      break;
    case 'month':
      if (displayedMonth !== null) {
        if (displayedMonth > 0) {
          displayedMonth--;
        } else {
          displayedMonth = 12;
          displayedYear!--;
        }
        currentSelectedDate = convertNaturalToGregorian(displayedYear!, displayedMonth, 1);
        renderMonthView();
      }
      break;
    case 'week':
      if (displayedWeek !== null && displayedMonth !== null) {
        if (displayedWeek > 0) {
          displayedWeek--;
        } else {
          // Go to last week of previous month
          if (displayedMonth > 0) {
            displayedMonth--;
          } else {
            displayedMonth = 12;
            displayedYear!--;
          }
          displayedWeek = 6;
        }
        const dayNum = displayedWeek * 4 + 1;
        currentSelectedDate = convertNaturalToGregorian(displayedYear!, displayedMonth, dayNum);
        renderWeekView();
      }
      break;
    case 'day':
      // Go to previous day
      const prevDate = new Date(currentSelectedDate);
      prevDate.setDate(prevDate.getDate() - 1);
      const prevNatDate = convertGregorianToNatural(prevDate);
      
      // Skip Aeterna
      if (prevNatDate.monthIndex === -1) {
        prevDate.setDate(prevDate.getDate() - 1);
      }
      
      currentSelectedDate = prevDate;
      renderDayView();
      break;
  }
  
  updateDateDisplay();
}

/**
 * Navigate to next period (context-dependent)
 */
function navigateNext(): void {
  const natDate = convertGregorianToNatural(currentSelectedDate);
  
  switch (currentView) {
    case 'year':
      if (displayedYear !== null) {
        displayedYear++;
        currentSelectedDate = convertNaturalToGregorian(displayedYear, 0, 1);
        renderYearView();
      }
      break;
    case 'month':
      if (displayedMonth !== null) {
        if (displayedMonth < 12) {
          displayedMonth++;
        } else {
          displayedMonth = 0;
          displayedYear!++;
        }
        currentSelectedDate = convertNaturalToGregorian(displayedYear!, displayedMonth, 1);
        renderMonthView();
      }
      break;
    case 'week':
      if (displayedWeek !== null && displayedMonth !== null) {
        if (displayedWeek < 6) {
          displayedWeek++;
        } else {
          // Go to first week of next month
          if (displayedMonth < 12) {
            displayedMonth++;
          } else {
            displayedMonth = 0;
            displayedYear!++;
          }
          displayedWeek = 0;
        }
        const dayNum = displayedWeek * 4 + 1;
        currentSelectedDate = convertNaturalToGregorian(displayedYear!, displayedMonth, dayNum);
        renderWeekView();
      }
      break;
    case 'day':
      // Go to next day
      const nextDate = new Date(currentSelectedDate);
      nextDate.setDate(nextDate.getDate() + 1);
      const nextNatDate = convertGregorianToNatural(nextDate);
      
      // Skip Aeterna
      if (nextNatDate.monthIndex === -1) {
        nextDate.setDate(nextDate.getDate() + 1);
      }
      
      currentSelectedDate = nextDate;
      renderDayView();
      break;
  }
  
  updateDateDisplay();
}

/**
 * Navigate to today
 */
function navigateToday(): void {
  currentSelectedDate = new Date();
  const natDate = convertGregorianToNatural(currentSelectedDate);
  
  // Skip Aeterna
  if (natDate.monthIndex === -1) {
    // Go to day 1 of month 1
    currentSelectedDate = convertNaturalToGregorian(natDate.year, 0, 1);
  }
  
  const updatedNatDate = convertGregorianToNatural(currentSelectedDate);
  displayedYear = updatedNatDate.year;
  displayedMonth = updatedNatDate.monthIndex;
  displayedWeek = Math.floor((updatedNatDate.day - 1) / 4);
  
  renderCurrentView();
  updateDateDisplay();
}

/**
 * Render the current view
 */
function renderCurrentView(): void {
  switch (currentView) {
    case 'year':
      renderYearView();
      break;
    case 'month':
      renderMonthView();
      break;
    case 'week':
      renderWeekView();
      break;
    case 'day':
      renderDayView();
      break;
  }
}

/**
 * Switch to a specific view
 */
function switchView(view: CalendarView): void {
  currentView = view;
  const natDate = convertGregorianToNatural(currentSelectedDate);
  
  // Skip Aeterna
  if (natDate.monthIndex === -1) {
    currentSelectedDate = convertNaturalToGregorian(natDate.year, 0, 1);
  }
  
  const updatedNatDate = convertGregorianToNatural(currentSelectedDate);
  displayedYear = updatedNatDate.year;
  displayedMonth = updatedNatDate.monthIndex;
  displayedWeek = Math.floor((updatedNatDate.day - 1) / 4);
  
  updateViewButtons();
  updateDateDisplay();
  renderCurrentView();
}

// =============================================================================
// EVENT HANDLERS & INITIALIZATION
// =============================================================================

/**
 * Initializes the Natural Calendar application
 */
function initializeCalendar(): void {
  // Initialize state
  const natDate = convertGregorianToNatural(currentSelectedDate);
  
  // Skip Aeterna on init
  if (natDate.monthIndex === -1) {
    currentSelectedDate = convertNaturalToGregorian(natDate.year, 0, 1);
  }
  
  const updatedNatDate = convertGregorianToNatural(currentSelectedDate);
  displayedYear = updatedNatDate.year;
  displayedMonth = updatedNatDate.monthIndex;
  displayedWeek = Math.floor((updatedNatDate.day - 1) / 4);
  
  // Navigation buttons
  const prevBtn = document.getElementById('prevBtn');
  const nextBtn = document.getElementById('nextBtn');
  const todayBtn = document.getElementById('todayBtn');
  
  if (prevBtn) prevBtn.onclick = navigatePrevious;
  if (nextBtn) nextBtn.onclick = navigateNext;
  if (todayBtn) todayBtn.onclick = navigateToday;
  
  // View buttons
  const viewYear = document.getElementById('viewYear');
  const viewMonth = document.getElementById('viewMonth');
  const viewWeek = document.getElementById('viewWeek');
  const viewDay = document.getElementById('viewDay');
  
  if (viewYear) viewYear.onclick = () => switchView('year');
  if (viewMonth) viewMonth.onclick = () => switchView('month');
  if (viewWeek) viewWeek.onclick = () => switchView('week');
  if (viewDay) viewDay.onclick = () => switchView('day');
  
  // Theme toggle
  const themeToggle = document.getElementById('themeToggle');
  const themeIcon = document.getElementById('themeIcon');
  if (themeToggle && themeIcon) {
    // Check for saved theme preference or default to dark
    const savedTheme = localStorage.getItem('calendar-theme') || 'dark';
    const applyTheme = (theme: 'light' | 'dark'): void => {
      if (theme === 'light') {
        document.body.classList.remove('dark');
        themeIcon.textContent = '☀️';
        localStorage.setItem('calendar-theme', 'light');
      } else {
        document.body.classList.add('dark');
        themeIcon.textContent = '🌙';
        localStorage.setItem('calendar-theme', 'dark');
      }
      // Update view buttons to reflect new theme
      updateViewButtons();
      // Re-render current view to apply theme changes
      renderCurrentView();
    };
    
    // Apply saved theme on load
    applyTheme(savedTheme as 'light' | 'dark');
    
    themeToggle.onclick = (): void => {
      const isDark = document.body.classList.contains('dark');
      applyTheme(isDark ? 'light' : 'dark');
    };
  }

  // Initial render
  updateViewButtons();
  updateDateDisplay();
  renderYearView();
}

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', initializeCalendar);
