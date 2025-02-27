import { render, screen } from '@testing-library/react';
import * as nextThemesModule from 'next-themes';

import { ThemeEditor } from '../';

const PROJECT = {
  id: 'test-id',
  name: 'test-name',
};

jest.spyOn(nextThemesModule, 'useTheme').mockReturnValue({
  resolvedTheme: 'system',
} as any);

describe('ThemeEditor', () => {
  beforeEach(() => {
    render(<ThemeEditor project={PROJECT} />);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should render the editor and the preview widget', () => {
    expect(
      screen.getByRole('button', {
        name: 'Click to expanded the color picker',
      }),
    ).toBeTruthy();
    expect(
      screen.getByRole('button', {
        name: 'Post',
      }),
    ).toBeTruthy();
  });
});
