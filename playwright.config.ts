import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir:"tests/browser", timeout:30000, retries:process.env.CI?1:0, workers:2,
  reporter:[["list"],["html",{open:"never"}]],
  use:{baseURL:"http://127.0.0.1:4173",trace:"retain-on-failure",screenshot:"only-on-failure"},
  webServer:{command:"npm run test:ui:preview",url:"http://127.0.0.1:4173",reuseExistingServer:!process.env.CI},
  projects:[
    {name:"ios-webkit-390",use:{browserName:"webkit",viewport:{width:390,height:844},isMobile:true,hasTouch:true,deviceScaleFactor:1}},
    {name:"android-chromium-360",use:{browserName:"chromium",viewport:{width:360,height:800},isMobile:true,hasTouch:true,deviceScaleFactor:1}},
    {name:"small-webkit-320",use:{browserName:"webkit",viewport:{width:320,height:568},isMobile:true,hasTouch:true,deviceScaleFactor:1}},
    {name:"tablet-webkit",use:{browserName:"webkit",viewport:{width:768,height:1024},hasTouch:true,deviceScaleFactor:1}},
    {name:"desktop-chromium",use:{browserName:"chromium",viewport:{width:1440,height:1000}}},
  ],
});
