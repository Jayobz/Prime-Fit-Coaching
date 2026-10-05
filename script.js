/* ============================================================
   PRIMEFIT COACHING — SCRIPT.JS
   Sales Funnel Lead Generation Website

   TABLE OF CONTENTS:
   01. Utility Helpers
   02. Navigation (scroll behavior + mobile menu)
   03. Scroll Animations (Intersection Observer)
   04. Supabase Config & Client
   05. Lead Capture Form (index.html) — Supabase integration
   06. Thank You Page (thank-you.html)
   07. Booking Form (thank-you.html)
   08. Init — Route to correct page handlers
============================================================ */

'use strict';

/* ============================================================
   01. UTILITY HELPERS
============================================================ */

/**
 * Shorthand querySelector
 * @param {string} selector
 * @param {Element} [scope=document]
 * @returns {Element|null}
 */
const $ = (selector, scope = document) => scope.querySelector(selector);

/**
 * Shorthand querySelectorAll
 * @param {string} selector
 * @param {Element} [scope=document]
 * @returns {NodeList}
 */
const $$ = (selector, scope = document) => scope.querySelectorAll(selector);

/**
 * Validate an email string format
 * @param {string} email
 * @returns {boolean}
 */
function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
}

/**
 * Validate a phone number — accepts common formats
 * @param {string} phone
 * @returns {boolean}
 */
function isValidPhone(phone) {
  // Allow digits, spaces, dashes, parens, plus sign — at least 7 digits total
  const digits = phone.replace(/\D/g, '');
  return digits.length >= 7 && digits.length <= 15;
}

/**
 * Sanitize a string for display (prevent XSS in DOM insertions)
 * @param {string} str
 * @returns {string}
 */
function sanitize(str) {
  const div = document.createElement('div');
  div.textContent = String(str);
  return div.innerHTML;
}

/**
 * Show a form error message and mark the field invalid
 * @param {HTMLElement} field - input/select element
 * @param {HTMLElement} errorEl - span to show message in
 * @param {string} message
 */
function showError(field, errorEl, message) {
  if (field) field.classList.add('invalid');
  if (errorEl) errorEl.textContent = message;
}

/**
 * Clear error state from a field
 * @param {HTMLElement} field
 * @param {HTMLElement} errorEl
 */
function clearError(field, errorEl) {
  if (field) field.classList.remove('invalid');
  if (errorEl) errorEl.textContent = '';
}

/**
 * Format a date string (YYYY-MM-DD) → "Monday, January 20, 2025"
 * @param {string} dateStr
 * @returns {string}
 */
function formatDate(dateStr) {
  if (!dateStr) return '';
  // Parse as local date to avoid timezone shift
  const [y, m, d] = dateStr.split('-').map(Number);
  const date = new Date(y, m - 1, d);
  return date.toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

/**
 * Get today's date as YYYY-MM-DD string (for min date on date inputs)
 * @returns {string}
 */
function todayString() {
  const today = new Date();
  const y = today.getFullYear();
  const m = String(today.getMonth() + 1).padStart(2, '0');
  const d = String(today.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/**
 * Map internal fitness goal values to human-readable labels
 * @param {string} value
 * @returns {string}
 */
function goalLabel(value) {
  const labels = {
    'lose-weight':    'lose weight',
    'build-muscle':   'build muscle',
    'improve-fitness':'improve your fitness',
    'get-healthier':  'get healthier',
    'other':          'reach your fitness goals',
  };
  return labels[value] || 'reach your fitness goals';
}


/* ============================================================
   02. NAVIGATION
============================================================ */

function initNavigation() {
  const navbar     = $('#navbar');
  const hamburger  = $('#hamburger');
  const navLinks   = $('#navLinks');

  if (!navbar) return;

  // --- Scroll: add/remove .scrolled class ---
  function handleNavScroll() {
    if (window.scrollY > 40) {
      navbar.classList.add('scrolled');
    } else {
      navbar.classList.remove('scrolled');
    }
  }

  window.addEventListener('scroll', handleNavScroll, { passive: true });
  handleNavScroll(); // Run on load in case page is already scrolled

  // --- Mobile hamburger toggle ---
  if (hamburger && navLinks) {
    hamburger.addEventListener('click', () => {
      const isOpen = navLinks.classList.toggle('open');
      hamburger.classList.toggle('open', isOpen);
      hamburger.setAttribute('aria-expanded', isOpen);
    });

    // Close menu when a nav link is clicked
    navLinks.querySelectorAll('a').forEach(link => {
      link.addEventListener('click', () => {
        navLinks.classList.remove('open');
        hamburger.classList.remove('open');
        hamburger.setAttribute('aria-expanded', 'false');
      });
    });

    // Close menu when clicking outside
    document.addEventListener('click', (e) => {
      if (!navbar.contains(e.target) && navLinks.classList.contains('open')) {
        navLinks.classList.remove('open');
        hamburger.classList.remove('open');
        hamburger.setAttribute('aria-expanded', 'false');
      }
    });
  }

  // --- Smooth scroll for anchor links ---
  // (HTML has scroll-behavior: smooth but we handle offset for fixed navbar)
  document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', (e) => {
      const targetId = anchor.getAttribute('href');
      if (targetId === '#') return;
      const target = document.querySelector(targetId);
      if (!target) return;
      e.preventDefault();

      const navHeight = navbar.offsetHeight;
      const targetTop = target.getBoundingClientRect().top + window.scrollY - navHeight - 16;

      window.scrollTo({ top: targetTop, behavior: 'smooth' });
    });
  });
}


/* ============================================================
   03. SCROLL ANIMATIONS (Intersection Observer)
============================================================ */

function initScrollAnimations() {
  const fadeElements = $$('.fade-in');
  if (!fadeElements.length) return;

  // Use IntersectionObserver for performance
  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('visible');
          // Once visible, no need to keep observing
          observer.unobserve(entry.target);
        }
      });
    },
    {
      threshold: 0.12,       // Trigger when 12% of element is visible
      rootMargin: '0px 0px -40px 0px', // Slight bottom offset
    }
  );

  fadeElements.forEach(el => observer.observe(el));

  // Fallback: if IntersectionObserver not supported, show all
  if (!('IntersectionObserver' in window)) {
    fadeElements.forEach(el => el.classList.add('visible'));
  }
}


/* ============================================================
   04. SUPABASE CONFIG
   ──────────────────────────────────────────────────────────
   Replace the two placeholder strings below with your real
   values from: Supabase Dashboard → Project Settings → API

   SUPABASE_URL  → "Project URL"
   SUPABASE_ANON_KEY → "anon / public" key

   NEVER use the service_role key here — anon key only.
============================================================ */

const SUPABASE_URL      = 'YOUR_SUPABASE_URL';
const SUPABASE_ANON_KEY = 'YOUR_SUPABASE_ANON_KEY';

// Initialise the Supabase client using the CDN global (loaded before this file)
// window.supabase is provided by @supabase/supabase-js v2 via CDN
const supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);


/* ============================================================
   05. LEAD CAPTURE FORM (index.html)
   ──────────────────────────────────────────────────────────
   Supabase table expected: "leads"
   Columns:
     id                – auto-generated (uuid or serial, set by Supabase)
     full_name         – text
     email             – text
     phone             – text
     fitness_goal      – text
     consultation_date – date  (YYYY-MM-DD)
     consultation_time – text
     created_at        – timestamptz (set by Supabase default: now())
============================================================ */

function initLeadForm() {
  const form = $('#leadForm');
  if (!form) return;

  // ── Field references ──────────────────────────────────────
  const fields = {
    fullName:         { input: $('#fullName'),         error: $('#fullNameError') },
    email:            { input: $('#email'),             error: $('#emailError') },
    phone:            { input: $('#phone'),             error: $('#phoneError') },
    fitnessGoal:      { input: $('#fitnessGoal'),       error: $('#fitnessGoalError') },
    experience:       { input: null,                    error: $('#experienceError') },
    consultationDate: { input: $('#consultationDate'),  error: $('#consultationDateError') },
    consultationTime: { input: $('#consultationTime'),  error: $('#consultationTimeError') },
  };

  const submitBtn    = $('#submitBtn');
  const feedbackEl   = $('#formFeedback');

  // Store original button label so we can restore it on error
  const originalBtnHTML = submitBtn.innerHTML;

  // ── Helpers: feedback banner ──────────────────────────────

  /**
   * Show an inline success or error message above the submit button.
   * @param {'success'|'error'} type
   * @param {string} message
   */
  function showFeedback(type, message) {
    if (!feedbackEl) return;
    feedbackEl.className = `form-feedback form-feedback--${type}`;
    feedbackEl.innerHTML = type === 'success'
      ? `<i class="fas fa-circle-check"></i> ${message}`
      : `<i class="fas fa-triangle-exclamation"></i> ${message}`;
    feedbackEl.style.display = 'flex';

    // Scroll feedback into view
    const navbar = $('#navbar');
    const offset = (navbar ? navbar.offsetHeight : 80) + 12;
    const top = feedbackEl.getBoundingClientRect().top + window.scrollY - offset;
    window.scrollTo({ top, behavior: 'smooth' });
  }

  function hideFeedback() {
    if (!feedbackEl) return;
    feedbackEl.style.display = 'none';
    feedbackEl.textContent = '';
    feedbackEl.className = 'form-feedback';
  }

  // ── Set min date to today on the date picker ──────────────
  if (fields.consultationDate.input) {
    fields.consultationDate.input.min = todayString();
  }

  // ── Real-time validation: clear errors on input ───────────
  Object.values(fields).forEach(({ input, error }) => {
    if (!input) return;
    input.addEventListener('input',  () => { clearError(input, error); hideFeedback(); });
    input.addEventListener('change', () => { clearError(input, error); hideFeedback(); });
  });

  // Radio group — clear error on any selection
  $$('input[name="experience"]').forEach(radio => {
    radio.addEventListener('change', () => {
      clearError(null, fields.experience.error);
      hideFeedback();
    });
  });

  // ── Full form validation ──────────────────────────────────
  function validateForm() {
    let valid = true;

    // Full Name
    const name = fields.fullName.input.value.trim();
    if (!name) {
      showError(fields.fullName.input, fields.fullName.error, 'Please enter your full name.');
      valid = false;
    } else if (name.length < 2) {
      showError(fields.fullName.input, fields.fullName.error, 'Name must be at least 2 characters.');
      valid = false;
    } else {
      clearError(fields.fullName.input, fields.fullName.error);
    }

    // Email
    const email = fields.email.input.value.trim();
    if (!email) {
      showError(fields.email.input, fields.email.error, 'Please enter your email address.');
      valid = false;
    } else if (!isValidEmail(email)) {
      showError(fields.email.input, fields.email.error, 'Please enter a valid email address.');
      valid = false;
    } else {
      clearError(fields.email.input, fields.email.error);
    }

    // Phone
    const phone = fields.phone.input.value.trim();
    if (!phone) {
      showError(fields.phone.input, fields.phone.error, 'Please enter your phone number.');
      valid = false;
    } else if (!isValidPhone(phone)) {
      showError(fields.phone.input, fields.phone.error, 'Please enter a valid phone number.');
      valid = false;
    } else {
      clearError(fields.phone.input, fields.phone.error);
    }

    // Fitness Goal
    const goal = fields.fitnessGoal.input.value;
    if (!goal) {
      showError(fields.fitnessGoal.input, fields.fitnessGoal.error, 'Please select your fitness goal.');
      valid = false;
    } else {
      clearError(fields.fitnessGoal.input, fields.fitnessGoal.error);
    }

    // Experience Level (radio)
    const experienceRadio = $('input[name="experience"]:checked');
    if (!experienceRadio) {
      showError(null, fields.experience.error, 'Please select your experience level.');
      valid = false;
    } else {
      clearError(null, fields.experience.error);
    }

    // Consultation Date
    const cDate = fields.consultationDate.input.value;
    if (!cDate) {
      showError(fields.consultationDate.input, fields.consultationDate.error, 'Please select a preferred consultation date.');
      valid = false;
    } else {
      clearError(fields.consultationDate.input, fields.consultationDate.error);
    }

    // Consultation Time
    const cTime = fields.consultationTime.input.value;
    if (!cTime) {
      showError(fields.consultationTime.input, fields.consultationTime.error, 'Please select a preferred consultation time.');
      valid = false;
    } else {
      clearError(fields.consultationTime.input, fields.consultationTime.error);
    }

    return valid;
  }

  // ── Form submit handler ───────────────────────────────────
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    hideFeedback();

    // 1. Validate — stop here if anything is missing/invalid
    if (!validateForm()) {
      const firstError = form.querySelector('.invalid, .form-error:not(:empty)');
      if (firstError) {
        const navbar = $('#navbar');
        const offset = (navbar ? navbar.offsetHeight : 80) + 20;
        const top = firstError.getBoundingClientRect().top + window.scrollY - offset;
        window.scrollTo({ top, behavior: 'smooth' });
      }
      return;
    }

    // 2. Collect form data — mapped to Supabase column names
    const leadData = {
      full_name:         fields.fullName.input.value.trim(),
      email:             fields.email.input.value.trim(),
      phone:             fields.phone.input.value.trim(),
      fitness_goal:      fields.fitnessGoal.input.value,
      // experience is not a column in the leads table —
      // store it in localStorage for the thank-you page personalisation
      consultation_date: fields.consultationDate.input.value,       // YYYY-MM-DD
      consultation_time: fields.consultationTime.input.value,
      // created_at is set automatically by Supabase (default: now())
    };

    // 3. Loading state — disable button to prevent duplicate submissions
    submitBtn.disabled = true;
    submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Submitting...';

    try {
      // ── 4. Insert into Supabase ────────────────────────────
      // The anon key + RLS INSERT policy allows this.
      // SELECT is blocked by RLS so visitors cannot read other leads.
      const { error: supabaseError } = await supabaseClient
        .from('leads')
        .insert([leadData]);

      if (supabaseError) {
        // Supabase returned an error (e.g. constraint violation, RLS denied)
        throw supabaseError;
      }

      // ── 5. Success ─────────────────────────────────────────
      // Also save to localStorage so thank-you.html can personalise the greeting
      try {
        localStorage.setItem('primefit_lead', JSON.stringify({
          fullName:         leadData.full_name,
          email:            leadData.email,
          phone:            leadData.phone,
          fitnessGoal:      leadData.fitness_goal,
          experience:       ($('input[name="experience"]:checked') || {}).value || '',
          consultationDate: leadData.consultation_date,
          consultationTime: leadData.consultation_time,
          submittedAt:      new Date().toISOString(),
        }));
      } catch (storageErr) {
        // localStorage unavailable in some private-browsing contexts — not fatal
        console.warn('localStorage unavailable:', storageErr);
      }

      // Show brief success message, then redirect to thank-you page
      showFeedback('success', "You're In! Your free consultation request has been received.");

      // Short pause so the user sees the confirmation, then move on
      setTimeout(() => {
        window.location.href = 'thank-you.html';
      }, 1400);

    } catch (error) {
      // ── 6. Error handling ──────────────────────────────────
      // Log the full technical error for debugging in DevTools
      console.error('Lead submission error:', error);

      // Restore the button so the user can try again
      submitBtn.disabled = false;
      submitBtn.innerHTML = originalBtnHTML;

      // Show a friendly, visible error message — do NOT clear the form
      showFeedback('error', 'Something went wrong. Please check your information and try again.');
    }
  });
}


/* ============================================================
   06. THANK YOU PAGE — Load & Display Lead Data
============================================================ */

function initThankYouPage() {
  // Only run on the thank-you page
  if (!document.body.classList.contains('thankyou-page')) return;

  const tyGreeting = $('#tyGreeting');
  const userNameEl = $('#userName');
  const userGoalEl = $('#userGoal');

  // --- Load saved lead data from localStorage ---
  let leadData = null;
  try {
    const stored = localStorage.getItem('primefit_lead');
    if (stored) leadData = JSON.parse(stored);
  } catch (err) {
    console.warn('Could not read lead data:', err);
  }

  if (leadData && tyGreeting) {
    // Show personalized greeting
    const firstName = leadData.fullName
      ? leadData.fullName.trim().split(' ')[0]
      : null;

    if (firstName && userNameEl) {
      userNameEl.textContent = firstName;
    }

    if (leadData.fitnessGoal && userGoalEl) {
      userGoalEl.textContent = goalLabel(leadData.fitnessGoal);
    }

    if (firstName) {
      tyGreeting.style.display = 'block';
      tyGreeting.style.animation = 'fade-slide-up 0.5s ease 0.4s both';
    }

    // Pre-fill booking form with known data (use raw strings for input values)
    const bookingName  = $('#bookingName');
    const bookingEmail = $('#bookingEmail');

    if (bookingName && leadData.fullName) {
      bookingName.value = leadData.fullName.trim();
    }
    if (bookingEmail && leadData.email) {
      bookingEmail.value = leadData.email.trim();
    }
  }

  // --- Scroll CTA button ---
  $$('.scroll-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      const target = document.querySelector(btn.getAttribute('href'));
      if (target) {
        const navbar = $('#navbar');
        const offset = (navbar ? navbar.offsetHeight : 80) + 16;
        const top = target.getBoundingClientRect().top + window.scrollY - offset;
        window.scrollTo({ top, behavior: 'smooth' });
      }
    });
  });
}


/* ============================================================
   07. BOOKING FORM (thank-you.html)
============================================================ */

function initBookingForm() {
  const bookingForm  = $('#bookingForm');
  if (!bookingForm) return;

  // Step elements
  const step1 = $('#bookingStep1');
  const step2 = $('#bookingStep2');

  // Step 1 fields
  const bookingDateInput  = $('#bookingDate');
  const selectedTimeInput = $('#selectedTime');
  const timeSlotBtns      = $$('.time-slot');

  // Step 1 errors
  const bookingDateError   = $('#bookingDateError');
  const selectedTimeError  = $('#selectedTimeError');

  // Step 2 fields
  const bookingNameInput  = $('#bookingName');
  const bookingEmailInput = $('#bookingEmail');

  // Step 2 errors
  const bookingNameError  = $('#bookingNameError');
  const bookingEmailError = $('#bookingEmailError');

  // Summary display
  const summaryDate = $('#summaryDate');
  const summaryTime = $('#summaryTime');

  // Navigation buttons
  const nextStepBtn    = $('#nextStepBtn');
  const backStepBtn    = $('#backStepBtn');

  // Success overlay
  const successOverlay = $('#bookingSuccess');
  const successDetails = $('#successDetails');
  const successEmail   = $('#successEmail');

  // --- Set minimum date to today ---
  if (bookingDateInput) {
    bookingDateInput.min = todayString();
  }

  // --- Time slot selection ---
  timeSlotBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      // Deselect all, select clicked
      timeSlotBtns.forEach(b => b.classList.remove('selected'));
      btn.classList.add('selected');
      selectedTimeInput.value = btn.dataset.time;
      clearError(null, selectedTimeError);
    });
  });

  // --- Clear date error on change ---
  if (bookingDateInput) {
    bookingDateInput.addEventListener('change', () => clearError(bookingDateInput, bookingDateError));
  }

  // --- Validate Step 1 ---
  function validateStep1() {
    let valid = true;

    const dateVal = bookingDateInput ? bookingDateInput.value : '';
    if (!dateVal) {
      showError(bookingDateInput, bookingDateError, 'Please select a date for your consultation.');
      valid = false;
    } else {
      clearError(bookingDateInput, bookingDateError);
    }

    const timeVal = selectedTimeInput ? selectedTimeInput.value : '';
    if (!timeVal) {
      showError(null, selectedTimeError, 'Please select a time slot.');
      valid = false;
    } else {
      clearError(null, selectedTimeError);
    }

    return valid;
  }

  // --- Validate Step 2 ---
  function validateStep2() {
    let valid = true;

    const nameVal = bookingNameInput ? bookingNameInput.value.trim() : '';
    if (!nameVal) {
      showError(bookingNameInput, bookingNameError, 'Please enter your name.');
      valid = false;
    } else {
      clearError(bookingNameInput, bookingNameError);
    }

    const emailVal = bookingEmailInput ? bookingEmailInput.value.trim() : '';
    if (!emailVal) {
      showError(bookingEmailInput, bookingEmailError, 'Please enter your email address.');
      valid = false;
    } else if (!isValidEmail(emailVal)) {
      showError(bookingEmailInput, bookingEmailError, 'Please enter a valid email address.');
      valid = false;
    } else {
      clearError(bookingEmailInput, bookingEmailError);
    }

    return valid;
  }

  // --- Real-time validation on step 2 fields ---
  if (bookingNameInput) {
    bookingNameInput.addEventListener('input', () => clearError(bookingNameInput, bookingNameError));
  }
  if (bookingEmailInput) {
    bookingEmailInput.addEventListener('input', () => clearError(bookingEmailInput, bookingEmailError));
  }

  // --- Next Step button (Step 1 → Step 2) ---
  if (nextStepBtn) {
    nextStepBtn.addEventListener('click', () => {
      if (!validateStep1()) return;

      // Update summary display
      const formattedDate = formatDate(bookingDateInput.value);
      const selectedTime  = selectedTimeInput.value;

      if (summaryDate) summaryDate.textContent = formattedDate;
      if (summaryTime) summaryTime.textContent = selectedTime;

      // Transition to step 2
      step1.classList.remove('active');
      step2.classList.add('active');

      // Scroll form into view
      const bookingFormWrap = $('#bookingFormWrap');
      if (bookingFormWrap) {
        const navbar = $('#navbar');
        const offset = (navbar ? navbar.offsetHeight : 80) + 16;
        const top = bookingFormWrap.getBoundingClientRect().top + window.scrollY - offset;
        window.scrollTo({ top, behavior: 'smooth' });
      }
    });
  }

  // --- Back button (Step 2 → Step 1) ---
  if (backStepBtn) {
    backStepBtn.addEventListener('click', () => {
      step2.classList.remove('active');
      step1.classList.add('active');
    });
  }

  // --- Booking Form Submit (Step 2) ---
  bookingForm.addEventListener('submit', (e) => {
    e.preventDefault();

    if (!validateStep2()) return;

    // Collect booking data
    const bookingData = {
      name:       bookingNameInput.value.trim(),
      email:      bookingEmailInput.value.trim(),
      date:       bookingDateInput.value,
      dateFormatted: formatDate(bookingDateInput.value),
      time:       selectedTimeInput.value,
      bookedAt:   new Date().toISOString(),
    };

    // Save to localStorage (demo)
    try {
      localStorage.setItem('primefit_booking', JSON.stringify(bookingData));
    } catch (err) {
      console.warn('localStorage unavailable:', err);
    }

    // Show loading state on confirm button
    const confirmBtn = $('#confirmBookingBtn');
    if (confirmBtn) {
      confirmBtn.disabled = true;
      confirmBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Confirming...';
    }

    // Short delay for realism, then show success
    setTimeout(() => {
      showBookingSuccess(bookingData);
    }, 800);
  });

  // --- Show booking success overlay ---
  function showBookingSuccess(data) {
    if (!successOverlay) return;

    // Populate success details
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

    if (successEmail) {
      successEmail.textContent = data.email;
    }

    // Show overlay
    successOverlay.classList.add('visible');
    document.body.style.overflow = 'hidden'; // Prevent background scroll

    // Scroll to top so overlay is visible from center
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  // --- Close success overlay if clicking outside card ---
  if (successOverlay) {
    successOverlay.addEventListener('click', (e) => {
      if (e.target === successOverlay) {
        // Don't allow accidental dismiss — user should use the buttons
        // but add a subtle shake to draw attention to the card
        const card = successOverlay.querySelector('.booking-success-card');
        if (card) {
          card.style.animation = 'none';
          card.offsetHeight; // Reflow
          card.style.animation = 'shake 0.3s ease';
        }
      }
    });
  }
}


/* ============================================================
   08. INIT — Route to correct page handlers
============================================================ */

document.addEventListener('DOMContentLoaded', () => {
  // These run on ALL pages
  initNavigation();
  initScrollAnimations();

  // Page-specific initializers
  const isThankYouPage = document.body.classList.contains('thankyou-page');

  if (isThankYouPage) {
    // Thank You page: load lead data + booking form
    initThankYouPage();
    initBookingForm();
  } else {
    // Landing page: lead capture form
    initLeadForm();
    initMobileStickyBehavior();
  }
});


/* ============================================================
   BONUS: Mobile Sticky CTA — hide when form is in view
============================================================ */

function initMobileStickyBehavior() {
  const stickyCta  = $('#mobileCta');
  const leadForm   = $('#lead-capture');
  if (!stickyCta || !leadForm) return;

  // Hide sticky CTA when the lead capture section is visible
  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          stickyCta.style.opacity = '0';
          stickyCta.style.pointerEvents = 'none';
        } else {
          stickyCta.style.opacity = '1';
          stickyCta.style.pointerEvents = 'auto';
        }
      });
    },
    { threshold: 0.1 }
  );

  observer.observe(leadForm);

  // Also add transition to sticky CTA
  stickyCta.style.transition = 'opacity 0.3s ease';
}


/* ============================================================
   EXTRA: Add a CSS shake keyframe dynamically
   (Used for the success overlay click-outside behavior)
============================================================ */

(function addShakeKeyframe() {
  const style = document.createElement('style');
  style.textContent = `
    @keyframes shake {
      0%, 100% { transform: translateX(0); }
      20%       { transform: translateX(-8px); }
      40%       { transform: translateX(8px); }
      60%       { transform: translateX(-5px); }
      80%       { transform: translateX(5px); }
    }
  `;
  document.head.appendChild(style);
})();
