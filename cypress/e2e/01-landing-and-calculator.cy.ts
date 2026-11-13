describe("Workflow 1: Landing Page & Income Calculator", () => {
  beforeEach(() => {
    cy.visit("/");
  });

  it("renders brand hero, value proposition, and CTA buttons", () => {
    cy.contains("Your Content. Your Fans.").should("exist");
    cy.contains("Your Money.").should("exist");
    cy.contains("Start Earning").should("exist");
    cy.contains("Explore Creators").should("exist");
  });

  it("calculates potential income interactively via follower slider", () => {
    cy.get('input[type="range"]')
      .first()
      .then(($el) => {
        const nativeInputValueSetter = Object.getOwnPropertyDescriptor(
          window.HTMLInputElement.prototype,
          "value"
        )?.set;
        nativeInputValueSetter?.call($el[0], "50000");
        $el[0].dispatchEvent(new Event("input", { bubbles: true }));
        $el[0].dispatchEvent(new Event("change", { bubbles: true }));
      });

    // 50,000 * 5% * 500 = KES 1,250,000
    cy.contains("1,250,000").should("exist");
    cy.contains("KES 500").should("exist");
  });
});
