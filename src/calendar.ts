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

/** Currently displayed Natural Year in the grid */
let displayedYear: number | null = null;

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
// UI RENDERING
// =============================================================================

/**
 * Updates the sidebar with information about the selected date
 * 
 * @param date - The currently selected Gregorian date
 */
function updateSidebar(date: Date): void {
  const natDate = convertGregorianToNatural(date);
  const moon = getMoonData(date);

  // Update Natural Calendar display
  const monthEl = document.getElementById('selectedNaturalMonth');
  const yearEl = document.getElementById('selectedNaturalYear');
  const dayEl = document.getElementById('selectedNaturalDay');
  const gregEl = document.getElementById('selectedGregorianDate');

  if (monthEl) monthEl.textContent = natDate.monthName;
  if (yearEl) yearEl.textContent = `Year ${natDate.year}`;
  if (dayEl) dayEl.textContent = natDate.day === 0 ? '∞' : String(natDate.day);

  if (gregEl) {
    const options: Intl.DateTimeFormatOptions = {
      month: 'long',
      day: 'numeric',
      year: 'numeric'
    };
    gregEl.textContent = date.toLocaleDateString('en-US', options);
  }

  // Update moon phase display
  const phaseEl = document.getElementById('moonPhaseName');
  const illumEl = document.getElementById('moonIllumination');
  const moonVisual = document.getElementById('sidebarMoonVisual');

  if (phaseEl) phaseEl.textContent = moon.phaseName;
  if (illumEl) illumEl.textContent = `${Math.round(moon.illumination * 100)}% Illumination`;
  if (moonVisual) renderMoonVisual(moonVisual, moon);

  // Update esoteric insight
  const esoEl = document.getElementById('esotericText');
  if (esoEl) {
    esoEl.textContent = getEsotericInsight(moon);
  }
}

/**
 * Generates esoteric insight text based on moon phase
 * 
 * @param moon - Moon phase data
 * @returns Insight text for the current phase
 */
function getEsotericInsight(moon: MoonData): string {
  if (moon.phaseName === 'New Moon') {
    return 'New Moon. Energy is inward. Set intentions for the cycle ahead.';
  } else if (moon.phaseName === 'Full Moon') {
    return 'Full Moon. Energy is outward and peaked. Illumination and realization.';
  } else if (moon.phase < 0.5) {
    return 'Waxing Phase. Build, create, and take action.';
  } else {
    return 'Waning Phase. Release, reflect, and integrate.';
  }
}

/**
 * Renders a visual representation of the moon phase
 * 
 * @param container - The container element for the moon visual
 * @param moonData - Moon phase data to visualize
 */
function renderMoonVisual(container: HTMLElement, moonData: MoonData): void {
  const overlay = container.querySelector('.shadow-overlay') as HTMLElement | null;
  if (!overlay) return;

  // Reset styles
  overlay.style.cssText = '';
  container.style.background = '#222';

  const p = moonData.phase;
  const offset = Math.cos(p * 2 * Math.PI) * 40;

  // Apply shadow based on phase
  if (p < 0.5) {
    container.style.background = '#111';
    container.style.boxShadow = `inset ${-offset * 2}px 0 20px -8px #fff`;
  } else {
    container.style.background = '#111';
    container.style.boxShadow = `inset ${offset * 2}px 0 20px -8px #fff`;
  }

  // Special cases for New and Full Moon
  if (moonData.phaseName === 'New Moon') {
    container.style.background = '#111';
    container.style.boxShadow = 'none';
  }
  if (moonData.phaseName === 'Full Moon') {
    container.style.background = '#fff';
    container.style.boxShadow = '0 0 20px #fff';
  }
}

/**
 * Renders an Aeterna (Day Out of Time) card in the year grid
 * 
 * @param gregorianYear - The Gregorian year for this Aeterna
 * @param naturalYear - The Natural Calendar year
 * @param grid - The grid container element
 * @param label - Display label for the card
 */
function renderAeternaCard(
  gregorianYear: number,
  naturalYear: number,
  grid: HTMLElement,
  label: string
): void {
  const aeterna = document.createElement('div');
  aeterna.className = 'month-card aeterna-card';

  const aeternaTi = document.createElement('div');
  aeternaTi.className = 'month-title';
  aeternaTi.textContent = label;
  aeterna.appendChild(aeternaTi);

  const aeternaGrid = document.createElement('div');
  aeternaGrid.className = 'mini-grid';
  aeternaGrid.style.gridTemplateColumns = 'repeat(1, 1fr)';

  const aeternaCell = document.createElement('div');
  aeternaCell.className = 'mini-day aeterna-day';
  aeternaCell.textContent = '∞';

  const equinoxDate = new Date(gregorianYear, 2, 20, 12, 0, 0);

  // Highlight if today
  const today = new Date();
  if (isSameDay(equinoxDate, today)) {
    aeternaCell.classList.add('today');
  }
  if (isSameDay(equinoxDate, currentSelectedDate)) {
    aeternaCell.classList.add('selected');
  }

  // Click handler
  aeternaCell.onclick = (): void => {
    currentSelectedDate = equinoxDate;
    const dateInput = document.getElementById('gregorianInput') as HTMLInputElement | null;
    if (dateInput) dateInput.valueAsDate = currentSelectedDate;
    updateSidebar(currentSelectedDate);
    renderYearGrid(naturalYear);
  };

  // Add moon phase dot
  const aeternaMoon = getMoonData(equinoxDate);
  const aeternaDot = createMoonDot(aeternaMoon);
  aeternaCell.appendChild(aeternaDot);

  aeternaGrid.appendChild(aeternaCell);
  aeterna.appendChild(aeternaGrid);
  grid.appendChild(aeterna);
}

/**
 * Creates a moon phase dot element
 * 
 * @param moon - Moon phase data
 * @returns The moon dot element
 */
function createMoonDot(moon: MoonData): HTMLElement {
  const dot = document.createElement('div');
  dot.className = 'moon-dot';

  const phaseClasses: Record<string, string> = {
    'New Moon': 'new',
    'Waxing Crescent': 'wax-crescent',
    'First Quarter': 'first-quarter',
    'Waxing Gibbous': 'wax-gibbous',
    'Full Moon': 'full',
    'Waning Gibbous': 'wan-gibbous',
    'Last Quarter': 'last-quarter',
    'Waning Crescent': 'wan-crescent'
  };

  const phaseClass = phaseClasses[moon.phaseName];
  if (phaseClass) dot.classList.add(phaseClass);

  return dot;
}

/**
 * Renders the full year grid showing all 13 months plus Aeterna days
 * 
 * @param naturalYear - The Natural Calendar year to display
 */
function renderYearGrid(naturalYear: number): void {
  const grid = document.getElementById('yearGrid');
  if (!grid) return;

  grid.innerHTML = '';

  const titleEl = document.getElementById('viewYearTitle');
  if (titleEl) titleEl.textContent = `Natural Year ${naturalYear}`;

  const gregorianYear = naturalYear + 2025;

  // Aeterna START (current year)
  renderAeternaCard(gregorianYear, naturalYear, grid, `∞ Aeterna ${naturalYear}`);

  // 13 Months
  for (let m = 0; m < 13; m++) {
    const card = document.createElement('div');
    card.className = 'month-card';

    const title = document.createElement('div');
    title.className = 'month-title';
    title.textContent = `${m + 1}. ${MONTH_NAMES[m]}`;
    card.appendChild(title);

    // Week Headers
    const header = document.createElement('div');
    header.className = 'week-header';
    header.innerHTML = '<span>I</span><span>II</span><span>III</span><span>Rest</span>';
    card.appendChild(header);

    const miniGrid = document.createElement('div');
    miniGrid.className = 'mini-grid';

    // 28 days per month
    for (let d = 1; d <= 28; d++) {
      const dayCell = document.createElement('div');
      dayCell.className = 'mini-day';
      dayCell.textContent = String(d);

      const equinox = new Date(gregorianYear, 2, 20, 12, 0, 0);
      const dayOffset = m * 28 + d;
      const cellDate = new Date(equinox);
      cellDate.setDate(equinox.getDate() + dayOffset);

      // Highlight today
      const today = new Date();
      if (isSameDay(cellDate, today)) {
        dayCell.classList.add('today');
      }

      // Highlight selected
      if (isSameDay(cellDate, currentSelectedDate)) {
        dayCell.classList.add('selected');
      }

      // Click handler
      dayCell.onclick = (): void => {
        currentSelectedDate = cellDate;
        const dateInput = document.getElementById('gregorianInput') as HTMLInputElement | null;
        if (dateInput) dateInput.valueAsDate = currentSelectedDate;
        updateSidebar(currentSelectedDate);
        renderYearGrid(naturalYear);
      };

      // Moon phase dot
      const moon = getMoonData(cellDate);
      const dot = createMoonDot(moon);
      dayCell.appendChild(dot);

      miniGrid.appendChild(dayCell);
    }

    card.appendChild(miniGrid);
    grid.appendChild(card);
  }

  // Aeterna END (next year preview)
  renderAeternaCard(gregorianYear + 1, naturalYear + 1, grid, `∞ Aeterna ${naturalYear + 1}`);
}

// =============================================================================
// EVENT HANDLERS & INITIALIZATION
// =============================================================================

/**
 * Initializes the Natural Calendar application
 */
function initializeCalendar(): void {
  const dateInput = document.getElementById('gregorianInput') as HTMLInputElement | null;
  const todayBtn = document.getElementById('todayBtn');
  const prevYearBtn = document.getElementById('prevYearBtn');
  const nextYearBtn = document.getElementById('nextYearBtn');

  if (!dateInput) {
    console.error('Natural Calendar: Required elements not found');
    return;
  }

  // Date input change handler
  dateInput.addEventListener('change', (e: Event): void => {
    const target = e.target as HTMLInputElement;
    if (target.value) {
      currentSelectedDate = new Date(target.value + 'T12:00:00');
      updateSidebar(currentSelectedDate);
      renderYearGrid(convertGregorianToNatural(currentSelectedDate).year);
    }
  });

  // Today button
  if (todayBtn) {
    todayBtn.onclick = (): void => {
      currentSelectedDate = new Date();
      dateInput.valueAsDate = currentSelectedDate;
      const natDate = convertGregorianToNatural(currentSelectedDate);
      displayedYear = natDate.year;
      updateSidebar(currentSelectedDate);
      renderYearGrid(displayedYear);
    };
  }

  // Previous year button
  if (prevYearBtn) {
    prevYearBtn.onclick = (): void => {
      if (displayedYear !== null) {
        displayedYear = displayedYear - 1;
        renderYearGrid(displayedYear);
      }
    };
  }

  // Next year button
  if (nextYearBtn) {
    nextYearBtn.onclick = (): void => {
      if (displayedYear !== null) {
        displayedYear = displayedYear + 1;
        renderYearGrid(displayedYear);
      }
    };
  }

  // Initial render
  dateInput.valueAsDate = currentSelectedDate;
  const initialNat = convertGregorianToNatural(currentSelectedDate);
  displayedYear = initialNat.year;
  updateSidebar(currentSelectedDate);
  renderYearGrid(displayedYear);
}

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', initializeCalendar);
