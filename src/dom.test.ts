import { describe, it, expect } from 'vitest';
import { getByText, fireEvent } from '@testing-library/dom';
import '@testing-library/jest-dom';

describe('DOM smoke test', () => {
    it('renders a button and responds to clicks', () => {
        document.body.innerHTML = `<div><button>Click me</button><span id="count">0</span></div>`;

        const button = getByText(document.body, 'Click me');
        const countEl = document.getElementById('count') as HTMLElement;

        let count = 0;
        button.addEventListener('click', () => {
            count += 1;
            countEl.textContent = String(count);
        });

        expect(button).toBeInTheDocument();
        fireEvent.click(button);
        expect(countEl.textContent).toBe('1');
    });
});
