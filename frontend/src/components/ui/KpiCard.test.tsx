import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { KpiCard } from './KpiCard';

describe('KpiCard', () => {
  it('renders label, formatted value, and unit correctly', () => {
    render(<KpiCard label="MAE" value={245.5} unit="MW" sampleCount={720} />);
    expect(screen.getByText('MAE')).toBeInTheDocument();
    expect(screen.getByText('245.5')).toBeInTheDocument();
    expect(screen.getByText('MW')).toBeInTheDocument();
    expect(screen.getByText('n=720')).toBeInTheDocument();
  });

  it('renders placeholder dash when value is null', () => {
    render(<KpiCard label="RMSE" value={null} unit="MW" />);
    expect(screen.getByText('—')).toBeInTheDocument();
  });

  it('renders loading skeleton when loading is true', () => {
    const { container } = render(<KpiCard label="MAE" value={100} unit="MW" loading={true} />);
    expect(container.querySelector('.animate-pulse')).toBeInTheDocument();
  });
});
