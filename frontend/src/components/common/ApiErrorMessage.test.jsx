// @vitest-environment jsdom

import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import ApiErrorMessage from './ApiErrorMessage';

describe('ApiErrorMessage', () => {
  const error = {
    message: 'The requested item was not found.',
    status: 404,
    code: 'ITEM_NOT_FOUND',
    requestId: 'GffXOjCtCYcEJEg=',
  };

  it('muestra el mensaje, estado HTTP, código e identificador', () => {
    render(<ApiErrorMessage error={error} />);

    expect(
      screen.getByText('The requested item was not found.'),
    ).toBeInTheDocument();

    expect(screen.getByText('Estado HTTP: 404')).toBeInTheDocument();
    expect(
      screen.getByText('Código de error: ITEM_NOT_FOUND'),
    ).toBeInTheDocument();
    expect(
      screen.getByText('Identificador de solicitud: GffXOjCtCYcEJEg='),
    ).toBeInTheDocument();
  });

  it('muestra el prefijo cuando se proporciona', () => {
    render(
      <ApiErrorMessage
        error={error}
        prefix="No fue posible cargar los datos:"
      />,
    );

    expect(
      screen.getByText(
        'No fue posible cargar los datos: The requested item was not found.',
      ),
    ).toBeInTheDocument();
  });

  it('no renderiza contenido cuando no recibe un error', () => {
    const { container } = render(<ApiErrorMessage error={null} />);

    expect(container.firstChild).toBeNull();
  });
});
