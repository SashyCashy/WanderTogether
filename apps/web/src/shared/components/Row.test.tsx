import { describe, expect, test, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Row } from './Row';

describe('Row', () => {
  test('renders as a link when href is given, not a button', () => {
    render(<Row headline="Lisbon" href="/trips/new?destinationId=lisbon" />);
    const link = screen.getByRole('link', { name: /lisbon/i });
    expect(link).toHaveAttribute('href', '/trips/new?destinationId=lisbon');
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });

  test('renders as a button and fires onClick when no href is given', async () => {
    const user = userEvent.setup();
    const onClick = vi.fn();
    render(<Row headline="Riverside Hostel" onClick={onClick} />);

    const button = screen.getByRole('button', { name: /riverside hostel/i });
    await user.click(button);

    expect(onClick).toHaveBeenCalledTimes(1);
    expect(screen.queryByRole('link')).not.toBeInTheDocument();
  });

  test('renders description, eyebrow, and metadata when provided', () => {
    render(<Row headline="Kyoto" eyebrow="Japan, Kansai" description="Temples and gardens." metadata="★ 4.8" />);

    expect(screen.getByText('Kyoto')).toBeInTheDocument();
    expect(screen.getByText('Japan, Kansai')).toBeInTheDocument();
    expect(screen.getByText('Temples and gardens.')).toBeInTheDocument();
    expect(screen.getByText('★ 4.8')).toBeInTheDocument();
  });

  test('omits description/eyebrow/metadata when not provided', () => {
    render(<Row headline="Reykjavík" />);
    expect(screen.getByText('Reykjavík')).toBeInTheDocument();
    // Only the headline's own span should render inside row-item__body.
    expect(document.querySelector('.row-item__description')).not.toBeInTheDocument();
    expect(document.querySelector('.row-item__eyebrow')).not.toBeInTheDocument();
    expect(document.querySelector('.row-item__metadata')).not.toBeInTheDocument();
  });

  test('renders a thumbnail with the given alt text, including an empty decorative alt', () => {
    const { rerender } = render(<Row headline="Barcelona" thumbnail={{ src: '/mock/destinations/barcelona.jpg', alt: 'Barcelona' }} />);
    expect(screen.getByRole('img', { name: 'Barcelona' })).toHaveAttribute('src', '/mock/destinations/barcelona.jpg');

    rerender(<Row headline="Barcelona" thumbnail={{ src: '/mock/destinations/barcelona.jpg', alt: '' }} />);
    // An empty alt makes the image presentational — not queryable by role "img" with a name.
    expect(screen.queryByRole('img', { name: 'Barcelona' })).not.toBeInTheDocument();
    expect(document.querySelector('.row-item__thumbnail img')).toHaveAttribute('alt', '');
  });
});
