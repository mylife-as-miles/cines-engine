/* SEVEN DAYS OF NO · POV kit (global POV) — palette and line widths first (the rig follows in this file).
   Colours sampled from design/refs (median of flat patches). */
(function (global) {
  'use strict';
  const C = {
    ink: '#1c1c1c',
    // hero
    skin: '#FCEBCB', skinSh: '#EED8B4', hoodie: '#3A8594', hoodieSh: '#2F7280', hoodieIn: '#28606C',
    white: '#FFFFFF', whiteSh: '#E6E6E6', shoeTeal: '#3A8594', sole: '#FFFFFF',
    // cast
    bossHair: '#A6A6A6', bossHairHi: '#CDCDCD', bossHairSh: '#8E8E8E', bossTrousers: '#7B7C7C', bossTrousersSh: '#696A6A',
    tie: '#3A3A3A', belt: '#2E2E2E', buckle: '#BDBDBD', shoeBlack: '#393939',
    friendTee: '#D14A44', friendTeeSh: '#B63E39', cap: '#3A3A3A', capSh: '#2A2A2A', jeans: '#5D8FAE', jeansSh: '#4E7D9A', jeansCuff: '#6E9DBA',
    mumCardigan: '#EC9547', mumCardiganSh: '#D6833A', mumSkirt: '#7E5C43', mumSkirtSh: '#6B4C36', mumHair: '#755438', mumHairSh: '#5E432C', shoeBrown: '#6E5340',
    cwSkin: '#CBA17C', cwSkinSh: '#B68B67', cwShirt: '#6EA179', cwShirtSh: '#5C8C67', khaki: '#DBC39E', khakiSh: '#C6AD86', lanyard: '#3E6FA6', badge: '#4988BC', shoeDark: '#5E4937',
    strJacket: '#6E5893', strJacketSh: '#5B4880', bucket: '#DAC7A2', bucketSh: '#C2AE87', strJeans: '#6191AF', strJeansSh: '#517E9B', strShoe: '#777093',
    // faces
    mouthIn: '#5E2323', tongue: '#E58A8E', tear: '#8ACDEB', sweat: '#8FD3F0', circles: 'rgba(96,78,96,0.32)',
    // props
    phone: '#3D3F48', phoneScreen: '#BFE3F2', phoneGlow: '#DFF6FF', laptop: '#C1C1C5', laptopSh: '#A9A9AE', clipboard: '#876245', clip: '#A9ADB2', paper: '#FFFFFF',
    box: '#C9995F', boxSh: '#B0834E', boxTop: '#D8AC74', tape: '#E3C38E', mug: '#FFFFFF', coffee: '#7A4A30',
    bubRed: '#E37F78', bubGreen: '#77CC81', bubBlue: '#7BAFE1', bubYellow: '#F4BF54', badgeRed: '#E5534B',
    bulb: '#F7D25A', bulbBase: '#9AA0A6', clockRim: '#A3ADB8', clockFace: '#FDFEFA',
    // sets (sampled from the refs, for the set agent to match)
    officeWallSide: '#FCC374', officeWallSideSh: '#E9A46B', officeWallBack: '#FBEABF', officeWallBackSh: '#F1C6A3', officeFloor: '#FDB569', officeFloorShadow: '#DC9967',
    officeDesk: '#EE8E5C', officeDeskLeg: '#B4C9DC', officeMonitor: '#B6CEE6', officeChair: '#DE875B', officePot: '#B6D0EA', leaf: '#87A26A', leafSh: '#6F8C57',
    windowFrame: '#FBB973', glassTop: '#FDCDB0', glassLow: '#FFE3B5', cloud: '#FEE6CC', cloudBlue: '#C9D3E3',
    livWall: '#C19280', livWallSh: '#B28173', livLampLight: '#EFC995', livFloor: '#B9714B', livFloorShadow: '#9A5E4C', livRug: '#BE917A',
    sofa: '#A9684C', sofaMid: '#915647', sofaSh: '#764540', pillow: '#DA9855', pillowSh: '#BC8157', lampShade: '#FCB953', lampPole: '#9B8981',
    curtain: '#B98E7F', door: '#935A47', doorFrame: '#AE7156', table: '#CD8B5F', tableSh: '#9C6752', livPot: '#8085A7', livLeaf: '#5F7357',
    stBrickBldg: '#B5714A', stBrickWin: '#854C32', stTan: '#BD8249', stOrange: '#F5A454', stSky: '#FCE9A7', stPier: '#C2753E', stRight: '#E77944',
    stDoorFrame: '#C45831', stDoor: '#88553B', stDoorGlass: '#5E9695', stLedgeTop: '#F4D780', stLedgeFace: '#9F9079', stPave: '#FBE689', stPaveLine: '#D9C26E',
    stTree: '#81A73A', stTreeSh: '#6D9233', stTrunk: '#9D6B3B', stPost: '#A9A8A3', stShadow: '#E2BF69',
    // evening multiply for figures in the living room (ref 07: white -> #D2B9C2, skin -> #CEA596)
    tintEvening: '#D2B9C2',
  };
  // line widths in px at 1920x1080. figure: silhouettes of a full-body figure (scale 1 = 800 px tall); detail: pocket, zip,
  // fingers, drawstrings; set: background outlines (the refs draw sets a little lighter than figures); setDetail: inner set lines.
  const LW = { figure: 5, detail: 3.1, set: 3.5, setDetail: 2.4 };
  const POV = global.POV || {};
  POV.C = C; POV.LW = LW; POV.INK = C.ink;
  global.POV = POV;
})(typeof window !== 'undefined' ? window : globalThis);
