import { render } from '@testing-library/react';
import { screen } from '@testing-library/dom';
import { RoadmapRecommendations } from '@/components/RoadmapRecommendations';
import { vi } from 'vitest';

vi.mock('@/lib/auth-headers', () => ({
  getAuthHeaders: async () => ({ Authorization: 'Bearer token' }),
}));

describe('RoadmapRecommendations', () => {
  it('renders roadmap section title', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => ({
        ok: true,
        json: async () => ({ recommendations: [] }),
      }))
    );

    render(<RoadmapRecommendations compact />);
    expect(screen.getByText('Lộ trình cá nhân hóa')).toBeInTheDocument();
  });
});
