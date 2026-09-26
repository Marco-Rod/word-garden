export interface LevelTheme {
  id: string;
  name: string;
  startLevel: number;
  endLevel: number;
  accent: string;
  words?: readonly string[];
}

export interface ThemeVisual {
  /** Main world surface, used on the map and lightly behind the board. */
  fill: string;
  wave: string;
  detail: string;
  /** Low-contrast sky colour that keeps the word board easy to read. */
  boardBackground: string;
  kind: 'garden' | 'sand' | 'forest' | 'space' | 'water' | 'ice' | 'city' | 'magic' | 'fire' | 'cloud';
}

/** Cada tema abarca cinco niveles consecutivos para guiar contenido y mapa. */
export const LEVEL_THEMES: readonly LevelTheme[] = [
  { id: 'garden', name: 'Jardín Inicial', startLevel: 1, endLevel: 5, accent: '#66bb6a' },
  { id: 'trail', name: 'Sendero de Aventura', startLevel: 6, endLevel: 10, accent: '#ffb74d' },
  { id: 'forest', name: 'Bosque Encantado', startLevel: 11, endLevel: 15, accent: '#43a047' },
  { id: 'space', name: 'Exploración Espacial', startLevel: 16, endLevel: 20, accent: '#5c6bc0' },
  { id: 'ocean', name: 'Océano Azul', startLevel: 21, endLevel: 25, accent: '#26a69a', words: ['BALLENA','DELFIN','CORAL','PULPO','TIBURON','ISLA','OLA','BARCO'] },
  { id: 'desert', name: 'Desierto Dorado', startLevel: 26, endLevel: 30, accent: '#d4a24c', words: ['CAMELLO','DUNA','OASIS','ARENA','CACTUS','SOL','ROCA','MAPA'] },
  { id: 'dino', name: 'Valle Dino', startLevel: 31, endLevel: 35, accent: '#8d6e63', words: ['DINO','HUESO','HUELLA','VOLCAN','SELVA','HUEVO','REX','FOSIL'] },
  { id: 'castle', name: 'Castillo Mágico', startLevel: 36, endLevel: 40, accent: '#ab74c5', words: ['CASTILLO','REINA','REY','TORRE','LLAVE','MAGIA','DRAGON','TESORO'] },
  { id: 'farm', name: 'Granja Feliz', startLevel: 41, endLevel: 45, accent: '#f6b04b', words: ['VACA','CABALLO','CERDO','GALLINA','GRANJA','TRIGO','PAJA','QUESO'] },
  { id: 'jungle', name: 'Selva Salvaje', startLevel: 46, endLevel: 50, accent: '#388e3c', words: ['TIGRE','MONO','LORO','JAGUAR','LIANA','SELVA','RANA','RIO'] },
  { id: 'arctic', name: 'Polo Nevado', startLevel: 51, endLevel: 55, accent: '#81d4fa', words: ['PINGUINO','OSO','HIELO','NIEVE','FOCA','TRINEO','IGLU','FRIO'] },
  { id: 'city', name: 'Ciudad Brillante', startLevel: 56, endLevel: 60, accent: '#78909c', words: ['CIUDAD','AUTO','TREN','CALLE','PUENTE','TORRE','PLAZA','LUZ'] },
  { id: 'music', name: 'Isla Musical', startLevel: 61, endLevel: 65, accent: '#ec407a', words: ['MUSICA','RITMO','CANTO','PIANO','TAMBOR','FIESTA','NOTA','BAILE'] },
  { id: 'candy', name: 'Valle Dulce', startLevel: 66, endLevel: 70, accent: '#f48fb1', words: ['DULCE','PASTEL','HELADO','MANGO','GALLETA','CHOCOLATE','FRESA','MIEL'] },
  { id: 'robot', name: 'Fábrica Robot', startLevel: 71, endLevel: 75, accent: '#607d8b', words: ['ROBOT','TUERCA','CABLE','MOTOR','METAL','RAYO','BOTON','RUEDA'] },
  { id: 'cloud', name: 'Reino de Nubes', startLevel: 76, endLevel: 80, accent: '#90caf9', words: ['NUBE','ARCOIRIS','VIENTO','LLUVIA','RAYO','CIELO','GOTA','SOL'] },
  { id: 'volcano', name: 'Isla Volcán', startLevel: 81, endLevel: 85, accent: '#ef6c00', words: ['VOLCAN','LAVA','ROCA','HUMO','ISLA','FUEGO','TIERRA','CUEVA'] },
  { id: 'circus', name: 'Circo Estrella', startLevel: 86, endLevel: 90, accent: '#e53935', words: ['CIRCO','PAYASO','CARPA','MAGIA','PELOTA','RUEDA','RISA','SHOW'] },
  { id: 'dream', name: 'Jardín de Sueños', startLevel: 91, endLevel: 95, accent: '#9575cd', words: ['SUEÑO','LUCES','LUNA','ESTRELLA','NOCHE','NUBE','MAGIA','PAZ'] },
  { id: 'final', name: 'Gran Final', startLevel: 96, endLevel: 100, accent: '#ffca28', words: ['AMISTAD','AVENTURA','JARDIN','TESORO','CAMINO','ESTRELLA','SONRISA','VICTORIA'] },
];

export const themeForLevel = (levelId: number): LevelTheme | undefined => LEVEL_THEMES.find((theme) => levelId >= theme.startLevel && levelId <= theme.endLevel);

/** Palette and decoration family are data, so map and gameplay always agree. */
export const THEME_VISUALS: Record<string, ThemeVisual> = {
  garden: { fill: '#dcedc8', wave: '#b9dc8f', detail: '#66a94a', boardBackground: '#dff4cf', kind: 'garden' },
  trail: { fill: '#f7dfab', wave: '#f3c87b', detail: '#b8834c', boardBackground: '#fff0c9', kind: 'sand' },
  forest: { fill: '#b9dca7', wave: '#78aa67', detail: '#356b3b', boardBackground: '#d8edc8', kind: 'forest' },
  space: { fill: '#b7b5e2', wave: '#8582c6', detail: '#4f4a91', boardBackground: '#d9d8fb', kind: 'space' },
  ocean: { fill: '#9cdae5', wave: '#4baec5', detail: '#147c98', boardBackground: '#d7f4f7', kind: 'water' },
  desert: { fill: '#f6d28d', wave: '#eab45e', detail: '#b67825', boardBackground: '#fff0c4', kind: 'sand' },
  dino: { fill: '#b6d58a', wave: '#789c50', detail: '#526c37', boardBackground: '#e4f2cf', kind: 'forest' },
  castle: { fill: '#e1c7ef', wave: '#bb91d1', detail: '#8050a0', boardBackground: '#f3e6fb', kind: 'magic' },
  farm: { fill: '#f6dc9e', wave: '#abd174', detail: '#7c9e45', boardBackground: '#fff3d5', kind: 'garden' },
  jungle: { fill: '#a8d89a', wave: '#589d59', detail: '#276c3b', boardBackground: '#d7f0d0', kind: 'forest' },
  arctic: { fill: '#d9f3fa', wave: '#a6dce9', detail: '#5babc2', boardBackground: '#eefbff', kind: 'ice' },
  city: { fill: '#c8d4dc', wave: '#94aebc', detail: '#546e7a', boardBackground: '#e8f0f3', kind: 'city' },
  music: { fill: '#f6c3dc', wave: '#df79ab', detail: '#b43d79', boardBackground: '#ffe3f0', kind: 'magic' },
  candy: { fill: '#ffd0df', wave: '#f695bd', detail: '#d95d91', boardBackground: '#fff0f6', kind: 'magic' },
  robot: { fill: '#cad8df', wave: '#829ba8', detail: '#405d6d', boardBackground: '#e8f1f4', kind: 'city' },
  cloud: { fill: '#d8eafa', wave: '#a9cff2', detail: '#6399c5', boardBackground: '#eef7ff', kind: 'cloud' },
  volcano: { fill: '#f7c09e', wave: '#e86e3c', detail: '#a53e23', boardBackground: '#ffe3d1', kind: 'fire' },
  circus: { fill: '#f6c5be', wave: '#dc7168', detail: '#b63943', boardBackground: '#ffe7df', kind: 'magic' },
  dream: { fill: '#dbcef3', wave: '#ad94d5', detail: '#7453aa', boardBackground: '#f0eaff', kind: 'cloud' },
  final: { fill: '#ffeba9', wave: '#f6c948', detail: '#d58c16', boardBackground: '#fff7d6', kind: 'magic' },
};

export const visualForLevel = (levelId: number): ThemeVisual => THEME_VISUALS[themeForLevel(levelId)?.id ?? 'garden'];
