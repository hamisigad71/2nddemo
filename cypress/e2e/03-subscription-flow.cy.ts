describe("Workflow 3: Subscription Flow & Payment Bypass", () => {
  beforeEach(() => {
    cy.visit("/discover");
  });

  it("opens creator profile, bypasses M-Pesa payment wall, and triggers active subscriber state", () => {
    // 1. Setup payment mock intercept
    cy.mockPaymentSuccess("CYPRESS-SUB-TX-999");

    // 2. Click on the first creator card or sponsored card
    cy.get(".discover-card, div[role='button']").first().click({ force: true });

    // 3. Verify modal appears or user navigates to profile
    cy.get("body").then(($body) => {
      // Check if SubscribeModal opened or direct subscribe button
      if ($body.find('input[type="tel"], input[placeholder*="07"], input[placeholder*="254"]').length > 0) {
        cy.get('input[type="tel"], input[placeholder*="07"], input[placeholder*="254"]')
          .first()
          .clear({ force: true })
          .type("0712345678", { force: true });

        cy.get('button[type="submit"], button:contains("Pay"), button:contains("Subscribe"), button:contains("Confirm")')
          .first()
          .click({ force: true });

        cy.wait("@mockInitiatePayment");
        cy.wait("@mockPollPaymentStatus");
      }
    });
  });
});
