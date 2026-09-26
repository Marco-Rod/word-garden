export interface LevelTheme {
  id: string;
  name: string;
  startLevel: number;
  endLevel: number;
  accent: string;
  words?: readonly string[];
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
