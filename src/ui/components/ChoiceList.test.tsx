import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { ChoiceList } from './ChoiceList';

describe('ChoiceList', () => {
  it('renders nothing when choices are empty', () => {
    const { container } = render(
      <ChoiceList choices={[]} disabled={false} onChoose={() => {}} />
    );
    expect(container.firstChild).toBeNull();
  });

  it('renders one button per choice', () => {
    render(
      <ChoiceList choices={['A', 'B', 'C']} disabled={false} onChoose={() => {}} />
    );
    expect(screen.getAllByRole('button')).toHaveLength(3);
  });

  it('invokes onChoose with the picked choice', () => {
    const onChoose = vi.fn();
    render(
      <ChoiceList
        choices={['搜索', '撤退', '隐蔽']}
        disabled={false}
        onChoose={onChoose}
      />
    );
    fireEvent.click(screen.getByTestId('choice-1'));
    expect(onChoose).toHaveBeenCalledWith('撤退');
  });

  it('disables all buttons when disabled is true', () => {
    render(
      <ChoiceList choices={['A', 'B']} disabled={true} onChoose={() => {}} />
    );
    for (const btn of screen.getAllByRole('button')) {
      expect(btn).toBeDisabled();
    }
  });
});
