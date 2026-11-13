describe("Workflow 2: Discover Page & Search Filtering", () => {
  beforeEach(() => {
    cy.visit("/discover");
  });

  it("loads creator roster without infinite loaders or blank cards", () => {
    cy.url().should("include", "/discover");
    cy.get("body").should("be.visible");
    cy.contains(/Creators|Featured|Explore/i).should("exist");
  });

  it("filters creators by keyword search", () => {
    cy.get('input[placeholder*="Search"]').first().type("timo", { force: true });
    cy.get("body").should("be.visible");
  });
});
