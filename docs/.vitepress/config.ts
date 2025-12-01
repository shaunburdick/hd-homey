import { defineConfig } from 'vitepress';

// https://vitepress.dev/reference/site-config
export default defineConfig({
    title: 'HD Homey',
    description: 'HDHomeRun Proxy for Remote Streaming',
    base: '/hd-homey/',

    // Disable theme switcher - always use dark theme
    appearance: false,

    themeConfig: {
        logo: '/hd-homey.png',
        siteTitle: 'HD Homey Docs',

        nav: [
            { text: 'Guide', link: '/getting-started/' },
            { text: 'Features', link: '/features/' },
            { text: 'API', link: '/api/' },
            { text: 'Contributing', link: '/contributing/' },
            {
                text: 'v1.0.0-beta.4',
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
                        { text: 'Installation', link: '/getting-started/installation' },
                        { text: 'Your First Stream', link: '/getting-started/first-stream' }
                    ]
                }
            ],
            '/features/': [
                {
                    text: 'Features',
                    items: [
                        { text: 'Overview', link: '/features/' },
                        { text: 'Tuner Management', link: '/features/tuner-management' },
                        { text: 'Channel Management', link: '/features/channel-management' },
                        { text: 'User Management', link: '/features/user-management' },
                        { text: 'User Invitations', link: '/features/user-invitations' },
                        { text: 'Stream Security', link: '/features/stream-security' },
                        { text: 'Video Transcoding', link: '/features/video-transcoding' }
                    ]
                }
            ],
            '/config/': [
                {
                    text: 'Configuration',
                    items: [
                        { text: 'Overview', link: '/config/' },
                        { text: 'Environment Variables', link: '/config/environment-variables' },
                        { text: 'Database', link: '/config/database' }
                    ]
                }
            ],
            '/troubleshooting/': [
                {
                    text: 'Troubleshooting',
                    items: [
                        { text: 'Overview', link: '/troubleshooting/' }
                    ]
                }
            ],
            '/api/': [
                {
                    text: 'API Reference',
                    items: [
                        { text: 'Overview', link: '/api/' }
                    ]
                }
            ],
            '/contributing/': [
                {
                    text: 'Contributing',
                    items: [
                        { text: 'Overview', link: '/contributing/' }
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
            message: 'Released under the AGPL-3.0 License.',
            copyright: 'Made by Shaun Burdick'
        }
    },

    head: [
        ['link', { rel: 'icon', href: '/hd-homey/hd-homey.png' }],
        ['meta', { property: 'og:type', content: 'website' }],
        ['meta', { property: 'og:title', content: 'HD Homey Documentation' }],
        ['meta', { property: 'og:description', content: 'HDHomeRun Proxy for Remote Streaming' }],
        ['meta', { property: 'og:image', content: '/hd-homey/hd-homey.png' }],
        // Plausible Analytics
        [
            'script',
            {
                defer: '',
                'data-domain': 'shaunburdick.github.io',
                src: 'https://analytics.public.burdick.dev/js/script.hash.pageview-props.tagged-events.js'
            }
        ],
        [
            'script',
            {},
            'window.plausible = window.plausible || function() { ' +
            '(window.plausible.q = window.plausible.q || []).push(arguments) ' +
            '}'
        ]
    ],

    lastUpdated: true
});
