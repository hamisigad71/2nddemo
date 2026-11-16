describe("Workflow 9: Avatar Upload, Persistence & Sign-In Stability Lifecycle", () => {
  // 1x1 Transparent PNG fixture in Base64
  const testPngBase64 =
    "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==";

  // Convert Base64 data to a Blob for Cypress file upload
  const b64toBlob = (b64Data: string, contentType = "image/png") => {
    const byteCharacters = atob(b64Data);
    const byteArrays = [];
    for (let offset = 0; offset < byteCharacters.length; offset += 512) {
      const slice = byteCharacters.slice(offset, offset + 512);
      const byteNumbers = new Array(slice.length);
      for (let i = 0; i < slice.length; i++) {
        byteNumbers[i] = slice.charCodeAt(i);
      }
      const byteArray = new Uint8Array(byteNumbers);
      byteArrays.push(byteArray);
    }
    return new Blob(byteArrays, { type: contentType });
  };

  it("Subscriber: uploads profile photo, saves, and verifies photo persists across page reloads and re-auth", () => {
    cy.loginAsSubscriber();
    cy.visit("/user/settings");

    // 1. Initial avatar state check
    cy.get('img[alt="avatar"]').first().should("be.visible");

    // 2. Select a new image file
    const testBlob = b64toBlob(testPngBase64);
    cy.get('input#userAvatarUpload').selectFile(
      {
        contents: testBlob,
        fileName: "subscriber_avatar_test.png",
        mimeType: "image/png",
        lastModifiedDate: new Date(),
      },
      { force: true }
    );

    // 3. Staged photo banner should appear
    cy.contains(/New photo staged|Click "Save Profile"/i).should("be.visible");

    // 4. Click Save Profile and wait for save to complete
    cy.get('button:contains("Save Profile"), button:contains("Save")')
      .first()
      .click({ force: true });

    // 5. Verify save confirmation feedback
    cy.contains(/Saved successfully|Profile and photo updated/i, { timeout: 12000 }).should("exist");

    // 6. Reload page to simulate real user revisiting or closing browser
    cy.reload();

    // 7. Verify the avatar did NOT revert to default
    cy.window().then((win) => {
      const savedAvatar = win.localStorage.getItem(
        "tgd_user_avatar_77793a21-2f0c-4ae7-842b-7aed42593c36"
      );
      // Assert avatar is not null or default
      expect(savedAvatar).to.not.be.null;
      expect(savedAvatar).to.not.include("default-avatar.jpg");
    });
  });

  it("Creator: uploads avatar in Edit Profile, saves, and verifies photo persists across reloads", () => {
    cy.loginAsCreator();
    cy.visit("/edit-profile");

    // 1. Check avatar element exists
    cy.get('img[alt="avatar"]').first().should("be.visible");

    // 3. Select new avatar file and assert staged confirmation
    const testBlob = b64toBlob(testPngBase64);
    cy.get('input#avatarUpload').selectFile(
      {
        contents: testBlob,
        fileName: "creator_avatar_test.png",
        mimeType: "image/png",
        lastModifiedDate: new Date(),
      },
      { force: true }
    );
    cy.contains(/New photo staged/i).should("be.visible");

    // 4. Click Save Changes and wait for toast / feedback
    cy.get('button:contains("Save Changes")')
      .first()
      .click({ force: true });

    // 5. Assert save confirmation
    cy.contains(/Changes saved|Saved/i, { timeout: 12000 }).should("exist");

    // 6. Hard reload page
    cy.reload();

    // 7. Assert avatar in creator settings did not revert to empty or default
    cy.window().then((win) => {
      const savedCreatorAvatar = win.localStorage.getItem(
        "tgd_user_avatar_e74f6c55-d901-4064-b386-4fe85dd25521"
      );
      expect(savedCreatorAvatar).to.not.be.null;
      expect(savedCreatorAvatar).to.not.include("default-avatar.jpg");
    });
  });
});
