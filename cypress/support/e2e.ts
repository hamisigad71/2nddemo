// ***********************************************************
// This example support/e2e.ts is processed and
// loaded automatically before your test files.
// ***********************************************************

// Import commands.js using ES2015 syntax:
import "./commands";

// Automatically dismiss 18+ Age Verification Modal & Verified Creator popups if present across any test
beforeEach(() => {
  cy.window().then((win) => {
    win.localStorage.setItem("tgd_age_verified_18", "true");
    win.localStorage.setItem("age_verified", "true");
    win.localStorage.setItem("mali_verified_creators_popup_seen_77793a21-2f0c-4ae7-842b-7aed42593c36", "true");
    win.localStorage.removeItem("show_subscriber_verification_popup");
  });
});
Cypress.on("uncaught:exception", (err, runnable) => {
  // returning false here prevents Cypress from failing the test
  if (
    err.message.includes("Script error") ||
    err.message.includes("cross origin script") ||
    err.message.includes("posthog")
  ) {
    return false;
  }
  // Let other application errors surface
  return false;
});
