import datalist from '../../../data/datalist.json'

describe('My React App', () => {
  beforeEach(() => {
    cy.intercept('GET', 'http://localhost:8080/d/?a=1&l=1&format=json', {
      statusCode: 200,
      body: datalist,
    }).as('getFiles')
  });

  it('shows mocked files', () => {

    cy.visit('http://localhost:3000')

    cy.wait('@getFiles') // wait until the mocked API call is made

    cy.contains('file2.jpg').should('exist')
  })

  it('should display the header', () => {
      cy.visit('http://localhost:3000')
    })
})