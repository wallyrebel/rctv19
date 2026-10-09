// Set launchAt only after the public weather routes have been verified.
// Keep null during development: the 48-hour clock must not start on a preview.
export const WEATHER_CONFIG = {
  stormId: 'al092026', stormName: 'Isaias', stormYear: 2026,
  launchAt: null, modeOverride: 'auto', stormHours: 48,
  apiUrl: '/api/weather',
  sponsors: [
    {name:'Mama Justice', image:null, width:1000, height:450},
    {name:'Steven Eaton · Modern Woodmen', image:null, width:500, height:500}
  ]
};
