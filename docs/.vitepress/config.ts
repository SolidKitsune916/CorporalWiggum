import { defineConfig } from 'vitepress'

export default defineConfig({
  title: 'Corporal WIGGUM, R.A.L.P.H.',
  description: 'Recursive Autonomous Loop for Programming Humans - Documentation',
  themeConfig: {
    logo: '/wiggum-logo.svg',
    nav: [
      { text: 'Home', link: '/' },
      { text: 'Getting Started', link: '/getting-started/installation' },
      { text: 'User Guide', link: '/user-guide/dashboard-overview' },
      { text: 'API', link: '/api/websocket-api' },
    ],

    sidebar: [
      {
        text: 'Getting Started',
        items: [
          { text: 'Installation', link: '/getting-started/installation' },
          { text: 'Quickstart', link: '/getting-started/quickstart' },
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
      { icon: 'github', link: 'https://github.com/SolidKitsune916/CorporalWiggum' },
    ],

    footer: {
      message: 'Built with the Ralph Wiggum technique',
      copyright: 'MIT License',
    },
  },
})
