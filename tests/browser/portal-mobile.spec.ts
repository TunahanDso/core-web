import {test,expect,type Page} from '@playwright/test';

async function prepare(page:Page,theme:string,collapsed=true){
  await page.addInitScript(({theme,collapsed})=>{localStorage.setItem('core.portal.theme',theme);localStorage.setItem('core.portal.sidebar.collapsed',collapsed?'1':'0');},{theme,collapsed});
  await page.route('**/portal/session-upgrade',route=>route.fulfill({status:200,body:'{}'}));
  await page.route('**/api/portal/mobile/register',route=>route.fulfill({status:200,body:'{}'}));
}
async function noPageOverflow(page:Page){
  expect(await page.evaluate(()=>document.documentElement.scrollWidth-window.innerWidth)).toBeLessThanOrEqual(1);
}
async function readable(page:Page,selector:string){
  const failures=await page.locator(selector).evaluateAll(elements=>{
    const rgb=(color:string)=>color.match(/[\d.]+/g)?.map(Number)||[0,0,0];
    const lum=(color:string)=>{const c=rgb(color).slice(0,3).map(n=>{const v=n/255;return v<=.04045?v/12.92:((v+.055)/1.055)**2.4});return c[0]*.2126+c[1]*.7152+c[2]*.0722};
    return elements.filter(el=>el.getBoundingClientRect().width>0).flatMap(el=>{
      let parent:Element|null=el,bg='rgb(255,255,255)';
      while(parent){const color=getComputedStyle(parent).backgroundColor;if(color!=='transparent' && (rgb(color)[3]??1)===1){bg=color;break;}parent=parent.parentElement;}
      const style=getComputedStyle(el),a=lum(style.color),b=lum(bg),ratio=(Math.max(a,b)+.05)/(Math.min(a,b)+.05);
      return ratio<4.5?[{text:el.textContent?.slice(0,60),color:style.color,bg,ratio}]:[];
    });
  });
  expect(failures).toEqual([]);
}

for(const theme of ['light','dark','aurora']){
  test(`${theme}: home has readable, padded cards without horizontal overflow`,async({page},info)=>{
    await prepare(page,theme);await page.goto('/portal');
    await expect(page.getByRole('heading',{name:'Merhaba, Tunahan.'})).toBeVisible();
    await expect(page.locator('html')).toHaveAttribute('data-portal-theme',theme);
    await noPageOverflow(page);
    for(const selector of ['.coreHomeStats>a','.coreHomePanel>header','.coreHomeList']){
      const padding=await page.locator(selector).first().evaluate(el=>parseFloat(getComputedStyle(el).paddingLeft));expect(padding).toBeGreaterThanOrEqual(16);
    }
    await readable(page,'.coreHome h1,.coreHome h2,.coreHome p,.coreHome small,.coreHomeStats span,.coreHomeStats b,.coreHomeBadge,.coreHomeItemCopy>a,.coreHome .portalPrimaryButton');
    await page.screenshot({path:info.outputPath(`${theme}-home.png`),fullPage:true});
  });
  test(`${theme}: mobile menu opens, stays readable and navigates with collapsed desktop preference`,async({page},info)=>{
    test.skip(info.project.name.startsWith('desktop'));
    await prepare(page,theme);await page.goto('/portal');
    const trigger=page.getByRole('button',{name:'Portal menüsünü aç'});await expect(trigger).toBeVisible();
    await expect(page.locator('html')).toHaveAttribute('data-portal-sidebar','collapsed');
    const box=await trigger.boundingBox();expect(box?.width).toBeGreaterThanOrEqual(44);expect(box?.height).toBeGreaterThanOrEqual(44);
    const avatar=await page.locator('.portalIdentity').boundingBox();expect(Math.abs((box?.y||0)-(avatar?.y||0))).toBeLessThanOrEqual(1);
    expect((await page.locator('.portalTopbar').boundingBox())?.height).toBeLessThanOrEqual(90);
    await trigger.click();const dialog=page.getByRole('dialog',{name:'Çalışma alanın'});await expect(dialog).toBeVisible();
    await readable(page,'.portalMobileDialog h2,.portalMobileDialog .portalNav b,.portalMobileDialog select');
    expect(await dialog.locator('footer').evaluate(el=>getComputedStyle(el).backgroundColor)).toBe('rgba(0, 0, 0, 0)');
    await dialog.getByRole('link',{name:'PCB / Elektronik',exact:true}).scrollIntoViewIfNeeded();
    await expect(dialog.getByRole('link',{name:'PCB / Elektronik',exact:true})).toBeVisible();
    await page.screenshot({path:info.outputPath(`${theme}-menu.png`)});
    await dialog.getByRole('button',{name:'Menüyü kapat'}).click();await expect(dialog).toHaveCount(0);await expect(trigger).toBeFocused();
    await trigger.click();await page.getByRole('dialog').getByRole('link',{name:'Projeler',exact:true}).click();
    await expect(page).toHaveURL(/\/portal\/projects$/);await expect(page.getByRole('dialog')).toHaveCount(0);await noPageOverflow(page);
  });
  test(`${theme}: native chrome and home share a usable palette`,async({page},info)=>{
    test.skip(info.project.name.startsWith('desktop'));
    await prepare(page,theme);await page.goto('/portal?nativeFixture=1');
    await expect(page.locator('html')).toHaveAttribute('data-core-native','native-v2');
    await expect(page.getByRole('heading',{name:'Merhaba, Tunahan.'})).toBeVisible();
    await expect(page.locator('.portalTopbar')).toBeHidden();await noPageOverflow(page);
    await expect(page.locator('.nativePullIndicator')).toHaveCount(0);
    for(const button of await page.locator('.nativeAppBar button').all()){const rect=await button.boundingBox();expect(rect?.width).toBeGreaterThanOrEqual(44);expect(rect?.height).toBeGreaterThanOrEqual(44);}
    await readable(page,'.nativeAppIdentity b,.nativeBottomTabs button span');
    await page.screenshot({path:info.outputPath(`${theme}-native.png`)});
    await page.locator('.nativeBottomTabs button').last().click();
    await expect(page.locator('.nativeMoreSheet')).toBeVisible();
    await readable(page,'.nativeMoreSheet h2,.nativeMemberCard b,.nativeMemberCard small,.nativeModuleOpen>b');
    await noPageOverflow(page);await page.screenshot({path:info.outputPath(`${theme}-native-menu.png`),animations:'disabled'});
    await page.locator('.nativeMoreSheet>header>button').click();
    await page.getByRole('button',{name:'Hızlı işlem',exact:true}).click();
    await expect(page.locator('.nativeQuickSheet')).toBeVisible();
    await readable(page,'.nativeQuickSheet h2,.nativeQuickGrid b,.nativeQuickGrid small');
    await page.screenshot({path:info.outputPath(`${theme}-native-actions.png`),animations:'disabled'});
  });
}
test('ordinary mobile browsing never auto-launches an app or displays a handoff wall',async({page})=>{
  await prepare(page,'dark');
  await page.addInitScript(()=>Object.defineProperty(navigator,'userAgent',{value:'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 Mobile Safari/604.1'}));
  await page.goto('/portal');await page.waitForTimeout(1600);
  await expect(page).toHaveURL(/\/portal$/);await expect(page.locator('.portalAppHandoff')).toHaveCount(0);
  await page.locator('.coreHomeShortcuts a[href="/portal/mail"]').click();await page.waitForTimeout(1600);
  await expect(page).toHaveURL(/\/portal\/mail$/);await expect(page.locator('.portalAppHandoff')).toHaveCount(0);await noPageOverflow(page);
});
test('empty home and enlarged text remain inside the viewport',async({page},info)=>{
  await prepare(page,'dark');await page.goto('/portal?empty=1');
  await page.addStyleTag({content:'.coreHome {font-size:20px} .coreHome :is(p,small,span,a,h2) {font-size:20px !important}'});
  await noPageOverflow(page);await expect(page.getByText('Şu an açık atanmış görevin yok.')).toBeVisible();
  await page.screenshot({path:info.outputPath('large-text.png'),fullPage:true});
});

async function withinViewport(page:Page,selector:string){
  const box=await page.locator(selector).first().boundingBox();
  expect(box).not.toBeNull();expect(box!.y).toBeGreaterThanOrEqual(-1);
  expect(box!.y+box!.height).toBeLessThanOrEqual((await page.evaluate(()=>visualViewport?.height||innerHeight))+1);
  expect(await page.evaluate(()=>document.documentElement.scrollHeight-innerHeight)).toBeLessThanOrEqual(1);
}
async function aboveFixedNavigation(page:Page,contentSelector:string,navSelector:string){
  const content=await page.locator(contentSelector).first().boundingBox();
  const nav=await page.locator(navSelector).first().boundingBox();
  expect(content).not.toBeNull();expect(nav).not.toBeNull();
  expect(content!.y+content!.height).toBeLessThanOrEqual(nav!.y+1);
}
async function mountFixtureMobileNav(page:Page){
  await page.evaluate(()=>{
    if(document.querySelector('.portalMobileNav'))return;
    const nav=document.createElement('nav');
    nav.className='portalMobileNav';
    nav.setAttribute('aria-label','Fixture mobile navigation');
    for(const [code,label] of [['OV','Genel'],['PM','Görev'],['CH','Sohbet'],['ML','Mail'],['VA','Vault']]){
      const link=document.createElement('a');
      link.href='#';
      const short=document.createElement('span');short.textContent=code;
      const text=document.createElement('b');text.textContent=label;
      link.append(short,text);nav.appendChild(link);
    }
    document.body.appendChild(nav);
  });
}
for(const theme of ['light','dark','aurora']){
  test(`${theme}: real chat keeps composer visible and scrolls messages internally`,async({page},info)=>{
    await prepare(page,theme);await page.goto('/portal/chat');
    await expect(page.locator('.chatFixedComposer')).toBeVisible();
    await withinViewport(page,'.chatFixedComposer');await noPageOverflow(page);
    await readable(page,'.chatAppIdentity b,.chatConversationHeader b,.portalMessageContent header b,.portalMessageContent p,.chatFixedComposer button,.portalBrand b,.portalIdentity b');
    await page.locator('.chatMessageViewport').evaluate(el=>el.scrollTop=el.scrollHeight);
    await expect(page.getByText('Tasarım incelemesi ve test planı için mesaj 24',{exact:true})).toBeVisible();
    await withinViewport(page,'.chatFixedComposer');
    await page.screenshot({path:info.outputPath(`${theme}-chat.png`),animations:'disabled'});
    if(!info.project.name.startsWith('desktop')){
      await page.setViewportSize({width:390,height:440});
      await mountFixtureMobileNav(page);
      await expect(page.locator('.portalMobileNav')).toBeVisible();
      await withinViewport(page,'.chatFixedComposer');
      await aboveFixedNavigation(page,'.chatFixedComposer','.portalMobileNav');
      await noPageOverflow(page);

      const textarea=page.getByRole('textbox',{name:'Kanal mesajı'});
      await textarea.focus();
      await expect(page.locator('html')).toHaveAttribute('data-core-keyboard','open');
      await expect(page.locator('.portalMobileNav')).toBeHidden();
      await expect(page.locator('.portalTopbar')).toBeHidden();
      await expect(page.locator('.chatFixedComposer')).toBeVisible();
      await withinViewport(page,'.chatFixedComposer');
      expect(await page.locator('.portalApp').evaluate(el=>getComputedStyle(el).position)).toBe('fixed');
      expect(await page.locator('.portalContentViewport').evaluate(el=>parseFloat(getComputedStyle(el).paddingBottom))).toBe(0);

      await textarea.evaluate((el:HTMLTextAreaElement)=>el.blur());
      await expect(page.locator('html')).not.toHaveAttribute('data-core-keyboard','open');
      await expect(page.locator('.portalMobileNav')).toBeVisible();

      await page.goto('/portal/chat?nativeFixture=1');
      await expect(page.locator('html')).toHaveAttribute('data-core-native','native-v2');
      const nativeComposer=page.locator('.chatFixedComposer');
      await expect(nativeComposer).toBeVisible();
      await withinViewport(page,'.chatFixedComposer');
      expect(await nativeComposer.evaluate(el=>getComputedStyle(el).position)).toBe('relative');
      const nativeComposerBox=await nativeComposer.boundingBox();
      const nativeTabsBox=await page.locator('.nativeBottomTabs').boundingBox();
      expect(nativeComposerBox).not.toBeNull();expect(nativeTabsBox).not.toBeNull();
      expect(nativeComposerBox!.y+nativeComposerBox!.height).toBeLessThanOrEqual(nativeTabsBox!.y+1);
    }
  });
  test(`${theme}: real mail reader and composer fit the workspace`,async({page},info)=>{
    await prepare(page,theme);await page.goto('/portal/mail?thread=thread');
    await expect(page.locator('.mailReaderHeader')).toBeVisible();
    await withinViewport(page,'.mailConversationViewport');await noPageOverflow(page);
    await readable(page,'.mailAppIdentity b,.mailReaderHeader h1,.mailConversationMessage b,.mailConversationMessage p');
    await page.goto('/portal/mail?compose=1');await expect(page.locator('.mailComposeSurface')).toBeVisible();
    await withinViewport(page,'.mailComposeSurface>form>footer');await noPageOverflow(page);
    await readable(page,'.mailComposeSurface>header b,.mailComposeSubject>span,.mailComposeRecipients b,.mailComposeSurface footer button');
    await page.screenshot({path:info.outputPath(`${theme}-mail-compose.png`),animations:'disabled'});
  });
  test(`${theme}: security surface and desktop rail preserve theme and width`,async({page},info)=>{
    await prepare(page,theme,false);
    await page.addInitScript(()=>{document.documentElement.classList.add('coreDesktopRuntime');});
    await page.goto('/portal/security');await expect(page.getByRole('heading',{name:'Güvenlik & Cihazlar'})).toBeVisible();
    await readable(page,'.portalPageHeader h1,.portalPageHeader p,.portalSecurityGrid h3,.portalSecurityGrid p,.portalBrand b,.portalIdentity b,.portalNav a.active b');
    if(info.project.name.startsWith('desktop')){
      expect(await page.locator('.portalNavScroll').evaluate(el=>el.scrollWidth-el.clientWidth)).toBeLessThanOrEqual(1);
      await page.getByRole('button',{name:'Sol menüyü daralt'}).click();
      expect(await page.locator('.portalNavScroll').evaluate(el=>el.scrollWidth-el.clientWidth)).toBeLessThanOrEqual(1);
    }
    await noPageOverflow(page);await page.screenshot({path:info.outputPath(`${theme}-security.png`),animations:'disabled'});
  });
}
