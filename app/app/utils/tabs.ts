/**
 * Ids de una pestaña y de su panel, para `TabNavigation` con `idPrefix`: la
 * pestaña apunta a su panel con `aria-controls` y el panel se nombra con la
 * pestaña (`aria-labelledby`).
 */
export const tabElementId = (prefix: string, tabId: string) => `${prefix}-tab-${tabId}`
export const tabPanelId = (prefix: string, tabId: string) => `${prefix}-panel-${tabId}`
