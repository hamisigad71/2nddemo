describe("Workflow 4: Escort Booking Escrow Flow & Step 1 Bypass", () => {
  beforeEach(() => {
    cy.visit("/escorts");
  });

  it("loads escorts list and tests contact unlock modal with mock payment", () => {
    cy.url().should("include", "/escorts");
    cy.mockPaymentSuccess("CYPRESS-ESCROW-STEP1-TX");

    cy.get("body").then(($body) => {
      if ($body.find('button:contains("Book"), button:contains("Chat"), button:contains("Contact")').length > 0) {
        cy.contains(/Book|Chat|Contact/i).first().click({ force: true });

        // Booking modal appears
        cy.contains(/STEP 1|UNLOCK DIRECT CONTACT/i).should("exist");

        // Fill test phone number if input is present
        cy.get('input[type="tel"], input[placeholder*="07"]').then(($inputs) => {
          if ($inputs.length > 0) {
            cy.wrap($inputs.first()).clear().type("0742630973", { force: true });
            cy.contains(/Pay KES|Unlock/i).first().click({ force: true });

            cy.wait("@mockInitiatePayment");
            cy.wait("@mockPollPaymentStatus");
          }
        });
      }
    });
  });
});
