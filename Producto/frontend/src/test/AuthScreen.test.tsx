/**
 * Component tests for AuthScreen — Vitest + React Testing Library
 * Requirements: 4.2, 4.3, 4.4, 4.5, 4.6, 4.7, 4.8, 4.9, 4.10
 */

import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { AuthScreen } from '../pages/AuthScreen';

// ─── Mock motion/react to avoid animation-related issues in tests ───────────
vi.mock('motion/react', () => ({
  motion: {
    div: ({ children, ...props }: any) => <div {...props}>{children}</div>,
    form: ({ children, ...props }: any) => <form {...props}>{children}</form>,
    img: (props: any) => <img {...props} />,
  },
  AnimatePresence: ({ children }: any) => <>{children}</>,
}));

// ─── Mock authService ────────────────────────────────────────────────────────
vi.mock('../services/backendService', () => ({
  authService: {
    forgotPassword: vi.fn(),
    resetPassword: vi.fn(),
  },
  fetchAPI: vi.fn(),
}));

// Import the mocked module so we can control its implementations
import { authService } from '../services/backendService';

// ─── Default props ───────────────────────────────────────────────────────────
const defaultProps = {
  onLogin: vi.fn().mockResolvedValue({}),
  onRegister: vi.fn().mockResolvedValue({}),
  loading: false,
  error: null,
};

// Helper: navigate to forgot-password mode
async function goToForgotPassword(user: ReturnType<typeof userEvent.setup>) {
  const forgotLink = screen.getByRole('button', { name: /olvidaste tu contraseña/i });
  await user.click(forgotLink);
}

// Helper: complete step 1 (submit email) assuming forgotPassword resolves
async function completeStep1(user: ReturnType<typeof userEvent.setup>, email = 'test@example.com') {
  const emailInput = screen.getByPlaceholderText(/ejemplo@sudtalent\.cl/i);
  await user.clear(emailInput);
  await user.type(emailInput, email);
  const sendButton = screen.getByRole('button', { name: /enviar código/i });
  await user.click(sendButton);
}

// ─── Tests ───────────────────────────────────────────────────────────────────

describe('AuthScreen', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ── Test 1: Login → forgot-password transition ────────────────────────────
  // Validates Requirement 4.2
  it('transitions from login to forgot-password when clicking "¿Olvidaste tu contraseña?"', async () => {
    const user = userEvent.setup();
    render(<AuthScreen {...defaultProps} />);

    // Login heading is visible
    expect(screen.getByRole('heading', { name: /iniciar sesión/i })).toBeInTheDocument();

    await goToForgotPassword(user);

    // Forgot-password heading (step 1) should appear
    expect(screen.getByRole('heading', { name: /recuperar contraseña/i })).toBeInTheDocument();
  });

  // ── Test 2: Step 1 → Step 2 on successful forgotPassword ─────────────────
  // Validates Requirement 4.3
  it('transitions from step 1 to step 2 after successful forgotPassword call', async () => {
    (authService.forgotPassword as ReturnType<typeof vi.fn>).mockResolvedValue({
      message: 'Si tu correo está registrado, recibirás un código en breve.',
    });

    const user = userEvent.setup();
    render(<AuthScreen {...defaultProps} />);

    await goToForgotPassword(user);
    await completeStep1(user);

    // Wait for step 2 to render
    await waitFor(() => {
      expect(screen.getByRole('heading', { name: /verificar código/i })).toBeInTheDocument();
    });

    expect(authService.forgotPassword).toHaveBeenCalledWith('test@example.com');
  });

  // ── Test 3: Step 2 → Step 3 with valid OTP ───────────────────────────────
  // Validates Requirement 4.4
  it('transitions from step 2 to step 3 after entering a valid 6-digit OTP', async () => {
    (authService.forgotPassword as ReturnType<typeof vi.fn>).mockResolvedValue({ message: 'ok' });

    const user = userEvent.setup();
    render(<AuthScreen {...defaultProps} />);

    await goToForgotPassword(user);
    await completeStep1(user);

    // Wait for step 2
    await waitFor(() => {
      expect(screen.getByRole('heading', { name: /verificar código/i })).toBeInTheDocument();
    });

    // Fill OTP
    const otpInput = screen.getByPlaceholderText('123456');
    await user.type(otpInput, '123456');

    const verifyButton = screen.getByRole('button', { name: /verificar código/i });
    await user.click(verifyButton);

    // Step 3 heading should appear
    await waitFor(() => {
      expect(screen.getByRole('heading', { name: /nueva contraseña/i })).toBeInTheDocument();
    });
  });

  // ── Test 4: Back button clears state and returns to login ─────────────────
  // Validates Requirement 4.6
  it('returns to login and clears state when clicking "Volver al inicio de sesión"', async () => {
    const user = userEvent.setup();
    render(<AuthScreen {...defaultProps} />);

    await goToForgotPassword(user);

    // Confirm we're in forgot-password mode
    expect(screen.getByRole('heading', { name: /recuperar contraseña/i })).toBeInTheDocument();

    // Click back button
    const backButton = screen.getByRole('button', { name: /volver al inicio de sesión/i });
    await user.click(backButton);

    // Should be back at login
    expect(screen.getByRole('heading', { name: /iniciar sesión/i })).toBeInTheDocument();
  });

  // ── Test 5: Spinner visible during loading (resetLoading) ─────────────────
  // Validates Requirement 4.10
  it('shows spinner during a pending forgotPassword request', async () => {
    // forgotPassword never resolves — simulates in-flight request
    (authService.forgotPassword as ReturnType<typeof vi.fn>).mockImplementation(
      () => new Promise(() => {})
    );

    const user = userEvent.setup();
    render(<AuthScreen {...defaultProps} />);

    await goToForgotPassword(user);

    const emailInput = screen.getByPlaceholderText(/ejemplo@sudtalent\.cl/i);
    await user.clear(emailInput);
    await user.type(emailInput, 'test@example.com');

    const sendButton = screen.getByRole('button', { name: /enviar código/i });
    await user.click(sendButton);

    // Spinner: a div with animate-spin class should be visible
    await waitFor(() => {
      expect(document.querySelector('.animate-spin')).toBeInTheDocument();
    });
  });

  // ── Test 6: Backend error shown in step 1 ────────────────────────────────
  // Validates Requirement 4.7
  it('displays backend error message when forgotPassword rejects', async () => {
    (authService.forgotPassword as ReturnType<typeof vi.fn>).mockRejectedValue({
      message: 'Demasiadas solicitudes.',
    });

    const user = userEvent.setup();
    render(<AuthScreen {...defaultProps} />);

    await goToForgotPassword(user);
    await completeStep1(user);

    await waitFor(() => {
      expect(screen.getByText(/demasiadas solicitudes/i)).toBeInTheDocument();
    });
  });

  // ── Test 7: Local validation — no backend call when email has no @ ────────
  // Validates Requirement 4.9
  // jsdom's native HTML5 email constraint blocks form submission for inputs
  // with type="email" that fail format validation, preventing React's onSubmit
  // from firing. We use fireEvent.submit on the form directly to bypass the
  // native constraint and exercise the React-side validation logic.
  it('shows a local validation error and does NOT call forgotPassword when email has no @', async () => {
    const user = userEvent.setup();
    render(<AuthScreen {...defaultProps} />);

    await goToForgotPassword(user);

    // Type a value without "@" into the email input
    const emailInput = screen.getByPlaceholderText(/ejemplo@sudtalent\.cl/i);
    await user.clear(emailInput);
    await user.type(emailInput, 'correo-sin-arroba');

    // Submit the form directly to bypass jsdom's native email constraint check
    const form = emailInput.closest('form')!;
    fireEvent.submit(form);

    // Local error should appear
    await waitFor(() => {
      expect(
        screen.getByText(/ingresa un correo electrónico válido/i)
      ).toBeInTheDocument();
    });

    // forgotPassword must NOT have been called
    expect(authService.forgotPassword).not.toHaveBeenCalled();
  });
});
