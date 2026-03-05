import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, within, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
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

// Mock Supabase to simulate async data load
vi.mock('../lib/supabase', () => ({
    supabase: {
        from: vi.fn((table) => {
            const mockProfs = [
                { id: '1', name: 'Mauricio Da Silva Pozzatto', matricula: 'B40293', specialty: 'Arquiteto', color: 'bg-blue-500' }
            ];
            let isInsert = false;
            let insertedData: any[] = [];
            const chainable: any = {
                select: vi.fn().mockReturnThis(),
                insert: vi.fn().mockImplementation((payload) => {
                    isInsert = true;
                    insertedData = payload;
                    return chainable;
                }),
                delete: vi.fn().mockReturnThis(),
                update: vi.fn().mockReturnThis(),
                upsert: vi.fn().mockResolvedValue({ error: null }),
                eq: vi.fn().mockReturnThis(),
                in: vi.fn().mockReturnThis(),
                limit: vi.fn().mockReturnThis(),
                single: vi.fn().mockResolvedValue({ data: { unidade: 'UAC', sigla: 'GSPA', gerencia: 'G', area: 'A', descricao: 'D', pcn: 'P', horas_sobreaviso: '15:45' }, error: null }),
            };
            chainable.then = (resolve: any) => {
                if (isInsert) {
                    if (table === 'professionals') {
                        resolve({ data: [{ id: 'mock-new', ...insertedData[0] }], error: null });
                    } else if (table === 'shifts') {
                        resolve({ data: insertedData.map((d: any, i: number) => ({ id: `mock-shift-${i}`, ...d })), error: null });
                    } else {
                        resolve({ data: insertedData, error: null });
                    }
                } else {
                    resolve({ data: table === 'professionals' ? mockProfs : [], error: null });
                }
            };
            return chainable;
        })
    }
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

    it('navigates to main app after entering name', async () => {
        render(<App />);
        const input = screen.getByPlaceholderText(/Como quer ser chamado\?/i);
        const button = screen.getByText(/Iniciar Aplicativo/i);

        fireEvent.change(input, { target: { value: 'Test User' } });
        fireEvent.click(button);

        await waitFor(() => {
            expect(screen.getByText(/Gerar Planilha/i)).toBeInTheDocument();
        });
    });

    it('adds and removes a professional', async () => {
        render(<App />);
        // Navigate to main app
        fireEvent.change(screen.getByPlaceholderText(/Como quer ser chamado\?/i), { target: { value: 'Test User' } });
        fireEvent.click(screen.getByText(/Iniciar Aplicativo/i));

        // Wait for async initial load of mocked professionals
        await waitFor(() => screen.getByText(/Mauricio Da Silva Pozzatto/i));

        const nameInput = screen.getByPlaceholderText(/Nome completo/i);
        const matriculaInput = screen.getByPlaceholderText(/Matrícula/i);
        const addButton = screen.getByText(/Adicionar/i);

        fireEvent.change(nameInput, { target: { value: 'John Doe' } });
        fireEvent.change(matriculaInput, { target: { value: 'B99999' } });
        fireEvent.click(addButton);

        // the mock insert returns the inserted professional, await for rendering
        await waitFor(() => {
            expect(screen.getByText(/John Doe/i)).toBeInTheDocument();
        });

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

    it('triggers auto-generation', async () => {
        render(<App />);
        fireEvent.change(screen.getByPlaceholderText(/Como quer ser chamado\?/i), { target: { value: 'Test User' } });
        fireEvent.click(screen.getByText(/Iniciar Aplicativo/i));

        await waitFor(() => screen.getByText(/Mauricio Da Silva Pozzatto/i));

        const autoBtn = screen.getByText(/Gerar Automático/i);
        fireEvent.click(autoBtn);
    });

    it('applies a period for a professional', async () => {
        render(<App />);
        fireEvent.change(screen.getByPlaceholderText(/Como quer ser chamado\?/i), { target: { value: 'Test User' } });
        fireEvent.click(screen.getByText(/Iniciar Aplicativo/i));

        await waitFor(() => screen.getByText(/Mauricio Da Silva Pozzatto/i));

        // Switch to Periodo tab
        fireEvent.click(screen.getByText(/Período/i));

        const profSelect = screen.getByDisplayValue(/Selecionar Profissional/i);
        fireEvent.change(profSelect, { target: { value: '1' } }); // Select Mauricio

        const applyBtn = screen.getByText(/Aplicar Período/i);
        fireEvent.click(applyBtn);

        // Should switch back to calendar tab and still have the professional loaded
        await waitFor(() => {
            expect(screen.getByText(/Mauricio Da Silva Pozzatto/i)).toBeInTheDocument();
        });
    });

    it('toggles settings and area data', async () => {
        render(<App />);
        fireEvent.change(screen.getByPlaceholderText(/Como quer ser chamado\?/i), { target: { value: 'Test User' } });
        fireEvent.click(screen.getByText(/Iniciar Aplicativo/i));

        // Switch to Area tab
        await waitFor(() => screen.getByText(/Área/i));
        fireEvent.click(screen.getByText(/Área/i));

        const unidadeInput = await waitFor(() => screen.getByDisplayValue(/UAC/i));
        fireEvent.change(unidadeInput, { target: { value: 'TEST-UNIDADE' } });
        expect(unidadeInput).toHaveValue('TEST-UNIDADE');
    });
});
