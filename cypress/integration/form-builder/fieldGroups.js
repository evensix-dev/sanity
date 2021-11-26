const el = (name) => `[data-testid="${name}"]`

describe('@sanity/form-builder: field groups', () => {
  it('should not render group tabs if no groups are defined in schema', () => {
    cy.visit('/test/desk/input-debug;readOnlyTest;9c0979b7-a202-44a3-a645-88a93499b47c')
    cy.get(el('field-groups')).should('not.exist')
  })

  it('should render group buttons', () => {
    cy.visit('/test/desk/input-debug;fieldGroups;c04d9594-b242-44ed-8da0-f6b5ff93f312')
    cy.get(el('field-groups')).should('be.visible')
    cy.get(el('group-all-fields')).should('be.visible').should('have.attr', 'aria-selected', 'true')
  })

  it('should focus first group on initial render', () => {
    // First field when no default group is focused
    cy.visit('/test/desk/input-debug;fieldGroups;c04d9594-b242-44ed-8da0-f6b5ff93f312')
    cy.get(el('group-all-fields')).should('be.focused')

    // First field in default group is focused
    cy.visit('/test/desk/input-debug;fieldGroupsDefault;f61b9762-3519-43f2-acc3-97ee709e2131')
    cy.get(el('group-group2')).should('be.focused')
  })

  it('(mouse) should filter field based on active group', () => {
    cy.visit('/test/desk/input-debug;fieldGroups;c04d9594-b242-44ed-8da0-f6b5ff93f312')

    // Click on Group 1
    cy.get(el('group-group1')).click()
    cy.get(el('input-field1')).should('be.visible')
    cy.get(el('input-field2')).should('not.exist')
    cy.get(el('input-field3')).should('not.exist')
    cy.get(el('input-field4')).should('be.visible')

    // Click on group 2
    cy.get(el('group-group2')).click()
    cy.get(el('input-field1')).should('not.exist')
    cy.get(el('input-field2')).should('be.visible')
    cy.get(el('input-field3')).should('not.exist')
    cy.get(el('input-field4')).should('be.visible')
  })

  it('(keyboard) should filter field based on active group', () => {
    cy.visit('/test/desk/input-debug;fieldGroups;c04d9594-b242-44ed-8da0-f6b5ff93f312')
    cy.get(el('group-all-fields')).type('{rightarrow}')
    cy.get(el('group-group1'))
      .trigger('click')
      .should('have.attr', 'aria-selected', 'true')
      .should('be.focused')
    cy.get(el('input-field1')).should('be.visible')
    cy.get(el('input-field2')).should('not.exist')
    cy.get(el('input-field3')).should('not.exist')
    cy.get(el('input-field4')).should('be.visible')
    cy.get(el('input-fieldGroup')).should('be.visible')

    // @todo
    // Test shift+tab to go back to the groups and choose another group
  })

  it('should disable groups when opening changes panel and show all fields', () => {
    cy.visit('/test/desk/input-debug;fieldGroups;c04d9594-b242-44ed-8da0-f6b5ff93f312')
    cy.get(el('group-group1')).click()
    cy.get(el('review-changes-button')).click()
    cy.get(el('group-all-fields')).should('have.attr', 'disabled')
    cy.get(el('group-group1')).should('have.attr', 'disabled')
    cy.get(el('group-group2')).should('have.attr', 'disabled')
  })

  it('should filter fields by default group on initial render and show group as active', () => {
    cy.visit('/test/desk/input-debug;fieldGroupsDefault;f61b9762-3519-43f2-acc3-97ee709e2131')
    cy.get(el('group-group2')).should('have.attr', 'aria-selected', 'true').should('be.focused')
  })

  it('should switch group and scroll to field when clicking validation error that is not in active group', () => {
    // todo
  })
})
