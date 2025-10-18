export const layoutConfig = {
  global: {
    tabEnableClose: false,
    tabEnableRename: false,
  },
  borders: [],
  layout: {
    type: 'row',
    weight: 100,
    children: [
      {
        type: 'tabset',
        weight: 25,
        enableTabStrip: true,
        selected: 0,
        children: [
          {
            type: 'tab',
            name: 'Tasks',
            component: 'tasks-panel',
          },
          {
            type: 'tab',
            name: 'Concepts',
            component: 'concepts-panel',
          },
        ],
      },
      {
        type: 'row',
        weight: 75,
        children: [
          {
            type: 'tabset',
            weight: 70,
            children: [
              {
                type: 'tab',
                name: 'Concept Map',
                component: 'concept-map',
              },
            ],
          },
          {
            type: 'tabset',
            weight: 30,
            children: [
              {
                type: 'tab',
                name: 'Logs',
                component: 'log-list',
              },
              {
                type: 'tab',
                name: 'System',
                component: 'system-status',
              },
            ],
          },
        ],
      },
    ],
  },
};
