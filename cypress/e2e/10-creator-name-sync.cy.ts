/**
 * Workflow 10: Creator display-name change must reach OTHER users.
 *
 * Covers the two bugs behind "name changes on my page but others see the old name":
 *   A. The creator's save must write the new name to BOTH public.users.name and
 *      creator_profiles.display_name (what every other user reads).
 *   B. A viewer's browser must show the DATABASE name, not a stale cached copy in
 *      localStorage (getCreatorProfile used to prefer the local cache).
 *
 * Supabase REST calls are intercepted, so these tests check exactly what the app
 * sends to / reads from the database instead of trusting localStorage.
 */

const CREATOR_ID = "e74f6c55-d901-4064-b386-4fe85dd25521"; // matches cy.loginAsCreator()
const OLD_NAME = "Old Stale Name";
const NEW_NAME = `Renamed Creator ${Date.now().toString().slice(-5)}`;

// Reply in the shape supabase-js expects: object for .single()/.maybeSingle(), array otherwise
const replyRow = (req: any, row: Record<string, any>) => {
  const wantsObject = String(req.headers["accept"] || "").includes("vnd.pgrst.object");
  req.reply({ statusCode: 200, body: wantsObject ? row : [row] });
};

describe("Workflow 10: Creator name change propagates to all users", () => {
  it("Creator: saving a new display name writes it to users AND creator_profiles", () => {
    const usersWrites: any[] = [];
    const profileWrites: any[] = [];

    // Capture every write to the two tables other users read the name from
    cy.intercept({ method: /PATCH|POST/, url: /\/rest\/v1\/users(\?|$)/ }, (req) => {
      usersWrites.push(req.body);
      req.reply({ statusCode: 200, body: [{ uid: CREATOR_ID }] });
    }).as("usersWrite");
    cy.intercept({ method: /PATCH|POST/, url: /\/rest\/v1\/creator_profiles(\?|$)/ }, (req) => {
      profileWrites.push(req.body);
      req.reply({ statusCode: 200, body: [{ user_id: CREATOR_ID }] });
    }).as("profileWrite");

    cy.loginAsCreator();
    cy.visit("/edit-profile");

    // Wait for initial page loader to finish
    cy.contains(/Getting things ready/i).should("not.exist");

    // Close Avatar Prompt Modal if it pops up
    cy.get("body").then(($body) => {
      if ($body.find('button[aria-label="Close"], button:has(svg.lucide-x)').length > 0) {
        cy.get('button[aria-label="Close"], button:has(svg.lucide-x)').first().click({ force: true });
      }
    });

    cy.contains("label", /Display Name/i, { timeout: 20000 })
      .parent()
      .find("input")
      .should("be.visible")
      .clear()
      .type(NEW_NAME);

    cy.contains("button", /Save Changes/i).first().click({ force: true });

    cy.wait("@usersWrite", { timeout: 20000 });
    cy.wait("@profileWrite", { timeout: 20000 });

    cy.wrap(null, { timeout: 20000 }).should(() => {
      const usersGotName = usersWrites.some((b) => b && b.name === NEW_NAME);
      const profileGotName = profileWrites.some((b) => b && b.display_name === NEW_NAME);
      expect(usersGotName, "public.users.name was sent the new name").to.eq(true);
      expect(profileGotName, "creator_profiles.display_name was sent the new name").to.eq(true);
    });
  });

  it("Viewer: sees the DATABASE name even when their browser has a stale cached copy", () => {
    // Database (what the creator just saved) returns the NEW name
    cy.intercept({ method: "GET", url: new RegExp(`/rest/v1/users\\?.*${CREATOR_ID}`) }, (req) =>
      replyRow(req, {
        uid: CREATOR_ID,
        name: NEW_NAME,
        role: "creator",
        status: "active",
        avatar: null,
      }),
    ).as("creatorUserRow");
    cy.intercept(
      { method: "GET", url: new RegExp(`/rest/v1/creator_profiles\\?.*${CREATOR_ID}`) },
      (req) => replyRow(req, { user_id: CREATOR_ID, display_name: NEW_NAME }),
    ).as("creatorProfileRow");

    cy.loginAsSubscriber();

    // Simulate the viewer's phone holding an OLD cached copy of this creator
    cy.window().then((win) => {
      win.localStorage.setItem(
        `tgd_creator_profile_${CREATOR_ID}`,
        JSON.stringify({ user_id: CREATOR_ID, name: OLD_NAME, display_name: OLD_NAME }),
      );
    });

    cy.visit(`/creator/${CREATOR_ID}`);
    cy.contains(/Getting things ready/i).should("not.exist");

    cy.contains(NEW_NAME, { timeout: 20000 }).should("be.visible");
    cy.contains(OLD_NAME).should("not.exist");
  });

  it("Creator: reloads Edit Profile and verifies the updated name persists and does not revert to old name", () => {
    // Intercept profile fetch so EditProfile loads the newly updated name
    cy.intercept({ method: "GET", url: new RegExp(`/rest/v1/users\\?.*${CREATOR_ID}`) }, (req) =>
      replyRow(req, {
        uid: CREATOR_ID,
        name: NEW_NAME,
        role: "creator",
        status: "active",
      })
    ).as("getUpdatedUser");

    cy.intercept({ method: "GET", url: new RegExp(`/rest/v1/creator_profiles\\?.*${CREATOR_ID}`) }, (req) =>
      replyRow(req, {
        user_id: CREATOR_ID,
        display_name: NEW_NAME,
      })
    ).as("getUpdatedCreatorProfile");

    cy.loginAsCreator();
    cy.visit("/edit-profile");

    // Wait for initial page loader to finish
    cy.contains(/Getting things ready/i).should("not.exist");

    // Close Avatar Prompt Modal if it pops up
    cy.get("body").then(($body) => {
      if ($body.find('button[aria-label="Close"], button:has(svg.lucide-x)').length > 0) {
        cy.get('button[aria-label="Close"], button:has(svg.lucide-x)').first().click({ force: true });
      }
    });

    cy.contains("label", /Display Name/i, { timeout: 20000 })
      .parent()
      .find("input")
      .should("have.value", NEW_NAME);

    // Simulate page reload
    cy.reload();
    cy.contains(/Getting things ready/i).should("not.exist");

    // Verify after reload it still has the new name and never reverted
    cy.contains("label", /Display Name/i, { timeout: 20000 })
      .parent()
      .find("input")
      .should("have.value", NEW_NAME);
  });
});
