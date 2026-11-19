/**
 * Workflow 11: End-to-End Creator KYC + M-Pesa Withdrawal → Admin Verification
 *
 * Verifies every critical handoff from Creator to Admin without hitting live Supabase:
 *   1. Unverified creator with KES 1,050 balance is strictly blocked from withdrawing
 *      and sees the identity verification prompt (zero payout requests sent).
 *   2. Creator uploads National ID + Verification Selfie + Legal Name + ID Number + DOB
 *      on /edit-profile?tab=kyc and submits KYC -> verifies exact payloads sent to:
 *        - Supabase storage (kyc-documents/<uid>/...-id.* & ...-selfie.*)
 *        - public.users (legal_name, national_id_number, dob, kyc_id_url, kyc_selfie_url, kyc_status='pending')
 *        - public.creator_profiles (synced KYC fields)
 *        - public.notifications (Admin KYC review alert with username, National ID & /admin/users?view=kyc)
 *   3. Creator with KYC status='pending' (awaiting Admin approval) is STILL blocked
 *      from withdrawing and sees the "Verification pending approval" modal.
 *   4. Verified creator withdraws KES 1,050 via M-Pesa:
 *        - Mismatched confirmation phone number is blocked (typo guard)
 *        - Valid Kenyan phone (0742 351 312) + matching confirmation normalizes to +254742351312
 *        - POST /rest/v1/transactions receives exact payout payload with reference_id "M-Pesa | +254742351312"
 *        - POST /rest/v1/notifications alerts Admin with creator name, legal name, KES 1,050 & +254742351312
 *        - Creator sees the "Processing Payment / Withdrawal Request Received" 48-hour confirmation screen
 *   5. Admin visits /admin/payouts and sees the exact payout request:
 *        - Creator name, Legal ID Name, normalized M-Pesa number (+254742351312), KES 1,050, pending status
 */

const CREATOR_ID = "e74f6c55-d901-4064-b386-4fe85dd25521"; // matches cy.loginAsCreator()
const ADMIN_ID = "00000000-0000-0000-0000-000000000001"; // matches cy.loginAsAdmin()
const CREATOR_NAME = "Beunice Kamau";
const CREATOR_EMAIL = "creator.test@tgd.co.ke";
const CREATOR_AVATAR =
  "https://gitkzykasegtygoybjhq.supabase.co/storage/v1/object/public/Daysman%20Gad/avatars/cypress-creator.jpg";
const CREATOR_COVER =
  "https://gitkzykasegtygoybjhq.supabase.co/storage/v1/object/public/Daysman%20Gad/covers/cypress-cover.jpg";
const LEGAL_NAME = "Kikonde Brenda Wali";
const NATIONAL_ID = "806324728";
const DOB = "2005-12-19";
const RAW_MPESA_INPUT = "0742 351 312";
const EXPECTED_MPESA_PHONE = "+254742351312";

// Minimal valid 1x1 PNG buffer for realistic ID & Selfie file uploads
const TINY_PNG_BASE64 =
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==";

const replyRow = (req: any, row: Record<string, any> | null) => {
  const wantsObject = String(req.headers["accept"] || "").includes(
    "vnd.pgrst.object",
  );
  if (!row) {
    req.reply({ statusCode: 200, body: wantsObject ? null : [] });
    return;
  }
  req.reply({ statusCode: 200, body: wantsObject ? row : [row] });
};

const EARNING_TRANSACTIONS = [
  {
    id: "tx-sub-1",
    type: "subscription",
    from_user_id: "fan-001",
    to_creator_id: CREATOR_ID,
    gross_amount: 1000,
    platform_fee: 300,
    net_amount: 700,
    status: "completed",
    created_at: "2026-11-09T23:05:21.000Z",
    reference_id: "SUB-TEST-1",
  },
  {
    id: "tx-ppv-1",
    type: "ppv",
    from_user_id: "fan-002",
    to_creator_id: CREATOR_ID,
    gross_amount: 500,
    platform_fee: 150,
    net_amount: 350,
    status: "completed",
    created_at: "2026-10-25T12:46:15.000Z",
    reference_id: "PPV-TEST-1",
  },
];

/**
 * Catch-all stub for all background Supabase traffic (heartbeat, notifications,
 * auth refresh, audit logs, creator_profiles) so tests never hang on live network
 * or receive 401s from fake Cypress tokens. Specific intercepts registered AFTER
 * this take precedence in Cypress.
 */
const stubSupabaseDefaults = () => {
  cy.intercept({ url: /supabase\.co\/rest\/v1\// }, (req) => {
    const wantsObject = String(req.headers["accept"] || "").includes(
      "vnd.pgrst.object",
    );
    req.reply({ statusCode: 200, body: wantsObject ? null : [] });
  });

  cy.intercept({ url: /supabase\.co\/auth\/v1\// }, (req) => {
    req.reply({ statusCode: 200, body: {} });
  });
};

const seedCreatorSessionOnWindow = (win: Window) => {
  win.localStorage.removeItem("tgd_all_transactions");
  win.localStorage.removeItem(`tgd_creator_profile_${CREATOR_ID}`);
  win.localStorage.setItem(`tgd_user_avatar_${CREATOR_ID}`, CREATOR_AVATAR);
  win.sessionStorage.setItem(`tgd_avatar_prompt_shown_${CREATOR_ID}`, "true");
};

const baseCreatorUser = (overrides: Record<string, any> = {}) => ({
  uid: CREATOR_ID,
  name: CREATOR_NAME,
  email: CREATOR_EMAIL,
  role: "creator",
  status: "active",
  avatar: CREATOR_AVATAR,
  avatar_url: CREATOR_AVATAR,
  cover_image: CREATOR_COVER,
  phone: "",
  kyc_status: "unverified",
  is_verified: false,
  kyc_id_url: null,
  kyc_selfie_url: null,
  legal_name: "",
  national_id_number: "",
  dob: "",
  ...overrides,
});

const baseCreatorProfile = (overrides: Record<string, any> = {}) => ({
  user_id: CREATOR_ID,
  display_name: CREATOR_NAME,
  avatar: CREATOR_AVATAR,
  avatar_url: CREATOR_AVATAR,
  cover_image: CREATOR_COVER,
  kyc_status: "unverified",
  is_verified: false,
  ...overrides,
});

describe("Workflow 11: Creator KYC + M-Pesa Withdrawal Data Sent to Admin", () => {
  it("Step 1: Strictly blocks an unverified creator from withdrawing even with KES 1,050 available", () => {
    const payoutInserts: any[] = [];
    stubSupabaseDefaults();

    cy.intercept(
      { method: "GET", url: new RegExp(`/rest/v1/users\\?.*${CREATOR_ID}`) },
      (req) => replyRow(req, baseCreatorUser()),
    ).as("getUnverifiedUser");

    cy.intercept(
      { method: "GET", url: new RegExp(`/rest/v1/creator_profiles\\?.*${CREATOR_ID}`) },
      (req) => replyRow(req, baseCreatorProfile()),
    );

    cy.intercept(
      { method: "GET", url: /\/rest\/v1\/transactions(\?|$)/ },
      { statusCode: 200, body: EARNING_TRANSACTIONS },
    ).as("getWalletTransactions");

    cy.intercept(
      { method: "POST", url: /\/rest\/v1\/transactions(\?|$)/ },
      (req) => {
        payoutInserts.push(req.body);
        req.reply({ statusCode: 201, body: req.body });
      },
    ).as("postPayout");

    cy.loginAsCreator();
    cy.visit("/wallet", { onBeforeLoad: seedCreatorSessionOnWindow });
    cy.contains(/Getting things ready/i).should("not.exist");
    cy.wait("@getWalletTransactions", { timeout: 15000 });

    // Balance shows KES 1,050 (700 + 350)
    cy.contains("1,050", { timeout: 15000 }).should("be.visible");

    // Verification required callout is visible
    cy.contains(/Identity verification required to cash out/i).should("be.visible");

    // Clicking Withdraw opens the KYC block dialog, NOT the withdrawal form
    cy.contains("button", /Withdraw to M-Pesa/i).click();
    cy.get('[role="dialog"]').should("be.visible");
    cy.contains(/Identity verification required/i).should("be.visible");
    cy.contains(/Request M-Pesa Withdrawal/i).should("not.exist");

    // Confirm zero payout transactions were sent
    cy.wrap(null).should(() => {
      expect(payoutInserts.length).to.eq(0);
    });
  });

  it("Step 2: Creator uploads ID, Selfie & legal details -> exact KYC payload and Admin notification are sent", () => {
    const storageUploads: string[] = [];
    const usersUpdates: any[] = [];
    const profileUpserts: any[] = [];
    const adminNotifications: any[] = [];
    stubSupabaseDefaults();

    cy.intercept(
      { method: "GET", url: new RegExp(`/rest/v1/users\\?.*${CREATOR_ID}`) },
      (req) => replyRow(req, baseCreatorUser()),
    );

    // Admin lookup used by notifyAdmins()
    cy.intercept(
      { method: "GET", url: /\/rest\/v1\/users\?.*role=eq\.admin/ },
      { statusCode: 200, body: [{ uid: ADMIN_ID }] },
    ).as("getAdmins");

    cy.intercept(
      { method: "GET", url: /\/rest\/v1\/creator_profiles(\?|$)/ },
      (req) => replyRow(req, baseCreatorProfile()),
    );

    // Storage uploads for National ID & Verification Selfie
    cy.intercept(
      { method: /POST|PUT/, url: /\/storage\/v1\/object\/kyc-documents\// },
      (req) => {
        storageUploads.push(req.url);
        req.reply({
          statusCode: 200,
          body: { Key: req.url.split("/storage/v1/object/")[1] },
        });
      },
    ).as("kycStorageUpload");

    // Capture writes to public.users
    cy.intercept(
      { method: /PATCH|POST/, url: /\/rest\/v1\/users(\?|$)/ },
      (req) => {
        usersUpdates.push(req.body);
        req.reply({ statusCode: 200, body: [{ uid: CREATOR_ID, ...req.body }] });
      },
    ).as("usersKycUpdate");

    // Capture writes to creator_profiles
    cy.intercept(
      { method: /PATCH|POST/, url: /\/rest\/v1\/creator_profiles(\?|$)/ },
      (req) => {
        profileUpserts.push(req.body);
        req.reply({
          statusCode: 200,
          body: [{ user_id: CREATOR_ID, ...req.body }],
        });
      },
    ).as("creatorProfileKycUpdate");

    // Capture Admin KYC submission notification
    cy.intercept(
      { method: "POST", url: /\/rest\/v1\/notifications(\?|$)/ },
      (req) => {
        const rows = Array.isArray(req.body) ? req.body : [req.body];
        adminNotifications.push(...rows);
        req.reply({ statusCode: 201, body: rows });
      },
    ).as("postNotification");

    cy.loginAsCreator();
    cy.visit("/edit-profile?tab=kyc", { onBeforeLoad: seedCreatorSessionOnWindow });
    cy.contains(/Getting things ready/i).should("not.exist");

    // Fill Legal Full Name, National ID, and Date of Birth
    cy.get('input[name="legalName"]', { timeout: 15000 })
      .should("be.visible")
      .clear()
      .type(LEGAL_NAME);
    cy.get('input[name="nationalId"]').clear().type(NATIONAL_ID);
    cy.get("input#kycDobInput").clear().type(DOB);

    // Attach National ID document & Verification Selfie with ID
    const pngBuffer = Cypress.Buffer.from(TINY_PNG_BASE64, "base64");
    cy.get("input#kycIdUpload").selectFile(
      {
        contents: pngBuffer,
        fileName: "national-id.png",
        mimeType: "image/png",
      },
      { force: true },
    );

    cy.get("input#kycSelfieUpload").selectFile(
      {
        contents: pngBuffer,
        fileName: "verification-selfie.png",
        mimeType: "image/png",
      },
      { force: true },
    );

    // Submit KYC for Verification
    cy.contains("button", /Submit KYC for Verification|Update Submitted KYC Documents/i)
      .should("be.visible")
      .click({ force: true });

    // Verify storage uploads, users update, creator_profiles update, and Admin notification
    cy.wait("@usersKycUpdate", { timeout: 20000 });
    cy.wait("@postNotification", { timeout: 20000 });

    cy.wrap(null, { timeout: 15000 }).should(() => {
      // 1. Both National ID and Selfie uploaded to private kyc-documents bucket under creator UID
      expect(
        storageUploads.some((u) => u.includes(`${CREATOR_ID}/`) && u.includes("-id.")),
        "National ID uploaded to kyc-documents/<uid>/...-id.*",
      ).to.eq(true);
      expect(
        storageUploads.some((u) => u.includes(`${CREATOR_ID}/`) && u.includes("-selfie.")),
        "Verification selfie uploaded to kyc-documents/<uid>/...-selfie.*",
      ).to.eq(true);

      // 2. public.users received exact KYC details and file paths
      const kycUserWrite = usersUpdates.find(
        (b) => b && b.national_id_number === NATIONAL_ID,
      );
      expect(kycUserWrite, "public.users KYC update payload").to.exist;
      expect(kycUserWrite.legal_name).to.eq(LEGAL_NAME);
      expect(kycUserWrite.dob).to.eq(DOB);
      expect(kycUserWrite.kyc_status).to.eq("pending");
      expect(String(kycUserWrite.kyc_id_url)).to.include(`${CREATOR_ID}/`);
      expect(String(kycUserWrite.kyc_selfie_url)).to.include(`${CREATOR_ID}/`);

      // 3. creator_profiles synced the same KYC details
      const kycProfileWrite = profileUpserts.find(
        (b) => b && b.national_id_number === NATIONAL_ID,
      );
      expect(kycProfileWrite, "creator_profiles KYC sync payload").to.exist;
      expect(kycProfileWrite.legal_name).to.eq(LEGAL_NAME);

      // 4. Admin received KYC review notification with ID number & /admin/users?view=kyc link
      const adminAlert = adminNotifications.find(
        (n) =>
          n &&
          n.user_id === ADMIN_ID &&
          String(n.message || "").includes(NATIONAL_ID),
      );
      expect(adminAlert, "Admin KYC notification received").to.exist;
      expect(adminAlert.link || adminAlert.action_url).to.include("/admin/users?view=kyc");
    });
  });

  it("Step 3: Keeps creator blocked while KYC is 'pending' (awaiting Admin approval)", () => {
    stubSupabaseDefaults();

    cy.intercept(
      { method: "GET", url: new RegExp(`/rest/v1/users\\?.*${CREATOR_ID}`) },
      (req) =>
        replyRow(
          req,
          baseCreatorUser({
            legal_name: LEGAL_NAME,
            kyc_status: "pending",
            is_verified: false,
            kyc_id_url: `${CREATOR_ID}/123-id.png`,
            kyc_selfie_url: `${CREATOR_ID}/123-selfie.png`,
          }),
        ),
    );

    cy.intercept(
      { method: "GET", url: new RegExp(`/rest/v1/creator_profiles\\?.*${CREATOR_ID}`) },
      (req) => replyRow(req, baseCreatorProfile({ kyc_status: "pending" })),
    );

    cy.intercept(
      { method: "GET", url: /\/rest\/v1\/transactions(\?|$)/ },
      { statusCode: 200, body: EARNING_TRANSACTIONS },
    ).as("getWalletTransactions");

    cy.loginAsCreator();
    cy.visit("/wallet", { onBeforeLoad: seedCreatorSessionOnWindow });
    cy.contains(/Getting things ready/i).should("not.exist");
    cy.wait("@getWalletTransactions", { timeout: 15000 });
    cy.contains("1,050", { timeout: 15000 }).should("be.visible");
    cy.contains(/Identity verification pending review/i, { timeout: 15000 }).should("be.visible");

    cy.contains("button", /Withdraw to M-Pesa/i)
      .should("not.be.disabled")
      .click();
    cy.get('[role="dialog"]').should("be.visible");
    cy.contains(/Verification pending approval/i).should("be.visible");
    cy.contains(/Request M-Pesa Withdrawal/i).should("not.exist");
  });

  it("Step 4: Verified creator withdraws -> enforces M-Pesa double-check, sends exact data to Admin & shows 48hr processing screen", () => {
    const payoutInserts: any[] = [];
    const notificationsSent: any[] = [];
    stubSupabaseDefaults();

    cy.intercept(
      { method: "GET", url: new RegExp(`/rest/v1/users\\?.*${CREATOR_ID}`) },
      (req) =>
        replyRow(
          req,
          baseCreatorUser({
            legal_name: LEGAL_NAME,
            kyc_status: "verified",
            is_verified: true,
            kyc_id_url: `${CREATOR_ID}/123-id.png`,
            kyc_selfie_url: `${CREATOR_ID}/123-selfie.png`,
          }),
        ),
    );

    cy.intercept(
      { method: "GET", url: new RegExp(`/rest/v1/creator_profiles\\?.*${CREATOR_ID}`) },
      (req) =>
        replyRow(
          req,
          baseCreatorProfile({ kyc_status: "verified", is_verified: true }),
        ),
    );

    cy.intercept(
      { method: "GET", url: /\/rest\/v1\/users\?.*role=eq\.admin/ },
      { statusCode: 200, body: [{ uid: ADMIN_ID }] },
    );

    cy.intercept(
      { method: "PATCH", url: /\/rest\/v1\/users(\?|$)/ },
      (req) => req.reply({ statusCode: 200, body: [{ uid: CREATOR_ID, ...req.body }] }),
    );

    cy.intercept(
      { method: "GET", url: /\/rest\/v1\/transactions(\?|$)/ },
      { statusCode: 200, body: EARNING_TRANSACTIONS },
    ).as("getWalletTransactions");

    cy.intercept(
      { method: "POST", url: /\/rest\/v1\/transactions(\?|$)/ },
      (req) => {
        payoutInserts.push(req.body);
        const created = {
          id: "payout-cypress-001",
          created_at: new Date().toISOString(),
          ...req.body,
        };
        replyRow(req, created);
      },
    ).as("createPayoutTx");

    cy.intercept(
      { method: "POST", url: /\/rest\/v1\/notifications(\?|$)/ },
      (req) => {
        const rows = Array.isArray(req.body) ? req.body : [req.body];
        notificationsSent.push(...rows);
        req.reply({ statusCode: 201, body: rows });
      },
    ).as("createPayoutNotif");

    cy.loginAsCreator();
    cy.visit("/wallet", { onBeforeLoad: seedCreatorSessionOnWindow });
    cy.contains(/Getting things ready/i).should("not.exist");
    cy.wait("@getWalletTransactions", { timeout: 15000 });
    cy.contains("1,050", { timeout: 15000 }).should("be.visible");

    cy.contains("button", /Withdraw to M-Pesa/i, { timeout: 15000 })
      .should("not.be.disabled")
      .click();
    cy.contains(/Request M-Pesa Withdrawal/i, { timeout: 15000 }).should("be.visible");

    // 1. Test typo protection: enter mismatched confirmation number -> must NOT submit
    cy.get('input[placeholder*="0712 345 678"]').clear().type(RAW_MPESA_INPUT);
    cy.contains(`Formatted M-Pesa number: ${EXPECTED_MPESA_PHONE}`).should("be.visible");

    cy.get('input[placeholder*="Re-enter your M-Pesa number"]')
      .scrollIntoView()
      .clear()
      .type("0742351313"); // 1 digit off
    cy.contains(/Numbers do not match/i).should("be.visible");
    cy.contains("button", /Submit Request/i).scrollIntoView().click();

    cy.wrap(null).should(() => {
      expect(payoutInserts.length, "Mismatched phone blocked submission").to.eq(0);
    });

    // 2. Enter matching M-Pesa confirmation number -> submit succeeds
    cy.get('input[placeholder*="Re-enter your M-Pesa number"]')
      .scrollIntoView()
      .clear()
      .type("0742351312");
    cy.contains(/M-Pesa numbers match/i).should("be.visible");
    cy.contains("button", /Submit Request/i).scrollIntoView().click();

    cy.wait("@createPayoutTx", { timeout: 15000 });
    cy.wait("@createPayoutNotif", { timeout: 15000 });

    // 3. Creator sees the professional 48-hour Processing Payment screen
    cy.contains(/Processing Payment/i, { timeout: 15000 }).should("be.visible");
    cy.contains(/Withdrawal Request Received/i).should("be.visible");
    cy.contains(/48 hours/i).should("be.visible");
    cy.contains("KES 1,050").should("be.visible");
    cy.contains(EXPECTED_MPESA_PHONE).should("be.visible");

    // 4. Assert exact data sent to database and Admin notification
    cy.wrap(null, { timeout: 15000 }).should(() => {
      expect(payoutInserts.length).to.eq(1);
      expect(payoutInserts[0].type).to.eq("payout");
      expect(payoutInserts[0].to_creator_id).to.eq(CREATOR_ID);
      expect(payoutInserts[0].gross_amount).to.eq(1050);
      expect(payoutInserts[0].net_amount).to.eq(1050);
      expect(payoutInserts[0].status).to.eq("pending");
      expect(payoutInserts[0].reference_id).to.eq(`M-Pesa | ${EXPECTED_MPESA_PHONE}`);

      const adminNotif = notificationsSent.find(
        (n) => n && n.user_id === ADMIN_ID,
      );
      expect(adminNotif, "Admin received payout notification").to.exist;
      expect(adminNotif.message).to.include(CREATOR_NAME);
      expect(adminNotif.message).to.include(LEGAL_NAME);
      expect(adminNotif.message).to.include("1,050");
      expect(adminNotif.message).to.include(EXPECTED_MPESA_PHONE);
      expect(adminNotif.link).to.eq("/admin/payouts");
    });
  });

  it("Step 5: Admin sees the exact creator payout details (Legal ID Name, +254 M-Pesa number & KES 1,050) on /admin/payouts", () => {
    stubSupabaseDefaults();

    const payoutRow = {
      id: "payout-cypress-001",
      type: "payout",
      from_user_id: CREATOR_ID,
      to_creator_id: CREATOR_ID,
      gross_amount: 1050,
      platform_fee: 0,
      net_amount: 1050,
      status: "pending",
      reference_id: `M-Pesa | ${EXPECTED_MPESA_PHONE}`,
      created_at: new Date().toISOString(),
    };

    cy.intercept(
      { method: "GET", url: /\/rest\/v1\/transactions(\?|$)/ },
      { statusCode: 200, body: [payoutRow] },
    ).as("getAdminPayoutTxs");

    cy.intercept(
      { method: "GET", url: /\/rest\/v1\/users(\?|$)/ },
      (req) => {
        if (req.url.includes(ADMIN_ID)) {
          replyRow(req, {
            uid: ADMIN_ID,
            name: "Head Administrator",
            email: "admin.test@tgd.co.ke",
            role: "admin",
            status: "active",
          });
          return;
        }
        req.reply({
          statusCode: 200,
          body: [
            {
              uid: CREATOR_ID,
              name: CREATOR_NAME,
              legal_name: LEGAL_NAME,
              email: CREATOR_EMAIL,
              phone: EXPECTED_MPESA_PHONE,
              avatar: CREATOR_AVATAR,
            },
          ],
        });
      },
    ).as("getPayoutUsers");

    cy.intercept(
      { method: "GET", url: /\/rest\/v1\/creator_profiles(\?|$)/ },
      {
        statusCode: 200,
        body: [
          {
            user_id: CREATOR_ID,
            display_name: CREATOR_NAME,
            legal_name: LEGAL_NAME,
            avatar_url: CREATOR_AVATAR,
          },
        ],
      },
    );

    cy.loginAsAdmin();
    cy.visit("/admin/payouts", {
      onBeforeLoad(win) {
        win.localStorage.removeItem("tgd_all_transactions");
      },
    });
    cy.wait("@getAdminPayoutTxs", { timeout: 15000 });
    cy.contains(/Payout Management/i, { timeout: 15000 }).should("be.visible");

    // Verify Admin table renders the exact creator name, KYC legal name, M-Pesa number, and amount
    cy.contains(CREATOR_NAME).should("be.visible");
    cy.contains(`ID Name: ${LEGAL_NAME}`).should("be.visible");
    cy.contains(EXPECTED_MPESA_PHONE).should("be.visible");
    cy.contains("KES 1,050").should("be.visible");
    cy.contains("button", /Mark Paid/i).should("be.visible");
  });
});
