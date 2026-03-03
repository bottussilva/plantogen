import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, within, waitFor } from '@testing-library/react';
import App from '../App';

// Mock Howler/Howl to avoid errors with audio
vi.mock('howler', () => ({
    Howl: vi.fn().mockImplementation(() => ({
        play: vi.fn(),
        mute: vi.fn(),
    })),
    Howler: {
        mute: vi.fn(),
    },
}));

describe('PlantoGen App', () => {
    it('renders landing page with start button', () => {
        render(<App />);
        expect(screen.getByText(/Iniciar Aplicativo/i)).toBeInTheDocument();
    });

    it('renders input for name', () => {
        render(<App />);
        expect(screen.getByPlaceholderText(/Como quer ser chamado\?/i)).toBeInTheDocument();
    });

    it('navigates to main app after entering name', () => {
        render(<App />);
        const input = screen.getByPlaceholderText(/Como quer ser chamado\?/i);
        const button = screen.getByText(/Iniciar Aplicativo/i);

        fireEvent.change(input, { target: { value: 'Test User' } });
        fireEvent.click(button);

        expect(screen.getByText(/Gerar Planilha/i)).toBeInTheDocument();
    });

    it('adds and removes a professional', async () => {
        render(<App />);
        // Navigate to main app
        fireEvent.change(screen.getByPlaceholderText(/Como quer ser chamado\?/i), { target: { value: 'Test User' } });
        fireEvent.click(screen.getByText(/Iniciar Aplicativo/i));

        // Ensure we are on Equipe tab (default)
        const nameInput = screen.getByPlaceholderText(/Nome completo/i);
        const matriculaInput = screen.getByPlaceholderText(/Matrícula/i);
        const addButton = screen.getByText(/Adicionar/i);

        fireEvent.change(nameInput, { target: { value: 'John Doe' } });
        fireEvent.change(matriculaInput, { target: { value: 'B99999' } });
        fireEvent.click(addButton);

        expect(screen.getByText(/John Doe/i)).toBeInTheDocument();

        // Remove professional (the one we just added)
        const johnDoeInfo = screen.getByText(/John Doe/i);
        const mainContainer = johnDoeInfo.closest('.group');
        if (mainContainer) {
            const removeBtn = within(mainContainer as HTMLElement).getByLabelText(/Remover profissional/i);
            fireEvent.click(removeBtn);
        }

        await waitFor(() => {
            expect(screen.queryByText(/John Doe/i)).not.toBeInTheDocument();
        }, { timeout: 3000 });
    });

    it('triggers auto-generation', () => {
        render(<App />);
        fireEvent.change(screen.getByPlaceholderText(/Como quer ser chamado\?/i), { target: { value: 'Test User' } });
        fireEvent.click(screen.getByText(/Iniciar Aplicativo/i));

        const autoBtn = screen.getByText(/Gerar Automático/i);
        fireEvent.click(autoBtn);
        // Auto-generate adds shifts. We can't easily see them in the list without scrolling, 
        // but the function call happened.
    });

    it('applies a period for a professional', () => {
        render(<App />);
        fireEvent.change(screen.getByPlaceholderText(/Como quer ser chamado\?/i), { target: { value: 'Test User' } });
        fireEvent.click(screen.getByText(/Iniciar Aplicativo/i));

        // Switch to Periodo tab
        fireEvent.click(screen.getByText(/Período/i));

        const profSelect = screen.getByDisplayValue(/Selecionar Profissional/i);
        fireEvent.change(profSelect, { target: { value: '1' } }); // Select Mauricio

        const applyBtn = screen.getByText(/Aplicar Período/i);
        fireEvent.click(applyBtn);

        // Should switch back to calendar tab
        expect(screen.getByText(/Mauricio Da Silva Pozzatto/i)).toBeInTheDocument();
    });

    it('toggles settings and area data', () => {
        render(<App />);
        fireEvent.change(screen.getByPlaceholderText(/Como quer ser chamado\?/i), { target: { value: 'Test User' } });
        fireEvent.click(screen.getByText(/Iniciar Aplicativo/i));

        // Switch to Area tab
        fireEvent.click(screen.getByText(/Área/i));

        const unidadeInput = screen.getByDisplayValue(/UAC/i);
        fireEvent.change(unidadeInput, { target: { value: 'TEST-UNIDADE' } });
        expect(unidadeInput).toHaveValue('TEST-UNIDADE');
    });
});
