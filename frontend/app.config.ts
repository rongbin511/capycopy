export default defineAppConfig({
  ui: {
    colors: {
      primary: 'indigo',
      neutral: 'slate',
    },
    dashboardNavbar: {
      slots: {
        root: 'h-12 shrink-0 flex items-center justify-between border-b border-default px-4 sm:px-6 gap-1.5',
        title: 'text-sm font-semibold text-highlighted truncate leading-tight',
      },
    },
    dashboardPanel: {
      slots: {
        body: 'flex flex-col flex-1 min-h-0 overflow-hidden p-0',
      },
    },
  },
})
