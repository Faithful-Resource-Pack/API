import firestorm from 'firestorm-db';
import { parseArr } from '../../tools/parseArr';
import config from '../config';
config();

import uses from './uses';

export default firestorm.collection('textures', el => {
  el.uses = () => {
    return uses.search([{
      field: 'textureID',
      criteria: '==',
      value: el[firestorm.ID_FIELD]
    }])
  }

  el.paths = () => {
    return uses.search([{
      field: 'textureID',
      criteria: '==',
      value: el[firestorm.ID_FIELD]
    }])
      .then((_uses) => {
        return Promise.all(_uses.map((use) => use.paths()));
      })
      .then(arr => {
        return parseArr(arr);
      })
  }
  return el;
})