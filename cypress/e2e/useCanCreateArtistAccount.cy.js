/* eslint-disable no-undef */
describe("When user creates an artist account", () => {
  beforeEach(() => {
    cy.visitApplication();
  });

  describe("as an authenticated user", () => {
    // can potentially be extracted to another test file
    beforeEach(() => {
      cy.applicationState().invoke("dispatch", {
        type: "user/setCurrentUser",
        payload: { name: "Thomas", email: "thomas@random.com", roles: ['artist', 'developer'] },
      });
      cy.getCy("create-project").click();
    });

    it("is expected to direct user to create project view", () => {
      cy.url().should("include", "/projects/create");
    });

    it("is expected to display project create form", () => {
      cy.getCy("project-create-ui").should("be.visible");
    });
  });

  describe("as an unauthenticated user", () => {
    describe("successfully as an artist", () => {
      beforeEach(() => {
        cy.intercept("POST", "**/auth**", {
          fixture: "createAccountResponseForArtistAccount.json",
          statusCode: 201,
        }).as("createAccount");
        cy.getCy("create-project").click();
        cy.signUp({
          email: "user@email.com",
          password: "password",
          roles: ["artist"],
        });
      });

      it("is expected to make a network call on submit", () => {
        cy.wait("@createAccount").its("request.method").should("eql", "POST");
      });

      it("is expected to include form data as params", () => {
        cy.wait("@createAccount").then(({ request }) => {
          expect(request.body.params.email).to.eql("user@email.com");
          expect(request.body.params.password).to.eql("password");
          expect(request.body.params.passwordConf).to.eql("password");
          expect(request.body.params.roles).to.eql(["artist"]);
        });
      });

      it("is expected to respond with a 201 status", () => {
        cy.wait("@createAccount").its("response.statusCode").should("eql", 201);
      });

      it("is expected to redirect user to create project view", () => {
        cy.url().should("include", "/projects/create");
      });
    });

    describe("successfully as a developer", () => {
      beforeEach(() => {
        cy.intercept("POST", "**/auth**", {
          fixture: "createAccountResponseForDeveloperAccount.json",
          statusCode: 201,
        }).as("createAccount");
        cy.getCy("create-project").click();
        cy.signUp({
          email: "user@email.com",
          password: "password",
          roles: ["developer"],
        });
      });

      it("is expected to see a not authorized message", () => {
        cy.get("body").should(
          "contain.text",
          "You can't do that as a developer"
        );
      });
    });

    describe("unsuccessfully", () => {
      beforeEach(() => {
        cy.intercept("POST", "**/auth**", {
          fixture: "createAccountResponseError.json",
          statusCode: 422,
        }).as("createAccountError");
        cy.getCy("create-project").click();
        cy.signUp({
          email: "user@email.com",
          password: "password",
          roles: ["artist"],
        });
      });

      it("is expected to respond with a 422 status", () => {
        cy.wait("@createAccountError")
          .its("response.statusCode")
          .should("eql", 422);
      });

      it("is expected to store error message in application state", () => {
        cy.wait("@createAccountError");
        cy.applicationState()
          .invoke("getState")
          .its("messages.message")
          .should("be.an", "array")
          .and("have.length", 1);
      });

      it("is expected to inform the user the account creation did not work", () => {
        cy.get("body").should("contain.text", "Email has been taken.");
      });

      it("is expected to stay on the signup page", () => {
        cy.url().should("include", "/auth");
      });
    });
  });
});
