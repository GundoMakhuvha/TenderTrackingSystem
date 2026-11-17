import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { AppBreadcrumbs, BreadcrumbProvider, useBreadcrumbLabel } from '@/components/layout/AppBreadcrumbs';

function Labeller({ path, label }: { path: string; label: string }) {
  useBreadcrumbLabel(path, label);
  return null;
}

function renderAt(path: string, extra?: React.ReactNode) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <BreadcrumbProvider>
        {extra}
        <AppBreadcrumbs />
      </BreadcrumbProvider>
    </MemoryRouter>,
  );
}

describe('AppBreadcrumbs', () => {
  it('shows just Dashboard on the home page', () => {
    renderAt('/');
    expect(screen.getByText('Dashboard')).toBeInTheDocument();
    expect(document.title).toBe('Dashboard | Tender Tracker');
  });

  it('builds a trail for nested static routes', () => {
    renderAt('/tenders/new');
    expect(screen.getByRole('link', { name: /Tenders/ })).toHaveAttribute('href', '/tenders');
    expect(screen.getByText('New Tender').closest('[aria-current="page"]')).not.toBeNull();
  });

  it('uses a friendly label for a tender instead of its id', () => {
    const id = '11111111-2222-4333-8444-555555555555';
    renderAt(`/tenders/${id}`, <Labeller path={`/tenders/${id}`} label="FAIS2026/27 T001" />);
    expect(screen.getByText('FAIS2026/27 T001')).toBeInTheDocument();
    expect(screen.queryByText(id)).not.toBeInTheDocument();
  });

  it('falls back to "Details" for unlabeled ids', () => {
    renderAt('/tenders/11111111-2222-4333-8444-555555555555');
    expect(screen.getByText('Details')).toBeInTheDocument();
  });
});
