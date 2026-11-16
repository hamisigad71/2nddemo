// ***********************************************************
// Custom Cypress Commands for Autonomous Workflow Testing
// ***********************************************************

declare global {
  namespace Cypress {
    interface Chainable {
      /**
       * Mock payment gateway endpoints (/api/pay and /api/pay/status)
       * so Cypress can bypass payment walls without sending real money or STK pushes.
       */
      mockPaymentSuccess(reference?: string): Chainable<void>;

      /**
       * Seed authenticated subscriber persona into localStorage
       */
      loginAsSubscriber(): Chainable<void>;

      /**
       * Seed authenticated creator persona into localStorage
       */
      loginAsCreator(): Chainable<void>;

      /**
       * Seed authenticated admin persona into localStorage
       */
      loginAsAdmin(): Chainable<void>;

      /**
       * Seed authenticated escort persona into localStorage
       */
      loginAsEscort(): Chainable<void>;
    }
  }
}

Cypress.Commands.add('mockPaymentSuccess', (reference = 'CYPRESS-MOCK-TX-1001') => {
  cy.intercept('POST', '**/api/pay*', (req) => {
    req.reply({
      statusCode: 200,
      body: {
        success: true,
        status: 'QUEUED',
        reference: reference,
        checkout_request_id: 'ws_CO_CYPRESS_MOCK_123',
      },
    });
  }).as('mockInitiatePayment');

  cy.intercept('GET', `**/api/pay/status*`, (req) => {
    req.reply({
      statusCode: 200,
      body: {
        status: 'SUCCESS',
        reference: reference,
        mpesa_receipt_number: 'TEST_REC_' + Math.floor(Math.random() * 100000),
        result_code: 0,
      },
    });
  }).as('mockPollPaymentStatus');
});

Cypress.Commands.add('loginAsSubscriber', () => {
  cy.window().then((win) => {
    const mockUser = {
      id: '77793a21-2f0c-4ae7-842b-7aed42593c36',
      uid: '77793a21-2f0c-4ae7-842b-7aed42593c36',
      email: 'thegentsplayhouse@gmail.com',
      name: 'Gents Playhouse',
      role: 'subscriber',
      status: 'active',
      aud: 'authenticated',
      app_metadata: { provider: 'email', providers: ['email'] },
      user_metadata: { name: 'Gents Playhouse', role: 'subscriber' },
      created_at: new Date().toISOString(),
    };

    const mockSession = {
      access_token: 'sb_publishable_fqQBtrYzbflSgtEQAj3caA_5nr0dLJq',
      token_type: 'bearer',
      expires_in: 3600,
      refresh_token: 'cypress-mock-sub-refresh',
      user: mockUser,
      expires_at: Math.floor(Date.now() / 1000) + 3600,
    };

    win.localStorage.setItem('tgd_auth_epoch', '2026-10-23_mandatory_kyc_epoch_v1');
    win.localStorage.setItem('tgd_auth_user', JSON.stringify(mockUser));
    win.localStorage.setItem('age_verified', 'true');
    win.localStorage.setItem('tgd_age_verified_18', 'true');
    win.localStorage.setItem(`mali_verified_creators_popup_seen_${mockUser.id}`, 'true');
    win.localStorage.removeItem('show_subscriber_verification_popup');
    win.localStorage.setItem('sb-gitkzykasegtygoybjhq-auth-token', JSON.stringify(mockSession));
  });
});

Cypress.Commands.add('loginAsCreator', () => {
  cy.window().then((win) => {
    const mockCreator = {
      id: 'e74f6c55-d901-4064-b386-4fe85dd25521',
      uid: 'e74f6c55-d901-4064-b386-4fe85dd25521',
      email: 'creator.test@tgd.co.ke',
      name: 'Beunice Kamau',
      role: 'creator',
      status: 'active',
      aud: 'authenticated',
      app_metadata: { provider: 'email', providers: ['email'] },
      user_metadata: { name: 'Beunice Kamau', role: 'creator' },
      created_at: new Date().toISOString(),
    };

    const mockSession = {
      access_token: 'cypress-mock-creator-token',
      token_type: 'bearer',
      expires_in: 3600,
      refresh_token: 'cypress-mock-creator-refresh',
      user: mockCreator,
      expires_at: Math.floor(Date.now() / 1000) + 3600,
    };

    win.localStorage.setItem('tgd_auth_epoch', '2026-10-23_mandatory_kyc_epoch_v1');
    win.localStorage.setItem('tgd_auth_user', JSON.stringify(mockCreator));
    win.localStorage.setItem('age_verified', 'true');
    win.localStorage.setItem('tgd_age_verified_18', 'true');
    win.localStorage.setItem('sb-gitkzykasegtygoybjhq-auth-token', JSON.stringify(mockSession));
  });
});

Cypress.Commands.add('loginAsAdmin', () => {
  cy.window().then((win) => {
    const mockAdmin = {
      id: '00000000-0000-0000-0000-000000000001',
      uid: '00000000-0000-0000-0000-000000000001',
      email: 'admin.test@tgd.co.ke',
      name: 'Head Administrator',
      role: 'admin',
      status: 'active',
      aud: 'authenticated',
      app_metadata: { provider: 'email', providers: ['email'] },
      user_metadata: { name: 'Head Administrator', role: 'admin' },
      created_at: new Date().toISOString(),
    };

    const mockSession = {
      access_token: 'cypress-mock-admin-token',
      token_type: 'bearer',
      expires_in: 3600,
      refresh_token: 'cypress-mock-refresh-token',
      user: mockAdmin,
      expires_at: Math.floor(Date.now() / 1000) + 3600,
    };

    win.localStorage.setItem('tgd_auth_epoch', '2026-10-23_mandatory_kyc_epoch_v1');
    win.localStorage.setItem('tgd_auth_user', JSON.stringify(mockAdmin));
    win.localStorage.setItem('age_verified', 'true');
    win.localStorage.setItem('tgd_age_verified_18', 'true');
    win.localStorage.setItem('sb-gitkzykasegtygoybjhq-auth-token', JSON.stringify(mockSession));

    // Admin Route Gatekeeper Session Unlock
    win.sessionStorage.setItem(
      'tgd_admin_session_auth',
      JSON.stringify({
        authorized: true,
        codeUsed: 'TGD-BOSS...',
        timestamp: Date.now(),
        userEmail: mockAdmin.email,
      })
    );
  });
});

Cypress.Commands.add('loginAsEscort', () => {
  cy.window().then((win) => {
    const mockEscort = {
      id: 'escort-1',
      uid: 'escort-1',
      email: 'valentina.escort@tgd.co.ke',
      name: 'Valentina',
      role: 'creator',
      is_escort: true,
      status: 'active',
      aud: 'authenticated',
      app_metadata: { provider: 'email', providers: ['email'] },
      user_metadata: { name: 'Valentina', role: 'creator' },
      created_at: new Date().toISOString(),
    };

    const mockSession = {
      access_token: 'cypress-mock-escort-token',
      token_type: 'bearer',
      expires_in: 3600,
      refresh_token: 'cypress-mock-escort-refresh',
      user: mockEscort,
      expires_at: Math.floor(Date.now() / 1000) + 3600,
    };

    win.localStorage.setItem('tgd_auth_epoch', '2026-10-23_mandatory_kyc_epoch_v1');
    win.localStorage.setItem('tgd_auth_user', JSON.stringify(mockEscort));
    win.localStorage.setItem('age_verified', 'true');
    win.localStorage.setItem('tgd_age_verified_18', 'true');
    win.localStorage.setItem('sb-gitkzykasegtygoybjhq-auth-token', JSON.stringify(mockSession));
  });
});

export {};
