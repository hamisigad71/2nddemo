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
      id: '8e975481-fe80-47c7-ad8c-418d4eefa714',
      uid: '8e975481-fe80-47c7-ad8c-418d4eefa714',
      email: 'subscriber.test@tgd.co.ke',
      name: 'Owuor Timothy',
      role: 'subscriber',
      status: 'active',
    };
    win.localStorage.setItem('tgd_auth_user', JSON.stringify(mockUser));
    win.localStorage.setItem('age_verified', 'true');
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
    };
    win.localStorage.setItem('tgd_auth_user', JSON.stringify(mockCreator));
    win.localStorage.setItem('age_verified', 'true');
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

export {};
