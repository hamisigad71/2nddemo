describe("Workflow 6: Admin Dashboard & Ground-Truth Ledger", () => {
  it("renders live stats without client hallucinations or undefined values", () => {
    cy.loginAsAdmin();
    cy.visit("/admin");

    cy.contains(/Overview|Total Platform Revenue|Subscribers/i).should("exist");

    // Assert no undefined/NaN leaks
    cy.get("body").should("not.contain", "NaN");
    cy.get("body").should("not.contain", "undefined");
  });
});
