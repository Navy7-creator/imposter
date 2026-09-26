import AwareImposterGame from './awareImposter';
import UnawareImposterGame from './unawareImposter';
import GuessNumberGame from './guessNumber';
import NeverSayDoGame from './neverSayDo';
import DrawingImposterGame from './drawingImposter';
import GuessTheLieGame from './guessTheLie';
import { games } from '../../data/gameData';

const makeGameMode = (id, title, description, Icon) => ({
  id,
  title,
  description,
  Icon,
});

export const gameModeRegistry = {
  'aware-imposter': makeGameMode('aware-imposter', games[0][1], games[0][2], AwareImposterGame),
  'unaware-imposter': makeGameMode('unaware-imposter', games[1][1], games[1][2], UnawareImposterGame),
  'guess-number': makeGameMode('guess-number', games[2][1], games[2][2], GuessNumberGame),
  'never-say-do': makeGameMode('never-say-do', games[3][1], games[3][2], NeverSayDoGame),
  'drawing-imposter': makeGameMode('drawing-imposter', games[4][1], games[4][2], DrawingImposterGame),
  'guess-the-lie': makeGameMode('guess-the-lie', games[5][1], games[5][2], GuessTheLieGame),
};

export const gameModeList = Object.entries(gameModeRegistry);
