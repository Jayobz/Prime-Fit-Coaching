/* ============================================================
   PRIMEFIT COACHING — SCRIPT.JS
   Sales Funnel Lead Generation Website

   TABLE OF CONTENTS:
   01. Utility Helpers
   02. Navigation (scroll behavior + mobile menu)
   03. Scroll Animations (Intersection Observer)
   04. Supabase Config & Client
   05. Lead Capture Form (index.html) — saves to leads table
   06. Thank You Page (thank-you.html) — loads lead data
   07. Booking Form (thank-you.html) — saves to bookings table
   08. Init — Route to correct page handlers

   SUPABASE SCHEMA:
   ┌─────────────────────────────────────────────────────┐
   │ TABLE: leads                                        │
   │   id            uuid  PK  gen_random_uuid()         │
   │   full_name     text                                │
   │   email         text                                │
   │   phone         text                                │
   │   goal          text                                │
   │   message       text                                │
   │   created_at    timestamptz  default now()          │
   ├─────────────────────────────────────────────────────┤
   │ TABLE: bookings                                     │
   │   id            uuid  PK  gen_random_uuid()         │
   │   lead_id       uuid  FK → leads.id                 │
   │   booking_date  date                                │
   │   booking_time  time                                │
   │   status        text  default 'pending'             │
   │   created_at    timestamptz  default now()          │
   └─────────────────────────────────────────────────────┘
============================================================ */

'use strict';

/* ============================================================
   01. UTILITY HELPERS
============================================================ */

/** Shorthand querySelector */
const $ = (selector, scope = document) => scope.querySelector(selector);

/** Shorthand querySelectorAll */
const $$ = (selector, scope = document) => scope.querySelectorAll(selector);

/** Validate email format */
function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
}

/** Validate phone — at least 7 digits, max 15 */
function isValidPhone(phone) {
  const digits = phone.replace(/\D/g, '');
  return digits.length >= 7 && digits.length <= 15;
}

/** Sanitize string for safe innerHTML insertion */
function sanitize(str) {
  const div = document.createElement('div');
  div.textContent = String(str);
  return div.innerHTML;
}

/** Mark a field invalid and show its error message */
function showError(field, errorEl, message) {
  if (field)   field.classList.add('invalid');
  if (errorEl) errorEl.textContent = message;
}

/** Clear invalid state and error message from a field */
function clearError(field, errorEl) {
  if (field)   field.classList.remove('invalid');
  if (errorEl) errorEl.textContent = '';
}

/**
 * Format YYYY-MM-DD → "Monday, January 20, 2025"
 * Parses as local date to avoid timezone-shift issues.
 */
function formatDate(dateStr) {
  if (!dateStr) return '';
  const [y, m, d] = dateStr.split('-').map(Number);
  return new Date(y, m - 1, d).toLocaleDateString('en-US', {
    weekday: 'long',
    year:    'numeric',
    month:   'long',
    day:     'numeric',
  });
}

/** Today as YYYY-MM-DD (used to set min date on date inputs) */
function todayString() {
  const t = new Date();
  const y = t.getFullYear();
  const m = String(t.getMonth() + 1).padStart(2, '0');
  const d = String(t.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/** Human-readable label for a fitness goal value */
function goalLabel(value) {
  const map = {
    'lose-weight':    'lose weight',
    'build-muscle':   'build muscle',
    'improve-fitness':'improve your fitness',
    'get-healthier':  'get healthier',
    'other':          'reach your fitness goals',
  };
  return map[value] || 'reach your fitness goals';
}


/* ============================================================
   02. NAVIGATION
============================================================ */

function initNavigation() {
  const navbar    = $('#navbar');
  const hamburger = $('#hamburger');
  const navLinks  = $('#navLinks');

  if (!navbar) return;

  // Scroll: add/remove .scrolled class for opaque background
  function handleNavScroll() {
    navbar.classList.toggle('scrolled', window.scrollY > 40);
  }
  window.addEventListener('scroll', handleNavScroll, { passive: true });
  handleNavScroll();

  // Mobile hamburger toggle
  if (hamburger && navLinks) {
    hamburger.addEventListener('click', () => {
      const isOpen = navLinks.classList.toggle('open');
      hamburger.classList.toggle('open', isOpen);
      hamburger.setAttribute('aria-expanded', isOpen);
    });

    navLinks.querySelectorAll('a').forEach(link => {
      link.addEventListener('click', () => {
        navLinks.classList.remove('open');
        hamburger.classList.remove('open');
        hamburger.setAttribute('aria-expanded', 'false');
      });
    });

    document.addEventListener('click', (e) => {
      if (!navbar.contains(e.target) && navLinks.classList.contains('open')) {
        navLinks.classList.remove('open');
        hamburger.classList.remove('open');
        hamburger.setAttribute('aria-expanded', 'false');
      }
    });
  }

  // Smooth scroll with fixed-navbar offset
  document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', (e) => {
      const id = anchor.getAttribute('href');
      if (id === '#') return;
      const target = document.querySelector(id);
      if (!target) return;
      e.preventDefault();
      const top = target.getBoundingClientRect().top + window.scrollY - navbar.offsetHeight - 16;
      window.scrollTo({ top, behavior: 'smooth' });
    });
  });
}


/* ============================================================
   03. SCROLL ANIMATIONS (Intersection Observer)
============================================================ */

function initScrollAnimations() {
  const els = $$('.fade-in');
  if (!els.length) return;

  if (!('IntersectionObserver' in window)) {
    // Fallback for older browsers — show everything immediately
    els.forEach(el => el.classList.add('visible'));
    return;
  }

  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('visible');
          observer.unobserve(entry.target);
        }
      });
    },
    { threshold: 0.12, rootMargin: '0px 0px -40px 0px' }
  );

  els.forEach(el => observer.observe(el));
}


/* ============================================================
   04. SUPABASE CONFIG & CLIENT
   ──────────────────────────────────────────────────────────
   Project URL : https://qhcuqyzhvuosuhtafzyu.supabase.co

   ► PASTE YOUR ANON KEY on the SUPABASE_KEY line below.
     Get it from:
     Supabase Dashboard → Project Settings → API
     → "anon public" key  (starts with eyJ...)

   The anon key is safe for frontend use — it is protected
   by Row Level Security (RLS).

   NEVER use the service_role key or PostgreSQL password here.
============================================================ */

const SUPABASE_URL = 'https://qhcuqyzhvuosuhtafzyu.supabase.co';
const SUPABASE_KEY = 'YOUR_SUPABASE_ANON_KEY'; // ← paste your anon key here

// Initialise safely.
// createClient() throws a synchronous TypeError when given a non-URL string,
// which would crash the whole script and make every section invisible.
// Wrapping in try/catch keeps the page rendering even with a missing key.
let supabaseClient = null;
try {
  if (SUPABASE_KEY === 'YOUR_SUPABASE_ANON_KEY' || !SUPABASE_KEY) {
    console.warn(
      '[PrimeFit] Supabase anon key not set. ' +
      'Open script.js and replace YOUR_SUPABASE_ANON_KEY with your real key.'
    );
  } else {
    supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
    console.log('[PrimeFit] Supabase client initialised ✓');
  }
} catch (e) {
  console.error('[PrimeFit] Supabase client failed to initialise:', e.message);
}

/**
 * Generate a RFC 4122 UUID v4.
 * Uses crypto.randomUUID() when available (all modern browsers),
 * falls back to Math.random() for older environments.
 * We generate the UUID client-side so we know the lead_id before
 * inserting — this avoids needing a SELECT-back after INSERT,
 * which simplifies RLS (only INSERT permission required, not SELECT).
 */
function generateUUID() {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  // Fallback
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    return (c === 'x' ? r : (r & 0x3) | 0x8).toString(16);
  });
}


/* ============================================================
   05. LEAD CAPTURE FORM  (index.html)
   ──────────────────────────────────────────────────────────
   Inserts into: leads
   Columns used:
     full_name  ← #fullName
     email      ← #email
     phone      ← #phone
     goal       ← #fitnessGoal  (dropdown value)
     message    ← #message      (textarea)

   On success:
     • Captures the returned lead.id
     • Saves lead data + id to localStorage
     • Redirects to thank-you.html after 1.4 s

   On failure:
     • Restores the submit button
     • Shows inline error banner
     • Does NOT clear the form
============================================================ */

function initLeadForm() {
  const form = $('#leadForm');
  if (!form) return;

  const fields = {
    fullName:    { input: $('#fullName'),    error: $('#fullNameError') },
    email:       { input: $('#email'),       error: $('#emailError') },
    phone:       { input: $('#phone'),       error: $('#phoneError') },
    fitnessGoal: { input: $('#fitnessGoal'), error: $('#fitnessGoalError') },
    message:     { input: $('#message'),     error: $('#messageError') },
  };

  const submitBtn      = $('#submitBtn');
  const feedbackEl     = $('#formFeedback');
  const origBtnHTML    = submitBtn ? submitBtn.innerHTML : '';

  // ── Feedback banner helpers ───────────────────────────────

  function showFeedback(type, text) {
    if (!feedbackEl) return;
    feedbackEl.className = `form-feedback form-feedback--${type}`;
    feedbackEl.innerHTML = type === 'success'
      ? `<i class="fas fa-circle-check"></i> ${text}`
      : `<i class="fas fa-triangle-exclamation"></i> ${text}`;
    feedbackEl.style.display = 'flex';
    // Scroll banner into view
    const nav    = $('#navbar');
    const offset = (nav ? nav.offsetHeight : 80) + 12;
    window.scrollTo({
      top: feedbackEl.getBoundingClientRect().top + window.scrollY - offset,
      behavior: 'smooth',
    });
  }

  function hideFeedback() {
    if (!feedbackEl) return;
    feedbackEl.style.display = 'none';
    feedbackEl.textContent   = '';
    feedbackEl.className     = 'form-feedback';
  }

  // ── Real-time: clear errors while typing ─────────────────

  Object.values(fields).forEach(({ input, error }) => {
    if (!input) return;
    input.addEventListener('input',  () => { clearError(input, error); hideFeedback(); });
    input.addEventListener('change', () => { clearError(input, error); hideFeedback(); });
  });

  // ── Validation ────────────────────────────────────────────

  function validateLeadForm() {
    let ok = true;

    // Full name
    const name = fields.fullName.input.value.trim();
    if (!name || name.length < 2) {
      showError(fields.fullName.input, fields.fullName.error,
        name ? 'Name must be at least 2 characters.' : 'Please enter your full name.');
      ok = false;
    } else {
      clearError(fields.fullName.input, fields.fullName.error);
    }

    // Email
    const email = fields.email.input.value.trim();
    if (!email) {
      showError(fields.email.input, fields.email.error, 'Please enter your email address.');
      ok = false;
    } else if (!isValidEmail(email)) {
      showError(fields.email.input, fields.email.error, 'Please enter a valid email address.');
      ok = false;
    } else {
      clearError(fields.email.input, fields.email.error);
    }

    // Phone
    const phone = fields.phone.input.value.trim();
    if (!phone) {
      showError(fields.phone.input, fields.phone.error, 'Please enter your phone number.');
      ok = false;
    } else if (!isValidPhone(phone)) {
      showError(fields.phone.input, fields.phone.error, 'Please enter a valid phone number.');
      ok = false;
    } else {
      clearError(fields.phone.input, fields.phone.error);
    }

    // Fitness goal
    const goal = fields.fitnessGoal.input.value;
    if (!goal) {
      showError(fields.fitnessGoal.input, fields.fitnessGoal.error,
        'Please select your fitness goal.');
      ok = false;
    } else {
      clearError(fields.fitnessGoal.input, fields.fitnessGoal.error);
    }

    // Message (optional but present in schema — no hard requirement)
    clearError(fields.message.input, fields.message.error);

    return ok;
  }

  // ── Submit handler ────────────────────────────────────────

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    hideFeedback();

    // 1. Front-end validation
    if (!validateLeadForm()) {
      const firstBad = form.querySelector('.invalid, .form-error:not(:empty)');
      if (firstBad) {
        const nav    = $('#navbar');
        const offset = (nav ? nav.offsetHeight : 80) + 20;
        window.scrollTo({
          top: firstBad.getBoundingClientRect().top + window.scrollY - offset,
          behavior: 'smooth',
        });
      }
      return;
    }

    // 2. Supabase guard — check BEFORE disabling the button
    if (!supabaseClient) {
      showFeedback('error',
        'Database not configured. Please add your Supabase anon key to script.js ' +
        '(replace YOUR_SUPABASE_ANON_KEY).');
      return;
    }

    // 3. Generate a UUID client-side so we know the lead_id immediately.
    //    This avoids needing SELECT permission after INSERT —
    //    only INSERT permission is required in RLS.
    const leadId = generateUUID();

    // 4. Collect data — column names match the leads table exactly
    const leadPayload = {
      id:        leadId,                                           // explicit UUID
      full_name: fields.fullName.input.value.trim(),
      email:     fields.email.input.value.trim(),
      phone:     fields.phone.input.value.trim(),
      goal:      fields.fitnessGoal.input.value,
      message:   fields.message.input ? fields.message.input.value.trim() : '',
      // created_at is set automatically by Supabase
    };

    // 5. Loading state — prevents double-submit
    if (submitBtn) {
      submitBtn.disabled  = true;
      submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Submitting...';
    }

    try {
      // 6. Insert lead (no .select() needed — we already have the id)
      const { error: insertErr } = await supabaseClient
        .from('leads')
        .insert([leadPayload]);

      if (insertErr) {
        // Surface the Supabase error code for easier debugging
        console.error('[PrimeFit] Lead insert error:', insertErr);
        throw insertErr;
      }

      // 7. Persist to localStorage so thank-you.html can:
      //    a) show a personalised greeting
      //    b) use leadId as the FK when inserting the booking
      try {
        localStorage.setItem('primefit_lead', JSON.stringify({
          leadId,                        // ← critical FK for bookings table
          fullName:    leadPayload.full_name,
          email:       leadPayload.email,
          phone:       leadPayload.phone,
          fitnessGoal: leadPayload.goal,
          message:     leadPayload.message,
          submittedAt: new Date().toISOString(),
        }));
      } catch (storageErr) {
        // Non-fatal — page still redirects; booking will show a fallback warning
        console.warn('[PrimeFit] localStorage unavailable:', storageErr);
      }

      // 8. Brief success flash, then redirect to booking page
      showFeedback('success',
        "You're In! Your free consultation request has been received.");

      setTimeout(() => {
        window.location.href = 'thank-you.html';
      }, 1400);

    } catch (err) {
      // 9. Failure — restore button, keep form data, show specific message
      console.error('[PrimeFit] Lead submission failed:', err);

      if (submitBtn) {
        submitBtn.disabled  = false;
        submitBtn.innerHTML = origBtnHTML;
      }

      // Show a more helpful message depending on error type
      let userMsg = 'Something went wrong. Please try again.';
      if (err && err.code === '42501') {
        userMsg = 'Submission blocked by database policy. Please contact support.';
      } else if (err && err.message && err.message.includes('NetworkError')) {
        userMsg = 'Network error. Please check your connection and try again.';
      } else if (err && err.message && err.message.includes('Failed to fetch')) {
        userMsg = 'Could not reach the server. Please check your connection and try again.';
      }

      showFeedback('error', userMsg);
    }
  });
}


/* ============================================================
   06. THANK YOU PAGE  (thank-you.html)
   ──────────────────────────────────────────────────────────
   Reads primefit_lead from localStorage and:
     • Shows personalised first-name greeting
     • Shows the user's fitness goal
     • Pre-fills the booking form name + email
     • Makes the lead id available to the booking step
============================================================ */

function initThankYouPage() {
  if (!document.body.classList.contains('thankyou-page')) return;

  const tyGreeting = $('#tyGreeting');
  const userNameEl = $('#userName');
  const userGoalEl = $('#userGoal');

  let leadData = null;
  try {
    const raw = localStorage.getItem('primefit_lead');
    if (raw) leadData = JSON.parse(raw);
  } catch (err) {
    console.warn('[PrimeFit] Could not read lead data:', err);
  }

  if (leadData && tyGreeting) {
    const firstName = leadData.fullName
      ? leadData.fullName.trim().split(' ')[0]
      : null;

    if (firstName && userNameEl) userNameEl.textContent = firstName;
    if (leadData.fitnessGoal && userGoalEl)
      userGoalEl.textContent = goalLabel(leadData.fitnessGoal);

    if (firstName) {
      tyGreeting.style.display   = 'block';
      tyGreeting.style.animation = 'fade-slide-up 0.5s ease 0.4s both';
    }

    // Pre-fill booking form contact fields
    const bookingName  = $('#bookingName');
    const bookingEmail = $('#bookingEmail');
    if (bookingName  && leadData.fullName) bookingName.value  = leadData.fullName.trim();
    if (bookingEmail && leadData.email)    bookingEmail.value = leadData.email.trim();
  }

  // Smooth-scroll CTA buttons that use href="#booking"
  $$('.scroll-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      const target = document.querySelector(btn.getAttribute('href'));
      if (!target) return;
      const nav    = $('#navbar');
      const offset = (nav ? nav.offsetHeight : 80) + 16;
      window.scrollTo({
        top: target.getBoundingClientRect().top + window.scrollY - offset,
        behavior: 'smooth',
      });
    });
  });
}


/* ============================================================
   07. BOOKING FORM  (thank-you.html)
   ──────────────────────────────────────────────────────────
   Inserts into: bookings
   Columns used:
     lead_id      ← localStorage primefit_lead.leadId  (FK → leads.id)
     booking_date ← #bookingDate  (date input, YYYY-MM-DD)
     booking_time ← time-slot button selection          (HH:MM:SS)
     status       ← hardcoded 'pending'

   Two-step UI:
     Step 1 — pick date + time slot → Continue
     Step 2 — confirm name/email   → CONFIRM BOOKING → Supabase insert
============================================================ */

function initBookingForm() {
  const bookingForm = $('#bookingForm');
  if (!bookingForm) return;

  // ── DOM refs ──────────────────────────────────────────────
  const step1 = $('#bookingStep1');
  const step2 = $('#bookingStep2');

  const bookingDateInput  = $('#bookingDate');
  const selectedTimeInput = $('#selectedTime');   // hidden input
  const timeSlotBtns      = $$('.time-slot');

  const bookingDateError  = $('#bookingDateError');
  const selectedTimeError = $('#selectedTimeError');

  const bookingNameInput  = $('#bookingName');
  const bookingEmailInput = $('#bookingEmail');
  const bookingNameError  = $('#bookingNameError');
  const bookingEmailError = $('#bookingEmailError');

  const summaryDate    = $('#summaryDate');
  const summaryTime    = $('#summaryTime');
  const nextStepBtn    = $('#nextStepBtn');
  const backStepBtn    = $('#backStepBtn');
  const confirmBtn     = $('#confirmBookingBtn');
  const origConfirmHTML = confirmBtn ? confirmBtn.innerHTML : '';

  const successOverlay = $('#bookingSuccess');
  const successDetails = $('#successDetails');
  const successEmail   = $('#successEmail');

  // ── Setup ─────────────────────────────────────────────────

  if (bookingDateInput) bookingDateInput.min = todayString();

  // Time-slot button selection
  timeSlotBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      timeSlotBtns.forEach(b => b.classList.remove('selected'));
      btn.classList.add('selected');
      // Store as HH:MM:SS (Supabase `time` type expects this format)
      selectedTimeInput.value = convertTo24h(btn.dataset.time);
      clearError(null, selectedTimeError);
    });
  });

  if (bookingDateInput)
    bookingDateInput.addEventListener('change',
      () => clearError(bookingDateInput, bookingDateError));
  if (bookingNameInput)
    bookingNameInput.addEventListener('input',
      () => clearError(bookingNameInput, bookingNameError));
  if (bookingEmailInput)
    bookingEmailInput.addEventListener('input',
      () => clearError(bookingEmailInput, bookingEmailError));

  // ── Helpers ───────────────────────────────────────────────

  /**
   * Convert "9:00 AM" / "1:00 PM" → "09:00:00" / "13:00:00"
   * Supabase time columns require HH:MM:SS format.
   */
  function convertTo24h(timeStr) {
    if (!timeStr) return '';
    const [timePart, period] = timeStr.split(' ');
    let [h, m] = timePart.split(':').map(Number);
    if (period === 'PM' && h !== 12) h += 12;
    if (period === 'AM' && h === 12) h = 0;
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:00`;
  }

  // ── Step 1 validation ─────────────────────────────────────

  function validateStep1() {
    let ok = true;
    if (!bookingDateInput || !bookingDateInput.value) {
      showError(bookingDateInput, bookingDateError,
        'Please select a date for your consultation.');
      ok = false;
    } else {
      clearError(bookingDateInput, bookingDateError);
    }
    if (!selectedTimeInput || !selectedTimeInput.value) {
      showError(null, selectedTimeError, 'Please select a time slot.');
      ok = false;
    } else {
      clearError(null, selectedTimeError);
    }
    return ok;
  }

  // ── Step 2 validation ─────────────────────────────────────

  function validateStep2() {
    let ok = true;
    const name = bookingNameInput ? bookingNameInput.value.trim() : '';
    if (!name) {
      showError(bookingNameInput, bookingNameError, 'Please enter your name.');
      ok = false;
    } else {
      clearError(bookingNameInput, bookingNameError);
    }
    const email = bookingEmailInput ? bookingEmailInput.value.trim() : '';
    if (!email) {
      showError(bookingEmailInput, bookingEmailError, 'Please enter your email address.');
      ok = false;
    } else if (!isValidEmail(email)) {
      showError(bookingEmailInput, bookingEmailError, 'Please enter a valid email address.');
      ok = false;
    } else {
      clearError(bookingEmailInput, bookingEmailError);
    }
    return ok;
  }

  // ── Next Step (Step 1 → Step 2) ───────────────────────────

  if (nextStepBtn) {
    nextStepBtn.addEventListener('click', () => {
      if (!validateStep1()) return;

      // Populate summary panel
      if (summaryDate) summaryDate.textContent = formatDate(bookingDateInput.value);
      if (summaryTime) summaryTime.textContent =
        // Show the friendly label, not the 24-h value
        timeSlotBtns[
          [...timeSlotBtns].findIndex(b => b.classList.contains('selected'))
        ]?.dataset.time ?? selectedTimeInput.value;

      step1.classList.remove('active');
      step2.classList.add('active');

      // Scroll the form into view
      const wrap = $('#bookingFormWrap');
      if (wrap) {
        const nav    = $('#navbar');
        const offset = (nav ? nav.offsetHeight : 80) + 16;
        window.scrollTo({
          top: wrap.getBoundingClientRect().top + window.scrollY - offset,
          behavior: 'smooth',
        });
      }
    });
  }

  // ── Back (Step 2 → Step 1) ────────────────────────────────

  if (backStepBtn) {
    backStepBtn.addEventListener('click', () => {
      step2.classList.remove('active');
      step1.classList.add('active');
    });
  }

  // ── Booking submit ────────────────────────────────────────

  bookingForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (!validateStep2()) return;

    // Retrieve lead_id saved during the lead form submission
    let leadId = null;
    try {
      const raw = localStorage.getItem('primefit_lead');
      if (raw) leadId = JSON.parse(raw).leadId || null;
    } catch (_) { /* ignore */ }

    if (!leadId) {
      // No lead ID — cannot create a FK-linked booking.
      // Show a graceful error instead of inserting an orphaned row.
      console.error('[PrimeFit] No lead ID found in localStorage.');
      alert('We could not find your consultation request. Please go back and resubmit the form.');
      return;
    }

    if (!supabaseClient) {
      alert('Database not configured. Please add your Supabase anon key.');
      return;
    }

    // Loading state — prevents double-submit
    if (confirmBtn) {
      confirmBtn.disabled  = true;
      confirmBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Booking...';
    }

    // The friendly display label (e.g. "9:00 AM") for the confirmation UI
    const selectedBtn     = [...timeSlotBtns].find(b => b.classList.contains('selected'));
    const displayTime     = selectedBtn ? selectedBtn.dataset.time : selectedTimeInput.value;
    const displayDate     = formatDate(bookingDateInput.value);

    const bookingPayload = {
      lead_id:      leadId,                       // FK → leads.id
      booking_date: bookingDateInput.value,        // YYYY-MM-DD
      booking_time: selectedTimeInput.value,       // HH:MM:SS (24-h)
      status:       'pending',
      // created_at is set automatically by Supabase
    };

    try {
      const { error: bookingErr } = await supabaseClient
        .from('bookings')
        .insert([bookingPayload]);

      if (bookingErr) throw bookingErr;

      // Persist booking details for the success overlay
      try {
        localStorage.setItem('primefit_booking', JSON.stringify({
          leadId,
          name:          bookingNameInput  ? bookingNameInput.value.trim()  : '',
          email:         bookingEmailInput ? bookingEmailInput.value.trim() : '',
          date:          bookingDateInput.value,
          dateFormatted: displayDate,
          time:          displayTime,
          bookedAt:      new Date().toISOString(),
        }));
      } catch (_) { /* non-fatal */ }

      showBookingSuccess({
        name:          bookingNameInput  ? bookingNameInput.value.trim()  : '',
        email:         bookingEmailInput ? bookingEmailInput.value.trim() : '',
        dateFormatted: displayDate,
        time:          displayTime,
      });

    } catch (err) {
      console.error('[PrimeFit] Booking insert error:', err);
      if (confirmBtn) {
        confirmBtn.disabled  = false;
        confirmBtn.innerHTML = origConfirmHTML;
      }
      alert('Something went wrong while booking your consultation. Please try again.');
    }
  });

  // ── Success overlay ───────────────────────────────────────

  function showBookingSuccess(data) {
    if (!successOverlay) return;

    if (successDetails) {
      successDetails.innerHTML = `
        <div class="summary-row">
          <span><i class="fas fa-calendar"></i> Date:</span>
          <strong>${sanitize(data.dateFormatted)}</strong>
        </div>
        <div class="summary-row">
          <span><i class="fas fa-clock"></i> Time:</span>
          <strong>${sanitize(data.time)}</strong>
        </div>
        <div class="summary-row">
          <span><i class="fas fa-user"></i> Name:</span>
          <strong>${sanitize(data.name)}</strong>
        </div>
        <div class="summary-row">
          <span><i class="fas fa-video"></i> Format:</span>
          <strong>Video / Phone — 30 min</strong>
        </div>
      `;
    }

    if (successEmail) successEmail.textContent = data.email;

    successOverlay.classList.add('visible');
    document.body.style.overflow = 'hidden';
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  // Shake card if user clicks outside it (accidental dismiss prevention)
  if (successOverlay) {
    successOverlay.addEventListener('click', (e) => {
      if (e.target !== successOverlay) return;
      const card = successOverlay.querySelector('.booking-success-card');
      if (!card) return;
      card.style.animation = 'none';
      void card.offsetHeight; // force reflow
      card.style.animation = 'shake 0.3s ease';
    });
  }
}


/* ============================================================
   08. INIT — Route to correct page handlers
============================================================ */

document.addEventListener('DOMContentLoaded', () => {
  // Runs on every page
  initNavigation();
  initScrollAnimations();

  if (document.body.classList.contains('thankyou-page')) {
    initThankYouPage();
    initBookingForm();
  } else {
    initLeadForm();
    initMobileStickyBehavior();
  }
});


/* ============================================================
   MOBILE STICKY CTA
   Hides the fixed bottom bar when the lead form is visible
============================================================ */

function initMobileStickyBehavior() {
  const cta      = $('#mobileCta');
  const formSect = $('#lead-capture');
  if (!cta || !formSect) return;

  cta.style.transition = 'opacity 0.3s ease';

  new IntersectionObserver(
    (entries) => {
      entries.forEach(entry => {
        cta.style.opacity       = entry.isIntersecting ? '0' : '1';
        cta.style.pointerEvents = entry.isIntersecting ? 'none' : 'auto';
      });
    },
    { threshold: 0.1 }
  ).observe(formSect);
}


/* ============================================================
   SHAKE KEYFRAME (injected dynamically for the booking overlay)
============================================================ */

(function injectShake() {
  const s = document.createElement('style');
  s.textContent = `
    @keyframes shake {
      0%,100% { transform:translateX(0); }
      20%     { transform:translateX(-8px); }
      40%     { transform:translateX(8px); }
      60%     { transform:translateX(-5px); }
      80%     { transform:translateX(5px); }
    }
  `;
  document.head.appendChild(s);
}());
