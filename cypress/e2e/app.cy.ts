describe("Platform Landing & Navigation", () => {
  it("loads the landing page successfully", () => {
    cy.visit("/");
    cy.contains("Your Content. Your Fans. Your Money.").should("exist");
  });

  it("navigates to discover page", () => {
    cy.visit("/discover");
    cy.url().should("include", "/discover");
  });
});
