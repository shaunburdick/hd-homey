import { defineConfig } from 'vitepress';

// https://vitepress.dev/reference/site-config
export default defineConfig({
    title: 'HD Homey',
    description: 'HDHomeRun Proxy for Remote Streaming',
    base: process.env.NODE_ENV === 'production' ? '/hd-homey/' : '/',

    themeConfig: {
        logo: '/hd-homey.png',
        siteTitle: 'HD Homey Docs',

        nav: [
            { text: 'Guide', link: '/getting-started/' },
            { text: 'Features', link: '/features/' },
            { text: 'API', link: '/api/' },
            { text: 'Contributing', link: '/contributing/' },
            {
                text: 'v1.0.0-beta.3',
                items: [
                    { text: 'Changelog', link: 'https://github.com/shaunburdick/hd-homey/blob/main/CHANGELOG.md' },
                    { text: 'GitHub', link: 'https://github.com/shaunburdick/hd-homey' }
                ]
            }
        ],

        sidebar: {
            '/getting-started/': [
                {
                    text: 'Getting Started',
                    items: [
                        { text: 'Overview', link: '/getting-started/' },
                        { text: 'Quick Start', link: '/getting-started/quick-start' },
                        { text: 'Full Installation', link: '/getting-started/full-installation' },
                        { text: 'First Steps', link: '/getting-started/first-steps' }
                    ]
                }
            ],
            '/features/': [
                {
                    text: 'Features',
                    items: [
                        { text: 'Overview', link: '/features/' },
                        { text: 'Tuner Management', link: '/features/tuner-management' },
                        { text: 'Channel Streaming', link: '/features/channel-streaming' },
                        { text: 'User Management', link: '/features/user-management' },
                        { text: 'User Invitations', link: '/features/user-invitations' },
                        { text: 'Authentication', link: '/features/authentication' },
                        { text: 'Video Transcoding', link: '/features/video-transcoding' }
                    ]
                }
            ],
            '/configuration/': [
                {
                    text: 'Configuration',
                    items: [
                        { text: 'Overview', link: '/configuration/' },
                        { text: 'Environment Variables', link: '/configuration/environment-variables' },
                        { text: 'Advanced Settings', link: '/configuration/advanced-settings' }
                    ]
                }
            ],
            '/troubleshooting/': [
                {
                    text: 'Troubleshooting',
                    items: [
                        { text: 'Overview', link: '/troubleshooting/' },
                        { text: 'Installation', link: '/troubleshooting/installation' },
                        { text: 'Streaming', link: '/troubleshooting/streaming' },
                        { text: 'Common Errors', link: '/troubleshooting/common-errors' }
                    ]
                }
            ],
            '/api/': [
                {
                    text: 'API Reference',
                    items: [
                        { text: 'Overview', link: '/api/' },
                        { text: 'Lineup Endpoint', link: '/api/lineup-endpoint' },
                        { text: 'Stream Authentication', link: '/api/stream-authentication' }
                    ]
                }
            ],
            '/contributing/': [
                {
                    text: 'Contributing',
                    items: [
                        { text: 'Overview', link: '/contributing/' },
                        { text: 'Development Setup', link: '/contributing/development-setup' },
                        { text: 'Spec Process', link: '/contributing/spec-process' },
                        { text: 'Architecture', link: '/contributing/architecture' },
                        { text: 'Testing', link: '/contributing/testing' }
                    ]
                }
            ]
        },

        socialLinks: [
            { icon: 'github', link: 'https://github.com/shaunburdick/hd-homey' }
        ],

        editLink: {
            pattern: 'https://github.com/shaunburdick/hd-homey/edit/main/docs/:path',
            text: 'Edit this page on GitHub'
        },

        search: {
            provider: 'local'
        },

        footer: {
            message: 'Released under the ISC License.',
            copyright: 'Copyright © 2025 Shaun Burdick'
        }
    },

    head: [
        ['link', { rel: 'icon', href: '/hd-homey/hd-homey.png' }],
        ['meta', { property: 'og:type', content: 'website' }],
        ['meta', { property: 'og:title', content: 'HD Homey Documentation' }],
        ['meta', { property: 'og:description', content: 'HDHomeRun Proxy for Remote Streaming' }],
        ['meta', { property: 'og:image', content: '/hd-homey/hd-homey.png' }]
    ],

    lastUpdated: true
});
