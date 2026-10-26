import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { StatusBadge } from './StatusBadge';

describe('StatusBadge', () => {
  it('renders matched status with emerald color scheme', () => {
    render(<StatusBadge status="matched" />);
    expect(screen.getByText('Matched')).toBeInTheDocument();
  });

  it('renders missing_forecast status with amber color scheme', () => {
    render(<StatusBadge status="missing_forecast" />);
    expect(screen.getByText('Missing Forecast')).toBeInTheDocument();
  });

  it('renders missing_actual status with rose color scheme', () => {
    render(<StatusBadge status="missing_actual" />);
    expect(screen.getByText('Missing Actual')).toBeInTheDocument();
  });

  it('renders missing_both status with slate color scheme', () => {
    render(<StatusBadge status="missing_both" />);
    expect(screen.getByText('Missing Both')).toBeInTheDocument();
  });
});
