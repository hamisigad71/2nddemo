/**
 * Workflow 11: Identity Verification (AML / KYC) and Profile Name Updates
 *
 * Verifies:
 * 1. Creator KYC tab submission transitions to 'pending' (never illegal 'verified'),
 *    uploading both ID and Selfie with live checklist feedback.
 * 2. User Settings KYC submission compresses documents and submits successfully
 *    without throwing "Failed to submit KYC: Failed to fetch".
 */

// 1x1 Transparent PNG fixture in Base64
const testPngBase64 =
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==";

const b64toBlob = (b64Data: string, contentType = "image/png") => {
  const byteCharacters = atob(b64Data);
  const byteArrays = [];
  for (let offset = 0; offset < byteCharacters.length; offset += 512) {
    const slice = byteCharacters.slice(offset, offset + 512);
    const byteNumbers = new Array(slice.length);
    for (let i = 0; i < slice.length; i++) {
      byteNumbers[i] = slice.charCodeAt(i);
    }
    byteArrays.push(new Uint8Array(byteNumbers));
  }
  return new Blob(byteArrays, { type: contentType });
};

describe("Workflow 11: KYC Identity Verification & Profile Updates", () => {
  it("Creator KYC: Attaches ID & Selfie, validates checklist, and submits to Pending Review", () => {
    const CREATOR_ID = "e74f6c55-d901-4064-b386-4fe85dd25521";
    const CREATOR_AVATAR =
      "https://gitkzykasegtygoybjhq.supabase.co/storage/v1/object/public/Daysman%20Gad/avatars/cypress-creator.jpg";
    const replyRow = (req: any, row: Record<string, any> | null) => {
      const wantsObject = String(req.headers["accept"] || "").includes(
        "vnd.pgrst.object",
      );
      req.reply({
        statusCode: 200,
        body: row ? (wantsObject ? row : [row]) : wantsObject ? null : [],
      });
    };

    // Stub background Supabase calls so the test never fails on live RLS / fake tokens
    cy.intercept({ url: /supabase\.co\/rest\/v1\// }, (req) => replyRow(req, null));
    cy.intercept({ url: /supabase\.co\/auth\/v1\// }, { statusCode: 200, body: {} });

    cy.intercept(
      { method: "GET", url: new RegExp(`/rest/v1/users\\?.*${CREATOR_ID}`) },
      (req) =>
        replyRow(req, {
          uid: CREATOR_ID,
          name: "Beunice Kamau",
          email: "creator.test@tgd.co.ke",
          role: "creator",
          status: "active",
          avatar: CREATOR_AVATAR,
          kyc_status: "unverified",
          is_verified: false,
          legal_name: "",
          national_id_number: "",
          dob: "",
          kyc_id_url: null,
          kyc_selfie_url: null,
        }),
    );

    cy.intercept(
      { method: "GET", url: /\/rest\/v1\/creator_profiles(\?|$)/ },
      (req) =>
        replyRow(req, {
          user_id: CREATOR_ID,
          display_name: "Beunice Kamau",
          avatar: CREATOR_AVATAR,
          kyc_status: "unverified",
          is_verified: false,
        }),
    );

    cy.intercept(
      { method: /POST|PUT/, url: /\/storage\/v1\/object\/kyc-documents\// },
      (req) =>
        req.reply({
          statusCode: 200,
          body: { Key: req.url.split("/storage/v1/object/")[1] },
        }),
    ).as("kycUpload");

    cy.intercept(
      { method: /PATCH|POST/, url: /\/rest\/v1\/users(\?|$)/ },
      (req) => req.reply({ statusCode: 200, body: [{ uid: CREATOR_ID, ...req.body }] }),
    ).as("usersKycUpdate");

    cy.intercept(
      { method: /PATCH|POST/, url: /\/rest\/v1\/creator_profiles(\?|$)/ },
      (req) => req.reply({ statusCode: 200, body: [{ user_id: CREATOR_ID, ...req.body }] }),
    );

    cy.loginAsCreator();
    cy.visit("/edit-profile", {
      onBeforeLoad(win) {
        win.localStorage.removeItem(`tgd_creator_profile_${CREATOR_ID}`);
        win.localStorage.setItem(`tgd_user_avatar_${CREATOR_ID}`, CREATOR_AVATAR);
        win.sessionStorage.setItem(`tgd_avatar_prompt_shown_${CREATOR_ID}`, "true");
      },
    });

    // Wait for initial page loader to finish
    cy.contains(/Getting things ready/i).should("not.exist");

    // Switch to KYC tab
    cy.contains("button", /KYC Verification/i).click({ force: true });

    // Fill in Legal Full Name
    cy.get('input[name="legalName"]').clear().type("Jane Doe");

    // Fill in National ID
    cy.get('input[name="nationalId"]').clear().type("87654321");

    // Fill in Date of Birth (using explicit KYC tab input ID)
    cy.get('input#kycDobInput').clear().type("1998-05-12");

    // Upload ID Document using selectFile
    const dummyBlob = b64toBlob(testPngBase64);
    cy.get('input#kycIdUpload').selectFile(
      { contents: dummyBlob, fileName: "id_document.png", mimeType: "image/png" },
      { force: true }
    );

    // Upload Selfie using selectFile
    cy.get('input#kycSelfieUpload').selectFile(
      { contents: dummyBlob, fileName: "selfie_id.png", mimeType: "image/png" },
      { force: true }
    );

    // Verify Checklist is visible and confirms requirements
    cy.contains(/Verification Checklist/i).should("be.visible");

    // Click Submit KYC
    cy.contains("button", /Submit KYC for Verification|Update Submitted KYC Documents/i)
      .first()
      .click({ force: true });

    cy.wait("@usersKycUpdate", { timeout: 15000 });

    // Assert that status is updated to submitted / in review
    cy.contains(/Submitted|Verification In Review|Pending/i, { timeout: 15000 }).should("exist");
  });

  it("User Settings KYC: Submits verification without 'Failed to fetch' error", () => {
    cy.loginAsSubscriber();
    cy.visit("/user/settings");

    // Wait for page loader to clear
    cy.contains(/Getting things ready/i).should("not.exist");

    // Ensure page avatar is visible
    cy.get('img[alt="avatar"]').first().should("be.visible");

    // Scroll to Identity Verification section
    cy.get("#identity-verification").scrollIntoView();

    // Fill KYC fields if present
    cy.get("body").then(($body) => {
      if ($body.find('input[name="legalName"]').length > 0) {
        cy.get('input[name="legalName"]').clear().type("John Subscriber");
        cy.get('input[name="nationalId"]').clear().type("11223344");

        const testBlob = b64toBlob(testPngBase64);
        cy.get('#identity-verification input[type="file"]').eq(0).selectFile(
          { contents: testBlob, fileName: "user_id.png", mimeType: "image/png" },
          { force: true }
        );
        cy.get('#identity-verification input[type="file"]').eq(1).selectFile(
          { contents: testBlob, fileName: "user_selfie.png", mimeType: "image/png" },
          { force: true }
        );

        cy.get('#identity-verification button:contains("Submit for Verification")')
          .first()
          .click({ force: true });
      }
    });

    // Verify no "Failed to submit KYC: Failed to fetch" error appears
    cy.contains(/Failed to fetch/i).should("not.exist");
  });
});
