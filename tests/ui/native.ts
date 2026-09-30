// Test-only Capacitor boundary. No device, permission prompt or production API is used.
const noop=async()=>{};
const addListener=async()=>({remove:noop});
export const Capacitor={isNativePlatform:()=>new URLSearchParams(location.search).has('nativeFixture'),getPlatform:()=> 'ios',isPluginAvailable:()=>false};
export const App={addListener,exitApp:noop};
export const Preferences={get:async()=>({value:null}),set:noop};
export const Network={getStatus:async()=>({connected:true,connectionType:'wifi'}),addListener};
export const Keyboard={addListener};
export const Haptics={impact:noop,notification:noop};
export const ImpactStyle={Light:'LIGHT',Medium:'MEDIUM'};
export const NotificationType={Success:'SUCCESS',Error:'ERROR'};
export const StatusBar={setStyle:noop};
export const Style={Light:'LIGHT',Dark:'DARK'};
export const Camera={takePhoto:async()=>{throw Error('Camera is not available in fixtures')}};
export const CameraDirection={Rear:'REAR'};
export const Share={share:noop};
export const PushNotifications={addListener,register:noop,checkPermissions:async()=>({receive:'prompt'}),requestPermissions:async()=>({receive:'denied'})};
