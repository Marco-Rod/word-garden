/**
 * Experimentos visuales reversibles. No se consumen desde las escenas de juego
 * ni modifican coordenadas ni input; sólo se activan con una query explícita.
 */
const experiment = (): string => new URLSearchParams(window.location.search).get('renderExperiment') ?? '';

export const isVisualPolishExperiment = (): boolean => experiment() === 'polish';
