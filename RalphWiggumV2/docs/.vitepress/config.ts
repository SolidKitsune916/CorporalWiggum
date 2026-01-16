export default {
  title: 'Corporal WIGGUM',
  description: 'R.A.L.P.H. - Recursive Autonomous Loop for Programming Humans',
  lang: 'en-US',
  lastUpdated: true,

  head: [
    ['meta', { name: 'theme-color', content: '#00e5e5' }],
    ['meta', { name: 'og:type', content: 'website' }],
    ['meta', { name: 'og:site_name', content: 'Corporal WIGGUM Documentation' }],
  ],

  themeConfig: {
    logo: '/logo.svg',
    siteTitle: 'Corporal WIGGUM',

    nav: [
      { text: 'Guide', link: '/getting-started/installation' },
      { text: 'API', link: '/api/websocket-api' },
      { text: 'GitHub', link: 'https://github.com/your-repo/ralph-wiggum' },
    ],

    sidebar: [
      {
        text: 'Getting Started',
        items: [
          { text: 'Installation', link: '/getting-started/installation' },
          { text: 'Quick Start', link: '/getting-started/quickstart' },
          { text: 'Your First Loop', link: '/getting-started/first-loop' },
        ],
      },
      {
        text: 'User Guide',
        items: [
          { text: 'Dashboard Overview', link: '/user-guide/dashboard-overview' },
          { text: 'Loop Modes', link: '/user-guide/loop-modes' },
          { text: 'Safety Controls', link: '/user-guide/safety-controls' },
        ],
      },
      {
        text: 'API Reference',
        items: [
          { text: 'WebSocket API', link: '/api/websocket-api' },
        ],
      },
      {
        text: 'Integrations',
        items: [
          { text: 'GitHub', link: '/integrations/github' },
          { text: 'Slack', link: '/integrations/slack' },
          { text: 'Webhooks', link: '/integrations/webhooks' },
        ],
      },
      {
        text: 'Architecture',
        items: [
          { text: 'Overview', link: '/architecture/overview' },
        ],
      },
      {
        text: 'Troubleshooting',
        items: [
          { text: 'Common Issues', link: '/troubleshooting/common-issues' },
        ],
      },
    ],

    socialLinks: [
      { icon: 'github', link: 'https://github.com/your-repo/ralph-wiggum' },
    ],

    footer: {
      message: 'Released under the MIT License.',
      copyright: 'Copyright 2024 - Corporal WIGGUM',
    },

    search: {
      provider: 'local',
    },
  },
});
