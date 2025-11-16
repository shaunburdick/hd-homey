import { expect, test } from 'vitest';
import { render, screen } from '@testing-library/react';
import Page from './page';

test('Page', async () => {
    render(await Page());
    expect(screen.getByRole('heading', { level: 1, name: /Hello Test User/i })).toBeDefined();
});
