import React from 'react';
import Svg, { Defs, ClipPath, Path, Image as SvgImage } from 'react-native-svg';
import { LIME } from './PregameChrome';

export const MODES = {
  solo: { id: 'solo', title: 'SOLO BATTLE ROYALE', image: require('../../assets/pregame/solo.png'), color: LIME, subtitle: 'LAST PLAYER STANDING', available: true },
  team: { id: 'team', title: 'TEAM DEATHMATCH', image: require('../../assets/pregame/team.png'), color: '#ff57b1', subtitle: 'BUILD YOUR SQUAD', available: true },
  zombies: { id: 'zombies', title: 'ZOMBIES', image: require('../../assets/pregame/zombies.png'), color: '#9784b8', subtitle: 'COMING SOON', available: false },
};
export default function ModeArtwork({ kind }) {
  const mode = MODES[kind] || MODES.solo;
  return <Svg width="100%" height="100%" viewBox="0 0 600 370" preserveAspectRatio="none">
    <Defs><ClipPath id={`mode-${mode.id}`}><Path d="M0 0H600V300H390L330 370H0Z" /></ClipPath></Defs>
    <SvgImage href={mode.image} x="0" y="0" width="600" height="370" preserveAspectRatio="xMidYMid slice" clipPath={`url(#mode-${mode.id})`} />
  </Svg>;
}
