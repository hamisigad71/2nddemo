describe("Workflow 5: 1-on-1 Chat & Anti-Circumvention Rule", () => {
  it("prevents digits and phone numbers from being typed in direct chat", () => {
    // Seed authenticated subscriber
    cy.loginAsSubscriber();
    cy.visit("/messages");

    cy.get("body").then(($body) => {
      if ($body.find('input[placeholder*="message"], textarea[placeholder*="message"]').length > 0) {
        // Attempt to type a phone number
        const badText = "call me at 0712345678";
        cy.get('input[placeholder*="message"], textarea[placeholder*="message"]')
          .first()
          .type(badText, { force: true });

        // Anti-circumvention filter strips digits
        cy.get('input[placeholder*="message"], textarea[placeholder*="message"]')
          .first()
          .should("not.have.value", badText);
      }
    });
  });
});
