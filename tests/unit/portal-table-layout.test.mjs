import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const workspace=fs.readFileSync(new URL('../../app/workspace.css',import.meta.url),'utf8');
const design=fs.readFileSync(new URL('../../app/portal-design.css',import.meta.url),'utf8');

const expectedColumns={
  portalTaskDataTable:7,
  portalMemberDataTable:6,
  portalInventoryDataTable:7,
  portalMovementDataTable:6,
  portalRepositoryDataTable:8,
  portalProjectDataTable:9,
  portalTeamDataTable:8,
  portalVaultDataTable:8,
  portalDocumentDataTable:8,
  portalControlProjectTable:7,
  portalVehicleDataTable:8,
  portalTeamMembershipTable:5,
  portalRoleProfileTable:5,
  portalCapabilityGrantTable:4,
  portalNotificationDataTable:5,
  portalCalendarDataTable:5,
  portalArchiveDataTable:6,
  portalSearchDataTable:4,
  portalMeetingDataTable:9,
  portalMeetingSpaceTable:5,
  portalPollDataTable:5,
};

function tableWidths(css){
  const groups=new Map();
  const source=css.replace(/\/\*[\s\S]*?\*\//g,'');
  for(const match of source.matchAll(/([^{}]+)\{\s*width:([0-9.]+)%\s*\}/g)){
    const width=Number(match[2]);
    for(const selector of match[1].split(',')){
      const m=selector.trim().match(/^\.([A-Za-z0-9_-]+)\s+th:nth-child\((\d+)\)$/);
      if(!m) continue;
      const [,name,index]=m;
      if(!groups.has(name)) groups.set(name,new Map());
      groups.get(name).set(Number(index),width);
    }
  }
  return groups;
}

test('portal registry tables define every column and allocate exactly 100%',()=>{
  const groups=tableWidths(workspace);
  for(const [name,count] of Object.entries(expectedColumns)){
    const widths=groups.get(name);
    assert.ok(widths,`${name}: width rules missing`);
    assert.equal(widths.size,count,`${name}: expected ${count} explicit column widths`);
    for(let i=1;i<=count;i++) assert.ok(widths.has(i),`${name}: column ${i} width missing`);
    const total=[...widths.values()].reduce((sum,value)=>sum+value,0);
    assert.equal(total,100,`${name}: widths must total 100%, got ${total}%`);
  }
});

test('table action controls never collapse into per-character wrapping',()=>{
  assert.match(
    design,
    /\.portalDataTable \.rowActions \{[^}]*white-space:nowrap;[^}]*overflow-wrap:normal;[^}]*word-break:normal;/s,
  );
  assert.match(
    design,
    /\.portalDataTable \.rowActions :is\(a,button,summary\) \{[^}]*white-space:nowrap;[^}]*overflow-wrap:normal;[^}]*word-break:normal;/s,
  );
});
