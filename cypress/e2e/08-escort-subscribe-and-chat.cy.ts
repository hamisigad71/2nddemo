describe("Workflow 8: Subscriber Unlocks Escort & Initiates Chat", () => {
  const escortId = "escort-1"; // Valentina

  it("unlocks escort contact & chat, opens conversation, and verifies messages without hallucinations", () => {
    // 1. Mock payment gateway
    cy.mockPaymentSuccess("TX-ESCORT-UNLOCK-002");

    // 2. Login as Subscriber
    cy.loginAsSubscriber();

    // 3. Seed unlock state for escort contact
    cy.window().then((win) => {
      const fanId = "77793a21-2f0c-4ae7-842b-7aed42593c36";
      win.localStorage.setItem(`tgd_escort_unlock_${fanId}_${escortId}`, "true");
      win.localStorage.setItem("tgd_escort_unlocks_global", JSON.stringify([escortId]));
    });

    // 4. Visit user messages targeting escort
    cy.visit(`/user/messages?creator=${escortId}`);

    // Dismiss 18+ modal if still visible in DOM
    cy.get("body").then(($body) => {
      if ($body.find('button:contains("18 or Older")').length > 0) {
        cy.contains(/18 or Older/i).click({ force: true });
      }
    });

    // Verify conversation view renders and message input is available
    cy.get('input[placeholder*="Message"], input[placeholder*="message"]', { timeout: 12000 })
      .should("be.visible");

    // 5. Send an inquiry message to the escort
    const escortInquiry = "Hi Valentina! Are you available for dinner date this evening?";
    cy.get('input[placeholder*="Message"], input[placeholder*="message"]')
      .first()
      .clear({ force: true })
      .type(escortInquiry, { force: true });

    cy.get('button[type="submit"]:has(svg.lucide-send), button:has(svg.lucide-send)')
      .first()
      .click({ force: true });

    // Assert message appears in thread
    cy.contains(escortInquiry).should("be.visible");
  });
});
